# Guía de introducción a Rust (para desarrolladores PHP/Symfony)

Esta guía asume que conoces PHP y Symfony, pero nunca has tocado Rust. Iremos comparando conceptos de Rust con sus equivalentes (o lo más parecido) en el mundo PHP.

---

## 1. ¿Qué es Rust y por qué es tan distinto a PHP?

PHP es un lenguaje **interpretado**, con **tipado dinámico** y con un **recolector de basura (garbage collector)** que libera memoria automáticamente.

Rust es un lenguaje **compilado**, con **tipado estático** fuerte, y **sin recolector de basura**. En su lugar, usa un sistema llamado **ownership (propiedad)** que el compilador verifica en tiempo de compilación para garantizar que la memoria se libera de forma segura, sin necesidad de un runtime que la vigile.

Esto significa:
- No hay `php artisan serve` ni un servidor que interprete el código en cada petición: Rust se compila a un binario nativo.
- Muchos errores que en PHP solo verías en producción (null, tipos incorrectos, condiciones de carrera) en Rust **no compilan**. El compilador es muy estricto pero muy útil.
- No hay excepciones (`try/catch`) como en PHP. Los errores se gestionan con tipos de retorno especiales (lo veremos más abajo).

---

## 2. Instalación y "Hola mundo"

Instalación (equivalente a instalar PHP + Composer):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Esto instala:
- `rustc`: el compilador (como el propio intérprete `php`)
- `cargo`: el gestor de paquetes y proyectos (el equivalente a **Composer**)

Crear un proyecto nuevo (equivalente a `composer init` / `symfony new`):

```bash
cargo new mi_proyecto
cd mi_proyecto
```

Esto genera:

```
mi_proyecto/
├── Cargo.toml     # como tu composer.json
└── src/
    └── main.rs    # el punto de entrada
```

El "Hola mundo" (`src/main.rs`):

```rust
fn main() {
    println!("Hola mundo");
}
```

Ejecutarlo:

```bash
cargo run
```

`cargo run` compila y ejecuta, similar a como `php archivo.php` interpreta y ejecuta al vuelo. La diferencia es que Rust genera un binario compilado en `target/`.

### ¿Qué es el `!` en `println!`?

Ese `!` indica que `println` no es una función normal, sino una **macro**: código que se expande en tiempo de compilación antes de compilar el programa de verdad. El compilador sustituye `println!(...)` por el código real que hace el trabajo.

`println!` necesita aceptar un número variable de argumentos de tipos distintos y comprobar que el formato coincide con ellos, algo que una función normal de Rust no puede hacer:

```rust
println!("Hola {}, tienes {} años", nombre, edad);
```

Aquí `{}` son placeholders (parecido a `sprintf` o a las plantillas Twig `{{ }}`). El compilador verifica, **en tiempo de compilación**, que el número de `{}` coincide con el número de argumentos y que sus tipos son formateables. Si te equivocas, el programa no compila; no falla en tiempo de ejecución como pasaría con `printf` en PHP.

Otras macros comunes que verás:
- `vec![1, 2, 3]` → crea un `Vec` (como `[1, 2, 3]` en PHP)
- `format!("...")` → como `println!` pero devuelve un `String` en vez de imprimirlo
- `assert_eq!(a, b)` → para tests

Regla práctica: si ves un `!` pegado a un nombre, es una macro, no una función. Se usan de forma muy parecida a las funciones, solo que con más "magia" en tiempo de compilación.

### Cómo se crea y se usa una macro propia

Crear tus propias macros es bastante más avanzado que crear funciones, y como principiante rara vez lo necesitarás (se usan sobre todo para generar código repetitivo). Aun así, para que veas cómo funciona: se definen con `macro_rules!`.

```rust
macro_rules! saludar {
    () => {
        println!("Hola desde una macro");
    };
}

fn main() {
    saludar!(); // se usa igual que println!, con el !
}
```

Una macro algo más útil, que acepta un argumento (aquí `$nombre` es un "patrón" que captura una expresión):

```rust
macro_rules! saludar {
    ($nombre:expr) => {
        println!("Hola, {}", $nombre);
    };
}

fn main() {
    saludar!("Iván"); // Hola, Iván
}
```

Diferencias clave respecto a una función:
- Una función se ejecuta en tiempo de ejecución; una macro se **expande** (se sustituye por código) en tiempo de compilación, antes de que el programa exista como binario.
- Una macro puede aceptar un número variable de argumentos (como hace `println!`); una función normal en Rust no puede.
- No hay equivalente directo en PHP: lo más parecido conceptualmente serían los atributos de PHP o la generación de código en tiempo de build de algunos frameworks, pero PHP no tiene nada que se ejecute en una fase de "compilación" previa como esta.

