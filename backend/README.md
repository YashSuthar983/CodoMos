# CogniWork Backend

FastAPI backend with MongoDB Atlas (Beanie ODM), JWT auth, forms, candidates, roles, projects/repos, XP events, and a GitHub webhook.

## Prerequisites
- A MongoDB Atlas connection string (SRV URI)

## Setup

1) Create a Python virtual environment (recommended)

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

2) Install dependencies

```bash
pip install -r backend/requirements.txt
```

3) Create `backend/.env`

```env
# copy from .env.example and fill values
JWT_SECRET_KEY=change_me_in_prod
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DB=cogniwork
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

4) Run the API

```bash
uvicorn app.main:app --reload --app-dir backend --host 127.0.0.1 --port 8000
```

API will be available at http://127.0.0.1:8000

Default admin user (auto-seeded on first run):
- email: admin@cogniwork.local
- password: admin

## Key Endpoints (prefix /api/v1)
- POST /auth/login (OAuth2 password) -> token
- POST /auth/signup -> create user
- GET /users/me -> current user info
- CRUD /candidates
- CRUD /roles
- CRUD /projects and /projects/repos
- CRUD /forms and /forms/{id}/responses
- GET /xp/events
- POST /integrations/github/webhook/{repo_id}

Public forms endpoints (no auth):
- GET /public/forms/{form_id}
- POST /public/forms/{form_id}/responses

To test GitHub webhook locally, create a repo via POST /projects/repos, note the repo_id (string), and send simulated events to /api/v1/integrations/github/webhook/{repo_id}.
