"""
GitHub Insights API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from beanie import PydanticObjectId
import asyncio

from app.api.deps import get_current_user
from app.models import (
    User, Repo, RepositoryMetadata, Branch, Commit, Issue, PullRequest,
    Contributor, Release, Milestone, ProjectBoard, Activity, XPLeaderboard,
    AppSettings
)
from app.services.github_insights import GitHubInsightsService
from app.services.xp_calculator import XPCalculator
from app.schemas.github_insights import (
    RepositoryMetadataOut, BranchOut, CommitOut, IssueOut, PullRequestOut,
    ContributorOut, ReleaseOut, MilestoneOut, ProjectBoardOut, ActivityOut,
    XPStatsOut, LeaderboardOut, RepositoryInsightsOut, CommitVelocityOut,
    ContributorAnalyticsOut
)

router = APIRouter(prefix="/github-insights", tags=["github-insights"])


@router.get("/repos/{repo_id}/metadata", response_model=RepositoryMetadataOut)
async def get_repository_metadata(
    repo_id: str,
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive repository metadata"""
    try:
        repo = await Repo.get(PydanticObjectId(repo_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid repository ID")
    
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Check if we need to refresh
    # Be defensive: if a corrupted/partial document exists, delete and re-sync
    metadata = None
    try:
        metadata = await RepositoryMetadata.find_one(RepositoryMetadata.repo_id == repo.id)
    except Exception:
        # Remove invalid document and force a fresh sync
        await RepositoryMetadata.find(RepositoryMetadata.repo_id == repo.id).delete()
        metadata = None
    
    if not metadata or refresh or (metadata and (datetime.utcnow() - metadata.last_synced).total_seconds() > 3600):
        # Refresh if no metadata, explicitly requested, or data is older than 1 hour
        # Ensure repository link is configured
        if not repo.owner or not repo.repo_name:
            raise HTTPException(
                status_code=400,
                detail="Repository owner/repo_name not configured. Set these on the Projects page or link the repo from GitHub list."
            )
        # Get GitHub PAT from centralized settings
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        
        if not github_pat:
            # If we have cached data, return it with a warning
            if metadata:
                return metadata
            raise HTTPException(
                status_code=400, 
                detail="GitHub Personal Access Token is not configured. Please ask your administrator to configure it in Settings."
            )
        
        try:
            service = GitHubInsightsService(github_pat)
            metadata = await service.sync_repository_metadata(repo)
        except Exception as e:
            # If sync fails but we have cached data, return it
            if metadata:
                return metadata
            raise HTTPException(status_code=500, detail=f"Failed to sync repository metadata: {str(e)}")
    
    if not metadata:
        raise HTTPException(
            status_code=404, 
            detail="No repository metadata found. Please ensure the repository is properly linked and sync data."
        )
    
    return metadata


@router.get("/repos/{repo_id}/branches", response_model=List[BranchOut])
async def get_repository_branches(
    repo_id: str,
    include_stale: bool = True,
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get all branches for a repository"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if refresh:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        if not github_pat:
            raise HTTPException(status_code=400, detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration.")
        service = GitHubInsightsService(github_pat)
        await service.sync_branches(repo)
    
    query = Branch.find(Branch.repo_id == repo.id)
    if not include_stale:
        query = query.find(Branch.is_stale == False)
    
    return await query.to_list()


@router.get("/repos/{repo_id}/commits", response_model=List[CommitOut])
async def get_repository_commits(
    repo_id: str,
    limit: int = Query(default=100, le=500),
    author: Optional[str] = None,
    since: Optional[datetime] = None,
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get recent commits for a repository"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if refresh:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        if not github_pat:
            raise HTTPException(status_code=400, detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration.")
        service = GitHubInsightsService(github_pat)
        await service.sync_recent_commits(repo, limit)
    
    query = Commit.find(Commit.repo_id == repo.id)
    
    if author:
        query = query.find(Commit.author_login == author)
    
    if since:
        query = query.find(Commit.author_date >= since)
    
    return await query.sort(-Commit.author_date).limit(limit).to_list()


@router.get("/repos/{repo_id}/commit-velocity")
async def get_commit_velocity(
    repo_id: str,
    period: str = Query(default="weekly", regex="^(daily|weekly|monthly)$"),
    current_user: User = Depends(get_current_user)
):
    """Get commit velocity graph data"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Calculate time buckets
    now = datetime.utcnow()
    if period == "daily":
        start_date = now - timedelta(days=30)
        bucket_size = timedelta(days=1)
        num_buckets = 30
    elif period == "weekly":
        start_date = now - timedelta(weeks=12)
        bucket_size = timedelta(weeks=1)
        num_buckets = 12
    else:  # monthly
        start_date = now - timedelta(days=365)
        bucket_size = timedelta(days=30)
        num_buckets = 12
    
    # Aggregate commits by time bucket
    buckets = []
    for i in range(num_buckets):
        bucket_start = start_date + (bucket_size * i)
        bucket_end = bucket_start + bucket_size
        
        commits = await Commit.find(
            Commit.repo_id == repo.id,
            Commit.author_date >= bucket_start,
            Commit.author_date < bucket_end
        ).to_list()
        
        buckets.append({
            "period_start": bucket_start,
            "period_end": bucket_end,
            "commit_count": len(commits),
            "unique_authors": len(set(c.author_login for c in commits if c.author_login)),
            "total_changes": sum(c.total_changes for c in commits)
        })
    
    return {
        "period": period,
        "buckets": buckets,
        "total_commits": sum(b["commit_count"] for b in buckets),
        "average_commits": sum(b["commit_count"] for b in buckets) / num_buckets
    }


@router.get("/repos/{repo_id}/issues", response_model=List[IssueOut])
async def get_repository_issues(
    repo_id: str,
    state: Optional[str] = Query(default="open", regex="^(open|closed|all)$"),
    labels: Optional[List[str]] = Query(default=None),
    assignee: Optional[str] = None,
    milestone: Optional[int] = None,
    sort: str = Query(default="created", regex="^(created|updated|comments)$"),
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get issues with filters"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if refresh:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        if not github_pat:
            raise HTTPException(status_code=400, detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration.")
        service = GitHubInsightsService(github_pat)
        await service.sync_issues(repo, state)
    
    query = Issue.find(Issue.repo_id == repo.id)
    
    if state != "all":
        query = query.find(Issue.state == state)
    
    if labels:
        query = query.find({"labels": {"$in": labels}})
    
    if assignee:
        query = query.find({"assignees": assignee})
    
    if milestone:
        query = query.find(Issue.milestone_id == milestone)
    
    # Sort
    if sort == "updated":
        query = query.sort(-Issue.updated_at)
    elif sort == "comments":
        query = query.sort(-Issue.comments_count)
    else:
        query = query.sort(-Issue.created_at)
    
    return await query.to_list()


@router.get("/repos/{repo_id}/pull-requests", response_model=List[PullRequestOut])
async def get_repository_pull_requests(
    repo_id: str,
    state: Optional[str] = Query(default="open", regex="^(open|closed|merged|all)$"),
    author: Optional[str] = None,
    reviewer: Optional[str] = None,
    sort: str = Query(default="created", regex="^(created|updated|popularity)$"),
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get pull requests with filters"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if refresh:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        if not github_pat:
            raise HTTPException(status_code=400, detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration.")
        service = GitHubInsightsService(github_pat)
        await service.sync_pull_requests(repo, state)
    
    query = PullRequest.find(PullRequest.repo_id == repo.id)
    
    if state != "all":
        if state == "merged":
            query = query.find(PullRequest.merged == True)
        else:
            query = query.find(PullRequest.state == state)
    
    if author:
        query = query.find(PullRequest.author_login == author)
    
    if reviewer:
        query = query.find({"requested_reviewers": reviewer})
    
    # Sort
    if sort == "updated":
        query = query.sort(-PullRequest.updated_at)
    elif sort == "popularity":
        query = query.sort(-PullRequest.comments_count)
    else:
        query = query.sort(-PullRequest.created_at)
    
    return await query.to_list()


@router.get("/repos/{repo_id}/pr-review-stats")
async def get_pr_review_stats(
    repo_id: str,
    period_days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get PR review statistics"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    since = datetime.utcnow() - timedelta(days=period_days)
    
    prs = await PullRequest.find(
        PullRequest.repo_id == repo.id,
        PullRequest.created_at >= since
    ).to_list()
    
    total_prs = len(prs)
    merged_prs = [pr for pr in prs if pr.merged]
    
    # Calculate statistics
    total_reviews = sum(pr.approved_count + pr.changes_requested_count for pr in prs)
    avg_reviews_per_pr = total_reviews / total_prs if total_prs > 0 else 0
    
    approval_rate = len(merged_prs) / total_prs * 100 if total_prs > 0 else 0
    
    # Time to merge statistics
    merge_times = [pr.time_to_merge for pr in merged_prs if pr.time_to_merge]
    avg_time_to_merge = sum(merge_times) / len(merge_times) if merge_times else 0
    
    # Review response time
    review_times = []
    for pr in prs:
        if pr.reviews and pr.created_at:
            first_review = min(pr.reviews, key=lambda r: r.get("created_at", ""))
            if first_review.get("created_at"):
                review_time = (
                    datetime.fromisoformat(first_review["created_at"].replace("Z", "+00:00")) - 
                    pr.created_at
                ).total_seconds() / 3600  # Convert to hours
                review_times.append(review_time)
    
    avg_review_response = sum(review_times) / len(review_times) if review_times else 0
    
    return {
        "period_days": period_days,
        "total_prs": total_prs,
        "merged_prs": len(merged_prs),
        "approval_rate": approval_rate,
        "avg_reviews_per_pr": avg_reviews_per_pr,
        "avg_time_to_merge_hours": avg_time_to_merge / 60,
        "avg_review_response_hours": avg_review_response,
        "total_reviews": total_reviews,
        "approved_reviews": sum(pr.approved_count for pr in prs),
        "changes_requested": sum(pr.changes_requested_count for pr in prs)
    }


@router.get("/repos/{repo_id}/contributors", response_model=List[ContributorOut])
async def get_repository_contributors(
    repo_id: str,
    active_only: bool = False,
    limit: int = Query(default=50, le=200),
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get repository contributors with analytics"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if refresh:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        if not github_pat:
            raise HTTPException(status_code=400, detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration.")
        service = GitHubInsightsService(github_pat)
        await service.sync_contributors(repo)
    
    query = Contributor.find(Contributor.repo_id == repo.id)
    
    if active_only:
        query = query.find(Contributor.is_active == True)
    
    return await query.sort(-Contributor.commits_count).limit(limit).to_list()


@router.get("/repos/{repo_id}/contributor-analytics")
async def get_contributor_analytics(
    repo_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed contributor analytics"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    contributors = await Contributor.find(Contributor.repo_id == repo.id).to_list()
    
    # Calculate statistics
    total_contributors = len(contributors)
    active_contributors = len([c for c in contributors if c.is_active])
    
    # Contribution breakdown
    total_commits = sum(c.commits_count for c in contributors)
    total_prs = sum(c.prs_created for c in contributors)
    total_issues = sum(c.issues_created for c in contributors)
    total_reviews = sum(c.reviews_given for c in contributors)
    
    # Top contributors by different metrics
    top_by_commits = sorted(contributors, key=lambda c: c.commits_count, reverse=True)[:5]
    top_by_prs = sorted(contributors, key=lambda c: c.prs_merged, reverse=True)[:5]
    top_by_issues = sorted(contributors, key=lambda c: c.issues_closed, reverse=True)[:5]
    
    # Collaboration index (average interactions between contributors)
    collaboration_score = 0
    if total_contributors > 1:
        collaboration_score = (total_reviews + total_prs * 2) / total_contributors
    
    # Skill distribution
    skill_distribution = {}
    for contributor in contributors:
        for lang in contributor.primary_languages:
            skill_distribution[lang] = skill_distribution.get(lang, 0) + 1
    
    return {
        "total_contributors": total_contributors,
        "active_contributors": active_contributors,
        "inactive_contributors": total_contributors - active_contributors,
        "contribution_totals": {
            "commits": total_commits,
            "pull_requests": total_prs,
            "issues": total_issues,
            "reviews": total_reviews
        },
        "top_contributors": {
            "by_commits": [{"login": c.login, "count": c.commits_count} for c in top_by_commits],
            "by_prs": [{"login": c.login, "count": c.prs_merged} for c in top_by_prs],
            "by_issues": [{"login": c.login, "count": c.issues_closed} for c in top_by_issues]
        },
        "collaboration_index": collaboration_score,
        "skill_distribution": skill_distribution
    }


@router.get("/repos/{repo_id}/releases", response_model=List[ReleaseOut])
async def get_repository_releases(
    repo_id: str,
    include_prereleases: bool = True,
    limit: int = Query(default=20, le=50),
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get repository releases"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if refresh:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        if not github_pat:
            raise HTTPException(status_code=400, detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration.")
        service = GitHubInsightsService(github_pat)
        await service.sync_releases(repo)
    
    query = Release.find(Release.repo_id == repo.id)
    
    if not include_prereleases:
        query = query.find(Release.is_prerelease == False)
    
    return await query.sort(-Release.created_at).limit(limit).to_list()


@router.get("/repos/{repo_id}/milestones", response_model=List[MilestoneOut])
async def get_repository_milestones(
    repo_id: str,
    state: Optional[str] = Query(default="open", regex="^(open|closed|all)$"),
    refresh: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get repository milestones with progress"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if refresh:
        settings = await AppSettings.get_app_settings()
        github_pat = settings.get_github_pat()
        if not github_pat:
            raise HTTPException(status_code=400, detail="GitHub PAT not configured. Please configure it in Settings → GitHub Integration.")
        service = GitHubInsightsService(github_pat)
        await service.sync_milestones(repo)
    
    query = Milestone.find(Milestone.repo_id == repo.id)
    
    if state != "all":
        query = query.find(Milestone.state == state)
    
    return await query.sort(-Milestone.due_on).to_list()


@router.get("/repos/{repo_id}/activity-feed", response_model=List[ActivityOut])
async def get_activity_feed(
    repo_id: str,
    event_types: Optional[List[str]] = Query(default=None),
    limit: int = Query(default=50, le=200),
    since: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    """Get activity feed for a repository"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    query = Activity.find(Activity.repo_id == repo.id)
    
    if event_types:
        query = query.find({"event_type": {"$in": event_types}})
    
    if since:
        query = query.find(Activity.occurred_at >= since)
    
    return await query.sort(-Activity.occurred_at).limit(limit).to_list()


@router.get("/xp/leaderboard", response_model=LeaderboardOut)
async def get_xp_leaderboard(
    period: str = Query(default="all-time", regex="^(daily|weekly|monthly|all-time)$"),
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get XP leaderboard"""
    calculator = XPCalculator()
    leaderboard = await calculator.generate_leaderboard(period, limit)
    return leaderboard


@router.get("/xp/user/{user_id}/stats", response_model=XPStatsOut)
async def get_user_xp_stats(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive XP statistics for a user"""
    calculator = XPCalculator()
    stats = await calculator.get_user_xp_stats(PydanticObjectId(user_id))
    return stats


@router.post("/repos/{repo_id}/sync-all")
async def sync_all_repository_data(
    repo_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Trigger a full sync of all repository data"""
    repo = await Repo.get(PydanticObjectId(repo_id))
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # Get GitHub PAT from centralized settings
    settings = await AppSettings.get_app_settings()
    github_pat = settings.get_github_pat()
    
    if not github_pat:
        raise HTTPException(
            status_code=400, 
            detail="GitHub PAT not configured. Please ask your administrator to configure it in Settings."
        )
    
    # Add sync task to background
    background_tasks.add_task(sync_repository_data, repo, github_pat)
    
    return {"message": "Repository sync started", "repo_id": repo_id}


async def sync_repository_data(repo: Repo, github_pat: str):
    """Background task to sync all repository data"""
    service = GitHubInsightsService(github_pat)
    
    try:
        # Sync all data types
        await service.sync_repository_metadata(repo)
        await service.sync_branches(repo)
        await service.sync_recent_commits(repo)
        await service.sync_issues(repo)
        await service.sync_pull_requests(repo)
        await service.sync_contributors(repo)
        await service.sync_releases(repo)
        await service.sync_milestones(repo)
        
        # Create activity entry for successful sync
        await Activity(
            repo_id=repo.id,
            event_type="sync_completed",
            actor_login="system",
            title="Repository data synchronized",
            description=f"Successfully synced all data for {repo.name}",
            occurred_at=datetime.utcnow()
        ).insert()
        
    except Exception as e:
        # Log error
        await Activity(
            repo_id=repo.id,
            event_type="sync_failed",
            actor_login="system",
            title="Repository sync failed",
            description=str(e),
            occurred_at=datetime.utcnow()
        ).insert()
        raise
