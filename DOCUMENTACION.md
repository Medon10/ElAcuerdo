# Documentación Técnica — El Acuerdo S.A.

Sistema de gestión de planillas diarias para la empresa de transporte **El Acuerdo S.A.**
Permite a los choferes cargar sus planillas de recorridos y efectivo, y a los supervisores (admin) consultar, verificar y administrar esos datos.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Arquitectura](#2-arquitectura)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Backend — Estructura de carpetas](#4-backend--estructura-de-carpetas)
5. [Frontend — Estructura de carpetas](#5-frontend--estructura-de-carpetas)
6. [Esquema de base de datos](#6-esquema-de-base-de-datos)
7. [Flujo de autenticación](#7-flujo-de-autenticación)
8. [Flujo principal — Chofer](#8-flujo-principal--chofer)
9. [Flujo principal — Supervisor (Admin)](#9-flujo-principal--supervisor-admin)
10. [Notificaciones por email](#10-notificaciones-por-email)
11. [Variables de entorno](#11-variables-de-entorno)
12. [Scripts de desarrollo y despliegue](#12-scripts-de-desarrollo-y-despliegue)
13. [Endpoints de la API](#13-endpoints-de-la-api)

---

## 1. Visión general

La aplicación consta de dos partes:

| Componente | Descripción |
|---|---|
| **Backend** | API REST con Express 5 + TypeScript. Se comunica con una base de datos MySQL a través de MikroORM. |
| **Frontend** | SPA con React 18 + TypeScript + Vite. Se despliega de forma independiente (Vercel / estático). |

El **chofer** accede desde su dispositivo, carga los recorridos del día (hora, número de recorrido, importe) y el desglose de efectivo recolectado, y envía la planilla. El **supervisor** consulta las planillas por chofer y fecha, revisa diferencias entre recorridos y efectivo, y puede eliminar o gestionar registros.

---

## 2. Arquitectura

```
┌──────────────┐         HTTPS / JSON         ┌──────────────────┐
│   Frontend   │  ───────────────────────────▶ │     Backend      │
│  (React SPA) │  ◀─────────────────────────── │  (Express API)   │
└──────────────┘      Bearer JWT en header     └────────┬─────────┘
                                                        │
                                                        │ MikroORM / mysql2
                                                        ▼
                                                ┌──────────────┐
                                                │    MySQL     │
                                                │    (TiDB)    │
                                                └──────────────┘
                                                        │
                                      ┌─────────────────┼───────────────────┐
                                      ▼                 ▼                   ▼
                              ┌────────────┐   ┌──────────────┐   ┌────────────────┐
                              │  planilla   │   │  recorridos  │   │planilla_efectivo│
                              └────────────┘   └──────────────┘   └────────────────┘
                                      │
                                      ▼
                              ┌────────────┐
                              │   usuario   │
                              └────────────┘
```

---

## 3. Stack tecnológico

### Backend

| Tecnología | Versión | Propósito |
|---|---|---|
| Node.js | ≥ 18 | Runtime |
| Express | 5.x | Framework HTTP |
| TypeScript | 5.x | Tipado estático |
| MikroORM | 6.x (driver MySQL) | ORM / migraciones automáticas |
| mysql2 | (via MikroORM) | Driver MySQL nativo |
| bcryptjs / bcrypt | 3.x / 6.x | Hash de contraseñas |
| jsonwebtoken | 9.x | Firma y verificación JWT |
| nodemailer | 7.x | Envío email SMTP |
| @sendgrid/mail | 8.x | Envío email vía API SendGrid |
| dotenv | 17.x | Carga de variables de entorno |
| cors | 2.x | Configuración CORS |
| cookie-parser | 1.x | Lectura de cookies |
| multer | 2.x | Upload de archivos (preparado) |
| tsc-watch | 6.x (dev) | Recompilación automática |

### Frontend

| Tecnología | Versión | Propósito |
|---|---|---|
| React | 18.x | Librería de UI |
| React Router | 6.x | Rutas SPA |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.x | Bundler y dev server |
| Tailwind CSS | 4.x | Utilidades CSS |
| Lucide React | 0.562 | Iconos SVG |

---

## 4. Backend — Estructura de carpetas

```
backend/
├── package.json            # Dependencias y scripts npm
├── tsconfig.json           # Configuración TypeScript
├── render.yaml             # Definición de servicio para Render.com
├── docs/                   # Documentos de apoyo (SQL, propuesta, pagos)
├── public/uploads/         # Directorio para archivos subidos (multer)
├── scripts/                # Scripts utilitarios (test-total-dia.mjs)
└── src/
    ├── app.ts              # 🔑 Entry point principal
    ├── server.ts           # Shim que importa app.ts
    ├── env.ts              # Carga dotenv
    ├── db.ts               # Pool mysql2/promise (usado por auth)
    │
    ├── planilla/           # Módulo PLANILLA
    │   ├── planilla.entity.ts
    │   ├── planilla.controller.ts
    │   └── planilla.routes.ts
    │
    ├── recorrido/          # Módulo RECORRIDO
    │   ├── recorrido.entity.ts
    │   ├── recorrido.controller.ts
    │   └── recorrido.routes.ts
    │
    ├── planilla-efectivo/  # Módulo PLANILLA-EFECTIVO
    │   ├── planilla-efectivo.entity.ts
    │   ├── planilla-efectivo.controller.ts
    │   └── planilla-efectivo.routes.ts
    │
    ├── usuario/            # Módulo USUARIO
    │   ├── usuario.entity.ts
    │   ├── usuario.controller.ts
    │   └── usuario.routes.ts
    │
    ├── discap-programado/  # Módulo DISCAPACITADOS PROGRAMADOS (aún no en producción)
    │   ├── discap-programado.entity.ts
    │   ├── discap-programado.controller.ts
    │   └── discap-programado.routes.ts
    │
    ├── notifications/
    │   └── planillaEmail.ts   # Envío de email al supervisor cuando se envía planilla
    │
    ├── shared/
    │   ├── repository.ts      # (Utilidades de repositorio genérico)
    │   ├── bdd/
    │   │   ├── BaseEntity.ts  # Clase abstracta base: id + created_at
    │   │   └── orm.ts         # Inicialización MikroORM + syncSchema
    │   ├── middleware/
    │   │   ├── auth.routes.ts             # POST /auth/login
    │   │   ├── verifytoken.ts             # Middleware: verifica JWT
    │   │   ├── verifyAdmin.ts             # Middleware: verifica rol admin
    │   │   ├── sanitizeLogin.ts           # Sanitización de input login
    │   │   ├── sanitizePlanilla.ts        # Sanitización de input planilla
    │   │   ├── sanitizeRecorrido.ts       # Sanitización de input recorrido
    │   │   ├── sanitizePlanillaEfectivo.ts# Sanitización de input efectivo
    │   │   ├── sanitizeUsuario.ts         # Sanitización de input usuario
    │   │   └── sanitizeDiscapProgramado.ts# Sanitización de input discap
    │   └── types/
    │       └── index.ts       # Tipos compartidos (extensión de Express Request)
    │
    └── types/
        └── User.ts            # Tipo User para el payload JWT
```

### Detalle de cada carpeta/archivo importante

#### `src/app.ts` — Entry point

Archivo principal del backend. Realiza:

1. **Importa** `env.ts` para cargar variables de entorno con `dotenv`.
2. **Crea** la aplicación Express y configura middlewares globales:
   - `cors()` con lista dinámica de orígenes permitidos (incluye localhost para desarrollo y dominios de producción).
   - `express.json()` para parseo de body JSON.
   - `cookieParser()` para leer cookies.
   - `RequestContext.create()` de MikroORM (aísla el EntityManager por request).
3. **Monta** los routers en sus prefijos:
   - `/auth` → `authRouter` (login)
   - `/usuarios` → `usuarioRouter`
   - `/planillas` → `planillaRouter`
   - `/recorridos` → `recorridoRouter`
   - `/planilla-efectivo` → `planillaEfectivoRouter`
   - `/discap-programados` → `discapProgramadoRouter`
4. **Health check** en `GET /` para UptimeRobot.
5. **Inicia** MikroORM con `syncSchema({ safe: true })` (crea tablas nuevas sin borrar las existentes) y levanta el servidor HTTP en `PORT`.

#### `src/db.ts` — Pool MySQL directo

Crea un pool de conexiones `mysql2/promise`. Se usa exclusivamente en `auth.routes.ts` para la consulta de login (busca al usuario por nombre de usuario con SQL directo). MikroORM maneja todo el resto del acceso a datos.

#### `src/shared/bdd/BaseEntity.ts` — Entidad base abstracta

```typescript
@PrimaryKey() id!: number;              // Auto-increment
@Property({ type: 'datetime', nullable: true, onCreate: () => new Date() })
created_at?: Date;
```

Todas las entidades (`Planilla`, `Recorrido`, `PlanillaEfectivo`, `Usuario`, `DiscapProgramado`) heredan de esta clase, obteniendo `id` y `created_at` automáticamente.

#### `src/shared/bdd/orm.ts` — Configuración MikroORM

- Construye la URL de conexión MySQL a partir de `DB_URL` o las variables individuales (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- Registra todas las entidades del sistema.
- Exporta la función `syncSchema()` que ejecuta `SchemaGenerator.updateSchema()` en modo seguro.

#### `src/shared/middleware/auth.routes.ts` — Login

Endpoint `POST /auth/login`:

1. Recibe `{ usuario, contraseña }`.
2. Busca al usuario en la tabla `usuario` por el campo `usuario` (SQL directo via `db.ts`).
3. Compara la contraseña con `bcrypt.compare()` (o texto plano como fallback para migración antigua).
4. Si coincide, firma un JWT con payload `{ id, rol, usuario }` y lo devuelve al cliente.

#### `src/shared/middleware/verifytoken.ts` — Verificación JWT

Middleware que:
1. Extrae el token del header `Authorization: Bearer <token>` o de la cookie `token`.
2. Verifica el JWT con `JWT_SECRET`.
3. Adjunta el payload decodificado en `req.user`.
4. Si falla, responde `401 Unauthorized`.

#### `src/shared/middleware/verifyAdmin.ts` — Verificación de rol admin

Middleware que (después de `verifyToken`) verifica que `req.user.rol === 'admin'`. Si no, responde `403 Forbidden`.

#### `src/planilla/` — Módulo Planilla (el más importante)

**`planilla.entity.ts`** — Entidad principal de la planilla diaria:

| Campo | Tipo | Descripción |
|---|---|---|
| `chofer` | ManyToOne → Usuario | FK `chofer_id`, el chofer que la envió |
| `numero_coche` | string | Número de coche (ej: "02") |
| `fecha_hora_planilla` | Date | Fecha/hora del envío |
| `total_recorrido` | decimal(12,2) | Suma de importes de todos los recorridos |
| `total_efectivo` | decimal(12,2) | Suma de todo el efectivo contado |
| `diferencia` | decimal(12,2) | `total_recorrido - total_efectivo` |
| `status` | enum | `enviado` / `revisado` / `rechazado` |
| `comentarios` | text (nullable) | Comentarios opcionales del chofer |

Relaciones: `OneToMany → Recorrido` y `OneToMany → PlanillaEfectivo` con `cascade: [Cascade.REMOVE]`.

**`planilla.controller.ts`** — Lógica de negocio principal (438 líneas):

- **`submitByChofer()`** — Función más importante. Flujo:
  1. Recibe `{ coche, recorridos[], efectivo[], comentarios }` del chofer.
  2. Calcula `totalRecorrido` sumando los importes de los recorridos.
  3. Calcula `totalEfectivo` sumando `denominacion × cantidad` de cada entrada de efectivo.
  4. Calcula `diferencia = totalRecorrido - totalEfectivo`.
  5. Crea la entidad `Planilla` con los totales y status `'enviado'`.
  6. Crea las entidades `Recorrido` asociadas a la planilla.
  7. Crea las entidades `PlanillaEfectivo` asociadas a la planilla.
  8. Persiste todo en una operación (MikroORM flush).
  9. Envía email de notificación al supervisor de forma asíncrona.
  10. Responde con `201 Created`.

- **`findByChoferFecha()`** — Busca planillas por chofer y fecha. Maneja correctamente la zona horaria `America/Argentina/Buenos_Aires` para construir el rango del día.

- **`totalDia()`** — Calcula la suma total de importes de recorridos para un chofer en un día, usando SQL directo con JOIN.

- **CRUD estándar**: `findAll`, `findOne`, `add`, `update`, `remove` (con cascade delete de recorridos y efectivos).

**`planilla.routes.ts`** — Rutas:

| Método | Ruta | Middleware | Controlador |
|---|---|---|---|
| GET | `/planillas` | verifyToken | findAll |
| GET | `/planillas/:id` | verifyToken | findOne |
| GET | `/planillas/por-chofer-fecha` | verifyToken, verifyAdmin | findByChoferFecha |
| GET | `/planillas/total-dia` | verifyToken, verifyAdmin | totalDia |
| POST | `/planillas/submit` | verifyToken | submitByChofer |
| POST | `/planillas` | verifyToken, verifyAdmin, sanitize | add |
| PUT | `/planillas/:id` | verifyToken, verifyAdmin, sanitize | update |
| PATCH | `/planillas/:id` | verifyToken, verifyAdmin, sanitize | update |
| DELETE | `/planillas/:id` | verifyToken, verifyAdmin | remove |

#### `src/recorrido/` — Módulo Recorrido

**`recorrido.entity.ts`** — Cada viaje/recorrido individual:

| Campo | Tipo | Descripción |
|---|---|---|
| `planilla` | ManyToOne → Planilla | FK `planilla_id` |
| `horario` | string (nullable) | Hora del recorrido (ej: "06:30") |
| `numero_recorrido` | string (nullable) | Número de línea/recorrido (ej: "0301") |
| `importe` | decimal(10,2) | Importe recaudado en este viaje |
| `discap_nombre` | string (nullable) | Nombre del discapacitado (futuro) |
| `discap_apellido` | string (nullable) | Apellido del discapacitado (futuro) |
| `discap_dni` | string (nullable) | DNI del discapacitado (futuro) |

**`recorrido.controller.ts`** — CRUD estándar (findAll, findOne, add, update, remove) vía MikroORM.

**`recorrido.routes.ts`** — CRUD REST. Las operaciones de escritura requieren `verifyToken` + `verifyAdmin`.

#### `src/planilla-efectivo/` — Módulo Planilla Efectivo

**`planilla-efectivo.entity.ts`** — Desglose de efectivo por denominación:

| Campo | Tipo | Descripción |
|---|---|---|
| `planilla` | ManyToOne → Planilla | FK `planilla_id` |
| `denominacion` | number | Valor del billete/moneda (ej: 20000, 10000, 500...) |
| `cantidad` | number | Cantidad de billetes/monedas de esa denominación |
| `subtotal` | decimal(12,2) | `denominacion × cantidad` |

**`planilla-efectivo.controller.ts`** — CRUD estándar vía MikroORM.

**`planilla-efectivo.routes.ts`** — CRUD REST. Las operaciones de escritura requieren `verifyToken` + `verifyAdmin`.

#### `src/usuario/` — Módulo Usuario

**`usuario.entity.ts`**:

| Campo | Tipo | Descripción |
|---|---|---|
| `usuario` | string (unique) | Nombre de usuario para login |
| `nombre` | string | Nombre real |
| `apellido` | string | Apellido |
| `contraseña` | string | Hash bcrypt de la contraseña |
| `rol` | enum | `chofer` o `admin` |
| `is_active` | boolean | Si la cuenta está activa |

Relación: `OneToMany → Planilla` con `cascade: [Cascade.REMOVE]`.

**`usuario.controller.ts`** — CRUD estándar + endpoint especial `listChoferes` que devuelve solo los usuarios con `rol = 'chofer'` y `is_active = true`.

#### `src/notifications/planillaEmail.ts` — Notificaciones

Envía un email al supervisor cada vez que un chofer envía una planilla. Soporta dos backends:

1. **SendGrid API** (prioridad si `SENDGRID_API_KEY` está configurado).
2. **SMTP directo** (vía nodemailer, con defaults para Gmail).

El email incluye: planilla ID, fecha, chofer, coche, total recorridos, total efectivo, diferencia y estado (CUADRA / FALTAN / SOBRA).

Se puede deshabilitar con `MAIL_ENABLED=false`.

---

## 5. Frontend — Estructura de carpetas

```
frontend/
├── index.html              # HTML base (Vite inyecta el bundle)
├── package.json            # Dependencias y scripts
├── vite.config.ts          # Configuración Vite
├── tsconfig.json           # Configuración TypeScript
├── tailwind.config.ts      # Configuración Tailwind CSS
├── postcss.config.cjs      # PostCSS con Tailwind
├── vercel.json             # Configuración de deploy en Vercel
└── src/
    ├── main.tsx            # Entry point React
    ├── App.tsx             # Definición de rutas y guards de auth
    ├── styles.css          # Estilos globales
    │
    ├── api/
    │   └── client.ts       # Cliente HTTP (fetch wrapper + hook useApi)
    │
    ├── context/
    │   └── AuthContext.tsx  # Contexto de autenticación (JWT en localStorage)
    │
    ├── pages/
    │   ├── Login/
    │   │   ├── LoginPage.tsx   # Página de login
    │   │   └── LoginPage.css
    │   ├── Dashboard/
    │   │   ├── DashboardPage.tsx  # 🔑 Página principal (chofer + supervisor)
    │   │   └── DashboardPage.css
    │   └── Planillas/
    │       ├── PlanillasPage.tsx   # Listado de todas las planillas (solo admin)
    │       └── PlanillasPage.css
    │
    ├── routes/             # (Carpeta de rutas, estructura preparada)
    └── validateFunctions/  # (Funciones de validación, estructura preparada)
```

### Detalle de cada archivo importante

#### `src/main.tsx` — Entry point

Renderiza el componente `<App />` dentro de `<BrowserRouter>` y `<StrictMode>`. Importa los estilos globales.

#### `src/App.tsx` — Rutas y guards

Define las rutas de la aplicación:

| Ruta | Componente | Guard |
|---|---|---|
| `/login` | `LoginPage` | Ninguno |
| `/` | `DashboardPage` | `RequireAuth` (debe haber token) |
| `/planillas` | `PlanillasPage` | `RequireAuth` + `RequireAdmin` (rol admin) |
| `*` | Redirect a `/` | — |

**`RequireAuth`**: Verifica que exista un token en `AuthContext`. Si no, redirige a `/login`.

**`RequireAdmin`**: Además de requerir auth, verifica que `payload.rol === 'admin'`. Si no, redirige a `/`.

#### `src/context/AuthContext.tsx` — Estado de autenticación

Provee un contexto React global con:

- **`token`**: JWT almacenado en `localStorage` con la clave `elAcuerdo.token`.
- **`payload`**: Objeto decodificado del JWT (`{ id, rol, usuario, iat, exp }`). Se decodifica en el cliente con `parseJwt()` (base64 decode del payload del JWT).
- **`setToken(t)`**: Guarda el token en localStorage y actualiza el estado.
- **`logout()`**: Borra el token de localStorage y redirige a `/login`.
- **Auto-logout**: Calcula un `setTimeout` basado en `exp` del token. Cuando el JWT expira, llama a `logout()` automáticamente.

#### `src/api/client.ts` — Cliente HTTP

- **`API_URL`**: Lee `VITE_API_URL` del entorno (o usa `http://localhost:3000` por defecto).
- **`apiFetch<T>(path, options)`**: Wrapper de `fetch()` que:
  1. Antepone `API_URL` al path.
  2. Agrega `Content-Type: application/json`.
  3. Agrega `Authorization: Bearer <token>` si hay token en localStorage.
  4. Si recibe `401`, redirige a `/login` automáticamente.
  5. Parsea la respuesta como JSON y la retorna tipada.
- **`useApi()`**: Hook de React que retorna métodos `{ get, post, put, patch, del }` que usan `apiFetch` internamente.

#### `src/pages/Login/LoginPage.tsx` — Página de login

Formulario simple con dos campos:
- **Usuario** (`usuario`)
- **Contraseña** (`contraseña`)

Al enviar el formulario:
1. Hace `POST /auth/login` con `{ usuario, contraseña }`.
2. Si es exitoso, guarda el token con `setToken()` y navega a `/`.
3. Si falla, muestra mensaje de error.

#### `src/pages/Dashboard/DashboardPage.tsx` — Página principal (1459 líneas)

Es el componente más grande de la aplicación. Se divide según el rol del usuario:

##### Para CHOFER — `DriverDashboard` → `DailyReportForm`

Vista de carga de la planilla diaria. Incluye:

1. **Selección de coche**: Input para el número de coche.
2. **Tabla de recorridos**: Filas con campos `hora`, `número de recorrido`, `importe`. El chofer agrega tantas filas como viajes haya realizado.
3. **Conteo de efectivo**: Lista de denominaciones de billetes argentinos (de $20.000 a $50). Para cada denominación ingresa la cantidad. El sistema calcula el subtotal automáticamente.
4. **Cálculo de balance**:
   - **Total recorrido** = Σ importes de todos los viajes.
   - **Total efectivo** = Σ (denominación × cantidad) de todos los billetes.
   - **Diferencia** = Total recorrido − Total efectivo.
   - Si diferencia = 0 → ✅ CUADRA.
   - Si diferencia > 0 → ⚠️ FALTAN (el chofer tiene menos efectivo del esperado).
   - Si diferencia < 0 → ⚠️ SOBRA.
5. **Borrador local**: Los datos del formulario se guardan en `localStorage` mientras el chofer los va completando, para no perder el progreso si cierra el navegador accidentalmente.
6. **Envío**: `POST /planillas/submit` con `{ coche, recorridos[], efectivo[], comentarios }`.

##### Para ADMIN — `SupervisorDashboard`

Vista de supervisión y gestión:

1. **Selector de chofer**: Dropdown que carga la lista de choferes activos desde `GET /usuarios/choferes`.
2. **Selector de fecha**: Input date para filtrar por día.
3. **Lista de planillas**: Llama a `GET /planillas/por-chofer-fecha?chofer_id=X&fecha=YYYY-MM-DD` y muestra las planillas del chofer en esa fecha.
4. **Detalle de planilla**: Muestra recorridos, efectivo, totales y diferencia.
5. **Total del día**: Llama a `GET /planillas/total-dia?chofer_id=X&fecha=YYYY-MM-DD` y muestra la suma total.
6. **Eliminar planilla**: Botón que hace `DELETE /planillas/:id`.
7. **Gestión de discapacitados**: CRUD de datos de discapacitados en recorridos y programados (feature en desarrollo).

#### `src/pages/Planillas/PlanillasPage.tsx` — Listado general (solo admin)

Página accesible solo para administradores. Hace `GET /planillas` y muestra una tabla con todas las planillas del sistema:

| Columna | Descripción |
|---|---|
| ID | Identificador |
| Coche | Número de coche |
| Fecha | Fecha/hora de la planilla |
| Tot. recorrido | Total de importes de recorridos |
| Tot. efectivo | Total de efectivo contado |
| Diferencia | Diferencia entre recorrido y efectivo |
| Estado | Chip visual con color según estado (enviado/revisado/rechazado) |

---

## 6. Esquema de base de datos

### Tabla `usuario`

```sql
CREATE TABLE usuario (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario       VARCHAR(255) UNIQUE NOT NULL,
  nombre        VARCHAR(255) NOT NULL,
  apellido      VARCHAR(255) NOT NULL,
  contraseña    VARCHAR(255) NOT NULL,       -- hash bcrypt
  rol           ENUM('chofer', 'admin') NOT NULL,
  is_active     TINYINT(1) DEFAULT 1
);
```

### Tabla `planilla`

```sql
CREATE TABLE planilla (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  chofer_id           INT NOT NULL,              -- FK → usuario.id
  numero_coche        VARCHAR(255) NOT NULL,
  fecha_hora_planilla DATETIME NOT NULL,
  total_recorrido     DECIMAL(12,2) DEFAULT 0,
  total_efectivo      DECIMAL(12,2) DEFAULT 0,
  diferencia          DECIMAL(12,2) DEFAULT 0,
  status              ENUM('enviado','revisado','rechazado') DEFAULT 'enviado',
  comentarios         TEXT NULL,
  FOREIGN KEY (chofer_id) REFERENCES usuario(id) ON DELETE CASCADE
);
```

### Tabla `recorridos`

```sql
CREATE TABLE recorridos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  planilla_id       INT NOT NULL,                -- FK → planilla.id
  horario           VARCHAR(255) NULL,
  numero_recorrido  VARCHAR(255) NULL,
  importe           DECIMAL(10,2) DEFAULT 0,
  discap_nombre     VARCHAR(255) NULL,
  discap_apellido   VARCHAR(255) NULL,
  discap_dni        VARCHAR(255) NULL,
  FOREIGN KEY (planilla_id) REFERENCES planilla(id) ON DELETE CASCADE
);
```

### Tabla `planilla_efectivo`

```sql
CREATE TABLE planilla_efectivo (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  planilla_id   INT NOT NULL,                    -- FK → planilla.id
  denominacion  INT NOT NULL,                    -- valor del billete (20000, 10000, etc.)
  cantidad      INT NOT NULL,                    -- cantidad de billetes
  subtotal      DECIMAL(12,2) DEFAULT 0,         -- denominacion × cantidad
  FOREIGN KEY (planilla_id) REFERENCES planilla(id) ON DELETE CASCADE
);
```

### Tabla `discap_programado` (no en producción)

```sql
CREATE TABLE discap_programado (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  nombre        VARCHAR(255) NULL,
  apellido      VARCHAR(255) NULL,
  dni           VARCHAR(255) NULL,
  recorrido     VARCHAR(255) NULL
);
```

### Relaciones

```
usuario (1) ───────< (N) planilla
planilla (1) ──────< (N) recorridos
planilla (1) ──────< (N) planilla_efectivo
```

Todas las relaciones tienen `ON DELETE CASCADE`: al eliminar un usuario se eliminan sus planillas, y al eliminar una planilla se eliminan sus recorridos y registros de efectivo.

---

## 7. Flujo de autenticación

```
┌──────────┐    POST /auth/login     ┌──────────┐     SELECT * FROM usuario    ┌───────┐
│  Login   │  { usuario, contraseña} │  Backend │     WHERE usuario = ?        │ MySQL │
│  Page    │ ──────────────────────▶  │ auth.ts  │ ──────────────────────────▶  │       │
│          │                          │          │ ◀──────────────────────────  │       │
│          │  ◀──────────────────────  │          │                             └───────┘
│          │  { token: "eyJ..." }     │  bcrypt  │
└──────────┘                          │  compare │
     │                                └──────────┘
     │  setToken(token)
     │  localStorage.setItem('elAcuerdo.token', token)
     ▼
┌──────────┐
│Dashboard │  Todas las requests llevan:
│  Page    │  Authorization: Bearer <token>
└──────────┘
```

1. El usuario ingresa sus credenciales en `/login`.
2. El frontend hace `POST /auth/login` con `{ usuario, contraseña }`.
3. El backend busca al usuario en MySQL, valida la contraseña con bcrypt.
4. Si es correcto, firma un JWT con `{ id, rol, usuario }` y lo retorna.
5. El frontend guarda el token en `localStorage` y navega a `/`.
6. Todas las requests posteriores incluyen el token como `Authorization: Bearer <token>`.
7. Los middlewares `verifyToken` y `verifyAdmin` protegen los endpoints según corresponda.
8. Cuando el JWT expira, el frontend ejecuta `logout()` automáticamente.

---

## 8. Flujo principal — Chofer

```
Chofer abre la app → Login → DashboardPage (DriverDashboard)
     │
     ├── 1. Ingresa número de coche
     │
     ├── 2. Agrega recorridos (hora, nro recorrido, importe)
     │       └── Se guarda borrador en localStorage
     │
     ├── 3. Cuenta efectivo por denominación
     │       └── Se calcula subtotal por denominación
     │
     ├── 4. Ve el resumen:
     │       ├── Total recorrido: Σ importes
     │       ├── Total efectivo:  Σ subtotales
     │       └── Diferencia:      recorrido - efectivo
     │
     └── 5. Envía planilla → POST /planillas/submit
             │
             Backend:
             ├── Crea registro en tabla `planilla`
             ├── Crea registros en tabla `recorridos`
             ├── Crea registros en tabla `planilla_efectivo`
             ├── Envía email al supervisor (async)
             └── Responde 201 Created
```

### Denominaciones de billetes (array BILLETES)

| Denominación | Descripción |
|---|---|
| $20.000 | Billete de veinte mil |
| $10.000 | Billete de diez mil |
| $5.000 | Billete de cinco mil |
| $2.000 | Billete de dos mil |
| $1.000 | Billete de mil |
| $500 | Billete de quinientos |
| $200 | Billete de doscientos |
| $100 | Billete de cien |
| $50 | Billete/moneda de cincuenta |

---

## 9. Flujo principal — Supervisor (Admin)

```
Admin abre la app → Login → DashboardPage (SupervisorDashboard)
     │
     ├── 1. Selecciona chofer del dropdown
     │       └── GET /usuarios/choferes → lista de choferes activos
     │
     ├── 2. Selecciona fecha
     │
     ├── 3. Busca planillas
     │       └── GET /planillas/por-chofer-fecha?chofer_id=X&fecha=YYYY-MM-DD
     │
     ├── 4. Ve detalle de cada planilla:
     │       ├── Recorridos (hora, nro, importe)
     │       ├── Efectivo (denominación, cantidad, subtotal)
     │       ├── Totales y diferencia
     │       └── Estado (enviado/revisado/rechazado)
     │
     ├── 5. Ve total del día
     │       └── GET /planillas/total-dia?chofer_id=X&fecha=YYYY-MM-DD
     │
     ├── 6. Puede eliminar planillas
     │       └── DELETE /planillas/:id (cascade → borra recorridos y efectivos)
     │
     └── 7. Puede acceder a /planillas (listado general de TODAS las planillas)
```

---

## 10. Notificaciones por email

Cuando un chofer envía una planilla exitosamente, el backend dispara un email al supervisor de forma asíncrona (no bloquea la respuesta al chofer).

**Proveedor de email** (en orden de prioridad):
1. **SendGrid API** — Si `SENDGRID_API_KEY` está definida.
2. **SMTP directo** — Vía nodemailer. Si el usuario es de Gmail, se auto-configura `smtp.gmail.com:465`.

**Contenido del email**:
- Asunto: `Nueva planilla enviada - {chofer} - {fecha} ({CUADRA/FALTAN/SOBRA})`
- Cuerpo: Planilla ID, fecha, chofer, coche, total recorridos, total efectivo, diferencia y estado.

**Variables de configuración**:
- `MAIL_ENABLED` — `true`/`false` (default: true).
- `MAIL_TO` — Dirección del destinatario (supervisor).
- `MAIL_FROM` — Dirección del remitente (o se usa SMTP_USER).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` — Para nodemailer.
- `SENDGRID_API_KEY` — Para SendGrid.

---

## 11. Variables de entorno

### Backend (`.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DB_URL` | URL completa MySQL (alternativa a las individuales) | `mysql://user:pass@host:3306/db` |
| `DB_HOST` | Host de la base de datos | `....-mysql.services.clever-cloud.com` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_USER` | Usuario MySQL | `uxxx` |
| `DB_PASSWORD` | Contraseña MySQL | `***` |
| `DB_NAME` | Nombre de la base de datos | `....` |
| `DB_SSL` | Habilitar SSL para MySQL | `true` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `mi_secreto_jwt` |
| `BUSINESS_TIME_ZONE` | Zona horaria del negocio | `America/Argentina/Buenos_Aires` |
| `MAIL_ENABLED` | Habilitar envío de emails | `true` |
| `MAIL_TO` | Email del supervisor | `supervisor@empresa.com` |
| `MAIL_FROM` | Email remitente | `sistema@empresa.com` |
| `SMTP_HOST` | Host SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Puerto SMTP | `465` |
| `SMTP_SECURE` | Usar SSL en SMTP | `true` |
| `SMTP_USER` | Usuario SMTP | `user@gmail.com` |
| `SMTP_PASS` | Contraseña SMTP / App Password | `***` |
| `SENDGRID_API_KEY` | API Key de SendGrid (opcional) | `SG.xxx` |

### Frontend (`.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base del backend | `https://mi-backend.onrender.com` |

---

## 12. Scripts de desarrollo y despliegue

### Backend

```bash
# Desarrollo (recompilación automática con tsc-watch)
cd backend
npm install
npm run dev          # → tsc-watch + node ./dist/app.js

# Build producción
npm run build        # → tsc -p ./tsconfig.json

# Iniciar en producción
npm start            # → node ./dist/app.js
```

### Frontend

```bash
# Desarrollo (hot reload con Vite)
cd frontend
npm install
npm run dev          # → vite dev server en http://localhost:5173

# Build producción
npm run build        # → tsc + vite build → carpeta dist/

# Preview del build
npm run preview      # → vite preview
```

### Despliegue

| Componente | Plataforma | Configuración |
|---|---|---|
| Backend | **Render.com** | Definido en `backend/render.yaml` y `render.yaml` (raíz) |
| Frontend | **Vercel** | Definido en `frontend/vercel.json` (SPA rewrites) |
| Base de datos | **Clever Cloud** | MySQL gestionado |

---

## 13. Endpoints de la API

### Autenticación

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/auth/login` | Login con usuario y contraseña | No |

### Usuarios

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/usuarios` | Listar todos los usuarios | Token |
| GET | `/usuarios/choferes` | Listar choferes activos | Token |
| GET | `/usuarios/:id` | Obtener un usuario | Token |
| POST | `/usuarios` | Crear usuario | Token + Admin |
| PUT | `/usuarios/:id` | Actualizar usuario | Token + Admin |
| DELETE | `/usuarios/:id` | Eliminar usuario | Token + Admin |

### Planillas

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/planillas` | Listar todas las planillas | Token |
| GET | `/planillas/:id` | Obtener una planilla | Token |
| GET | `/planillas/por-chofer-fecha` | Buscar por chofer y fecha | Token + Admin |
| GET | `/planillas/total-dia` | Total del día por chofer | Token + Admin |
| POST | `/planillas/submit` | Enviar planilla (chofer) | Token |
| POST | `/planillas` | Crear planilla (admin) | Token + Admin |
| PUT | `/planillas/:id` | Actualizar planilla | Token + Admin |
| PATCH | `/planillas/:id` | Actualizar parcialmente | Token + Admin |
| DELETE | `/planillas/:id` | Eliminar planilla (cascade) | Token + Admin |

### Recorridos

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/recorridos` | Listar todos | Público |
| GET | `/recorridos/:id` | Obtener uno | Público |
| POST | `/recorridos` | Crear recorrido | Token + Admin |
| PUT | `/recorridos/:id` | Actualizar recorrido | Token + Admin |
| PATCH | `/recorridos/:id` | Actualizar parcialmente | Token + Admin |
| DELETE | `/recorridos/:id` | Eliminar recorrido | Token + Admin |

### Planilla Efectivo

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/planilla-efectivo` | Listar todos | Público |
| GET | `/planilla-efectivo/:id` | Obtener uno | Público |
| POST | `/planilla-efectivo` | Crear registro | Token + Admin |
| PUT | `/planilla-efectivo/:id` | Actualizar registro | Token + Admin |
| PATCH | `/planilla-efectivo/:id` | Actualizar parcialmente | Token + Admin |
| DELETE | `/planilla-efectivo/:id` | Eliminar registro | Token + Admin |

### Discapacitados Programados (no en producción)

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/discap-programados` | Listar todos | Token |
| GET | `/discap-programados/:id` | Obtener uno | Token |
| POST | `/discap-programados` | Crear registro | Token + Admin |
| PUT | `/discap-programados/:id` | Actualizar registro | Token + Admin |
| DELETE | `/discap-programados/:id` | Eliminar registro | Token + Admin |

---