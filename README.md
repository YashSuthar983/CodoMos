# CogniWork — Unified AI for People, Projects, and Product

A full‑stack project that connects hiring, skills, projects, and market intelligence into a single AI‑powered system with comprehensive GitHub repository insights and XP gamification.

- Backend: `FastAPI` + `Pydantic v2` + `MongoDB Atlas` + `Beanie` + `GraphQL`
- Frontend: `React` + `Vite` + `Chakra UI` + `Recharts`
- AI Assist: Google Gemini for form field generation and automation suggestions
- GitHub Integration: GraphQL API for repository analytics, XP tracking, and contributor insights


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

## GitHub Webhook Integration

Award XP to contributors automatically when a PR is merged.

What it does:
- On GitHub `pull_request` events where `action=closed` and `pull_request.merged=true`, the backend awards an `XPEvent` to the user whose `github_username` matches the PR author.
- If the `Repo` linked in CogniWork has tags, XP is split across those tags as `skill_distribution`.

How to set it up:
1) Link a repo in the UI and optionally set a webhook secret
   - App -> Projects & Repos -> "Link a Repo"
   - Fill Name, optional Tags, and optional Webhook Secret
   - After creation, click "Copy Webhook URL" next to the repo to get the endpoint URL

2) Configure GitHub webhook on your repository
   - GitHub -> Repo -> Settings -> Webhooks -> Add webhook
   - Payload URL: `https://<your-host>/api/v1/integrations/github/webhook/<repo_id>`
   - Content type: `application/json`
   - Secret: use the same secret you set in step 1 (recommended for production)
   - Events: Select “Pull requests”

3) Map your user to your GitHub username
   - App -> Projects & Repos -> "Your GitHub Username" -> Save

Security and testing:
- If a `webhook_secret` is set on the repo, the backend verifies `X-Hub-Signature-256` (preferred) or `X-Hub-Signature` HMAC signatures.
- `ping` events return `{ ok: true, pong: true }`.
- You can simulate locally from the Projects page using "Simulate PR merged", or via cURL (see `backend/README.md` for sample commands, with/without secret).

Notes:
- Endpoint is unauthenticated to allow GitHub to call it. Use a secret in production.

## GitHub Insights Features

### 🚀 New Comprehensive GitHub Analytics Dashboard

Navigate to the **Insights** page to access powerful repository analytics:

**Repository Insights:**
- Stars, forks, watchers, and size tracking
- Language distribution with visual charts  
- Branch management with stale detection
- Commit velocity graphs

**Issues & Pull Requests:**
- Advanced filtering and search
- Review statistics and approval rates
- Time to merge analysis
- PR frequency charts

**Contributor Analytics:**
- Comprehensive contribution tracking
- Active/inactive status monitoring
- Skill distribution analysis
- Collaboration index metrics

**XP Gamification System:**
- Automatic XP for GitHub activities (commits +1, issues +3, PRs +5, reviews +2, milestones +5)
- Streak bonuses and quality rewards
- Monthly/weekly/daily leaderboards
- Skill-based XP distribution

**Milestones & Roadmap:**
- Progress tracking with visual indicators
- Velocity calculations
- Predictive completion dates

### Setup GitHub Insights

1. **Save GitHub PAT**: Go to user profile and save your GitHub Personal Access Token
2. **Link Repository**: Navigate to Projects page and link your GitHub repositories
3. **View Insights**: Click on "Insights" in the navbar
4. **Sync Data**: Select a repository and click "Sync Data" to fetch latest information

For detailed documentation, see [GitHub Insights Features Documentation](docs/GITHUB_INSIGHTS_FEATURES.md)

## Contributing
- Create a feature branch, open a PR.
- Keep backend and frontend changes scoped/atomic where possible.
- Update this README if you add new env vars or major flows.