Como principiante, con saber **usar** macros ya existentes (`println!`, `vec!`, `format!`) es más que suficiente. Crear las tuyas propias es un tema para cuando ya domines lo básico del lenguaje.

---

## 3. Variables: inmutables por defecto

En PHP, cualquier variable se puede reasignar libremente:

```php
$nombre = "Iván";
$nombre = "Otro nombre"; // sin problema
```

En Rust, las variables son **inmutables por defecto**:

```rust
let nombre = "Iván";
nombre = "Otro nombre"; // ❌ ERROR de compilación
```

Si quieres que sea modificable, debes indicarlo explícitamente con `mut`:

```rust
let mut nombre = "Iván";
nombre = "Otro nombre"; // ✅ Ahora sí
```

Esta inmutabilidad por defecto es una decisión de diseño de Rust: reduce errores por variables que cambian de valor sin que te des cuenta.

---

## 4. Tipos: aquí no hay tipado dinámico

En PHP puedes hacer esto sin que nada se queje al escribir el código (aunque falle en tiempo de ejecución):

```php
$edad = 25;
$edad = "veinticinco"; // válido en PHP puro, sin tipado estricto
```

En Rust, el tipo de una variable se fija y no puede cambiar. Aunque no siempre hace falta escribirlo (el compilador lo infiere), siempre existe:

```rust
let edad: i32 = 25;       // entero de 32 bits
let nombre: &str = "Iván"; // cadena de texto (slice)
let precio: f64 = 9.99;    // número decimal
let activo: bool = true;
```

Tipos básicos más comunes:

| PHP | Rust | Descripción |
|---|---|---|
| `int` | `i32`, `i64`, `u32`... | Enteros (con o sin signo, distintos tamaños) |
| `float` | `f32`, `f64` | Decimales |
| `string` | `String` / `&str` | Cadenas de texto (dos variantes, ver punto 6) |
| `bool` | `bool` | Booleano |
| `array` | `Vec<T>`, `[T; N]` | Colecciones |

---

## 5. Funciones

En PHP (con tipado, como sueles usar en Symfony):

```php
function sumar(int $a, int $b): int
{
    return $a + $b;
}
```

En Rust:

```rust
fn sumar(a: i32, b: i32) -> i32 {
    a + b // sin punto y coma = valor de retorno (equivalente a "return a + b;")
}
```

Detalle importante: en Rust, si la última línea de una función **no lleva punto y coma**, se convierte automáticamente en el valor devuelto. Es una particularidad del lenguaje que al principio resulta rara viniendo de PHP, donde el `return` es siempre explícito.

### Cómo se crea y se usa una función paso a paso

Crear una función se hace con la palabra clave `fn`, seguida del nombre, los parámetros entre paréntesis (con su tipo obligatorio) y, si devuelve algo, una flecha `->` con el tipo de retorno:

```rust
fn saludar(nombre: &str) -> String {
    format!("Hola, {}", nombre)
}
```

- `nombre: &str` → parámetro llamado `nombre`, de tipo `&str` (texto de solo lectura)
- `-> String` → la función devuelve un `String`
- La última línea sin `;` es el valor devuelto (equivalente a `return format!(...)`)

Para usarla, la llamas igual que en PHP, por nombre y con sus argumentos:

```rust
fn main() {
    let mensaje = saludar("Iván");
    println!("{}", mensaje); // Hola, Iván
}
```

Si la función no devuelve nada (equivalente a `void` en PHP), simplemente omites el `->`:

```rust
fn imprimir_saludo(nombre: &str) {
    println!("Hola, {}", nombre);
}
```

En PHP esto sería:

```php
function saludar(string $nombre): string
{
    return "Hola, $nombre";
}

echo saludar("Iván");
```

La diferencia principal es que en Rust los tipos de los parámetros **siempre** son obligatorios (no hay equivalente sin tipar), mientras que en PHP tipar es opcional aunque recomendable.

---

## 6. Strings: la parte que más confunde al venir de PHP

En PHP, un string es un string y punto. En Rust hay **dos tipos principales**:

- `&str`: una referencia a texto, normalmente de solo lectura (por ejemplo, texto literal `"hola"`).
- `String`: un texto que posees tú, que vive en el "heap" y que puedes modificar/hacer crecer.

