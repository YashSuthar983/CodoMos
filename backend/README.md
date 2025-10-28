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


## GitHub Webhook Integration

Use this to award XP for repository activities. The webhook endpoint accepts GitHub events and awards XP for:

- `pull_request` closed and merged: awards to PR author
- `pull_request_review` submitted with state `approved` or `commented`: awards to the reviewer
- `issues` closed: awards to the actor who closed the issue

XP amounts by default:
- pr_merged: 10
- review_approved: 4
- review_commented: 2
- issue_closed: 5

The user is identified by matching the relevant GitHub login (author, reviewer, or closer) to `User.github_username`. If the linked `Repo` has tags, XP is split across those tags as `skill_distribution`.

Setup steps:
1) Create a repo record and optional secret
   - POST `/api/v1/projects/repos` with `{ "name": "my-repo", "tags": ["frontend"], "webhook_secret": "<your-secret>" }`
   - Or via UI: Dashboard -> Projects & Repos -> Link a Repo (optional Webhook Secret)

2) Configure GitHub webhook
   - Go to GitHub: Repository -> Settings -> Webhooks -> Add webhook
   - Payload URL: `https://<your-host>/api/v1/integrations/github/webhook/<repo_id>`
   - Content type: `application/json`
   - Secret: use the same `webhook_secret` you saved in step 1
   - Events: Choose “Let me select individual events” and check “Pull requests”

3) Map your user to GitHub username
   - PATCH `/api/v1/users/me` with `{ "github_username": "octocat" }`
   - Or via UI: Projects & Repos -> "Your GitHub Username"

Security:
- If a `webhook_secret` is set on the repo, the endpoint verifies HMAC signatures from GitHub (`X-Hub-Signature-256` preferred, `X-Hub-Signature` fallback)
- `ping` events respond with `{ ok: true, pong: true }`

Local testing without secret:
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: pull_request' \
  -d '{
    "action": "closed",
    "pull_request": { "merged": true, "user": { "login": "octocat" } }
  }' \
  http://127.0.0.1:8000/api/v1/integrations/github/webhook/<repo_id>
```

Local testing with secret (sha256):
```bash
SECRET='your-webhook-secret'
READ_URL='http://127.0.0.1:8000/api/v1/integrations/github/webhook/<repo_id>'
payload='{"action":"closed","pull_request":{"merged":true,"user":{"login":"octocat"}}}'
sig=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: pull_request' \
  -H "X-Hub-Signature-256: sha256=$sig" \
  -d "$payload" \
  "$READ_URL"
```

Review approved/commented example:
```bash
payload='{"action":"submitted","review":{"state":"approved","user":{"login":"reviewer1"}}}'
sig=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: pull_request_review' \
  -H "X-Hub-Signature-256: sha256=$sig" \
  -d "$payload" \
  "$READ_URL"
```

Issue closed example:
```bash
payload='{"action":"closed","sender":{"login":"closer1"}}'
sig=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: issues' \
  -H "X-Hub-Signature-256: sha256=$sig" \
  -d "$payload" \
  "$READ_URL"
```

Notes:
- Endpoint path is unauthenticated to allow GitHub to call it
- If no secret is configured, signature verification is skipped (use a secret in production)

### Private Repos and PAT

For private repositories, you can programmatically create/delete webhooks using a GitHub Personal Access Token (PAT):

- Save your PAT in the app: PATCH `/api/v1/users/me` with `{ "github_pat": "<token>" }` or via UI (Projects & Repos → Your GitHub Settings)
- Recommended PAT scopes:
  - `admin:repo_hook` (manage webhooks)
  - `repo` (access private repositories)
- Ensure `PUBLIC_BASE_URL` is set in backend `.env` so the server constructs the correct callback URL for GitHub (e.g., `https://api.example.com`). Defaults to `http://127.0.0.1:8000`.

Endpoints to manage GitHub webhooks:
- POST `/api/v1/projects/repos/{repo_id}/github/webhook` (body optional: `{ owner, repo_name, events }`)
- DELETE `/api/v1/projects/repos/{repo_id}/github/webhook`

Both endpoints require:
- The current user to have a saved `github_pat`
- The repo to have `owner`, `repo_name`, and `webhook_secret` set
