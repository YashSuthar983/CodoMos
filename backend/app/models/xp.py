from datetime import datetime
from typing import Optional, Dict
from beanie import Document, PydanticObjectId
from pydantic import Field
from enum import Enum


class XPSource(str, Enum):
    """XP event sources with defined values"""
    COMMIT = "commit"  # +1 XP
    ISSUE_CLOSED = "issue_closed"  # +3 XP
    PR_MERGED = "pr_merged"  # +5 XP
    CODE_REVIEW = "code_review"  # +2 XP
    MILESTONE_COMPLETED = "milestone_completed"  # +5 XP
    RELEASE_PUBLISHED = "release_published"  # +10 XP
    
    # Bonus XP
    HIGH_PRIORITY_ISSUE = "high_priority_issue"  # +2 bonus
    EARLY_DELIVERY = "early_delivery"  # +3 bonus
    STREAK_BONUS = "streak_bonus"  # Variable
    QUALITY_BONUS = "quality_bonus"  # Variable (lint/test success)
    FIRST_CONTRIBUTION = "first_contribution"  # +10 bonus
    
    # Collaborative XP
    PAIR_PROGRAMMING = "pair_programming"  # +2 XP
    MENTORING = "mentoring"  # +3 XP
    DOCUMENTATION = "documentation"  # +2 XP


class XPEvent(Document):
    person_id: PydanticObjectId
    source: str  # pr_merged, issue_closed, review, etc.
    amount: int = 0
    skill_distribution: Optional[Dict[str, float]] = None
    
    # Enhanced tracking
    repo_id: Optional[PydanticObjectId] = None
    github_username: Optional[str] = None
    reference_id: Optional[str] = None  # PR number, issue number, etc.
    reference_url: Optional[str] = None  # Link to GitHub
    
    # Streak and bonus tracking
    is_bonus: bool = False
    bonus_reason: Optional[str] = None
    streak_day: Optional[int] = None  # Current streak day count
    
    # Quality metrics
    quality_score: Optional[float] = None  # 0-100
    test_coverage: Optional[float] = None  # percentage
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "xp_events"
        indexes = [
            "person_id",
            "source",
            "repo_id",
            "github_username",
            "created_at"
        ]


class XPConfiguration(Document):
    """XP system configuration"""
    # Base XP values
    xp_values: Dict[str, int] = Field(default_factory=lambda: {
        "commit": 1,
        "issue_closed": 3,
        "pr_merged": 5,
        "code_review": 2,
        "milestone_completed": 5,
        "release_published": 10,
        "high_priority_bonus": 2,
        "early_delivery_bonus": 3,
        "first_contribution": 10,
        "pair_programming": 2,
        "mentoring": 3,
        "documentation": 2
    })
    
    # Streak configuration
    streak_enabled: bool = True
    streak_threshold_days: int = 1  # Consecutive days for streak
    streak_bonus_per_day: int = 1  # Extra XP per streak day
    streak_max_bonus: int = 10  # Max streak bonus per event
    
    # Decay configuration
    decay_enabled: bool = True
    decay_days_inactive: int = 7  # Days before decay starts
    decay_percentage: float = 0.01  # 1% weekly decay
    decay_min_xp: int = 0  # Minimum XP after decay
    
    # Quality bonuses
    quality_bonus_enabled: bool = True
    quality_threshold_coverage: float = 80.0  # Test coverage %
    quality_bonus_multiplier: float = 1.2  # 20% bonus for quality
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "xp_configuration"
