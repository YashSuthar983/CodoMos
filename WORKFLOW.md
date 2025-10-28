# Dhappa - GitHub Integration Workflow

## The Complete Flow (4 Simple Steps)

```
┌─────────────────────────────────────────────────────────────┐
│                     STEP 1: DASHBOARD                        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Project A    │  │ Project B    │  │ Project C    │      │
│  │ 3 repos      │  │ 1 repo       │  │ 0 repos      │      │
│  │ ✓ Active     │  │ ✓ Active     │  │ ✓ Active     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│             [+ New Project]                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Click project card
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            STEP 2: PROJECT DETAIL PAGE                       │
│                                                               │
│  My Project              [+ Connect GitHub Repo]             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📊 Stats:  3 Repos  |  2 Webhooks  |  15 XP Events │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─ Linked Repositories ─────────────────────────────┐      │
│  │                                                     │      │
│  │  ✓ frontend-app     (owner/repo)    [✓ Active]   │      │
│  │  ✓ backend-api      (owner/repo)    [✓ Active]   │      │
│  │  ✓ docs             (owner/repo)    [No Webhook] │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Click "+ Connect GitHub Repo"
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         STEP 3: GITHUB CONNECTION WIZARD                     │
│                                                               │
│  ╔═══════════════════════════════════════════════════╗      │
│  ║ Connect GitHub Repository                    [×]  ║      │
│  ╠═══════════════════════════════════════════════════╣      │
│  ║                                                    ║      │
│  ║  Step 1: Enter GitHub Token                       ║      │
│  ║  Get your PAT from GitHub Settings                ║      │
│  ║  Required scopes: repo, admin:repo_hook           ║      │
│  ║                                                    ║      │
│  ║  [ghp_xxxxxxxxxxxxx]  [Load Repos]                ║      │
│  ║                                                    ║      │
│  ║  Step 2: Select Repository                        ║      │
│  ║  ┌────────────────────────────────────────────┐  ║      │
│  ║  │ Repository          Private    Action      │  ║      │
│  ║  ├────────────────────────────────────────────┤  ║      │
│  ║  │ my-app             Public   [Link & Hook]  │  ║      │
│  ║  │ private-repo       Private  [Link & Hook]  │  ║      │
│  ║  │ client-project     Private  [Link & Hook]  │  ║      │
│  ║  └────────────────────────────────────────────┘  ║      │
│  ╚═══════════════════════════════════════════════════╝      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Click "Link & Hook"
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 4: AUTOMATIC MAGIC ✨                      │
│                                                               │
│  Backend automatically:                                       │
│  ✓ Creates repo record in database                           │
│  ✓ Generates strong 40-char webhook secret                   │
│  ✓ Calls GitHub API to create webhook                        │
│  ✓ Adds repo to project's repo_ids                           │
│  ✓ Closes wizard, shows success toast                        │
│                                                               │
│  Result: Repo appears in "Linked Repositories" with          │
│          green "✓ Active" webhook badge                      │
└─────────────────────────────────────────────────────────────┘
```

## What Happens Behind the Scenes

### When You Click "Link & Create Webhook":

```javascript
// 1. Frontend creates repo
POST /api/v1/projects/repos
{
  "name": "my-app",
  "owner": "myusername",
  "repo_name": "my-app",
  "webhook_secret": "randomly_generated_40_char_string"
}
→ Returns: { id: "repo_abc123", ... }

// 2. Frontend creates GitHub webhook
POST /api/v1/projects/repos/repo_abc123/github/webhook
Headers: { "X-GitHub-PAT": "ghp_..." }
→ Backend calls GitHub API:
   POST https://api.github.com/repos/myusername/my-app/hooks
   {
     "name": "web",
     "active": true,
     "events": ["pull_request", "pull_request_review", "issues"],
     "config": {
       "url": "http://yourapp.com/api/v1/integrations/github/webhook/repo_abc123",
       "content_type": "json",
       "secret": "randomly_generated_40_char_string"
     }
   }
→ Returns webhook_id: 12345

// 3. Frontend links repo to project
PATCH /api/v1/projects/project_xyz789
{
  "repo_ids": ["existing_repo_1", "existing_repo_2", "repo_abc123"]
}

// DONE! 🎉
```

## Why This Flow is Better

