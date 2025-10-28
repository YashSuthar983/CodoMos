"""
XP Calculation and Tracking Service
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from beanie import PydanticObjectId
import logging

from app.models import (
    User, XPEvent, XPConfiguration, XPSource, XPLeaderboard,
    Contributor, PullRequest, Issue, Commit, Release, Milestone
)

logger = logging.getLogger(__name__)


class XPCalculator:
    """Service for calculating and awarding XP based on GitHub activity"""
    
    def __init__(self):
        self.config: Optional[XPConfiguration] = None
    
    async def load_config(self) -> XPConfiguration:
        """Load or create XP configuration"""
        self.config = await XPConfiguration.find_one()
        if not self.config:
            self.config = XPConfiguration()
            await self.config.insert()
        return self.config
    
    async def calculate_base_xp(self, source: str) -> int:
        """Calculate base XP for an event source"""
        if not self.config:
            await self.load_config()
        
        return self.config.xp_values.get(source, 0)
    
    async def calculate_streak_bonus(self, user_id: PydanticObjectId) -> Tuple[int, int]:
        """Calculate streak bonus for a user
        Returns: (streak_days, bonus_xp)
        """
        if not self.config or not self.config.streak_enabled:
            return 0, 0
        
        # Get user's recent XP events
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_events = await XPEvent.find(
            XPEvent.person_id == user_id,
            XPEvent.created_at >= yesterday
        ).to_list()
        
        if not recent_events:
            return 0, 0
        
        # Check for consecutive days
        streak_days = 1
        current_date = datetime.utcnow().date()
        
        for i in range(1, 30):  # Check up to 30 days back
            check_date = current_date - timedelta(days=i)
            day_events = await XPEvent.find(
                XPEvent.person_id == user_id,
                XPEvent.created_at >= datetime.combine(check_date, datetime.min.time()),
                XPEvent.created_at < datetime.combine(check_date + timedelta(days=1), datetime.min.time())
            ).to_list()
            
            if day_events:
                streak_days += 1
            else:
                break
        
        # Calculate bonus
        bonus_xp = min(
            streak_days * self.config.streak_bonus_per_day,
            self.config.streak_max_bonus
        )
        
        return streak_days, bonus_xp
    
    async def calculate_quality_bonus(
        self, 
        test_coverage: Optional[float] = None,
        lint_score: Optional[float] = None
    ) -> float:
        """Calculate quality bonus multiplier"""
        if not self.config or not self.config.quality_bonus_enabled:
            return 1.0
        
        if test_coverage and test_coverage >= self.config.quality_threshold_coverage:
            return self.config.quality_bonus_multiplier
        
        if lint_score and lint_score >= 90:  # 90% lint score threshold
            return 1.1  # 10% bonus
        
        return 1.0
    
    async def award_xp_for_commit(
        self,
        user: User,
        commit: Commit,
        repo_id: PydanticObjectId
    ) -> XPEvent:
        """Award XP for a commit"""
        base_xp = await self.calculate_base_xp("commit")
        
        # Add bonus for large commits
        if commit.total_changes > 100:
            base_xp += 1  # Bonus for substantial commits
        
        # Check streak
        streak_days, streak_bonus = await self.calculate_streak_bonus(user.id)
        total_xp = base_xp + streak_bonus
        
        # Create XP event
        xp_event = XPEvent(
            person_id=user.id,
            source=XPSource.COMMIT,
            amount=total_xp,
            repo_id=repo_id,
            github_username=user.github_username,
            reference_id=commit.sha[:7],
            reference_url=f"https://github.com/{user.github_username}/commit/{commit.sha}",
            streak_day=streak_days if streak_days > 1 else None,
            is_bonus=streak_bonus > 0,
            bonus_reason="streak bonus" if streak_bonus > 0 else None
        )
        
        await xp_event.insert()
        return xp_event
    
    async def award_xp_for_pr_merged(
        self,
        user: User,
        pr: PullRequest,
        repo_id: PydanticObjectId,
        repo_tags: Optional[List[str]] = None
    ) -> XPEvent:
        """Award XP for a merged pull request"""
        base_xp = await self.calculate_base_xp("pr_merged")
        
        # Add bonuses
        bonus_xp = 0
        bonus_reasons = []
        
        # Size bonus
        if pr.additions + pr.deletions > 500:
            bonus_xp += 2
            bonus_reasons.append("large PR")
        
        # Quick merge bonus
        if pr.time_to_merge and pr.time_to_merge < 1440:  # Less than 24 hours
            bonus_xp += await self.calculate_base_xp("early_delivery_bonus")
            bonus_reasons.append("quick merge")
        
        # High approval bonus
        if pr.approved_count >= 2:
            bonus_xp += 1
            bonus_reasons.append("multiple approvals")
        
        # Streak bonus
        streak_days, streak_bonus = await self.calculate_streak_bonus(user.id)
        bonus_xp += streak_bonus
        if streak_bonus > 0:
            bonus_reasons.append(f"streak day {streak_days}")
        
        total_xp = base_xp + bonus_xp
        
        # Calculate skill distribution based on repo tags
        skill_distribution = None
        if repo_tags:
            skill_distribution = {tag: 1.0 / len(repo_tags) for tag in repo_tags}
        
        # Create XP event
        xp_event = XPEvent(
            person_id=user.id,
            source=XPSource.PR_MERGED,
            amount=total_xp,
            skill_distribution=skill_distribution,
            repo_id=repo_id,
            github_username=user.github_username,
            reference_id=f"#{pr.number}",
            reference_url=f"https://github.com/{user.github_username}/pull/{pr.number}",
            streak_day=streak_days if streak_days > 1 else None,
            is_bonus=bonus_xp > 0,
            bonus_reason=", ".join(bonus_reasons) if bonus_reasons else None
        )
        
        await xp_event.insert()
        return xp_event
    
    async def award_xp_for_issue_closed(
        self,
        user: User,
        issue: Issue,
        repo_id: PydanticObjectId
    ) -> XPEvent:
        """Award XP for closing an issue"""
        base_xp = await self.calculate_base_xp("issue_closed")
        
        # Add bonuses
        bonus_xp = 0
        bonus_reasons = []
        
        # Priority bonus
        if "high-priority" in issue.labels or "critical" in issue.labels:
            bonus_xp += await self.calculate_base_xp("high_priority_bonus")
            bonus_reasons.append("high priority")
        
        # Quick resolution bonus
        if issue.closed_at and issue.created_at:
            resolution_time = (issue.closed_at - issue.created_at).total_seconds() / 3600
            if resolution_time < 24:  # Resolved within 24 hours
                bonus_xp += 1
                bonus_reasons.append("quick resolution")
        
        total_xp = base_xp + bonus_xp
        
        # Create XP event
        xp_event = XPEvent(
            person_id=user.id,
            source=XPSource.ISSUE_CLOSED,
            amount=total_xp,
            repo_id=repo_id,
            github_username=user.github_username,
            reference_id=f"#{issue.number}",
            reference_url=f"https://github.com/{user.github_username}/issues/{issue.number}",
            is_bonus=bonus_xp > 0,
            bonus_reason=", ".join(bonus_reasons) if bonus_reasons else None
        )
        
        await xp_event.insert()
        return xp_event
    
    async def award_xp_for_code_review(
        self,
        user: User,
        pr_number: int,
        repo_id: PydanticObjectId
    ) -> XPEvent:
        """Award XP for code review"""
        base_xp = await self.calculate_base_xp("code_review")
        
        # Create XP event
        xp_event = XPEvent(
            person_id=user.id,
            source=XPSource.CODE_REVIEW,
            amount=base_xp,
            repo_id=repo_id,
            github_username=user.github_username,
            reference_id=f"#{pr_number}",
            reference_url=f"https://github.com/{user.github_username}/pull/{pr_number}"
        )
        
        await xp_event.insert()
        return xp_event
    
    async def award_xp_for_milestone(
        self,
        contributors: List[User],
        milestone: Milestone,
        repo_id: PydanticObjectId
    ) -> List[XPEvent]:
        """Award XP to all contributors when a milestone is completed"""
        base_xp = await self.calculate_base_xp("milestone_completed")
        
        # Bonus for early completion
        bonus_xp = 0
        if milestone.due_on and milestone.closed_at:
            if milestone.closed_at < milestone.due_on:
                bonus_xp = await self.calculate_base_xp("early_delivery_bonus")
        
        total_xp = base_xp + bonus_xp
        
        xp_events = []
        for user in contributors:
            xp_event = XPEvent(
                person_id=user.id,
                source=XPSource.MILESTONE_COMPLETED,
                amount=total_xp,
                repo_id=repo_id,
                github_username=user.github_username,
                reference_id=f"Milestone #{milestone.number}",
                reference_url=f"https://github.com/{user.github_username}/milestone/{milestone.number}",
                is_bonus=bonus_xp > 0,
                bonus_reason="early completion" if bonus_xp > 0 else None
            )
            await xp_event.insert()
            xp_events.append(xp_event)
        
        return xp_events
    
    async def award_xp_for_release(
        self,
        user: User,
        release: Release,
        repo_id: PydanticObjectId
    ) -> XPEvent:
        """Award XP for publishing a release"""
        base_xp = await self.calculate_base_xp("release_published")
        
        # Create XP event
        xp_event = XPEvent(
            person_id=user.id,
            source=XPSource.RELEASE_PUBLISHED,
            amount=base_xp,
            repo_id=repo_id,
            github_username=user.github_username,
            reference_id=release.tag_name,
            reference_url=f"https://github.com/{user.github_username}/releases/tag/{release.tag_name}"
        )
        
        await xp_event.insert()
        return xp_event
    
    async def apply_xp_decay(self, user: User) -> Optional[XPEvent]:
        """Apply XP decay for inactive users"""
        if not self.config or not self.config.decay_enabled:
            return None
        
        # Check last activity
        last_event = await XPEvent.find(
            XPEvent.person_id == user.id
        ).sort(-XPEvent.created_at).first_or_none()
        
        if not last_event:
            return None
        
        days_inactive = (datetime.utcnow() - last_event.created_at).days
        
        if days_inactive < self.config.decay_days_inactive:
            return None
        
        # Calculate total XP
        all_events = await XPEvent.find(XPEvent.person_id == user.id).to_list()
        total_xp = sum(event.amount for event in all_events)
        
        # Apply decay
        decay_amount = int(total_xp * self.config.decay_percentage)
        if decay_amount > 0:
            # Create negative XP event for decay
            decay_event = XPEvent(
                person_id=user.id,
                source="xp_decay",
                amount=-decay_amount,
                bonus_reason=f"Inactive for {days_inactive} days"
            )
            await decay_event.insert()
            return decay_event
        
        return None
    
    async def calculate_user_total_xp(self, user_id: PydanticObjectId) -> int:
        """Calculate total XP for a user"""
        events = await XPEvent.find(XPEvent.person_id == user_id).to_list()
        return sum(event.amount for event in events)
    
    async def calculate_user_xp_by_skill(self, user_id: PydanticObjectId) -> Dict[str, float]:
        """Calculate XP breakdown by skill/tag"""
        events = await XPEvent.find(
            XPEvent.person_id == user_id,
            XPEvent.skill_distribution != None
        ).to_list()
        
        skill_xp = {}
        for event in events:
            if event.skill_distribution:
                for skill, weight in event.skill_distribution.items():
                    if skill not in skill_xp:
                        skill_xp[skill] = 0
                    skill_xp[skill] += event.amount * weight
        
        return skill_xp
    
    async def generate_leaderboard(
        self,
        period: str = "all-time",
        limit: int = 10
    ) -> XPLeaderboard:
        """Generate XP leaderboard for a period"""
        # Determine period boundaries
        now = datetime.utcnow()
        if period == "daily":
            period_start = now - timedelta(days=1)
        elif period == "weekly":
            period_start = now - timedelta(weeks=1)
        elif period == "monthly":
            period_start = now - timedelta(days=30)
        else:  # all-time
            period_start = datetime(2000, 1, 1)
        
        period_end = now
        
        # Aggregate XP by user
        pipeline = [
            {"$match": {
                "created_at": {"$gte": period_start, "$lte": period_end}
            }},
            {"$group": {
                "_id": "$person_id",
                "total_xp": {"$sum": "$amount"},
                "event_count": {"$sum": 1},
                "sources": {"$addToSet": "$source"}
            }},
            {"$sort": {"total_xp": -1}},
            {"$limit": limit}
        ]
        
        results = await XPEvent.aggregate(pipeline).to_list()
        
        # Build leaderboard entries
        entries = []
        rank = 1
        for result in results:
            user = await User.get(result["_id"])
            if user:
                entry = {
                    "user_id": str(result["_id"]),
                    "login": user.github_username or user.email,
                    "total_xp": result["total_xp"],
                    "rank": rank,
                    "event_count": result["event_count"],
                    "sources": result["sources"]
                }
                
                # Get skill breakdown
                skill_xp = await self.calculate_user_xp_by_skill(result["_id"])
                entry["skill_breakdown"] = skill_xp
                
                entries.append(entry)
                rank += 1
        
        # Create leaderboard document
        leaderboard = XPLeaderboard(
            period=period,
            period_start=period_start,
            period_end=period_end,
            entries=entries,
            total_participants=len(entries),
            total_xp_awarded=sum(e["total_xp"] for e in entries)
        )
        
        await leaderboard.insert()
        return leaderboard
    
    async def get_user_xp_stats(self, user_id: PydanticObjectId) -> Dict[str, Any]:
        """Get comprehensive XP statistics for a user"""
        total_xp = await self.calculate_user_total_xp(user_id)
        skill_breakdown = await self.calculate_user_xp_by_skill(user_id)
        
        # Get recent events
        recent_events = await XPEvent.find(
            XPEvent.person_id == user_id
        ).sort(-XPEvent.created_at).limit(10).to_list()
        
        # Calculate growth (last 30 days vs previous 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        
        recent_xp = sum(
            event.amount for event in await XPEvent.find(
                XPEvent.person_id == user_id,
                XPEvent.created_at >= thirty_days_ago
            ).to_list()
        )
        
        previous_xp = sum(
            event.amount for event in await XPEvent.find(
                XPEvent.person_id == user_id,
                XPEvent.created_at >= sixty_days_ago,
                XPEvent.created_at < thirty_days_ago
            ).to_list()
        )
        
        growth_rate = 0
        if previous_xp > 0:
            growth_rate = ((recent_xp - previous_xp) / previous_xp) * 100
        
        # Get current streak
        streak_days, _ = await self.calculate_streak_bonus(user_id)
        
        return {
            "total_xp": total_xp,
            "skill_breakdown": skill_breakdown,
            "recent_events": recent_events,
            "thirty_day_xp": recent_xp,
            "growth_rate": growth_rate,
            "current_streak": streak_days,
            "rank": await self._get_user_rank(user_id, total_xp)
        }
    
    async def _get_user_rank(self, user_id: PydanticObjectId, user_xp: int) -> int:
        """Get user's rank based on total XP"""
        higher_xp_users = await XPEvent.aggregate([
            {"$group": {
                "_id": "$person_id",
                "total_xp": {"$sum": "$amount"}
            }},
            {"$match": {"total_xp": {"$gt": user_xp}}}
        ]).to_list()
        
        return len(higher_xp_users) + 1
