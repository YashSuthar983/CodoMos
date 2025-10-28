# GitHub PAT Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Give it a name: `CogniWork Integration`
3. Select the following scopes:
   - ✅ `repo` - Full control of private repositories
   - ✅ `read:org` - Read org and team membership, read org projects
   - ✅ `read:user` - Read user profile data

4. Click **Generate token**
5. **Copy the token** (you won't be able to see it again!)

### Step 2: Configure in CogniWork

1. Login to CogniWork as admin:
   - Email: `admin@cogniwork.dev`
   - Password: `admin`

2. Navigate to **Settings** page (in navbar)

3. In the **GitHub Integration** tab:
   - Paste your GitHub PAT in the input field
   - Click **Test Connection** to verify
   - You should see: ✅ "GitHub connection successful"
   - Click **Save Settings**

### Step 3: Link Your Repository

1. Go to **Projects** page
2. Create a new project or select existing
3. Click "Link Repository"
4. Enter your GitHub repository details:
   - Owner: `username` or `organization`
   - Name: `repository-name`

### Step 4: View Insights

1. Navigate to **Insights** page
2. Select your repository from dropdown
3. Click **Sync Data**
4. Explore the 6 analytics panels! 🎉

## Troubleshooting

### Error: "GitHub PAT not configured"
- Go to Settings → GitHub Integration tab
- Ensure PAT is entered and saved
- Click "Test Connection" to verify

### Error: "Repository not found"
- Go to Projects page
- Verify repository is linked correctly
- Check owner and name match your GitHub repo

### Error: "Failed to sync repository metadata"
- Verify your PAT has the correct scopes
- Check if the repository exists and you have access
- Try clicking "Sync Data" again

### Connection Test Fails
- Verify PAT is correct (try regenerating on GitHub)
- Check required scopes are selected
- Ensure no trailing spaces in PAT

## What Gets Synced?

The system fetches and caches:
- 📊 Repository metadata (stars, forks, languages)
- 🌿 Branches (with stale detection)
- 💻 Commits (with velocity analysis)
- 🐛 Issues (with labels and filters)
- 🔀 Pull Requests (with review stats)
- 👥 Contributors (with XP tracking)
- 🎯 Milestones (with progress)
- 📦 Releases
- 📈 Activity feed

## Security Notes

✅ **Your GitHub PAT is secure:**
- Stored encrypted in MongoDB
- Never exposed in API responses (masked as `ghp_****`)
- Only admins can view/modify settings
- Read-only access to GitHub (no write operations)

## Cache Behavior

- Data is cached for 1 hour
- Click "Sync Data" to force refresh
- Background sync can be enabled in Settings
- Cached data shown if GitHub API is unavailable

## Need Help?

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify MongoDB is running
3. Ensure GitHub PAT has not expired
4. Try regenerating the PAT with correct scopes
