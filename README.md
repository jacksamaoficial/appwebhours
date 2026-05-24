# App Control de Horas y Gastos

Aplicación web para el registro de horas trabajadas y gastos. Soporta múltiples trabajos el mismo día.

## Stack

| Capa       | Tecnología                            |
|------------|---------------------------------------|
| Backend    | FastAPI + Python 3.12 + SQLAlchemy 2  |
| Base datos | PostgreSQL 16                         |
| Migraciones| Alembic                               |
| Frontend   | React 18 + TypeScript + Vite          |
| Estado     | Zustand + TanStack Query              |
| Estilos    | Tailwind CSS                          |
| Docker     | Docker Compose                        |

## Inicio rápido

### Con Docker Compose

```bash
# Copia los ficheros de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Genera una SECRET_KEY segura
openssl rand -hex 32

# Edita backend/.env con tu SECRET_KEY y contraseña de BD

# Levanta los servicios
docker compose up --build
```

La app estará disponible en `http://localhost:5173`.

### Desarrollo local

**Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # edita con tu configuración local

# Requiere PostgreSQL corriendo en localhost:5432
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Tests

```bash
cd backend
# Instala también aiosqlite para tests en memoria
pip install aiosqlite
pytest --cov=app tests/
```

## Estructura

```
appwebhours/
├── backend/
│   ├── app/
│   │   ├── api/            # Routers FastAPI (auth, jobs, time-entries, expenses)
│   │   ├── core/           # Config, seguridad, base de datos
│   │   ├── models/         # ORM models (SQLAlchemy)
│   │   ├── schemas/        # Pydantic v2 schemas
│   │   └── services/       # Lógica de negocio
│   ├── migrations/         # Alembic
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/            # Axios client + funciones por dominio
│       ├── components/     # Layout (AppLayout, Sidebar, Header)
│       ├── hooks/          # Custom hooks con TanStack Query
│       ├── pages/          # Dashboard, TimeTracker, Expenses, Jobs
│       ├── store/          # Zustand (auth)
│       └── types/          # TypeScript types
├── docker-compose.yml
└── context.md              # Contexto completo del proyecto
```

## Endpoints API

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET|POST         /api/v1/jobs
GET|PATCH|DELETE /api/v1/jobs/{id}

GET|POST         /api/v1/time-entries
GET|PATCH|DELETE /api/v1/time-entries/{id}

GET|POST         /api/v1/expenses
GET|PATCH|DELETE /api/v1/expenses/{id}
```

Documentación interactiva disponible en `http://localhost:8000/docs` (solo en `ENVIRONMENT=development`).

## Seguridad

- Contraseñas hasheadas con bcrypt (cost 12)
- JWT access token (30 min) en memoria + refresh token (7 días) en cookie httpOnly
- CORS con lista blanca de orígenes
- Rate limiting en endpoints de auth (slowapi)
- Row-level security: cada query filtra por `user_id` del token
- Secrets exclusivamente en variables de entorno
