from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ExecutiveDashboardResponse(BaseModel):
    snapshot_date: datetime
    total_employees: int
    active_employees: int
    total_projects: int
    active_projects: int
    projects_on_track: int
    projects_at_risk: int
    avg_xp_per_employee: float
    total_org_xp: float
    commits_this_week: int
    prs_merged_this_week: int
    total_candidates: int
    candidates_by_stage: Dict[str, int]
    avg_time_to_hire_days: float
    offer_acceptance_rate: float
    avg_satisfaction_score: float
    engagement_score: float
    total_budget: float
    budget_utilized: float
    budget_utilization_percent: float
    employee_growth_rate: float
    project_completion_rate: float
    hiring_velocity: float


class TeamProductivityMetrics(BaseModel):
    team_name: str
    total_members: int
    active_members: int
    total_xp: float
    avg_xp_per_member: float
    commits_count: int
    prs_count: int
    issues_closed: int
    top_performers: List[Dict[str, Any]]
    productivity_trend: List[Dict[str, Any]]


class HiringPipelineHealth(BaseModel):
    total_candidates: int
    candidates_by_stage: Dict[str, int]
    stage_conversion_rates: Dict[str, float]
    avg_time_to_hire_days: float
    avg_time_per_stage_days: Dict[str, float]
    offer_acceptance_rate: float
    rejection_reasons: Dict[str, int]
    top_sources: List[Dict[str, Any]]
    monthly_trends: List[Dict[str, Any]]


class ReportCreate(BaseModel):
    report_name: str
    report_type: str
    description: Optional[str] = None
    metrics: List[str]
    filters: Dict[str, Any] = Field(default_factory=dict)
    visualization_type: str = "table"
    is_scheduled: bool = False
    schedule_frequency: Optional[str] = None
    schedule_time: Optional[str] = None
    recipients: List[str] = Field(default_factory=list)


class ReportUpdate(BaseModel):
    report_name: Optional[str] = None
    description: Optional[str] = None
    metrics: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    visualization_type: Optional[str] = None
    is_scheduled: Optional[bool] = None
    schedule_frequency: Optional[str] = None
    schedule_time: Optional[str] = None
    recipients: Optional[List[str]] = None


class ReportResponse(BaseModel):
    id: str
    report_name: str
    report_type: str
    description: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    metrics: List[str]
    filters: Dict[str, Any]
    visualization_type: str
    is_scheduled: bool
    schedule_frequency: Optional[str]
    schedule_time: Optional[str]
    recipients: List[str]
    last_generated: Optional[datetime]


class ReportDataResponse(BaseModel):
    report_id: str
    report_name: str
    generated_at: datetime
    data: Dict[str, Any]
    metadata: Dict[str, Any]


class PredictiveAnalyticsRequest(BaseModel):
    model_type: str
    time_horizon_days: int = 90
    include_recommendations: bool = True


class AttritionPrediction(BaseModel):
    employee_id: str
    employee_name: str
    position: str
    attrition_risk: str
    risk_score: float
    risk_factors: List[str]
    recommendations: List[str]


class ProjectRiskPrediction(BaseModel):
    project_id: str
    project_name: str
    risk_level: str
    risk_score: float
    risk_factors: List[str]
    estimated_delay_days: int
    recommendations: List[str]


class ResourceShortagePrediction(BaseModel):
    skill_area: str
    shortage_severity: str
    current_capacity: int
    projected_demand: int
    shortage_gap: int
    timeline_weeks: int
    recommendations: List[str]


class HiringDemandPrediction(BaseModel):
    position: str
    predicted_openings: int
    confidence: float
    reasoning: List[str]
    recommended_start_date: datetime
    estimated_time_to_fill_days: int


class PredictiveAnalyticsResponse(BaseModel):
    model_type: str
    prediction_date: datetime
    attrition_predictions: Optional[List[AttritionPrediction]] = None
    project_risks: Optional[List[ProjectRiskPrediction]] = None
    resource_shortages: Optional[List[ResourceShortagePrediction]] = None
    hiring_demands: Optional[List[HiringDemandPrediction]] = None
    overall_summary: Dict[str, Any]
    recommendations: List[str]
