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

## Copias de seguridad

### Automáticas (cron)
El servicio `backup` de Docker Compose hace un `pg_dump` cada día a las **06:00 (hora de Madrid)** y lo guarda en `./backups` del servidor. Las copias automáticas se conservan 30 días; las manuales y las subidas no caducan.

Variables (en `.env` junto a `docker-compose.yml`):

| Variable | Por defecto | Uso |
|---|---|---|
| `BACKUP_CRON` | `0 6 * * *` | Horario (formato cron) |
| `TZ` | `Europe/Madrid` | Zona horaria del horario |
| `BACKUP_RETENTION_DAYS` | `30` | Días que se guardan las copias automáticas |
| `BACKUP_HOST_DIR` | `./backups` | Carpeta del servidor donde se guardan |
| `BACKUP_RCLONE_REMOTE` | *(vacío)* | Copia externa opcional con rclone, p. ej. `gdrive:jacksocialclub-backups` (config en `deploy/backup/rclone/rclone.conf`) |
| `ADMIN_EMAILS` | *(vacío)* | Emails que pueden abrir el panel de copias. Con el registro abierto, cualquiera podría registrarse con un email de esta lista que aún no tenga cuenta: en producción usa `ALLOW_REGISTRATION=false` |

Copia manual desde el servidor: `docker compose exec backup backup.sh manual`

### Panel de administración
Los usuarios cuyo email está en `ADMIN_EMAILS` ven **Copias de seguridad** en el menú: crear una copia, descargarla, subir un archivo `.dump` y restaurar. Restaurar pide escribir `RESTAURAR`, guarda antes una copia del estado actual y se hace en una sola transacción (si falla, los datos no cambian).

### Recuperación si la app no arranca
```bash
docker compose exec backup restore.sh appwebhours-20261018-060000-auto.dump
docker compose restart backend   # aplica migraciones pendientes
```
En un servidor nuevo: despliega, copia el `.dump` en `./backups` y ejecuta lo anterior.

> Las copias en el mismo servidor no protegen si se pierde el servidor. Descarga copias periódicamente o configura `BACKUP_RCLONE_REMOTE`.

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

GET|PATCH        /api/v1/business
GET|POST         /api/v1/admin/backups              (solo ADMIN_EMAILS)
POST             /api/v1/admin/backups/upload
GET              /api/v1/admin/backups/{name}/download
POST             /api/v1/admin/backups/{name}/restore
DELETE           /api/v1/admin/backups/{name}

GET|POST         /api/v1/employees
PATCH            /api/v1/employees/{id}

GET              /api/v1/business-days
GET              /api/v1/business-days/closed
GET              /api/v1/business-days/{date}
PUT              /api/v1/business-days/{date}/sales
POST             /api/v1/business-days/{date}/close
POST             /api/v1/business-days/{date}/reopen
```

Perfiles y reglas de negocio (roles, días cerrados, turnos de noche): ver [context.md](context.md).

Documentación interactiva disponible en `http://localhost:8000/docs` (solo en `ENVIRONMENT=development`).

## Seguridad

- Contraseñas hasheadas con bcrypt (cost 12)
- JWT access token (30 min) en memoria + refresh token (7 días) en cookie httpOnly
- CORS con lista blanca de orígenes
- Rate limiting en endpoints de auth (slowapi): login 10/min, registro 5/h, refresh 30/min por IP
- Registro público desactivable (`ALLOW_REGISTRATION=false` en producción)
- Cambiar la contraseña de un empleado cierra todas sus sesiones (`token_version`)
- La API no arranca con la `SECRET_KEY` de ejemplo
- Row-level security: cada query filtra por `user_id` del token
- Secrets exclusivamente en variables de entorno
