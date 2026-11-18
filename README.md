# Gestión de Productos

Aplicación web para administrar un catálogo de productos. Los usuarios se registran, inician y cierran sesión, y con sesión activa pueden ver, agregar, modificar y eliminar productos. Cada producto solo lo puede modificar o eliminar quien lo registró.

**Aplicación en línea:** https://gestion-productos-jet.vercel.app

**Tecnologías:** Node.js, Express, MongoDB con Mongoose, JWT, bcryptjs, Jest y Supertest. Despliegue en Vercel con GitHub Actions.

## Estructura

```
api/index.js                  Función serverless de Vercel (usa src/app.js)
server.js                     Ejecución local
src/
  app.js                      Express: middleware, rutas y manejo de errores
  config/env.js               Variables de entorno
  config/db.js                Conexión a MongoDB reutilizable
  models/                     Usuario, Producto y TokenRevocado
  controllers/                Lógica de autenticación y de productos
  routes/                     Endpoints de /api/auth y /api/productos
  middleware/                 JWT, validaciones, conexión a la BD y errores
public/                       Vistas estáticas: login (index.html) y productos.html
tests/unit/                   Pruebas unitarias de controladores y middleware
tests/integration/            Pruebas de rutas con MongoDB en memoria
scripts/                      MongoDB local y datos de ejemplo
.github/workflows/ci-cd.yml   Pipeline: pruebas y despliegue
vercel.json                   Envía /api/* a la función de Express
docs/diagrama-er.png          Diagrama entidad-relación
```

## Ejecutar en local

Requiere Node.js 18 o superior.

```bash
npm install
copy .env.example .env
```

Edita `.env` con un `JWT_SECRET` propio. Luego, en una terminal, inicia MongoDB (omite este paso si ya tienes MongoDB instalado):

```bash
npm run db
```

En otra terminal, carga los datos de ejemplo e inicia el servidor:

```bash
npm run seed
npm start
```

Abre http://localhost:3000 y entra con `SEED_EMAIL` y `SEED_PASSWORD`.

## Pruebas

```bash
npm test
```

Ejecuta las pruebas unitarias (controladores y middleware con modelos simulados) y las de rutas (la app completa contra un MongoDB en memoria). Para ver la cobertura: `npm test -- --coverage`.

## API

Todas las rutas parten de `/api` y responden JSON. Las protegidas exigen el encabezado `Authorization: Bearer <token>`.

| Método | Ruta | Token | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Crea un usuario y devuelve un token |
| POST | `/auth/login` | No | Inicia sesión y devuelve un token |
| POST | `/auth/logout` | Sí | Cierra la sesión: el token deja de ser válido |
| GET | `/auth/perfil` | Sí | Datos del usuario de la sesión |
| GET | `/productos` | Sí | Lista productos. Filtros: `?q=` y `?categoria=` |
| GET | `/productos/:id` | Sí | Obtiene un producto |
| POST | `/productos` | Sí | Crea un producto |
| PUT | `/productos/:id` | Sí | Actualiza un producto (solo quien lo creó) |
| DELETE | `/productos/:id` | Sí | Elimina un producto (solo quien lo creó) |

Cuerpo de un producto:

```json
{
  "nombre": "Mouse ergonómico",
  "descripcion": "Inalámbrico, 6 botones",
  "precio": 459.9,
  "stock": 15,
  "categoria": "Electrónica"
}
```

Categorías: Electrónica, Hogar, Ropa, Alimentos, Papelería, Deportes y Otros.

## Despliegue (CI/CD)

- **CI con GitHub Actions** (`.github/workflows/ci-cd.yml`): en cada push y pull request instala dependencias y ejecuta Jest.
- **CD con Vercel:** el proyecto está conectado al repositorio. Cada push a `main` genera un despliegue de producción automático, y cada pull request, un despliegue de vista previa.
- **Despliegue por CLI (opcional):** el mismo workflow incluye un trabajo que publica con la CLI de Vercel solo si las pruebas pasan. Se activa al agregar en GitHub (**Settings → Secrets and variables → Actions**) los secretos `VERCEL_TOKEN`, `MONGODB_URI` y `JWT_SECRET`; sin ellos se omite.

En Vercel, las variables `MONGODB_URI` y `JWT_SECRET` se configuran en **Settings → Environment Variables**. En MongoDB Atlas, **Network Access** debe permitir `0.0.0.0/0`, porque Vercel no tiene una IP fija.
