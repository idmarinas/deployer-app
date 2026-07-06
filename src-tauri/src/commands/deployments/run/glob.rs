//! Matcher glob mínimo (sin dependencias externas) para los patrones
//! `exclude` de `PathMapping`. Soporta únicamente `*` (0+ caracteres) y `?`
//! (1 carácter) — suficiente para exclusiones típicas de deploy
//! (`node_modules`, `.git`, `*.log`, `.env*`).
//!
//! Se compara contra el NOMBRE de la entrada (archivo/directorio), no contra
//! la ruta completa, replicando cómo funcionan `.gitignore`/rsync --exclude
//! para patrones sin `/`.

/// Devuelve true si `name` coincide con `pattern`.
pub fn glob_match(pattern: &str, name: &str) -> bool {
    match_recursive(pattern.as_bytes(), name.as_bytes())
}

/// Devuelve true si `name` coincide con alguno de los `patterns`.
pub fn matches_any(patterns: &[String], name: &str) -> bool {
    patterns.iter().any(|p| glob_match(p, name))
}

fn match_recursive(pattern: &[u8], text: &[u8]) -> bool {
    match (pattern.first(), text.first()) {
        (None, None) => true,
        (None, Some(_)) => false,
        (Some(b'*'), _) => {
            // '*' coincide con 0 caracteres (avanzar patrón) o con 1+ (avanzar texto)
            match_recursive(&pattern[1..], text)
                || (!text.is_empty() && match_recursive(pattern, &text[1..]))
        }
        (Some(b'?'), Some(_)) => match_recursive(&pattern[1..], &text[1..]),
        (Some(b'?'), None) => false,
        (Some(pc), Some(tc)) if pc == tc => match_recursive(&pattern[1..], &text[1..]),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_match() {
        assert!(glob_match("node_modules", "node_modules"));
        assert!(!glob_match("node_modules", "node_modules2"));
    }

    #[test]
    fn wildcard_suffix() {
        assert!(glob_match("*.log", "app.log"));
        assert!(glob_match("*.log", ".log"));
        assert!(!glob_match("*.log", "app.log.bak"));
    }

    #[test]
    fn wildcard_prefix() {
        assert!(glob_match(".env*", ".env"));
        assert!(glob_match(".env*", ".env.local"));
        assert!(!glob_match(".env*", "env"));
    }

    #[test]
    fn question_mark() {
        assert!(glob_match("file?.txt", "file1.txt"));
        assert!(!glob_match("file?.txt", "file12.txt"));
    }

    #[test]
    fn matches_any_list() {
        let patterns = vec!["node_modules".to_string(), "*.log".to_string()];
        assert!(matches_any(&patterns, "node_modules"));
        assert!(matches_any(&patterns, "debug.log"));
        assert!(!matches_any(&patterns, "src"));
    }
}
