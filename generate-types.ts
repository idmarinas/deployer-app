import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";

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
    const type = sqlType.toUpperCase().trim();

    // BOOLEAN → boolean
    if (type.includes("BOOLEAN")) return "boolean";

    // INTEGERS
    if (type.includes("INT")) return "number";

    // TIMESTAMPS → Date
    if (type.includes("TIMESTAMP") || type.includes("DATE")) return "Date";

    // TEXTO
    if (type.includes("CHAR") || type.includes("CLOB") || type.includes("TEXT")) return "string";

    // BLOB
    if (type.includes("BLOB")) return "Buffer";

    // NÚMEROS DECIMALES
    if (type.includes("REAL") || type.includes("FLOA") || type.includes("DOUB")) return "number";
    if (type.includes("NUMERIC") || type.includes("DECIMAL")) return "number";

    return "any";
}

// Lee todas las migraciones UP en orden
function getAllMigrationsSQL(migrationsDir: string): string {
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith(".up.sql"))
        .sort(); // Orden alfabético garantiza orden de versión

    let allSQL = "";

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        console.log(`📄 Leyendo migración: ${file}`);
        allSQL += "\n" + content;
    }

    return allSQL;
}

// Parsea el SQL para obtener información más precisa de NOT NULL
function parseSQLSchema(sqlContent: string): Map<string, Map<string, { type: string; notNull: boolean }>> {
    const schema = new Map();

    // Expresión regular para encontrar CREATE TABLE
    const tableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(sqlContent)) !== null) {
        const tableName = tableMatch[1];
        const tableBody = tableMatch[2];
        const columns = new Map();

        // Dividir por líneas
        const lines = tableBody.split("\n");

        for (const line of lines) {
            // Saltar líneas vacías y comentarios
            if (!line.trim() || line.trim().startsWith("--")) continue;

            // Detectar si es una línea de columna (no de constraint)
            const columnMatch = /^\s*(\w+)\s+([A-Z\s()]+?)(?:\s+CONSTRAINT|\s+NOT\s+NULL|\s+DEFAULT|\s+CHECK|\s+UNIQUE|,|$)/i.exec(line);

            if (columnMatch) {
                const colName = columnMatch[1];
                const colType = columnMatch[2].trim();
                const notNull = /NOT\s+NULL/i.test(line);

                // Saltarse constraints que no son columnas
                if (!["CONSTRAINT", "PRIMARY", "UNIQUE", "FOREIGN", "CHECK"].includes(colName.toUpperCase())) {
                    columns.set(colName, { type: colType, notNull });
                }
            }
        }

        if (columns.size > 0) {
            schema.set(tableName, columns);
        }
    }

    return schema;
}

function generateTypes(dbPath: string, migrationsDir: string, outputFile: string) {
    const db = new Database(dbPath, { readonly: true });

    // Leer todas las migraciones en orden
    console.log(`📂 Leyendo migraciones desde: ${migrationsDir}`);
    const allSQL = getAllMigrationsSQL(migrationsDir);

    // Parsear el SQL combinado para obtener información precisa
    const sqlSchema = parseSQLSchema(allSQL);

    const tables = db
        .query<{ name: string }>(
            `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`
        )
        .all();

    let output = "// Auto-generado desde la BD SQLite\n";
    output += "// ⚠️ NO EDITAR MANUALMENTE - Regenerar con: bun run generate-types.ts\n";
    output += `// Generado desde migraciones en: ${migrationsDir}\n\n`;

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

            // Usar información del SQL parseado si está disponible
            let notNull = col.notnull === 1;
            const sqlTableSchema = sqlSchema.get(tableName);
            if (sqlTableSchema && sqlTableSchema.has(col.name)) {
                notNull = sqlTableSchema.get(col.name)!.notNull;
            }

            const optional = notNull ? "" : "?";
            output += `  ${col.name}${optional}: ${tsType};\n`;
        }

        // Relaciones con nombres únicos
        const usedNames = new Set<string>();
        for (const fk of fks) {
            let relationName = toCamelCase(fk.from.replace(/_id$/, ""));
            if (usedNames.has(relationName)) {
                relationName = toCamelCase(fk.from);
            }
            usedNames.add(relationName);

            output += `  ${relationName}?: ${toPascalCase(fk.table)}; // FK → ${fk.table}.${fk.to}\n`;
        }

        output += "}\n\n";
    }

    fs.writeFileSync(outputFile, output, "utf-8");
    console.log(`✅ Tipos generados en ${outputFile}`);
    console.log(`📊 Total de tablas: ${tables.length}`);
}

// Ejecutar
const migrationsDir = "./src-tauri/migrations";
const dbPath = "./deployer-app.sqlite";
const outputFile = "./src/types/db-types.d.ts";

if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Directorio de migraciones no encontrado: ${migrationsDir}`);
    process.exit(1);
}

generateTypes(dbPath, migrationsDir, outputFile);