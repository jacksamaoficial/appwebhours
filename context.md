# context.md — App Control de Horas y Gastos

## Visión del Producto

Aplicación web para el registro y control de horas trabajadas y gastos, con soporte para múltiples trabajos en el mismo día. Orientada a freelancers, consultores y cualquier persona que gestione múltiples fuentes de ingresos.

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

#### User
- `id` UUID PK
- `email` único, validado
- `hashed_password` bcrypt
- `full_name`
- `is_active` boolean
- `created_at` / `updated_at`

#### Job (Trabajo)
- `id` UUID PK
- `user_id` FK → User (row-level security: un usuario solo ve sus propios trabajos)
- `name` nombre del trabajo/cliente
- `description` opcional
- `hourly_rate` tarifa por hora (Decimal)
- `currency` código ISO 4217 (EUR, USD, etc.)
- `color` hex color para identificación visual
- `is_active` para archivar sin borrar
- `created_at` / `updated_at`

#### TimeEntry (Registro de Horas)
- `id` UUID PK
- `user_id` FK → User
- `job_id` FK → Job
- `date` fecha del trabajo
- `start_time` hora inicio (time)
- `end_time` hora fin (time, nullable si en curso)
- `duration_minutes` calculado automáticamente
- `notes` descripción opcional
- `created_at` / `updated_at`
- **Un usuario puede tener múltiples TimeEntry en el mismo día, para distintos o el mismo Job.**

#### Expense (Gasto)
- `id` UUID PK
- `user_id` FK → User
- `job_id` FK → Job (opcional — puede ser gasto personal)
- `date` fecha del gasto
- `amount` importe (Decimal)
- `currency` código ISO 4217
- `category` enum: transport, food, equipment, software, office, other
- `description`
- `created_at` / `updated_at`

---

## Seguridad

| Práctica                         | Implementación                                      |
|----------------------------------|-----------------------------------------------------|
| Passwords                        | bcrypt via passlib (cost factor 12)                 |
| Tokens                           | JWT access (30 min) + refresh (7 días) en httpOnly cookie |
| Autorización                     | Cada endpoint verifica `user_id` del token contra el recurso solicitado |
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
POST /api/v1/auth/register  →  crea usuario, devuelve tokens
POST /api/v1/auth/login     →  verifica credenciales, devuelve tokens
POST /api/v1/auth/refresh   →  rota refresh token, devuelve nuevo access token
GET  /api/v1/auth/me        →  perfil del usuario autenticado
POST /api/v1/auth/logout    →  invalida refresh token
```

### Time Tracker
```
GET    /api/v1/jobs                      →  lista trabajos del usuario
POST   /api/v1/jobs                      →  crea trabajo
PATCH  /api/v1/jobs/{id}                 →  actualiza trabajo
DELETE /api/v1/jobs/{id}                 →  archiva trabajo (soft delete)

GET    /api/v1/time-entries?date=YYYY-MM-DD  →  entradas del día (todos los trabajos)
POST   /api/v1/time-entries              →  registra nueva entrada
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
5. **Row-level security en servicios**: cada query filtra siempre por `user_id` del token.
6. **Sin ORM lazy loading**: todas las relaciones con `lazy="raise"` para evitar N+1 queries silenciosos.
7. **Vite + React**: web app, no React Native/Expo. El repo anterior usaba Expo (móvil); este proyecto es web.

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
