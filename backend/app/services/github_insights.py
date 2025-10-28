"""
GitHub Insights Service - Comprehensive GitHub data fetching using GraphQL and REST APIs
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx
from github import Github
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport
from beanie import PydanticObjectId
import logging
from cachetools import TTLCache
import json

from app.models import (
    Repo, RepositoryMetadata, Branch, Commit, Issue, PullRequest,
    Contributor, Release, Milestone, ProjectBoard, Activity,
    IssueState, PRState
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class GitHubInsightsService:
    """Service for fetching comprehensive GitHub repository data"""
    
    def __init__(self, token: str):
        self.token = token
        self.rest_client = Github(token)
        
        # Setup GraphQL client
        transport = AIOHTTPTransport(
            url="https://api.github.com/graphql",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.graphql_client = Client(transport=transport, fetch_schema_from_transport=True)
        
        # Cache for expensive operations (TTL: 5 minutes)
        self.cache = TTLCache(maxsize=100, ttl=300)
    
    async def sync_repository_metadata(self, repo: Repo) -> RepositoryMetadata:
        """Sync repository metadata from GitHub"""
        cache_key = f"metadata:{repo.owner}/{repo.repo_name}"
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Ensure repository link is properly configured
        if not repo.owner or not repo.repo_name:
            raise ValueError("Repository owner/repo_name not configured. Please set 'owner' and 'repo_name' for this repo in Projects.")
        
        # GraphQL query for repository metadata
        query = gql("""
            query getRepository($owner: String!, $name: String!) {
                repository(owner: $owner, name: $name) {
                    id
                    databaseId
                    nameWithOwner
                    description
                    homepageUrl
                    stargazerCount
                    forkCount
                    watchers {
                        totalCount
                    }
                    issues(states: OPEN) {
                        totalCount
                    }
                    diskUsage
                    defaultBranchRef {
                        name
                    }
                    visibility
                    isArchived
                    isDisabled
                    createdAt
                    updatedAt
                    pushedAt
                    licenseInfo {
                        key
                        name
                    }
                    primaryLanguage {
                        name
                    }
                    languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                        edges {
                            node {
                                name
                            }
                            size
                        }
                    }
                    repositoryTopics(first: 10) {
                        nodes {
                            topic {
                                name
                            }
                        }
                    }
                }
            }
        """)
        
        try:
            result = await self.graphql_client.execute_async(
                query, 
                variable_values={"owner": repo.owner, "name": repo.repo_name}
            )
            
            repo_data = result["repository"]
            if not repo_data:
                raise ValueError(f"Repository '{repo.owner}/{repo.repo_name}' not found on GitHub.")
            
            # Transform languages data
            languages = {}
            for edge in repo_data.get("languages", {}).get("edges", []):
                languages[edge["node"]["name"]] = edge["size"]
            
            # Extract topics
            topics = [
                node["topic"]["name"] 
                for node in repo_data.get("repositoryTopics", {}).get("nodes", [])
            ]
            
            # Compute common field values
            github_id = repo_data["databaseId"]
            full_name = repo_data["nameWithOwner"]
            description = repo_data.get("description")
            homepage = repo_data.get("homepageUrl")
            stars_count = repo_data["stargazerCount"]
            forks_count = repo_data["forkCount"]
            watchers_count = repo_data["watchers"]["totalCount"]
            open_issues_count = repo_data["issues"]["totalCount"]
            size = repo_data.get("diskUsage", 0)
            default_branch = repo_data.get("defaultBranchRef", {}).get("name", "main")
            visibility = repo_data.get("visibility", "PUBLIC").lower()
            archived = repo_data.get("isArchived", False)
            disabled = repo_data.get("isDisabled", False)
            created_at = datetime.fromisoformat(repo_data["createdAt"].replace("Z", "+00:00"))
            updated_at = datetime.fromisoformat(repo_data["updatedAt"].replace("Z", "+00:00"))
            pushed_at = datetime.fromisoformat(repo_data["pushedAt"].replace("Z", "+00:00")) if repo_data.get("pushedAt") else None
            license_key = repo_data["licenseInfo"].get("key") if repo_data.get("licenseInfo") else None
            license_name = repo_data["licenseInfo"].get("name") if repo_data.get("licenseInfo") else None
            primary_language = repo_data["primaryLanguage"]["name"] if repo_data.get("primaryLanguage") else None
            last_synced = datetime.utcnow()
            
            # Create or update metadata document
            metadata = None
            try:
                metadata = await RepositoryMetadata.find_one(
                    RepositoryMetadata.repo_id == repo.id
                )
            except Exception as fetch_err:
                # If an invalid/partial document exists (e.g., only repo_id), remove it and recreate
                logger.warning(
                    "Invalid RepositoryMetadata document found for repo_id=%s. Error: %s. Deleting and recreating.",
                    str(repo.id), str(fetch_err)
                )
                await RepositoryMetadata.find(RepositoryMetadata.repo_id == repo.id).delete()
                metadata = None
            
            if not metadata:
                # Create a brand new document with all required fields populated
                metadata = RepositoryMetadata(
                    repo_id=repo.id,
                    github_id=github_id,
                    full_name=full_name,
                    description=description,
                    homepage=homepage,
                    stars_count=stars_count,
                    forks_count=forks_count,
                    watchers_count=watchers_count,
                    open_issues_count=open_issues_count,
                    size=size,
                    default_branch=default_branch,
                    visibility=visibility,
                    archived=archived,
                    disabled=disabled,
                    created_at=created_at,
                    updated_at=updated_at,
                    pushed_at=pushed_at,
                    license_key=license_key,
                    license_name=license_name,
                    primary_language=primary_language,
                    languages=languages,
                    topics=topics,
                    last_synced=last_synced,
                )
                await metadata.insert()
            else:
                # Update fields on existing document
                metadata.github_id = github_id
                metadata.full_name = full_name
                metadata.description = description
                metadata.homepage = homepage
                metadata.stars_count = stars_count
                metadata.forks_count = forks_count
                metadata.watchers_count = watchers_count
                metadata.open_issues_count = open_issues_count
                metadata.size = size
                metadata.default_branch = default_branch
                metadata.visibility = visibility
                metadata.archived = archived
                metadata.disabled = disabled
                metadata.created_at = created_at
                metadata.updated_at = updated_at
                metadata.pushed_at = pushed_at
                metadata.license_key = license_key
                metadata.license_name = license_name
                metadata.primary_language = primary_language
                metadata.languages = languages
                metadata.topics = topics
                metadata.last_synced = last_synced
                await metadata.save()
            
            self.cache[cache_key] = metadata
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to sync repository metadata: {e}")
            raise

    # -----------------
    # Helper utilities
    # -----------------
    def _to_naive(self, dt: Optional[datetime]) -> Optional[datetime]:
        if not dt:
            return dt
        try:
            return dt.replace(tzinfo=None) if getattr(dt, "tzinfo", None) else dt
        except Exception:
            return dt

    def _get_gh_repo(self, repo: Repo):
        if not repo.owner or not repo.repo_name:
            raise ValueError("Repository owner/repo_name not configured. Set these on the Projects page.")
        return self.rest_client.get_repo(f"{repo.owner}/{repo.repo_name}")

    # -----------------
    # Sync operations
    # -----------------
    async def sync_branches(self, repo: Repo) -> None:
        """Sync repository branches"""
        gh_repo = self._get_gh_repo(repo)
        default_branch = gh_repo.default_branch
        # PyGithub is sync; run in thread if needed, but small lists are OK
        branches = list(gh_repo.get_branches())
        for b in branches:
            try:
                commit = gh_repo.get_commit(b.commit.sha)
                last_commit_date = self._to_naive(getattr(commit.commit.author, "date", None))
                last_commit_author = getattr(getattr(commit.author, "login", None), "__str__", lambda: None)()
                # Upsert by (repo_id, name)
                existing = await Branch.find_one(Branch.repo_id == repo.id, Branch.name == b.name)
                if not existing:
                    existing = Branch(
                        repo_id=repo.id,
                        name=b.name,
                        is_default=(b.name == default_branch),
                        is_protected=bool(getattr(b, "protected", False)),
                        last_commit_sha=commit.sha,
                        last_commit_message=commit.commit.message or None,
                        last_commit_author=last_commit_author,
                        last_commit_date=last_commit_date,
                        is_stale=False,
                        ahead_by=0,
                        behind_by=0,
                    )
                    await existing.insert()
                else:
                    existing.is_default = (b.name == default_branch)
                    existing.is_protected = bool(getattr(b, "protected", False))
                    existing.last_commit_sha = commit.sha
                    existing.last_commit_message = commit.commit.message or None
                    existing.last_commit_author = last_commit_author
                    existing.last_commit_date = last_commit_date
                    # Mark stale if >30 days without commits
                    if last_commit_date:
                        existing.is_stale = (datetime.utcnow() - last_commit_date) > timedelta(days=30)
                    await existing.save()
            except Exception as e:
                logger.warning(f"Failed to sync branch {b.name}: {e}")

    async def sync_recent_commits(self, repo: Repo, limit: int = 100) -> None:
        """Sync recent commits (default branch)"""
        gh_repo = self._get_gh_repo(repo)
        commits = gh_repo.get_commits()  # default branch
        count = 0
        for c in commits:
            if count >= limit:
                break
            try:
                # Stats trigger an extra API call; PyGithub caches per object
                additions = getattr(c.stats, "additions", 0)
                deletions = getattr(c.stats, "deletions", 0)
                total_changes = additions + deletions
                author_login = getattr(getattr(c.author, "login", None), "__str__", lambda: None)()
                committer_login = getattr(getattr(c.committer, "login", None), "__str__", lambda: None)()
                author_date = self._to_naive(getattr(c.commit.author, "date", None))
                commit_date = self._to_naive(getattr(c.commit.committer, "date", None))
                # Safely handle verification (some commits may not have this attribute)
                verification = getattr(c.commit, "verification", None)
                verified = bool(getattr(verification, "verified", False)) if verification else False
                verification_reason = getattr(verification, "reason", None) if verification else None
                existing = await Commit.find_one(Commit.repo_id == repo.id, Commit.sha == c.sha)
                if not existing:
                    existing = Commit(
                        repo_id=repo.id,
                        sha=c.sha,
                        message=c.commit.message or "",
                        author_login=author_login,
                        author_email=getattr(c.commit.author, "email", None),
                        author_date=author_date or datetime.utcnow(),
                        committer_login=committer_login,
                        committer_email=getattr(c.commit.committer, "email", None),
                        commit_date=commit_date or author_date or datetime.utcnow(),
                        additions=additions or 0,
                        deletions=deletions or 0,
                        total_changes=total_changes or 0,
                        files_changed=0,
                        pr_number=None,
                        branch=None,
                        verified=verified,
                        verification_reason=verification_reason,
                    )
                    await existing.insert()
                else:
                    existing.message = c.commit.message or existing.message
                    existing.author_login = author_login
                    existing.author_email = getattr(c.commit.author, "email", None)
                    existing.author_date = author_date or existing.author_date
                    existing.committer_login = committer_login
                    existing.committer_email = getattr(c.commit.committer, "email", None)
                    existing.commit_date = commit_date or existing.commit_date
                    existing.additions = additions or existing.additions
                    existing.deletions = deletions or existing.deletions
                    existing.total_changes = total_changes or existing.total_changes
                    existing.verified = verified
                    existing.verification_reason = verification_reason
                    await existing.save()
                count += 1
            except Exception as e:
                logger.warning(f"Failed to sync commit {getattr(c, 'sha', 'unknown')}: {e}")

    async def sync_issues(self, repo: Repo, state: Optional[str] = None) -> None:
        """Sync issues (optionally filter by state: open/closed/all)"""
        gh_repo = self._get_gh_repo(repo)
        state = state or "all"
        issues = gh_repo.get_issues(state=state)
        now = datetime.utcnow()
        for i in issues:
            try:
                # PyGithub returns PRs in issues iterator when pull requests are included; skip PRs here
                if getattr(i, "pull_request", None):
                    continue
                labels = [lbl.name for lbl in (i.labels or [])]
                assignees = [a.login for a in (i.assignees or [])]
                milestone = i.milestone
                updated_at = self._to_naive(getattr(i, "updated_at", None))
                existing = await Issue.find_one(Issue.repo_id == repo.id, Issue.number == i.number)
                if not existing:
                    existing = Issue(
                        repo_id=repo.id,
                        github_id=i.id,
                        number=i.number,
                        title=i.title or "",
                        body=i.body or None,
                        state=IssueState.OPEN if (i.state or "open").lower() == "open" else IssueState.CLOSED,
                        author_login=getattr(i.user, "login", "unknown"),
                        author_avatar=getattr(i.user, "avatar_url", None),
                        assignees=assignees,
                        labels=labels,
                        milestone_id=(milestone.number if milestone else None),
                        milestone_title=(milestone.title if milestone else None),
                        comments_count=getattr(i, "comments", 0) or 0,
                        reactions_count=0,
                        last_comment_date=None,
                        created_at=self._to_naive(getattr(i, "created_at", None)) or now,
                        updated_at=updated_at or now,
                        closed_at=self._to_naive(getattr(i, "closed_at", None)),
                        ai_summary=None,
                        ai_summary_date=None,
                        days_since_activity=int(((now - (updated_at or now)).total_seconds()) // 86400),
                        is_stale=((now - (updated_at or now)) > timedelta(days=14)),
                    )
                    await existing.insert()
                else:
                    existing.title = i.title or existing.title
                    existing.body = i.body or existing.body
                    existing.state = IssueState.OPEN if (i.state or "open").lower() == "open" else IssueState.CLOSED
                    existing.assignees = assignees
                    existing.labels = labels
                    existing.milestone_id = milestone.number if milestone else None
                    existing.milestone_title = milestone.title if milestone else None
                    existing.comments_count = getattr(i, "comments", existing.comments_count)
                    existing.updated_at = updated_at or existing.updated_at
                    existing.closed_at = self._to_naive(getattr(i, "closed_at", None))
                    existing.days_since_activity = int(((now - (updated_at or now)).total_seconds()) // 86400)
                    existing.is_stale = ((now - (updated_at or now)) > timedelta(days=14))
                    await existing.save()
            except Exception as e:
                logger.warning(f"Failed to sync issue #{getattr(i, 'number', 'unknown')}: {e}")

    async def sync_pull_requests(self, repo: Repo, state: Optional[str] = None) -> None:
        """Sync pull requests (open/closed/merged/all)"""
        gh_repo = self._get_gh_repo(repo)
        state = state or "all"
        prs = gh_repo.get_pulls(state=state)
        for pr in prs:
            try:
                merged = bool(getattr(pr, "merged", False))
                # Reviews
                reviews = []
                approved_count = 0
                changes_requested_count = 0
                try:
                    for rv in pr.get_reviews():
                        r_state = (rv.state or "").lower()
                        if r_state == "approved":
                            approved_count += 1
                        elif r_state == "changes_requested":
                            changes_requested_count += 1
                        reviews.append({
                            "user": getattr(getattr(rv.user, "login", None), "__str__", lambda: None)(),
                            "state": rv.state,
                            "created_at": self._to_naive(getattr(rv, "submitted_at", None)) or self._to_naive(getattr(rv, "created_at", None)),
                        })
                except Exception:
                    # Reviews endpoint may be restricted for some tokens
                    reviews = []
                # Time metrics
                created_at = self._to_naive(getattr(pr, "created_at", None))
                merged_at = self._to_naive(getattr(pr, "merged_at", None))
                first_review_time = None
                if reviews:
                    first_review_time = min([r.get("created_at") for r in reviews if r.get("created_at")])
                time_to_first_review = None
                if created_at and first_review_time:
                    time_to_first_review = int((first_review_time - created_at).total_seconds() // 60)
                time_to_merge = None
                if created_at and merged_at:
                    time_to_merge = int((merged_at - created_at).total_seconds() // 60)
                # Upsert by (repo_id, number)
                existing = await PullRequest.find_one(PullRequest.repo_id == repo.id, PullRequest.number == pr.number)
                state_value = PRState.MERGED if merged else (PRState.OPEN if (pr.state or "open").lower() == "open" else PRState.CLOSED)
                if not existing:
                    existing = PullRequest(
                        repo_id=repo.id,
                        github_id=pr.id,
                        number=pr.number,
                        title=pr.title or "",
                        body=pr.body or None,
                        state=state_value,
                        author_login=getattr(pr.user, "login", None) or "unknown",
                        author_avatar=getattr(pr.user, "avatar_url", None),
                        assignees=[a.login for a in (pr.assignees or [])],
                        requested_reviewers=[a.login for a in (pr.requested_reviewers or [])],
                        labels=[l.name for l in (pr.labels or [])],
                        milestone_id=(pr.milestone.number if pr.milestone else None),
                        milestone_title=(pr.milestone.title if pr.milestone else None),
                        head_branch=getattr(getattr(pr, "head", None), "ref", None) or "",
                        base_branch=getattr(getattr(pr, "base", None), "ref", None) or "",
                        head_sha=getattr(getattr(pr, "head", None), "sha", None) or "",
                        base_sha=getattr(getattr(pr, "base", None), "sha", None) or "",
                        mergeable=None,
                        merged=merged,
                        merged_by=(getattr(getattr(pr, "merged_by", None), "login", None) if merged else None),
                        merge_commit_sha=getattr(pr, "merge_commit_sha", None),
                        additions=getattr(pr, "additions", 0) or 0,
                        deletions=getattr(pr, "deletions", 0) or 0,
                        changed_files=getattr(pr, "changed_files", 0) or 0,
                        commits_count=getattr(pr, "commits", 0) or 0,
                        comments_count=getattr(pr, "comments", 0) or 0,
                        review_comments_count=getattr(pr, "review_comments", 0) or 0,
                        reviews=reviews,
                        approved_count=approved_count,
                        changes_requested_count=changes_requested_count,
                        linked_issues=[],
                        created_at=created_at or datetime.utcnow(),
                        updated_at=self._to_naive(getattr(pr, "updated_at", None)) or created_at or datetime.utcnow(),
                        closed_at=self._to_naive(getattr(pr, "closed_at", None)),
                        merged_at=merged_at,
                        time_to_first_review=time_to_first_review,
                        time_to_merge=time_to_merge,
                        ai_summary=None,
                        ai_commit_summary=None,
                    )
                    await existing.insert()
                else:
                    existing.title = pr.title or existing.title
                    existing.body = pr.body or existing.body
                    existing.state = state_value
                    existing.assignees = [a.login for a in (pr.assignees or [])]
                    existing.requested_reviewers = [a.login for a in (pr.requested_reviewers or [])]
                    existing.labels = [l.name for l in (pr.labels or [])]
                    existing.milestone_id = (pr.milestone.number if pr.milestone else None)
                    existing.milestone_title = (pr.milestone.title if pr.milestone else None)
                    existing.merged = merged
                    existing.merged_by = getattr(getattr(pr, "merged_by", None), "login", None) if merged else None
                    existing.merge_commit_sha = getattr(pr, "merge_commit_sha", None)
                    existing.additions = getattr(pr, "additions", existing.additions)
                    existing.deletions = getattr(pr, "deletions", existing.deletions)
                    existing.changed_files = getattr(pr, "changed_files", existing.changed_files)
                    existing.commits_count = getattr(pr, "commits", existing.commits_count)
                    existing.comments_count = getattr(pr, "comments", existing.comments_count)
                    existing.review_comments_count = getattr(pr, "review_comments", existing.review_comments_count)
                    existing.reviews = reviews
                    existing.approved_count = approved_count
                    existing.changes_requested_count = changes_requested_count
                    existing.updated_at = self._to_naive(getattr(pr, "updated_at", None)) or existing.updated_at
                    existing.closed_at = self._to_naive(getattr(pr, "closed_at", None))
                    existing.merged_at = merged_at
                    existing.time_to_first_review = time_to_first_review
                    existing.time_to_merge = time_to_merge
                    await existing.save()
            except Exception as e:
                logger.warning(f"Failed to sync PR #{getattr(pr, 'number', 'unknown')}: {e}")

    async def sync_contributors(self, repo: Repo) -> None:
        """Sync contributors and basic analytics"""
        gh_repo = self._get_gh_repo(repo)
        for c in gh_repo.get_contributors():
            try:
                user_login = getattr(c, "login", None) or getattr(getattr(c, "author", None), "login", None)
                if not user_login:
                    continue
                existing = await Contributor.find_one(Contributor.repo_id == repo.id, Contributor.login == user_login)
                if not existing:
                    existing = Contributor(
                        repo_id=repo.id,
                        login=user_login,
                        github_id=getattr(c, "id", 0) or 0,
                        avatar_url=getattr(c, "avatar_url", None),
                        name=None,
                        email=None,
                        bio=None,
                        company=None,
                        location=None,
                        commits_count=getattr(c, "contributions", 0) or 0,
                        prs_created=0,
                        prs_merged=0,
                        issues_created=0,
                        issues_closed=0,
                        reviews_given=0,
                        comments_made=0,
                        lines_added=0,
                        lines_deleted=0,
                        last_commit_date=None,
                        last_pr_date=None,
                        last_issue_date=None,
                        last_activity_date=None,
                        primary_languages=[],
                        skill_tags=[],
                        avg_pr_merge_time=None,
                        pr_approval_rate=0.0,
                        is_active=True,
                        days_inactive=0,
                        user_id=None,
                        total_xp_earned=0,
                    )
                    await existing.insert()
                else:
                    existing.commits_count = getattr(c, "contributions", existing.commits_count)
                    await existing.save()
            except Exception as e:
                logger.warning(f"Failed to sync contributor: {e}")

    async def sync_releases(self, repo: Repo) -> None:
        """Sync releases and tags"""
        gh_repo = self._get_gh_repo(repo)
        for rel in gh_repo.get_releases():
            try:
                assets = []
                total_downloads = 0
                for a in rel.get_assets():
                    assets.append({
                        "name": getattr(a, "name", None),
                        "size": getattr(a, "size", 0),
                        "download_count": getattr(a, "download_count", 0),
                        "content_type": getattr(a, "content_type", None),
                        "created_at": self._to_naive(getattr(a, "created_at", None)),
                    })
                    total_downloads += getattr(a, "download_count", 0) or 0
                existing = await Release.find_one(Release.repo_id == repo.id, Release.github_id == rel.id)
                if not existing:
                    existing = Release(
                        repo_id=repo.id,
                        github_id=rel.id,
                        tag_name=getattr(rel, "tag_name", ""),
                        name=getattr(rel, "title", None),
                        body=getattr(rel, "body", None),
                        is_prerelease=bool(getattr(rel, "prerelease", False)),
                        is_draft=bool(getattr(rel, "draft", False)),
                        author_login=getattr(getattr(rel, "author", None), "login", None) or "unknown",
                        assets=assets,
                        assets_count=len(assets),
                        created_at=self._to_naive(getattr(rel, "created_at", None)) or datetime.utcnow(),
                        published_at=self._to_naive(getattr(rel, "published_at", None)),
                        download_count=total_downloads,
                    )
                    await existing.insert()
                else:
                    existing.name = getattr(rel, "title", existing.name)
                    existing.body = getattr(rel, "body", existing.body)
                    existing.is_prerelease = bool(getattr(rel, "prerelease", existing.is_prerelease))
                    existing.is_draft = bool(getattr(rel, "draft", existing.is_draft))
                    existing.assets = assets
                    existing.assets_count = len(assets)
                    existing.published_at = self._to_naive(getattr(rel, "published_at", None))
                    existing.download_count = total_downloads
                    await existing.save()
            except Exception as e:
                logger.warning(f"Failed to sync release {getattr(rel, 'tag_name', 'unknown')}: {e}")

    async def sync_milestones(self, repo: Repo) -> None:
        """Sync milestones with progress"""
        gh_repo = self._get_gh_repo(repo)
        # GitHub API supports open/closed; fetch both
        for state in ("open", "closed"):
            try:
                for m in gh_repo.get_milestones(state=state):
                    open_issues = getattr(m, "open_issues", 0) or 0
                    closed_issues = getattr(m, "closed_issues", 0) or 0
                    total = open_issues + closed_issues
                    progress = round((closed_issues / total) * 100, 2) if total > 0 else 0.0
                    existing = await Milestone.find_one(Milestone.repo_id == repo.id, Milestone.number == m.number)
                    if not existing:
                        existing = Milestone(
                            repo_id=repo.id,
                            github_id=m.id,
                            number=m.number,
                            title=m.title or "",
                            description=getattr(m, "description", None),
                            state=m.state or state,
                            open_issues=open_issues,
                            closed_issues=closed_issues,
                            progress_percentage=progress,
                            created_at=self._to_naive(getattr(m, "created_at", None)) or datetime.utcnow(),
                            updated_at=self._to_naive(getattr(m, "updated_at", None)) or datetime.utcnow(),
                            due_on=self._to_naive(getattr(m, "due_on", None)),
                            closed_at=self._to_naive(getattr(m, "closed_at", None)),
                            estimated_completion=None,
                            velocity=None,
                        )
                        await existing.insert()
                    else:
                        existing.title = m.title or existing.title
                        existing.description = getattr(m, "description", existing.description)
                        existing.state = m.state or existing.state
                        existing.open_issues = open_issues
                        existing.closed_issues = closed_issues
                        existing.progress_percentage = progress
                        existing.updated_at = self._to_naive(getattr(m, "updated_at", None)) or existing.updated_at
                        existing.due_on = self._to_naive(getattr(m, "due_on", None))
                        existing.closed_at = self._to_naive(getattr(m, "closed_at", None))
                        await existing.save()
            except Exception as e:
                logger.warning(f"Failed to sync milestones (state={state}): {e}")