```rust
let saludo: &str = "Hola";           // referencia inmutable de texto
let mut nombre: String = String::from("Iván"); // string propio, modificable

nombre.push_str(" García"); // ahora sí puedes concatenar/modificar
```

Regla práctica al principio: usa `String` cuando necesites poseer y modificar el texto (como al construir una respuesta), y `&str` cuando solo necesites leerlo (como parámetros de función que no van a modificar el texto).

---

## 7. El concepto clave: Ownership (propiedad)

Esto **no existe en PHP** y es lo más importante de entender en Rust.

En PHP, cuando pasas una variable a una función o la asignas a otra, no te preocupas por quién "posee" el valor; el garbage collector se encarga de todo:

```php
$a = "hola";
$b = $a;
echo $a; // funciona sin problema, $a sigue existiendo
```

En Rust, cada valor tiene **un único dueño** en cada momento. Si asignas ese valor a otra variable (para tipos como `String`), la propiedad **se mueve**, y la variable original deja de ser válida:

```rust
let a = String::from("hola");
let b = a; // la propiedad de "hola" se mueve de a a b

println!("{}", a); // ❌ ERROR: a ya no es válida
println!("{}", b); // ✅ esto sí funciona
```

Si quieres seguir usando `a`, tienes dos opciones:

**Opción 1: clonar (como copiar el valor, similar a lo que hace PHP implícitamente)**

```rust
let a = String::from("hola");
let b = a.clone();

println!("{}", a); // ✅ ahora sí funciona, son dos copias independientes
println!("{}", b);
```

**Opción 2: prestar (borrowing), pasando una referencia en lugar de mover la propiedad**

```rust
fn imprimir(texto: &String) {
    println!("{}", texto);
}

let a = String::from("hola");
imprimir(&a); // le "prestamos" a, sin transferir la propiedad
println!("{}", a); // ✅ a sigue siendo válida aquí
```

El símbolo `&` indica que se está pasando una **referencia** (un préstamo), no el valor en sí. Esto es lo que permite a Rust garantizar seguridad de memoria sin garbage collector: el compilador comprueba en tiempo de compilación que nunca haya dos dueños del mismo valor a la vez, ni referencias a datos ya liberados.

Esto es exigente al principio, pero evita categorías enteras de bugs (referencias colgantes, condiciones de carrera) que en PHP simplemente no existen porque el runtime gestiona todo por ti, con el coste de rendimiento que eso conlleva.

---

## 8. Sin `null`, sin excepciones: `Option` y `Result`

### Adiós a los null checks

En PHP (aunque uses tipos, `null` siempre puede colarse si no usas tipos estrictos o si algo devuelve `?string`):

```php
function buscarUsuario(int $id): ?Usuario
{
    // puede devolver null
}
```

En Rust no existe `null`. En su lugar, se usa el tipo `Option<T>`, que solo puede ser una de estas dos cosas:

- `Some(valor)`: hay un valor
- `None`: no hay valor

```rust
fn buscar_usuario(id: i32) -> Option<String> {
    if id == 1 {
        Some(String::from("Iván"))
    } else {
        None
    }
}

fn main() {
    let resultado = buscar_usuario(1);

    match resultado {
        Some(nombre) => println!("Usuario encontrado: {}", nombre),
        None => println!("Usuario no encontrado"),
    }
}
```

El compilador **te obliga** a gestionar ambos casos. No hay forma de "olvidarte" de comprobar si es `null`, como sí puede pasar en PHP.

### Adiós a las excepciones (`try/catch`)

En PHP, para gestionar errores usas excepciones:

```php
try {
    $resultado = dividir(10, 0);
} catch (DivisionByZeroError $e) {
    echo "Error: " . $e->getMessage();
}
```

En Rust, los errores recuperables se gestionan con el tipo `Result<T, E>`, que puede ser:

- `Ok(valor)`: la operación fue bien
- `Err(error)`: la operación falló

```rust
fn dividir(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err(String::from("No se puede dividir entre cero"))
    } else {
        Ok(a / b)
    }
}

fn main() {
    match dividir(10.0, 0.0) {
        Ok(resultado) => println!("Resultado: {}", resultado),
        Err(mensaje) => println!("Error: {}", mensaje),
    }
}
```

De nuevo, el compilador te obliga a gestionar el caso de error explícitamente. No puedes "olvidarte" de un `catch` como a veces pasa en PHP.

---

## 9. Estructuras y comportamiento: no hay clases, hay `struct` + `impl`

Symfony vive de las clases y la orientación a objetos clásica. Rust **no tiene clases** en el sentido de PHP. En su lugar:

