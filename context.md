# context.md — App Control de Horas y Gastos

## Visión del Producto

Aplicación web para un negocio de hostelería (p. ej. un pub de copas): los empleados fichan sus horas y el dueño lleva el control de gastos, ventas diarias (efectivo, tarjetas, salidas de caja) y cierre de días.

### Perfiles (roles jerárquicos — cada uno incluye al anterior)

| Rol                     | Puede                                                              |
|-------------------------|--------------------------------------------------------------------|
| `hours`                 | Fichar y ver **sus** horas                                         |
| `hours_expenses`        | + ver y gestionar **todos** los gastos del negocio                 |
| `hours_expenses_sales`  | + registrar las ventas del día                                     |
| `owner`                 | + ver las horas de todos, gestionar puestos y empleados, cerrar/reabrir días |

El registro público crea un negocio y su dueño. El dueño crea las cuentas de los empleados.

### Día cerrado
El dueño puede cerrar un día: a partir de ese momento nadie (ni el dueño) puede crear, editar ni borrar horas, gastos o ventas con esa fecha (API responde `409`). Solo el dueño puede reabrirlo.

---

## Stack Tecnológico

| Capa        | Tecnología                                    | Versión aprox. |
|-------------|-----------------------------------------------|----------------|
| Backend     | FastAPI + Python                              | 3.11+          |
| ORM         | SQLAlchemy 2.x (async)                        | 2.0+           |
| Base datos  | PostgreSQL                                    | 15+            |
| Migraciones | Alembic                                       | 1.13+          |
| Auth        | JWT (python-jose) + bcrypt (passlib)          | —              |
| Frontend    | React + TypeScript + Vite                     | React 18+      |
| State       | Zustand (auth global) + TanStack Query (server state) | —     |
| HTTP Client | Axios                                         | —              |
| Estilos     | Tailwind CSS                                  | 3.x            |
| Contenedor  | Docker + Docker Compose                       | —              |

> **Sin dependencias de terceros de auth** (sin OAuth, sin Auth0, sin Clerk). Login propio con email + contraseña.

---

## Arquitectura

