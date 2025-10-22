# CogniWork — Unified AI for People, Projects, and Product

A full‑stack project that connects hiring, skills, projects, and market intelligence into a single AI‑powered system.

- Backend: `FastAPI` + `Pydantic v2` + `MongoDB Atlas` + `Beanie`
- Frontend: `React` + `Vite` + `Chakra UI`
- AI Assist: Google Gemini for form field generation and automation suggestions


## Architecture
- `backend/` — FastAPI app, MongoDB/Beanie models, auth, routes
- `frontend/` — React app, protected routes, dashboard modules
- Key modules: Users, Candidates, Roles, Projects, Forms, XP Events, GitHub integration


## Prerequisites
- Python 3.12+
- Node.js 18+
- MongoDB Atlas connection string
- (Optional) Google Gemini API key for AI form assistant


## Quickstart

### 1) Backend setup
```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values
# MONGODB_URI=...
# MONGODB_DB=cogniwork
# JWT_SECRET_KEY=change_me
# BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
# (Optional) GEMINI_API_KEY=...  # from Google AI Studio

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:
- OpenAPI docs: http://127.0.0.1:8000/api/openapi.json
- Base: http://127.0.0.1:8000/api/v1

Default admin is seeded on startup if missing:
- Email: `admin@cogniwork.dev`
- Password: `admin`


### 2) Frontend setup
```
cd frontend
npm install
# Optional: cp .env.example .env  # VITE_API_URL defaults to http://127.0.0.1:8000/api/v1
npm run dev
```
Open: http://localhost:5173

Log in with the admin credentials above.


## Environment variables (backend)
- `MONGODB_URI` — MongoDB Atlas connection string
- `MONGODB_DB` — Database name (default: `cogniwork`)
- `JWT_SECRET_KEY` — Secret for signing JWTs
- `BACKEND_CORS_ORIGINS` — Comma‑separated origins (dev defaults provided)
- `GEMINI_API_KEY` — Enable AI Form Assistant (optional but recommended)
- `GEMINI_MODEL` — Defaults to `gemini-2.0-flash`

## Useful scripts (manual)
- Start backend: `.venv/bin/uvicorn app.main:app 
- Start frontend: `npm run dev`


## Project TODOs / Roadmap
- Authentication & RBAC
  - Harden roles/permissions and add admin UI controls
- Forms
  - Add `send_email` trigger with provider integration (e.g., SendGrid/SMTP)
  - Add trigger validation and preview runner in UI
  - Support nested/conditional fields in schema
- AI
  - Display AI health status and rate‑limit feedback in the UI
  - Add “refine” interaction loops and few‑shot examples
- Candidates & Projects
  - Candidate–Role matching pipeline UI
  - Project risk predictions and team suggestions wiring
- Integrations
  - GitHub webhook to XP pipeline (award XP on merged PRs)
  - Pluggable webhooks with secret signing

## Contributing
- Create a feature branch, open a PR.
- Keep backend and frontend changes scoped/atomic where possible.
- Update this README if you add new env vars or major flows.
