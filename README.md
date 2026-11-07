# 🔗 Link Short

**Convierte URLs largas en enlaces cortos que puedes copiar, compartir y abrir desde cualquier dispositivo.**

Link Short es un acortador de enlaces con una interfaz centrada en una sola tarea. Pega una dirección, pulsa **Acortar** y recibe un enlace listo para compartir. Firestore conserva el destino y la aplicación lo recupera cuando alguien visita la URL corta.

El diseño combina tarjetas claras con un fondo azul noche, luces difusas y movimiento suave. Incluye estados de carga, mensajes de error y controles accesibles para crear y copiar enlaces.

[Abrir la aplicación](https://link-short-k.vercel.app/) · [Configuración local](#configuración-local) · [API](#api) · [Despliegue](#despliegue-en-vercel)

![Link Short — Acorta tu enlace](src/app/opengraph-image.jpg)

## ✨ Funcionalidades

- Acortamiento de URLs absolutas HTTP y HTTPS.
- Códigos de ocho caracteres generados con aleatoriedad criptográfica.
- Almacenamiento persistente en Firestore y creación atómica para resolver colisiones.
- Redirecciones temporales 307 al destino original.
- Copia al portapapeles con alternativa manual cuando el navegador restringe el acceso.
- Botón **Limpiar** para vaciar el campo original y devolverle el foco.
- Límite de 10 solicitudes válidas por minuto y por IP en Vercel.
- Interfaz adaptable, mensajes accesibles y animación compatible con movimiento reducido.
- Favicon y metadatos Open Graph y Twitter con imagen optimizada para compartir.

## 🧩 Tecnologías

| Tecnología | Uso |
| --- | --- |
| Next.js 16 y React 19 | Interfaz, App Router y endpoints del servidor |
| TypeScript | Tipado de componentes y lógica del servidor |
| Tailwind CSS 4 | Estilos y diseño adaptable |
| Firebase Admin y Firestore | Persistencia y transacciones desde el servidor |
| Vercel | Despliegue y alojamiento |
| Node.js Test Runner | Pruebas de creación, redirección y límites |

## 🚀 Configuración local

Necesitas **Node.js 24**, npm y un proyecto de Firebase con una base Firestore Standard cuyo ID sea **(default)**.

### 1. Instala el proyecto

~~~sh
git clone https://github.com/Key0817/LinkShort.git
cd LinkShort
npm ci
~~~

### 2. Configura las variables

Copia [.env.example](.env.example) como `.env.local`. En PowerShell puedes ejecutar el siguiente comando.

~~~powershell
Copy-Item .env.example .env.local
~~~

Completa los valores de tu entorno.

| Variable | Descripción |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Campo project_id de la cuenta de servicio |
| `FIREBASE_CLIENT_EMAIL` | Campo client_email de la cuenta de servicio |
| `FIREBASE_PRIVATE_KEY` | Clave PEM completa de la cuenta de servicio |
| `APP_BASE_URL` | Origen de los enlaces, por ejemplo http://localhost:3000 |
| `RATE_LIMIT_SECRET` | Cadena aleatoria privada de al menos 32 caracteres |

En Firebase, genera la clave desde **Configuración del proyecto → Cuentas de servicio**. Usa una asignación por línea en `.env.local`, con comillas si el valor las necesita y sin comas al final. La clave privada admite saltos de línea reales o escapados como `\n`.

Para generar un secreto puedes usar Node.js desde la terminal y copiar el resultado a `RATE_LIMIT_SECRET`.

~~~sh
node -p "require('node:crypto').randomBytes(32).toString('hex')"
~~~

Las credenciales se utilizan en módulos exclusivos del servidor. Guarda `.env.local` fuera de Git y reinicia el servidor después de modificarlo.

### 3. Prepara y comprueba Firestore

Publica el contenido de [firestore.rules](firestore.rules) desde la pestaña **Reglas** de Firestore. Estas reglas bloquean el acceso directo de clientes. Firebase Admin accede mediante los permisos IAM de la cuenta de servicio.

~~~sh
npm run check:firestore
~~~

El comando crea un documento temporal, verifica su lectura y lo elimina. La cuenta de servicio necesita permisos de lectura, escritura y eliminación.

### 4. Inicia la aplicación

~~~sh
npm run dev
~~~

Abre [localhost:3000](http://localhost:3000), ingresa una URL y pulsa **Acortar**. Después podrás copiar el enlace generado o abrirlo en otra pestaña.

## ⚙️ Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila para producción con Webpack |
| `npm start` | Sirve la compilación de producción |
| `npm run lint` | Comprueba las reglas de ESLint |
| `npm test` | Ejecuta las pruebas con persistencia simulada |
| `npm run check:firestore` | Comprueba escritura y lectura en Firestore real |

## 🔌 API

### Crear un enlace

`POST /api/links` recibe JSON con el campo `url`.

~~~json
{
  "url": "https://example.com/pagina"
}
~~~

Una respuesta correcta devuelve **201**. Este es un ejemplo de su estructura.

~~~json
{
  "code": "aB3dE7_f",
  "shortUrl": "http://localhost:3000/aB3dE7_f",
  "destinationUrl": "https://example.com/pagina"
}
~~~

Para probarlo desde PowerShell con el servidor local activo puedes ejecutar lo siguiente.

~~~powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/links' -ContentType 'application/json' -Body '{"url":"https://example.com/pagina"}'
~~~

### Abrir un enlace

`GET /[code]` consulta Firestore y devuelve **307** con el destino en la cabecera `Location`. Un código desconocido o con formato inválido devuelve **404**.

| Estado | Significado |
| --- | --- |
| 201 | Enlace creado |
| 307 | Redirección temporal al destino |
| 400 | JSON o URL de entrada inválidos |
| 404 | Código desconocido o inválido |
| 429 | Cuota agotada, con espera indicada en Retry-After |
| 500 | Fallo de configuración, consulta o almacenamiento |
| 503 | Se agotaron los cinco intentos de generación por colisiones |

## 🗄️ Persistencia y límites

Los documentos `links/{code}` contienen `destinationUrl` y `createdAt`, una fecha asignada por Firestore. La creación atómica conserva los documentos existentes si un código colisiona.

La colección `linkRateLimits` mantiene contadores mediante transacciones. Cada ventana dura 60 segundos desde la primera solicitud y admite 10 intentos que pasan la validación. Estos consumen cuota aunque la creación del enlace falle después. El contador guarda un identificador HMAC de la IP, la cantidad y la fecha de reinicio.

En Vercel se utiliza la cabecera `x-vercel-forwarded-for`. En desarrollo local todas las peticiones comparten una cuota. Si falta el secreto o falla el contador, la API devuelve 500.