```
appwebhours/
├── backend/
│   ├── app/
│   │   ├── api/               # Routers FastAPI por dominio
│   │   │   ├── auth.py        # /auth/register, /auth/login, /auth/refresh, /auth/me
│   │   │   ├── jobs.py        # CRUD de trabajos
│   │   │   ├── time_entries.py # Registro de horas (múltiples/día por trabajo)
│   │   │   └── expenses.py    # Registro de gastos
│   │   ├── core/
│   │   │   ├── config.py      # Settings via pydantic-settings + .env
│   │   │   ├── security.py    # JWT creation/verification, password hashing
│   │   │   └── database.py    # SQLAlchemy async engine + session factory
│   │   ├── models/            # ORM models (SQLAlchemy DeclarativeBase)
│   │   │   ├── user.py
│   │   │   ├── job.py
│   │   │   ├── time_entry.py
│   │   │   └── expense.py
│   │   ├── schemas/           # Pydantic v2 schemas (request/response)
│   │   │   ├── auth.py
│   │   │   ├── job.py
│   │   │   ├── time_entry.py
│   │   │   └── expense.py
│   │   ├── services/          # Lógica de negocio desacoplada de HTTP
│   │   │   ├── auth.py
│   │   │   ├── jobs.py
│   │   │   ├── time_entries.py
│   │   │   └── expenses.py
│   │   └── main.py            # App factory, CORS, routers, lifespan
│   ├── migrations/            # Alembic (env.py + versions/)
│   ├── tests/                 # pytest + httpx (async)
│   ├── .env.example
│   ├── alembic.ini
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios instance + funciones por dominio
│   │   ├── components/        # Componentes reutilizables (Layout, UI)
│   │   ├── pages/
│   │   │   ├── Dashboard/     # Resumen del día/semana/mes
│   │   │   ├── TimeTracker/   # Registro de horas (múltiples trabajos/día)
│   │   │   └── Expenses/      # Registro y listado de gastos
│   │   ├── hooks/             # Custom hooks (useJobs, useTimeEntries, etc.)
│   │   ├── store/             # Zustand stores
│   │   └── types/             # TypeScript interfaces/types
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Dominio del Negocio

### Entidades Principales

#### Business (Negocio)
- `id` UUID PK
- `name`, `currency`
- `created_at` / `updated_at`

#### User
- `id` UUID PK
- `business_id` FK → Business
- `role` hours | hours_expenses | hours_expenses_sales | owner
- `email` único, validado
- `hashed_password` bcrypt
- `full_name`
- `is_active` boolean
- `created_at` / `updated_at`

#### Job (Puesto: barra, sala, puerta…)
- `id` UUID PK
- `business_id` FK → Business (los gestiona el dueño; todos los empleados los ven)
- `name` nombre del trabajo/cliente
- `description` opcional
- `hourly_rate` tarifa por hora (Decimal)
- `currency` código ISO 4217 (EUR, USD, etc.)
- `color` hex color para identificación visual
- `is_active` para archivar sin borrar
- `created_at` / `updated_at`

#### TimeEntry (Registro de Horas)
- `id` UUID PK
- `business_id` FK → Business
- `user_id` FK → User (el empleado que trabajó; el dueño puede registrar horas de otros)
- `job_id` FK → Job
- `date` fecha del trabajo
- `start_time` hora inicio (time)
- `end_time` hora fin (time, nullable si en curso). Si es anterior a `start_time`, el turno termina después de medianoche (`date` es el día en que empezó)
- `duration_minutes` calculado automáticamente
- `notes` descripción opcional
- `created_at` / `updated_at`
- **Un usuario puede tener múltiples TimeEntry en el mismo día, para distintos o el mismo Job.**

#### Expense (Gasto)
- `id` UUID PK
- `business_id` FK → Business
- `user_id` FK → User (quién lo apuntó)
- `job_id` FK → Job (opcional — puede ser gasto personal)
- `date` fecha del gasto
- `amount` importe (Decimal)
- `currency` código ISO 4217
- `category` enum: drinks, ice, food, supplies, cleaning, staff, rent, utilities, maintenance, equipment, entertainment, marketing, fees, other
- `description`
- `created_at` / `updated_at`

#### BusinessDay (Día: ventas + cierre)
- `id` UUID PK
- `business_id` FK → Business; único por (`business_id`, `date`)
- `cash`, `card`, `cash_out` (salidas de caja) — Decimal
- `total` = `cash + card - cash_out` (calculado en la respuesta, no se guarda)
- `notes` opcional
- `is_closed`, `closed_at`, `closed_by_id`
- `updated_by_id`, `created_at` / `updated_at`

Las salidas de caja son independientes de la entidad Expense.

#### PayBand (Tramo de horario y tarifa por empleado)
- `id` UUID PK
- `business_id` FK → Business, `user_id` FK → User
- `start_time`, `end_time` (si `end_time` ≤ `start_time`, el tramo cruza medianoche)
- `hourly_rate` €/hora (Decimal)
- Los tramos de un empleado no pueden solaparse.
- `User.overtime_rate`: €/hora de lo fichado **fuera** de todos los tramos (antes o después del horario) = horas extra.
- Las nóminas se calculan al consultar (`GET /api/v1/payroll`) con las tarifas vigentes; cambiar un horario recalcula también meses anteriores.

---

## Seguridad

| Práctica                         | Implementación                                      |
|----------------------------------|-----------------------------------------------------|
| Passwords                        | bcrypt via passlib (cost factor 12)                 |
| Tokens                           | JWT access (30 min) + refresh (7 días) en httpOnly cookie |
| Autorización                     | Cada recurso se filtra por el `business_id` del usuario; permisos por rol con la dependencia `require_role` |
| CORS                             | Lista blanca explícita de orígenes                  |
| Rate limiting                    | slowapi en endpoints de auth (10 req/min)           |
| Secrets                          | Variables de entorno, nunca hardcoded               |
| SQL Injection                    | SQLAlchemy ORM, sin queries raw                     |
| Input validation                 | Pydantic v2 en todos los schemas                    |
| Dependency updates               | pyproject.toml con rangos mínimos                   |

---

## Flujos Principales

### Autenticación
```
POST /api/v1/auth/register  →  crea negocio + dueño, devuelve tokens
POST /api/v1/auth/login     →  verifica credenciales, devuelve tokens
POST /api/v1/auth/refresh   →  rota refresh token, devuelve nuevo access token
GET  /api/v1/auth/me        →  perfil del usuario autenticado
POST /api/v1/auth/logout    →  invalida refresh token
```

### Time Tracker
```
GET    /api/v1/jobs                      →  lista puestos del negocio
POST   /api/v1/jobs                      →  crea puesto (dueño)
PATCH  /api/v1/jobs/{id}                 →  actualiza puesto (dueño)
DELETE /api/v1/jobs/{id}                 →  archiva puesto (dueño, soft delete)

