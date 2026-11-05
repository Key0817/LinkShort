# Link Short

Acortador de enlaces con Next.js App Router, TypeScript y Tailwind CSS. Firestore almacenará los enlaces y Vercel alojará la aplicación. El alcance inicial es crear, copiar y abrir enlaces cortos.

## Desarrollo local

Requiere Node.js 24 y npm. Desde la raíz del proyecto, ejecuta:

```sh
npm install
npm run dev
```

Abre [localhost:3000](http://localhost:3000). La primera etapa muestra las tarjetas de entrada y resultado. El botón se habilitará al conectar el flujo de creación. Esta etapa funciona sin credenciales de Firebase.

```sh
npm run lint
npm run build
```

## Estructura inicial

| Ruta | Responsabilidad |
| --- | --- |
| `src/app/page.tsx` | Pantalla principal con las dos tarjetas |
| `src/app/layout.tsx` | Layout global y metadatos |
| `src/app/globals.css` | Entrada de Tailwind CSS |
| `.env.example` | Variables previstas para la integración |

## Etapas

| Etapa | Trabajo | Criterio de cierre |
| --- | --- | --- |
| 1. Base | Configurar Next.js, TypeScript, Tailwind y ESLint. Maquetar la pantalla. | La página carga y pasan las comprobaciones de lint y compilación. |
| 2. Persistencia | Configurar Firestore y Firebase Admin SDK en el servidor. Crear `links/{code}` con `destinationUrl` y `createdAt`. | Se puede crear y leer un enlace en el entorno de desarrollo con el SDK del servidor. |
| 3. Creación | Implementar `POST /api/links`. Validar URL absolutas HTTP/HTTPS en servidor. Generar códigos aleatorios con el generador criptográfico de Node.js y usar creación atómica con reintentos acotados si el código existe. | Una URL válida devuelve `201` con el enlace corto. Las entradas inválidas devuelven `400` y las colisiones conservan el enlace anterior. |
| 4. Redirección | Implementar `GET /[code]` para consultar Firestore. | Un código válido devuelve una redirección temporal `307`. Un código desconocido devuelve `404`. |
| 5. Interfaz funcional | Conectar el formulario, mostrar estados de carga, error y éxito, y permitir copiar el enlace. | Desde la pantalla se puede crear, copiar y abrir un enlace que lleva al destino correcto. |
| 6. Lanzamiento | Limitar solicitudes de creación, probar el flujo y configurar las variables privadas y la URL pública en Vercel. | El flujo completo funciona en el despliegue y se verifica el límite de solicitudes. |

Las credenciales se cargarán en `.env.local` para desarrollo y en las variables de entorno de Vercel para el despliegue. El SDK se inicializará solo desde módulos del servidor. `APP_BASE_URL` definirá el origen de los enlaces devueltos por la API.

## Referencias

- [Next.js App Router](https://nextjs.org/docs/app/getting-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Entornos de Vercel](https://vercel.com/docs/deployments/environments)
