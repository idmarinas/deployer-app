import { Database } from "bun:sqlite";
import fs from "fs";

// Convierte snake_case a PascalCase
function toPascalCase(str: string) {
    return str
        .split(/[_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join("");
}

// Convierte snake_case a camelCase
function toCamelCase(str: string) {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// Mapeo SQLite → TypeScript
function mapSQLiteTypeToTS(sqlType: string): string {
    const type = sqlType.toUpperCase();
    if (type.includes("INT")) return "number";
    if (type.includes("CHAR") || type.includes("CLOB") || type.includes("TEXT")) return "string";
    if (type.includes("BLOB")) return "Buffer";
    if (type.includes("REAL") || type.includes("FLOA") || type.includes("DOUB")) return "number";
    if (type.includes("NUMERIC") || type.includes("DECIMAL")) return "number";
    if (type.includes("TIMESTAMP") || type.includes("DATE")) return "Date | string";
    return "any";
}

function generateTypes(dbPath: string, outputFile: string) {
    const db = new Database(dbPath, { readonly: true });

    const tables = db
        .query<{ name: string }>(
            `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`
        )
        .all();

    let output = "// Auto-generado desde la BD SQLite\n\n";

    for (const { name: tableName } of tables) {
        const columns = db
            .query<{ name: string; type: string; notnull: number }>(
                `PRAGMA table_info(${tableName});`
            )
            .all();

        const fks = db
            .query<{ table: string; from: string; to: string }>(
                `PRAGMA foreign_key_list(${tableName});`
            )
            .all();

        output += `export interface ${toPascalCase(tableName)} {\n`;

        // Campos normales
        for (const col of columns) {
            const tsType = mapSQLiteTypeToTS(col.type);
            const optional = col.notnull === 0 ? "?" : "";
            output += `  ${col.name}${optional}: ${tsType};\n`;
        }

        // Relaciones con nombres únicos
        const usedNames = new Set<string>();
        for (const fk of fks) {
            let relationName = toCamelCase(fk.from.replace(/_id$/, "")); // ej: deployment_id → deployment
            if (usedNames.has(relationName)) {
                // Si ya existe, usar nombre completo de la columna
                relationName = toCamelCase(fk.from);
            }
            usedNames.add(relationName);

            output += `  ${relationName}?: ${toPascalCase(fk.table)}; // FK → ${fk.table}.${fk.to}\n`;
        }

        output += "}\n\n";
    }

    fs.writeFileSync(outputFile, output, "utf-8");
    console.log(`✅ Tipos generados en ${outputFile}`);
}

// Ejecutar
generateTypes("./deployer-app.sqlite", "./src/types/db-types.d.ts");
