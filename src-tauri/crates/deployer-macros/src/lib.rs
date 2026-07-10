extern crate proc_macro;

use proc_macro::TokenStream;
use proc_macro2::{Delimiter, Group, Ident, Span, TokenTree};
use quote::quote;
use syn::{parse_macro_input, Attribute, Data, DeriveInput, Expr, Field, Fields, Lit, Meta};

#[proc_macro_derive(
    DbEntity,
    attributes(db_table, db_encrypt, db_conditional_encrypt, db_rename)
)]
pub fn derive_db_entity(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;

    // 1. Obtener el nombre de la tabla desde #[db_table("nombre")]
    //    Usa syn::Error para emitir un error de compilación apuntando al span del struct.
    let table_name = match get_table_name(&input.attrs, name) {
        Ok(t) => t,
        Err(e) => return e.to_compile_error().into(),
    };

    // Obtener los campos del struct.
    //    Usa syn::Error para emitir errores de compilación precisos.
    let fields = match &input.data {
        Data::Struct(data_struct) => match &data_struct.fields {
            Fields::Named(fields_named) => &fields_named.named,
            _ => {
                return syn::Error::new_spanned(
                    name,
                    "DbEntity solo puede derivarse en structs con campos nombrados",
                )
                .to_compile_error()
                .into()
            }
        },
        _ => {
            return syn::Error::new_spanned(name, "DbEntity solo puede derivarse en structs")
                .to_compile_error()
                .into()
        }
    };

    // 2. Extraer campos cifrados: #[db_encrypt]
    let mut encrypted_fields: Vec<String> = Vec::new();

    // 3. Extraer campos condicionalmente cifrados: #[db_conditional_encrypt(condition = "campo")]
    let mut conditional_encrypted_fields: Vec<(String, String)> = Vec::new();

    for field in fields {
        let field_name = field.ident.as_ref().unwrap().to_string();

        for attr in &field.attrs {
            if attr.path().is_ident("db_encrypt") {
                encrypted_fields.push(field_name.clone());
            } else if attr.path().is_ident("db_conditional_encrypt") {
                // Sintaxis: #[db_conditional_encrypt(condition = "campo_condicion")]
                if let Meta::List(meta_list) = &attr.meta {
                    let mut condition_value: Option<String> = None;
                    let _ = meta_list.parse_nested_meta(|meta| {
                        if meta.path.is_ident("condition") {
                            let value: Expr = meta.value()?.parse()?;
                            if let Expr::Lit(expr_lit) = value {
                                if let Lit::Str(lit_str) = expr_lit.lit {
                                    condition_value = Some(lit_str.value());
                                }
                            }
                        }
                        Ok(())
                    });
                    if let Some(cond) = condition_value {
                        conditional_encrypted_fields.push((field_name.clone(), cond));
                    } else {
                        return syn::Error::new_spanned(
                            field.ident.as_ref().unwrap(),
                            "db_conditional_encrypt requiere el argumento `condition = \"nombre_campo\"`",
                        )
                        .to_compile_error()
                        .into();
                    }
                }
            }
        }
    }

    // Generar los arrays estáticos para encrypted_fields y conditional_encrypted_fields
    // NOTA: usan el nombre de CAMPO RUST (no la columna renombrada), porque
    // `apply_encryption`/`apply_decryption` operan sobre el resultado de
    // `to_fields()`/`to_fields_all()`, que ya usa el nombre de columna DB
    // renombrado (ver `get_db_rename` más abajo) — por tanto estos arrays
    // también deben usar el nombre de columna DB para que coincidan.
    let encrypted_fields_tokens = encrypted_fields.iter().map(|field| {
        let db_name = fields
            .iter()
            .find(|f| f.ident.as_ref().unwrap().to_string() == *field)
            .and_then(get_db_rename)
            .unwrap_or_else(|| field.clone());
        quote! { #db_name }
    });

    let conditional_encrypted_fields_tokens =
        conditional_encrypted_fields.iter().map(|(field, cond)| {
            let db_name = fields
                .iter()
                .find(|f| f.ident.as_ref().unwrap().to_string() == *field)
                .and_then(get_db_rename)
                .unwrap_or_else(|| field.clone());
            quote! { (#db_name, #cond) }
        });

    // 4. Generar from_row
    let from_row_fields = fields.iter().map(|field| {
        let f_ident = &field.ident;
        let f_db_name = db_column_name(field);
        quote! {
            #f_ident: row.try_get(#f_db_name).map_err(|e| e.to_string())?
        }
    });

    // 5. Generar to_fields (excluyendo id, created_at, updated_at)
    //    Usa .expect() en lugar de unwrap_or(Null) para que los fallos de serialización
    //    sean visibles inmediatamente en lugar de silenciosos.
    let to_fields_mappings = fields
        .iter()
        .filter(|field| {
            let n = field.ident.as_ref().unwrap().to_string();
            n != "id" && n != "created_at" && n != "updated_at"
        })
        .map(|field| {
            let f_ident = &field.ident;
            let f_db_name = db_column_name(field);
            let expect_msg = format!(
                "Error al serializar el campo `{}` a serde_json::Value",
                f_db_name
            );
            quote! {
                (#f_db_name.into(), serde_json::to_value(&self.#f_ident).expect(#expect_msg))
            }
        });

    // 6. Generar to_fields_all (todos los campos)
    let to_fields_all_mappings = fields.iter().map(|field| {
        let f_ident = &field.ident;
        let f_db_name = db_column_name(field);
        let expect_msg = format!(
            "Error al serializar el campo `{}` a serde_json::Value",
            f_db_name
        );
        quote! {
            (#f_db_name.into(), serde_json::to_value(&self.#f_ident).expect(#expect_msg))
        }
    });

    // 7. Generar from_fields
    let from_fields_mappings = fields.iter().map(|field| {
        let f_ident = &field.ident;
        let f_db_name = db_column_name(field);
        quote! {
            #f_ident: map.get(#f_db_name)
                .cloned()
                .and_then(|v| serde_json::from_value(v).ok())
                .unwrap_or_default()
        }
    });

    let expanded = quote! {
        impl crate::db::DbEntity for #name {
            fn table_name() -> &'static str {
                #table_name
            }

            fn encrypted_fields() -> &'static [&'static str] {
                &[#(#encrypted_fields_tokens),*]
            }

            fn conditional_encrypted_fields() -> &'static [(&'static str, &'static str)] {
                &[#(#conditional_encrypted_fields_tokens),*]
            }

            fn from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, String> {
                use sqlx::Row;
                Ok(#name {
                    #(#from_row_fields),*
                })
            }

            fn to_fields(&self) -> Vec<(String, serde_json::Value)> {
                vec![
                    #(#to_fields_mappings),*
                ]
            }

            fn to_fields_all(&self) -> Vec<(String, serde_json::Value)> {
                vec![
                    #(#to_fields_all_mappings),*
                ]
            }

            fn from_fields(fields: Vec<(String, serde_json::Value)>) -> Result<Self, String> {
                let map: std::collections::HashMap<String, serde_json::Value> =
                    fields.into_iter().collect();
                Ok(#name {
                    #(#from_fields_mappings),*
                })
            }
        }
    };

    TokenStream::from(expanded)
}

/// Busca #[db_table("nombre")] en los atributos del struct.
/// Devuelve Err con un syn::Error apuntando al ident del struct si no se encuentra.
fn get_table_name(
    attrs: &[Attribute],
    struct_ident: &syn::Ident,
) -> Result<String, syn::Error> {
    for attr in attrs {
        if attr.path().is_ident("db_table") {
            if let Meta::List(meta_list) = &attr.meta {
                if let Ok(lit) = meta_list.parse_args::<Lit>() {
                    if let Lit::Str(lit_str) = lit {
                        return Ok(lit_str.value());
                    }
                }
            }
        }
    }
    Err(syn::Error::new(
        Span::call_site(),
        format!(
            "`{}` debe tener el atributo #[db_table(\"nombre_tabla\")]",
            struct_ident
        ),
    ))
}

/// Busca #[db_rename("columna")] en los atributos de un campo.
///
/// Permite que el nombre del campo Rust difiera del nombre de la columna en
/// SQLite (por ejemplo, `task_type` en Rust -> columna `type`, ya que `type`
/// es palabra reservada en Rust y no puede usarse como identificador sin
/// `r#type`). Devuelve `None` si el campo no tiene el atributo, en cuyo caso
/// se usa el nombre del campo Rust tal cual como nombre de columna.
fn get_db_rename(field: &Field) -> Option<String> {
    for attr in &field.attrs {
        if attr.path().is_ident("db_rename") {
            if let Meta::List(meta_list) = &attr.meta {
                if let Ok(Lit::Str(lit_str)) = meta_list.parse_args::<Lit>() {
                    return Some(lit_str.value());
                }
            }
        }
    }
    None
}

/// Nombre de columna DB efectivo de un campo: el de `#[db_rename("...")]` si
/// existe, o si no el nombre del campo Rust tal cual como nombre de columna.
fn db_column_name(field: &Field) -> String {
    get_db_rename(field).unwrap_or_else(|| field.ident.as_ref().unwrap().to_string())
}

// ===========================================================================
// ident_concat! — reemplazo de paste::paste! para concatenación de identifiers
// Sintaxis: ident_concat! { [<prefijo _ sufijo>] }
// ===========================================================================

/// Proc macro que reemplaza `[<a _ b _ c>]` por el identifier `a_b_c`.
/// Sustituto de `paste::paste!` solo para la parte de concatenación de identifiers.
#[proc_macro]
pub fn ident_concat(input: TokenStream) -> TokenStream {
    let input: proc_macro2::TokenStream = input.into();
    let output = process_tokens(&input);
    output.into()
}

fn process_tokens(stream: &proc_macro2::TokenStream) -> proc_macro2::TokenStream {
    let mut output = proc_macro2::TokenStream::new();

    for tree in stream.clone() {
        match tree {
            TokenTree::Group(group) => {
                if group.delimiter() == Delimiter::Bracket {
                    let inner: Vec<TokenTree> = group.stream().into_iter().collect();
                    if let Some(ident) = try_parse_bracket(&inner) {
                        output.extend(std::iter::once(TokenTree::Ident(ident)));
                    } else {
                        let processed = process_tokens(&group.stream());
                        let mut g = Group::new(group.delimiter(), processed);
                        g.set_span(group.span());
                        output.extend(std::iter::once(TokenTree::Group(g)));
                    }
                } else {
                    let processed = process_tokens(&group.stream());
                    let mut g = Group::new(group.delimiter(), processed);
                    g.set_span(group.span());
                    output.extend(std::iter::once(TokenTree::Group(g)));
                }
            }
            other => {
                output.extend(std::iter::once(other));
            }
        }
    }

    output
}

/// Intenta parsear `[< ... >]` dentro de un bracket group.
/// Devuelve el identifier concatenado si el patrón coincide.
fn try_parse_bracket(tokens: &[TokenTree]) -> Option<Ident> {
    if tokens.len() < 2 {
        return None;
    }

    // Primer token debe ser '<'
    match &tokens[0] {
        TokenTree::Punct(p) if p.as_char() == '<' => {}
        _ => return None,
    }

    // Último token debe ser '>'
    match tokens.last().unwrap() {
        TokenTree::Punct(p) if p.as_char() == '>' => {}
        _ => return None,
    }

    // Tokens del medio: concatenar identifiers con underscores
    let middle = &tokens[1..tokens.len() - 1];
    let mut result = String::new();

    for token in middle {
        match token {
            TokenTree::Ident(ident) => result.push_str(&ident.to_string()),
            TokenTree::Punct(p) if p.as_char() == '_' => result.push('_'),
            TokenTree::Literal(lit) => result.push_str(&lit.to_string()),
            _ => {}
        }
    }

    if result.is_empty() {
        return None;
    }

    Some(Ident::new(&result, Span::call_site()))
}
