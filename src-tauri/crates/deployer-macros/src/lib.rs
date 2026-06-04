extern crate proc_macro;

use proc_macro::TokenStream;
use quote::quote;
use syn::{
    parse_macro_input, Attribute, Data, DeriveInput, Fields, Lit, Meta,
    Expr,
};

#[proc_macro_derive(DbEntity, attributes(db_table, db_encrypt, db_conditional_encrypt))]
pub fn derive_db_entity(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;

    // 1. Obtener el nombre de la tabla desde el atributo #[db_table("nombre")]
    let table_name = get_table_name(&input.attrs)
        .expect("El struct debe tener el atributo #[db_table(\"nombre_tabla\")]");

    // Obtener los campos del struct
    let fields = match &input.data {
        Data::Struct(data_struct) => match &data_struct.fields {
            Fields::Named(fields_named) => &fields_named.named,
            _ => panic!("DbEntity solo puede derivarse en structs con campos nombrados"),
        },
        _ => panic!("DbEntity solo puede derivarse en structs"),
    };

    // 2. Extraer campos cifrados: #[db_encrypt(expose = true/false)] o #[db_encrypt]
    let mut encrypted_fields = Vec::new();
    // 3. Extraer campos condicionalmente cifrados: #[db_conditional_encrypt("campo_condicion")]
    let mut conditional_encrypted_fields = Vec::new();

    for field in fields {
        let field_name = field.ident.as_ref().unwrap().to_string();

        for attr in &field.attrs {
            if attr.path().is_ident("db_encrypt") {
                let mut expose = false; // por defecto false
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
                if let Meta::List(meta_list) = &attr.meta {
                    if let Ok(lit) = meta_list.parse_args::<Lit>() {
                        if let Lit::Str(lit_str) = lit {
                            conditional_encrypted_fields.push((field_name.clone(), lit_str.value()));
                        }
                    }
                }
            }
        }
    }

    // Generar la representación de los arrays estáticos
    let encrypted_fields_tokens = encrypted_fields.iter().map(|(field, expose)| {
        quote! { (#field, #expose) }
    });

    let conditional_encrypted_fields_tokens = conditional_encrypted_fields.iter().map(|(field, cond)| {
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
    let to_fields_mappings = fields.iter().filter(|field| {
        let name = field.ident.as_ref().unwrap().to_string();
        name != "id" && name != "created_at" && name != "updated_at"
    }).map(|field| {
        let f_ident = &field.ident;
        let f_name = f_ident.as_ref().unwrap().to_string();
        quote! {
            (#f_name.into(), serde_json::to_value(&self.#f_ident).unwrap_or(serde_json::Value::Null))
        }
    });

    // 6. Generar to_fields_all (todos los campos)
    let to_fields_all_mappings = fields.iter().map(|field| {
        let f_ident = &field.ident;
        let f_name = f_ident.as_ref().unwrap().to_string();
        quote! {
            (#f_name.into(), serde_json::to_value(&self.#f_ident).unwrap_or(serde_json::Value::Null))
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
                let map: std::collections::HashMap<String, serde_json::Value> = fields.into_iter().collect();
                Ok(#name {
                    #(#from_fields_mappings),*
                })
            }
        }
    };

    TokenStream::from(expanded)
}

fn get_table_name(attrs: &[Attribute]) -> Option<String> {
    for attr in attrs {
        if attr.path().is_ident("db_table") {
            if let Meta::List(meta_list) = &attr.meta {
                if let Ok(lit) = meta_list.parse_args::<Lit>() {
                    if let Lit::Str(lit_str) = lit {
                        return Some(lit_str.value());
                    }
                }
            }
        }
    }
    None
}
