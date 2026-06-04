extern crate proc_macro;

use proc_macro::TokenStream;
use proc_macro2::Span;
use quote::quote;
use syn::{parse_macro_input, Attribute, Data, DeriveInput, Expr, Fields, Lit, Meta};

#[proc_macro_derive(DbEntity, attributes(db_table, db_encrypt, db_conditional_encrypt))]
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

    // 2. Extraer campos cifrados: #[db_encrypt] o #[db_encrypt(expose = true/false)]
    let mut encrypted_fields: Vec<(String, bool)> = Vec::new();

    // 3. Extraer campos condicionalmente cifrados: #[db_conditional_encrypt(condition = "campo")]
    let mut conditional_encrypted_fields: Vec<(String, String)> = Vec::new();

    for field in fields {
        let field_name = field.ident.as_ref().unwrap().to_string();

        for attr in &field.attrs {
            if attr.path().is_ident("db_encrypt") {
                let mut expose = false;
                if let Meta::List(meta_list) = &attr.meta {
                    let _ = meta_list.parse_nested_meta(|meta| {
                        if meta.path.is_ident("expose") {
                            let value: Expr = meta.value()?.parse()?;
                            if let Expr::Lit(expr_lit) = value {
                                if let Lit::Bool(lit_bool) = expr_lit.lit {
                                    expose = lit_bool.value;
                                }
                            }
                        }
                        Ok(())
                    });
                }
                encrypted_fields.push((field_name.clone(), expose));
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
    let encrypted_fields_tokens = encrypted_fields.iter().map(|(field, expose)| {
        quote! { (#field, #expose) }
    });

    let conditional_encrypted_fields_tokens =
        conditional_encrypted_fields.iter().map(|(field, cond)| {
            quote! { (#field, #cond) }
        });

    // 4. Generar from_row
    let from_row_fields = fields.iter().map(|field| {
        let f_ident = &field.ident;
        let f_name = f_ident.as_ref().unwrap().to_string();
        quote! {
            #f_ident: row.try_get(#f_name).map_err(|e| e.to_string())?
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
            let f_name = f_ident.as_ref().unwrap().to_string();
            let expect_msg = format!(
                "Error al serializar el campo `{}` a serde_json::Value",
                f_name
            );
            quote! {
                (#f_name.into(), serde_json::to_value(&self.#f_ident).expect(#expect_msg))
            }
        });

    // 6. Generar to_fields_all (todos los campos)
    let to_fields_all_mappings = fields.iter().map(|field| {
        let f_ident = &field.ident;
        let f_name = f_ident.as_ref().unwrap().to_string();
        let expect_msg = format!(
            "Error al serializar el campo `{}` a serde_json::Value",
            f_name
        );
        quote! {
            (#f_name.into(), serde_json::to_value(&self.#f_ident).expect(#expect_msg))
        }
    });

    // 7. Generar from_fields
    let from_fields_mappings = fields.iter().map(|field| {
        let f_ident = &field.ident;
        let f_name = f_ident.as_ref().unwrap().to_string();
        quote! {
            #f_ident: map.get(#f_name)
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

            fn encrypted_fields() -> &'static [(&'static str, bool)] {
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
