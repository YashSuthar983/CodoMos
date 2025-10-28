"""
GitHub data models for comprehensive repository insights
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from beanie import Document, PydanticObjectId
from pydantic import Field
from enum import Enum


class IssueState(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


class PRState(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    MERGED = "merged"


class RepositoryMetadata(Document):
    """Extended repository metadata from GitHub"""
    repo_id: PydanticObjectId  # Reference to our Repo model
    github_id: int
    full_name: str
    description: Optional[str] = None
    homepage: Optional[str] = None
    
    # Statistics
    stars_count: int = 0
    forks_count: int = 0
    watchers_count: int = 0
    open_issues_count: int = 0
    size: int = 0  # KB
    
    # Repository info
    default_branch: str = "main"
    visibility: str = "public"  # public, private, internal
    archived: bool = False
    disabled: bool = False
    
    # Languages
    primary_language: Optional[str] = None
    languages: Dict[str, int] = Field(default_factory=dict)  # {language: bytes}
    
    # Dates
    created_at: datetime
    updated_at: datetime
    pushed_at: Optional[datetime] = None
    last_synced: datetime = Field(default_factory=datetime.utcnow)
    
    # License
    license_key: Optional[str] = None
    license_name: Optional[str] = None
    
    # Topics
    topics: List[str] = Field(default_factory=list)
    
    class Settings:
        name = "repository_metadata"
        indexes = [
            "repo_id",
            "github_id",
            "full_name",
            "last_synced"
        ]


class Branch(Document):
    """Branch information"""
    repo_id: PydanticObjectId
    name: str
    is_default: bool = False
    is_protected: bool = False
    
    # Latest commit info
    last_commit_sha: str
    last_commit_message: Optional[str] = None
    last_commit_author: Optional[str] = None
    last_commit_date: Optional[datetime] = None
    
    # Stale detection
    is_stale: bool = False  # No commits in 30+ days
    ahead_by: int = 0  # Commits ahead of default branch
    behind_by: int = 0  # Commits behind default branch
    
    last_synced: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "branches"
        indexes = [
            "repo_id",
            "name",
            "is_default",
            "is_stale"
        ]


class Commit(Document):
    """Commit information"""
    repo_id: PydanticObjectId
    sha: str
    message: str
    author_login: Optional[str] = None
    author_email: Optional[str] = None
    author_date: datetime
    committer_login: Optional[str] = None
    committer_email: Optional[str] = None
    commit_date: datetime
    
    # Stats
    additions: int = 0
    deletions: int = 0
    total_changes: int = 0
    files_changed: int = 0
    
    # Relations
    pr_number: Optional[int] = None  # Associated PR if any
    branch: Optional[str] = None
    
    # Verification
    verified: bool = False
    verification_reason: Optional[str] = None
    
    class Settings:
        name = "commits"
        indexes = [
            "repo_id",
            "sha",
            "author_login",
            "author_date",
            "pr_number"
        ]


class Issue(Document):
    """Issue tracking"""
    repo_id: PydanticObjectId
    github_id: int
    number: int
    title: str
    body: Optional[str] = None
    state: IssueState
    
    # User info
    author_login: str
    author_avatar: Optional[str] = None
    assignees: List[str] = Field(default_factory=list)
    
    # Labels and metadata
    labels: List[str] = Field(default_factory=list)
    milestone_id: Optional[int] = None
    milestone_title: Optional[str] = None
    
    # Activity
    comments_count: int = 0
    reactions_count: int = 0
    last_comment_date: Optional[datetime] = None
    
    # Dates
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    
    # AI summary (generated)
    ai_summary: Optional[str] = None
    ai_summary_date: Optional[datetime] = None
    
    # Aging
    days_since_activity: int = 0
    is_stale: bool = False  # No activity in 14+ days
    
    class Settings:
        name = "issues"
        indexes = [
            "repo_id",
            "github_id",
            "number",
            "state",
            "author_login",
            "created_at"
        ]


class PullRequest(Document):
    """Pull Request tracking"""
    repo_id: PydanticObjectId
    github_id: int
    number: int
    title: str
    body: Optional[str] = None
    state: PRState
    
    # User info
    author_login: str
    author_avatar: Optional[str] = None
    assignees: List[str] = Field(default_factory=list)
    requested_reviewers: List[str] = Field(default_factory=list)
    
    # Labels and metadata
    labels: List[str] = Field(default_factory=list)
    milestone_id: Optional[int] = None
    milestone_title: Optional[str] = None
    
    # Branch info
    head_branch: str
    base_branch: str
    head_sha: str
    base_sha: str
    
    # Merge info
    mergeable: Optional[bool] = None
    merged: bool = False
    merged_by: Optional[str] = None
    merge_commit_sha: Optional[str] = None
    
    # Stats
    additions: int = 0
    deletions: int = 0
    changed_files: int = 0
    commits_count: int = 0
    comments_count: int = 0
    review_comments_count: int = 0
    
    # Reviews
    reviews: List[Dict[str, Any]] = Field(default_factory=list)
    approved_count: int = 0
    changes_requested_count: int = 0
    
    # Linked issues
    linked_issues: List[int] = Field(default_factory=list)
    
    # Dates
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    merged_at: Optional[datetime] = None
    
    # Performance metrics
    time_to_first_review: Optional[int] = None  # minutes
    time_to_merge: Optional[int] = None  # minutes
    
    # AI summary (generated)
    ai_summary: Optional[str] = None
    ai_commit_summary: Optional[str] = None
    
    class Settings:
        name = "pull_requests"
        indexes = [
            "repo_id",
            "github_id",
            "number",
            "state",
            "author_login",
            "merged",
            "created_at"
        ]


class Contributor(Document):
    """Contributor analytics"""
    repo_id: PydanticObjectId
    login: str
    github_id: int
    avatar_url: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    
    # Contribution stats
    commits_count: int = 0
    prs_created: int = 0
    prs_merged: int = 0
    issues_created: int = 0
    issues_closed: int = 0
    reviews_given: int = 0
    comments_made: int = 0
    
    # Lines of code
    lines_added: int = 0
    lines_deleted: int = 0
    
    # Recent activity
    last_commit_date: Optional[datetime] = None
    last_pr_date: Optional[datetime] = None
    last_issue_date: Optional[datetime] = None
    last_activity_date: Optional[datetime] = None
    
    # Skills (auto-detected from languages)
    primary_languages: List[str] = Field(default_factory=list)
    skill_tags: List[str] = Field(default_factory=list)  # frontend, backend, devops, docs, etc.
    
    # Performance
    avg_pr_merge_time: Optional[float] = None  # hours
    pr_approval_rate: float = 0.0  # percentage
    
    # Status
    is_active: bool = True
    days_inactive: int = 0
    
    # XP reference
    user_id: Optional[PydanticObjectId] = None  # Link to our User model
    total_xp_earned: int = 0
    
    class Settings:
        name = "contributors"
        indexes = [
            "repo_id",
            "login",
            "github_id",
            "user_id",
            "is_active"
        ]


class Release(Document):
    """Release and tag tracking"""
    repo_id: PydanticObjectId
    github_id: int
    tag_name: str
    name: Optional[str] = None
    body: Optional[str] = None  # Release notes
    
    # Version info
    is_prerelease: bool = False
    is_draft: bool = False
    
    # Author
    author_login: str
    
    # Assets
    assets: List[Dict[str, Any]] = Field(default_factory=list)
    assets_count: int = 0
    
    # Dates
    created_at: datetime
    published_at: Optional[datetime] = None
    
    # Download stats
    download_count: int = 0
    
    class Settings:
        name = "releases"
        indexes = [
            "repo_id",
            "github_id",
            "tag_name",
            "created_at"
        ]


class Milestone(Document):
    """Milestone tracking for roadmap"""
    repo_id: PydanticObjectId
    github_id: int
    number: int
    title: str
    description: Optional[str] = None
    state: str  # open, closed
    
    # Progress
    open_issues: int = 0
    closed_issues: int = 0
    progress_percentage: float = 0.0
    
    # Dates
    created_at: datetime
    updated_at: datetime
    due_on: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    # Estimates
    estimated_completion: Optional[datetime] = None  # AI prediction
    velocity: Optional[float] = None  # Issues closed per day
    
    class Settings:
        name = "milestones"
        indexes = [
            "repo_id",
            "github_id",
            "number",
            "state",
            "due_on"
        ]


class ProjectBoard(Document):
    """GitHub Projects v2 board tracking"""
    repo_id: PydanticObjectId
    github_id: int
    name: str
    description: Optional[str] = None
    
    # Columns
    columns: List[Dict[str, Any]] = Field(default_factory=list)
    # [{"id": "col_id", "name": "To Do", "cards_count": 5, "cards": [...]}]
    
    # Stats
    total_cards: int = 0
    todo_count: int = 0
    in_progress_count: int = 0
    done_count: int = 0
    
    # Performance metrics
    avg_cycle_time: Optional[float] = None  # hours from created to done
    throughput: Optional[float] = None  # cards completed per week
    wip_limit_breached: bool = False
    
    # Last synced
    last_synced: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "project_boards"
        indexes = [
            "repo_id",
            "github_id",
            "name"
        ]


class Activity(Document):
    """Activity feed events"""
    repo_id: PydanticObjectId
    event_type: str  # commit, pr_opened, pr_merged, issue_opened, issue_closed, review, release, etc.
    event_id: Optional[str] = None  # Reference to specific event
    
    # Actor
    actor_login: str
    actor_avatar: Optional[str] = None
    
    # Event details
    title: str
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamp
    occurred_at: datetime
    
    # Notification status
    notified: bool = False
    notification_channels: List[str] = Field(default_factory=list)  # slack, discord, email, etc.
    
    class Settings:
        name = "activities"
        indexes = [
            "repo_id",
            "event_type",
            "actor_login",
            "occurred_at",
            "notified"
        ]


class XPLeaderboard(Document):
    """XP leaderboard snapshot"""
    period: str  # daily, weekly, monthly, all-time
    period_start: datetime
    period_end: datetime
    
    # Leaderboard entries
    entries: List[Dict[str, Any]] = Field(default_factory=list)
    # [{"user_id": "...", "login": "...", "total_xp": 100, "rank": 1, "breakdown": {...}}]
    
    # Stats
    total_participants: int = 0
    total_xp_awarded: int = 0
    
    # Generated at
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "xp_leaderboards"
        indexes = [
            "period",
            "period_start",
            "generated_at"
        ]
