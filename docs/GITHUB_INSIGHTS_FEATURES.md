# GitHub Insights Features Documentation

## Overview
Comprehensive GitHub repository analytics and contributor tracking system with XP gamification integrated into the CogniWork platform.

## Architecture

### Backend (FastAPI + MongoDB)
- **Models**: Extended data models for GitHub entities (repositories, branches, commits, issues, PRs, contributors, releases, milestones)
- **Services**: 
  - `GitHubInsightsService`: GraphQL and REST API integration for efficient data fetching
  - `XPCalculator`: Advanced XP calculation with bonuses, streaks, and decay
- **API Endpoints**: RESTful endpoints under `/api/v1/github-insights/`

### Frontend (React + Chakra UI + Recharts)
- **Repository Insights Dashboard**: `/insights` route with comprehensive analytics
- **Components**: Modular panels for different aspects of repository data
- **Data Visualization**: Interactive charts and graphs using Recharts

## Features Implemented

### 🧭 Repository Data & Insights
✅ **Repository Metadata**
- Stars, forks, watchers, size tracking
- Language breakdown with visual charts
- Topics and license information
- Last sync timestamp

✅ **Branch Management**
- All branches with last commit info
- Stale branch detection (30+ days)
- Protected and default branch indicators
- Ahead/behind tracking

✅ **Commit Analytics**
- Recent commits with author info
- Commit velocity graphs (daily/weekly/monthly)
- File changes and verification status
- PR associations

### 🧩 Issues & Pull Requests
✅ **Issues Overview**
- Open/closed issue filtering
- Label and assignee tracking
- Stale issue detection
- Activity age tracking

✅ **Pull Request Analytics**
- PR state tracking (open/closed/merged)
- Review statistics and approval rates
- Time to merge metrics
- Changes and file counts

✅ **Review Statistics**
- Average review response time
- Approval rates
- Reviews per PR
- Time to merge analysis

### 👥 Contributor Analytics
✅ **Contributor Tracking**
- Commit, PR, issue, and review counts
- Active/inactive status
- Primary languages and skills
- Last activity tracking

✅ **Analytics Dashboard**
- Total and active contributor counts
- Collaboration index
- Skill distribution
- Top contributors by different metrics

### 🏆 XP System
✅ **XP Events**
- Commits: +1 XP
- Closed Issues: +3 XP
- Merged PRs: +5 XP
- Code Reviews: +2 XP
- Milestones: +5 XP
- Releases: +10 XP

✅ **Bonus System**
- High priority issues: +2 bonus
- Early delivery: +3 bonus
- Streak bonuses: up to +10
- Quality bonuses: 20% multiplier
- First contribution: +10 bonus

✅ **Advanced Features**
- Streak tracking and rewards
- XP decay for inactivity
- Skill-based XP distribution
- Monthly/weekly/daily leaderboards

### 🗺️ Roadmap & Milestones
✅ **Milestone Tracking**
- Progress visualization
- Due date tracking
- Velocity calculations
- Issue associations

### 📊 Data Visualization
✅ **Interactive Charts**
- Commit velocity graphs
- Language distribution pie charts
- Contribution breakdown charts
- Progress bars for milestones

### 🔔 Activity Feed
✅ **Real-time Updates**
- Recent activity tracking
- Event type filtering
- Actor information
- Timestamp tracking

## API Endpoints

### Repository Insights
- `GET /api/v1/github-insights/repos/{repo_id}/metadata` - Repository metadata
- `GET /api/v1/github-insights/repos/{repo_id}/branches` - Branch information
- `GET /api/v1/github-insights/repos/{repo_id}/commits` - Recent commits
- `GET /api/v1/github-insights/repos/{repo_id}/commit-velocity` - Commit frequency analysis
- `GET /api/v1/github-insights/repos/{repo_id}/issues` - Issues with filters
- `GET /api/v1/github-insights/repos/{repo_id}/pull-requests` - Pull requests
- `GET /api/v1/github-insights/repos/{repo_id}/pr-review-stats` - PR review statistics
- `GET /api/v1/github-insights/repos/{repo_id}/contributors` - Contributor list
- `GET /api/v1/github-insights/repos/{repo_id}/contributor-analytics` - Detailed analytics
- `GET /api/v1/github-insights/repos/{repo_id}/releases` - Release history
- `GET /api/v1/github-insights/repos/{repo_id}/milestones` - Project milestones
- `GET /api/v1/github-insights/repos/{repo_id}/activity-feed` - Recent activities
- `POST /api/v1/github-insights/repos/{repo_id}/sync-all` - Trigger full sync

### XP System
- `GET /api/v1/xp/leaderboard` - XP leaderboard
- `GET /api/v1/xp/user/{user_id}/stats` - User XP statistics

## Configuration

### Environment Variables
Add to `.env`:
```env
# GitHub Integration (optional)
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY=your_private_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Redis Cache (optional)
REDIS_URL=redis://localhost:6379

# Notification Services (optional)
SLACK_WEBHOOK_URL=your_slack_webhook
DISCORD_WEBHOOK_URL=your_discord_webhook
```

### User Setup
1. Save GitHub PAT in user profile
2. Link repositories in Projects page
3. Configure webhook secrets for automated syncing
4. Map GitHub username for XP tracking

## Usage

### Initial Setup
1. Navigate to Projects page
2. Link a GitHub repository
3. Save your GitHub PAT in settings
4. Navigate to Insights page
5. Select repository and click "Sync Data"

### Regular Use
- View real-time repository analytics
- Monitor contributor activity
- Track XP and gamification progress
- Analyze PR and issue metrics
- Review milestone progress

## Security Considerations
- GitHub PAT stored securely per user
- Read-only access via GitHub GraphQL API
- Webhook signature verification
- Rate limiting and caching implemented
- No write operations to GitHub

## Performance Optimizations
- GraphQL for bulk data fetching
- Redis caching (5-minute TTL)
- Parallel API calls
- Background sync operations
- Incremental data updates

## Future Enhancements
- GitHub Projects v2 board integration
- Automated notifications (Slack/Discord)
- AI-powered issue summaries
- Predictive milestone completion
- Custom XP rules configuration
- Export analytics reports
- Team collaboration metrics
- Code quality integration

## Testing
```bash
# Backend tests
cd backend
.venv/bin/pytest tests/

# Frontend tests
cd frontend
npm test
```

## Troubleshooting

### Common Issues
1. **No data showing**: Ensure GitHub PAT is saved and has correct permissions
2. **Sync fails**: Check PAT has `repo` scope for private repos
3. **XP not awarded**: Verify GitHub username mapping
4. **Charts not loading**: Clear browser cache and refresh

### Required GitHub Permissions
- `repo` - Full repository access (for private repos)
- `read:org` - Read organization data
- `read:user` - Read user profile data

## Support
For issues or questions, please refer to the main project documentation or create an issue in the repository.