- `struct`: define los datos (como las propiedades de una clase)
- `impl`: define el comportamiento (como los métodos de una clase)

Comparación directa. En PHP:

```php
class Usuario
{
    public function __construct(
        private string $nombre,
        private int $edad
    ) {}

    public function saludar(): string
    {
        return "Hola, soy {$this->nombre}";
    }
}

$usuario = new Usuario("Iván", 30);
echo $usuario->saludar();
```

En Rust:

```rust
struct Usuario {
    nombre: String,
    edad: u32,
}

impl Usuario {
    // equivalente a un "método estático" / factoría, similar a un named constructor
    fn nuevo(nombre: String, edad: u32) -> Usuario {
        Usuario { nombre, edad }
    }

    // método de instancia (equivalente a un método público de la clase)
    fn saludar(&self) -> String {
        format!("Hola, soy {}", self.nombre)
    }
}

fn main() {
    let usuario = Usuario::nuevo(String::from("Iván"), 30);
    println!("{}", usuario.saludar());
}
```

Notas:
- `&self` es como `$this`, pero explícito y "prestado" (no se toma posesión del objeto).
- No hay herencia entre `struct`. Rust favorece la **composición** y los **traits** (lo más parecido a las interfaces de PHP) en lugar de la herencia clásica.

---

## 10. Traits ≈ interfaces de PHP

En PHP, con Symfony usas interfaces constantemente:

```php
interface Notificable
{
    public function notificar(string $mensaje): void;
}

class Email implements Notificable
{
    public function notificar(string $mensaje): void
    {
        echo "Enviando email: $mensaje";
    }
}
```

En Rust, el equivalente son los **traits**:

```rust
trait Notificable {
    fn notificar(&self, mensaje: &str);
}

struct Email;

impl Notificable for Email {
    fn notificar(&self, mensaje: &str) {
        println!("Enviando email: {}", mensaje);
    }
}
```

Conceptualmente es prácticamente lo mismo que una interfaz de PHP: defines un "contrato" de comportamiento que distintos tipos pueden implementar.

---

## 11. Gestión de paquetes: Cargo ≈ Composer

| Composer (PHP) | Cargo (Rust) |
|---|---|
| `composer.json` | `Cargo.toml` |
| `composer.lock` | `Cargo.lock` |
| `composer require paquete` | `cargo add paquete` |
| `composer install` | `cargo build` |
| `vendor/` | `target/` (compilado, no solo dependencias) |
| Packagist | crates.io |

Ejemplo de `Cargo.toml`:

```toml
[package]
name = "mi_proyecto"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = "1.0"
```

---

## 12. El compilador como aliado (no como enemigo)

Un cambio de mentalidad importante viniendo de PHP: en Rust, si el código compila, ya has eliminado de raíz muchísimos bugs típicos (nulls inesperados, referencias inválidas, tipos incompatibles). El compilador de Rust es famoso por dar **mensajes de error muy detallados**, a menudo sugiriendo directamente cómo arreglar el problema.

Al principio vas a "pelear con el compilador" mucho más que con PHP. Es normal y esperado: esa fricción inicial es la que luego se traduce en menos bugs en producción.

---

## 13. Resumen de diferencias clave

| Concepto | PHP | Rust |
|---|---|---|
| Ejecución | Interpretado | Compilado a binario nativo |
| Tipado | Dinámico (u opcional estricto) | Estático y obligatorio |
| Memoria | Garbage collector | Ownership + borrowing (sin GC) |
| Variables | Mutables por defecto | Inmutables por defecto (`mut` para cambiar) |
| Valores ausentes | `null` | `Option<T>` (`Some` / `None`) |
| Errores | Excepciones (`try/catch`) | `Result<T, E>` (`Ok` / `Err`) |
| Objetos | Clases con herencia | `struct` + `impl` + `traits` (composición) |
| Gestor de paquetes | Composer | Cargo |

---

## 14. Próximos pasos sugeridos

1. Instala Rust y ejecuta el "Hola mundo" de esta guía.
2. Practica el concepto de ownership con ejercicios pequeños (es, con diferencia, lo más distinto a PHP).
3. Familiarízate con `Option` y `Result` haciendo pequeñas funciones que puedan fallar.
4. Crea un `struct` con un par de métodos y un `trait` sencillo.
5. Cuando te sientas cómodo con lo anterior, el libro oficial ["The Rust Programming Language"](https://doc.rust-lang.org/book/) (conocido como "el libro del cangrejo") es la referencia estándar y gratuita para seguir avanzando.
