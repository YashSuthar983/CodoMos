"""
Pydantic schemas for GitHub Insights API responses
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, field_serializer


class RepositoryMetadataOut(BaseModel):
    id: Any
    repo_id: Any
    github_id: int
    full_name: str
    description: Optional[str] = None
    homepage: Optional[str] = None
    stars_count: int
    forks_count: int
    watchers_count: int
    open_issues_count: int
    size: int
    default_branch: str
    visibility: str
    archived: bool
    disabled: bool
    created_at: datetime
    updated_at: datetime
    pushed_at: Optional[datetime] = None
    last_synced: datetime
    license_key: Optional[str] = None
    license_name: Optional[str] = None
    primary_language: Optional[str] = None
    languages: Dict[str, int]
    topics: List[str]
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class BranchOut(BaseModel):
    id: Any
    repo_id: Any
    name: str
    is_default: bool
    is_protected: bool
    last_commit_sha: str
    last_commit_message: Optional[str] = None
    last_commit_author: Optional[str] = None
    last_commit_date: Optional[datetime] = None
    is_stale: bool
    ahead_by: int
    behind_by: int
    last_synced: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class CommitOut(BaseModel):
    id: Any
    repo_id: Any
    sha: str
    message: str
    author_login: Optional[str] = None
    author_email: Optional[str] = None
    author_date: datetime
    committer_login: Optional[str] = None
    committer_email: Optional[str] = None
    commit_date: datetime
    additions: int
    deletions: int
    total_changes: int
    files_changed: int
    pr_number: Optional[int] = None
    branch: Optional[str] = None
    verified: bool
    verification_reason: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class IssueOut(BaseModel):
    id: Any
    repo_id: Any
    github_id: int
    number: int
    title: str
    body: Optional[str] = None
    state: str
    author_login: str
    author_avatar: Optional[str] = None
    assignees: List[str]
    labels: List[str]
    milestone_id: Optional[int] = None
    milestone_title: Optional[str] = None
    comments_count: int
    reactions_count: int
    last_comment_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    ai_summary: Optional[str] = None
    ai_summary_date: Optional[datetime] = None
    days_since_activity: int
    is_stale: bool
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class PullRequestOut(BaseModel):
    id: Any
    repo_id: Any
    github_id: int
    number: int
    title: str
    body: Optional[str] = None
    state: str
    author_login: str
    author_avatar: Optional[str] = None
    assignees: List[str]
    requested_reviewers: List[str]
    labels: List[str]
    milestone_id: Optional[int] = None
    milestone_title: Optional[str] = None
    head_branch: str
    base_branch: str
    head_sha: str
    base_sha: str
    mergeable: Optional[bool] = None
    merged: bool
    merged_by: Optional[str] = None
    merge_commit_sha: Optional[str] = None
    additions: int
    deletions: int
    changed_files: int
    commits_count: int
    comments_count: int
    review_comments_count: int
    reviews: List[Dict[str, Any]]
    approved_count: int
    changes_requested_count: int
    linked_issues: List[int]
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    merged_at: Optional[datetime] = None
    time_to_first_review: Optional[int] = None
    time_to_merge: Optional[int] = None
    ai_summary: Optional[str] = None
    ai_commit_summary: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class ContributorOut(BaseModel):
    id: Any
    repo_id: Any
    login: str
    github_id: int
    avatar_url: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    commits_count: int
    prs_created: int
    prs_merged: int
    issues_created: int
    issues_closed: int
    reviews_given: int
    comments_made: int
    lines_added: int
    lines_deleted: int
    last_commit_date: Optional[datetime] = None
    last_pr_date: Optional[datetime] = None
    last_issue_date: Optional[datetime] = None
    last_activity_date: Optional[datetime] = None
    primary_languages: List[str]
    skill_tags: List[str]
    avg_pr_merge_time: Optional[float] = None
    pr_approval_rate: float
    is_active: bool
    days_inactive: int
    user_id: Optional[Any] = None
    total_xp_earned: int
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id', 'user_id')
    def serialize_id(self, v):
        return str(v) if v else None


class ReleaseOut(BaseModel):
    id: Any
    repo_id: Any
    github_id: int
    tag_name: str
    name: Optional[str] = None
    body: Optional[str] = None
    is_prerelease: bool
    is_draft: bool
    author_login: str
    assets: List[Dict[str, Any]]
    assets_count: int
    created_at: datetime
    published_at: Optional[datetime] = None
    download_count: int
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class MilestoneOut(BaseModel):
    id: Any
    repo_id: Any
    github_id: int
    number: int
    title: str
    description: Optional[str] = None
    state: str
    open_issues: int
    closed_issues: int
    progress_percentage: float
    created_at: datetime
    updated_at: datetime
    due_on: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    velocity: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class ProjectBoardOut(BaseModel):
    id: Any
    repo_id: Any
    github_id: int
    name: str
    description: Optional[str] = None
    columns: List[Dict[str, Any]]
    total_cards: int
    todo_count: int
    in_progress_count: int
    done_count: int
    avg_cycle_time: Optional[float] = None
    throughput: Optional[float] = None
    wip_limit_breached: bool
    last_synced: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class ActivityOut(BaseModel):
    id: Any
    repo_id: Any
    event_type: str
    event_id: Optional[str] = None
    actor_login: str
    actor_avatar: Optional[str] = None
    title: str
    description: Optional[str] = None
    metadata: Dict[str, Any]
    occurred_at: datetime
    notified: bool
    notification_channels: List[str]
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id', 'repo_id')
    def serialize_id(self, v):
        return str(v)


class XPStatsOut(BaseModel):
    total_xp: int
    skill_breakdown: Dict[str, float]
    recent_events: List[Dict[str, Any]]
    thirty_day_xp: int
    growth_rate: float
    current_streak: int
    rank: int
    
    model_config = ConfigDict(from_attributes=True)


class LeaderboardOut(BaseModel):
    id: Any
    period: str
    period_start: datetime
    period_end: datetime
    entries: List[Dict[str, Any]]
    total_participants: int
    total_xp_awarded: int
    generated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('id')
    def serialize_id(self, v):
        return str(v)


class RepositoryInsightsOut(BaseModel):
    metadata: RepositoryMetadataOut
    branch_count: int
    total_commits: int
    open_issues: int
    closed_issues: int
    open_prs: int
    merged_prs: int
    contributor_count: int
    release_count: int
    milestone_count: int
    
    model_config = ConfigDict(from_attributes=True)


class CommitVelocityOut(BaseModel):
    period: str
    buckets: List[Dict[str, Any]]
    total_commits: int
    average_commits: float
    
    model_config = ConfigDict(from_attributes=True)


class ContributorAnalyticsOut(BaseModel):
    total_contributors: int
    active_contributors: int
    inactive_contributors: int
    contribution_totals: Dict[str, int]
    top_contributors: Dict[str, List[Dict[str, Any]]]
    collaboration_index: float
    skill_distribution: Dict[str, int]
    
    model_config = ConfigDict(from_attributes=True)