GET    /api/v1/time-entries?date=YYYY-MM-DD[&user_id=]  →  entradas del día (empleado: las suyas; dueño: todas o filtradas)
POST   /api/v1/time-entries              →  registra nueva entrada (dueño puede pasar user_id)
PATCH  /api/v1/time-entries/{id}         →  edita entrada (ej: añadir end_time)
DELETE /api/v1/time-entries/{id}         →  elimina entrada
```

### Expenses
```
GET    /api/v1/expenses?from=&to=        →  gastos en rango de fechas
POST   /api/v1/expenses                  →  registra gasto
PATCH  /api/v1/expenses/{id}             →  edita gasto
DELETE /api/v1/expenses/{id}             →  elimina gasto
```
(Requiere rol `hours_expenses` o superior.)

### Ventas y cierres
```
GET  /api/v1/business-days/closed?from_date=&to_date=  →  días cerrados (cualquier rol)
GET  /api/v1/business-days?from_date=&to_date=        →  ventas por día (rol ventas+)
GET  /api/v1/business-days/{date}                      →  un día (vacío si no hay datos)
PUT  /api/v1/business-days/{date}/sales                →  guarda efectivo/tarjetas/salidas (rol ventas+)
POST /api/v1/business-days/{date}/close                →  cierra el día (dueño)
POST /api/v1/business-days/{date}/reopen               →  reabre el día (dueño)
```

### Negocio y empleados
```
GET   /api/v1/business            →  datos del negocio
PATCH /api/v1/business            →  edita nombre/moneda (dueño)
GET   /api/v1/employees           →  lista personal (dueño)
POST  /api/v1/employees           →  crea cuenta de empleado (dueño)
PATCH /api/v1/employees/{id}      →  cambia perfil, activa/desactiva, resetea contraseña (dueño)
GET   /api/v1/employees/{id}/pay-schedule  →  tramos y tarifa extra (dueño)
PUT   /api/v1/employees/{id}/pay-schedule  →  reemplaza tramos y tarifa extra (dueño)
GET   /api/v1/payroll?from_date=&to_date=[&user_id=]  →  horas normales/extra e importes por empleado (dueño)
```

---

## Convenciones de Código

- **Python**: PEP 8, async/await en toda la capa de acceso a datos, type hints obligatorios.
- **TypeScript**: strict mode activado, no `any` salvo casos justificados.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- **Tests backend**: pytest-asyncio + httpx AsyncClient. Cobertura mínima objetivo: 80%.
- **Sin archivos de agentes externos**: no `.emergent/`, no `.gitconfig` de bots, no `memory/` de herramientas de IA, no `test_reports/` autogenerados.

---

## Variables de Entorno

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/appwebhours
SECRET_KEY=<min-32-chars-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:5173
ENVIRONMENT=development
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Comandos de Desarrollo

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Con Docker
docker compose up --build
```

---

## Decisiones de Diseño

1. **UUID como PK**: evita enumeración de IDs en URLs.
2. **Soft delete en Jobs**: `is_active=False` en lugar de borrar para preservar historial de TimeEntry.
3. **duration_minutes calculado en DB**: trigger o al insertar, para consistencia.
4. **Refresh token en cookie httpOnly**: mitiga XSS. Access token en memoria (no localStorage).
5. **Row-level security en servicios**: cada query filtra siempre por el `business_id` del usuario del token (y por `user_id` en horas de empleados).
6. **Sin ORM lazy loading**: todas las relaciones con `lazy="raise"` para evitar N+1 queries silenciosos.
7. **Vite + React**: web app, no React Native/Expo. El repo anterior usaba Expo (móvil); este proyecto es web.
8. **Roles fijos jerárquicos** en lugar de permisos combinables: más simple de entender para el dueño.
9. **Migración 0002**: cada usuario existente pasa a ser dueño de un negocio nuevo que reutiliza su id.

---

## Estado Actual del Proyecto

- [ ] Estructura base creada
- [ ] Backend: modelos y schemas
- [ ] Backend: endpoints CRUD
- [ ] Backend: auth con JWT
- [ ] Backend: migraciones Alembic
- [ ] Backend: tests
- [ ] Frontend: configuración Vite + Tailwind
- [ ] Frontend: auth (login/register)
- [ ] Frontend: Dashboard
- [ ] Frontend: Time Tracker
- [ ] Frontend: Expenses
- [ ] Docker Compose funcional
- [ ] CI/CD (GitHub Actions)