### Before (Old Flow):
1. Go to scattered "Projects" page
2. Manually fill owner/repo fields
3. Manually generate webhook secret
4. Click separate "Create Hook" button
5. Hope everything works
6. Debug when it doesn't
7. Confusion about PAT storage

**Total: 7+ confusing steps, many failure points**

### After (New Flow):
1. Open project page
2. Click "+ Connect GitHub Repo"
3. Paste PAT, click "Load Repos"
4. Click "Link & Create Webhook"

**Total: 4 clear steps, automatic success**

## Key Design Principles

### 1. **Project-Centric**
- Everything revolves around projects
- Each project has its own dashboard
- Clear ownership: repos belong to projects

### 2. **Collapsible Wizard**
- Hidden by default (clean UI)
- Expands only when needed
- Auto-closes after success

### 3. **One-Click Actions**
- "Link & Create Webhook" does everything
- No manual secret generation
- No separate webhook creation step

### 4. **Clear Visual Feedback**
- Stats at top (repos, webhooks, XP)
- Green ✓ badges for active webhooks
- Success toasts for each action
- Loading states during API calls

### 5. **Temporary PAT Usage**
- Enter once per session
- Sent via X-GitHub-PAT header
- Not saved (unless user wants)
- More secure than global storage

## Common User Journeys

### New User First-Time Setup:
```
Login → See empty dashboard → 
Click "+ New Project" → Enter name → 
Click "+ Connect GitHub Repo" → 
Paste PAT → Load repos → 
Click "Link & Hook" → DONE!

Time: ~2 minutes
```

### Adding Another Repo to Existing Project:
```
Dashboard → Click project → 
Click "+ Connect GitHub Repo" → 
(PAT already in wizard) → Load repos → 
Click "Link & Hook" → DONE!

Time: ~30 seconds
```

### Managing Multiple Projects:
```
Dashboard shows all projects →
Each card shows repo count →
Click any project to manage its repos →
Each project isolated and organized

Time: Instant navigation
```

## Security Considerations

1. **PAT Never Saved in Frontend**
   - Stored in React state only
   - Cleared when wizard closes
   - Never in localStorage

2. **PAT Optional in Backend**
   - Can be saved encrypted
   - Or used via header only
   - User's choice

3. **Webhook Secrets**
   - Auto-generated (crypto-strong)
   - 40 characters minimum
   - Stored encrypted
   - Used to verify GitHub signatures

4. **CORS & Auth**
   - All routes require JWT
   - User can only see their projects
   - GitHub API calls proxied through backend

## API Reference

### Projects
- `GET /api/v1/projects/` - List all projects
- `POST /api/v1/projects/` - Create project
- `GET /api/v1/projects/{id}` - Get single project
- `PATCH /api/v1/projects/{id}` - Update project (including repo_ids)

### Repositories
- `GET /api/v1/projects/repos` - List all repos
- `POST /api/v1/projects/repos` - Create repo
- `POST /api/v1/projects/repos/{id}/github/webhook` - Create webhook
- `GET /api/v1/projects/repos/github/list` - List GitHub repos via PAT

### GitHub Integration
- All endpoints accept `X-GitHub-PAT` header
- If header present, use it; else use saved PAT
- If neither, return empty or error

## Troubleshooting Decision Tree

```
Can't see repos after Load Repos?
├─ Check PAT has `repo` scope
├─ Check PAT isn't expired
├─ If org repo: check SSO authorization
└─ Check browser console for errors

Webhook creation fails?
├─ Check PAT has `admin:repo_hook` scope
├─ Check owner/repo_name are correct
├─ Check backend logs for GitHub API error
└─ Try manual webhook creation as fallback

Project doesn't show linked repos?
├─ Check project.repo_ids array
├─ Verify repo IDs match actual repo documents
├─ Check backend logs for query errors
└─ Refresh page

PAT not working after save?
├─ Check backend /users/me endpoint returns github_pat
├─ Try header-based PAT instead
├─ Clear browser cache
└─ Check backend encryption/decryption
```

## Future Enhancements

### Phase 1 (Current) ✅
- Project-centric dashboard
- Single-page project view
- Collapsible GitHub wizard
- One-click repo linking

### Phase 2 (Next)
- GitHub App support (no PAT needed)
- Team member invitations
- Role-based access per project
- Repo-level settings

### Phase 3 (Later)
- Analytics dashboard per project
- PR velocity charts
- XP leaderboards
- Custom webhook events

---

**Questions?** Check the [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details.
