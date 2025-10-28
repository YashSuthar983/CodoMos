from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.analytics import Report, PredictiveModel
from app.schemas.analytics import (
    ExecutiveDashboardResponse,
    TeamProductivityMetrics,
    HiringPipelineHealth,
    ReportCreate,
    ReportUpdate,
    ReportResponse,
    ReportDataResponse,
    PredictiveAnalyticsRequest,
    PredictiveAnalyticsResponse,
    AttritionPrediction,
    ProjectRiskPrediction,
    ResourceShortagePrediction,
    HiringDemandPrediction
)
from app.services.analytics_service import AnalyticsService
from bson import ObjectId
import io
import json


router = APIRouter()


@router.get("/dashboard/executive", response_model=ExecutiveDashboardResponse)
async def get_executive_dashboard(
    current_user: User = Depends(get_current_user)
):
    """
    Get executive dashboard with company-wide KPIs.
    Admin only access.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = AnalyticsService()
    dashboard_data = await analytics_service.get_executive_dashboard()
    
    return dashboard_data


@router.get("/dashboard/team-productivity", response_model=List[TeamProductivityMetrics])
async def get_team_productivity(
    current_user: User = Depends(get_current_user)
):
    """
    Get team-level productivity metrics.
    Admin only access.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = AnalyticsService()
    team_metrics = await analytics_service.get_team_productivity_metrics()
    
    return team_metrics


@router.get("/dashboard/hiring-pipeline", response_model=HiringPipelineHealth)
async def get_hiring_pipeline_health(
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed hiring pipeline health metrics.
    Admin only access.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = AnalyticsService()
    pipeline_health = await analytics_service.get_hiring_pipeline_health()
    
    return pipeline_health


@router.get("/reports", response_model=List[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db),
    report_type: Optional[str] = None
):
    """
    List all custom reports created by the user or accessible to them.
    """
    query = {}
    if report_type:
        query["report_type"] = report_type
    
    # Admin can see all reports, users see only their own
    if current_user.role != "admin":
        query["created_by"] = str(current_user.id)
    
    reports = await db.reports.find(query).to_list(None)
    
    return [
        {
            "id": str(report["_id"]),
            "report_name": report["report_name"],
            "report_type": report["report_type"],
            "description": report.get("description"),
            "created_by": report["created_by"],
            "created_at": report["created_at"],
            "updated_at": report["updated_at"],
            "metrics": report.get("metrics", []),
            "filters": report.get("filters", {}),
            "visualization_type": report.get("visualization_type", "table"),
            "is_scheduled": report.get("is_scheduled", False),
            "schedule_frequency": report.get("schedule_frequency"),
            "schedule_time": report.get("schedule_time"),
            "recipients": report.get("recipients", []),
            "last_generated": report.get("last_generated")
        }
        for report in reports
    ]


@router.post("/reports", response_model=ReportResponse)
async def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Create a new custom report.
    """
    report = Report(
        report_name=report_data.report_name,
        report_type=report_data.report_type,
        description=report_data.description,
        created_by=str(current_user.id),
        metrics=report_data.metrics,
        filters=report_data.filters,
        visualization_type=report_data.visualization_type,
        is_scheduled=report_data.is_scheduled,
        schedule_frequency=report_data.schedule_frequency,
        schedule_time=report_data.schedule_time,
        recipients=report_data.recipients
    )
    
    report_dict = report.dict(by_alias=True, exclude_none=True)
    result = await db.reports.insert_one(report_dict)
    
    created_report = await db.reports.find_one({"_id": result.inserted_id})
    
    return {
        "id": str(created_report["_id"]),
        "report_name": created_report["report_name"],
        "report_type": created_report["report_type"],
        "description": created_report.get("description"),
        "created_by": created_report["created_by"],
        "created_at": created_report["created_at"],
        "updated_at": created_report["updated_at"],
        "metrics": created_report.get("metrics", []),
        "filters": created_report.get("filters", {}),
        "visualization_type": created_report.get("visualization_type", "table"),
        "is_scheduled": created_report.get("is_scheduled", False),
        "schedule_frequency": created_report.get("schedule_frequency"),
        "schedule_time": created_report.get("schedule_time"),
        "recipients": created_report.get("recipients", []),
        "last_generated": created_report.get("last_generated")
    }


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get a specific report by ID.
    """
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if current_user.role != "admin" and report["created_by"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": str(report["_id"]),
        "report_name": report["report_name"],
        "report_type": report["report_type"],
        "description": report.get("description"),
        "created_by": report["created_by"],
        "created_at": report["created_at"],
        "updated_at": report["updated_at"],
        "metrics": report.get("metrics", []),
        "filters": report.get("filters", {}),
        "visualization_type": report.get("visualization_type", "table"),
        "is_scheduled": report.get("is_scheduled", False),
        "schedule_frequency": report.get("schedule_frequency"),
        "schedule_time": report.get("schedule_time"),
        "recipients": report.get("recipients", []),
        "last_generated": report.get("last_generated")
    }


@router.put("/reports/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str,
    report_data: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Update an existing report.
    """
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if current_user.role != "admin" and report["created_by"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = report_data.dict(exclude_none=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": update_data}
    )
    
    updated_report = await db.reports.find_one({"_id": ObjectId(report_id)})
    
    return {
        "id": str(updated_report["_id"]),
        "report_name": updated_report["report_name"],
        "report_type": updated_report["report_type"],
        "description": updated_report.get("description"),
        "created_by": updated_report["created_by"],
        "created_at": updated_report["created_at"],
        "updated_at": updated_report["updated_at"],
        "metrics": updated_report.get("metrics", []),
        "filters": updated_report.get("filters", {}),
        "visualization_type": updated_report.get("visualization_type", "table"),
        "is_scheduled": updated_report.get("is_scheduled", False),
        "schedule_frequency": updated_report.get("schedule_frequency"),
        "schedule_time": updated_report.get("schedule_time"),
        "recipients": updated_report.get("recipients", []),
        "last_generated": updated_report.get("last_generated")
    }


@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Delete a report.
    """
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if current_user.role != "admin" and report["created_by"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.reports.delete_one({"_id": ObjectId(report_id)})
    
    return {"message": "Report deleted successfully"}


@router.post("/reports/{report_id}/generate", response_model=ReportDataResponse)
async def generate_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Generate data for a specific report.
    """
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if current_user.role != "admin" and report["created_by"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics_service = AnalyticsService()
    
    # Generate report data based on report type
    report_data = {}
    
    if report["report_type"] == "executive":
        report_data = await analytics_service.get_executive_dashboard()
    elif report["report_type"] == "team":
        report_data = {"teams": await analytics_service.get_team_productivity_metrics()}
    elif report["report_type"] == "hiring":
        report_data = await analytics_service.get_hiring_pipeline_health()
    else:
        # Custom report - compile requested metrics
        if "executive_dashboard" in report.get("metrics", []):
            report_data["executive"] = await analytics_service.get_executive_dashboard()
        if "team_productivity" in report.get("metrics", []):
            report_data["teams"] = await analytics_service.get_team_productivity_metrics()
        if "hiring_pipeline" in report.get("metrics", []):
            report_data["hiring"] = await analytics_service.get_hiring_pipeline_health()
    
    # Cache the generated data
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {
            "last_generated": datetime.utcnow(),
            "last_data": report_data
        }}
    )
    
    return {
        "report_id": report_id,
        "report_name": report["report_name"],
        "generated_at": datetime.utcnow(),
        "data": report_data,
        "metadata": {
            "filters": report.get("filters", {}),
            "visualization_type": report.get("visualization_type", "table")
        }
    }


@router.get("/reports/{report_id}/export")
async def export_report(
    report_id: str,
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Export report data in various formats (JSON, CSV).
    """
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check permissions
    if current_user.role != "admin" and report["created_by"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get cached data or generate new
    report_data = report.get("last_data")
    if not report_data:
        # Generate fresh data
        analytics_service = AnalyticsService()
        if report["report_type"] == "executive":
            report_data = await analytics_service.get_executive_dashboard()
        elif report["report_type"] == "team":
            report_data = {"teams": await analytics_service.get_team_productivity_metrics()}
        elif report["report_type"] == "hiring":
            report_data = await analytics_service.get_hiring_pipeline_health()
    
    if format == "json":
        return report_data
    elif format == "csv":
        # Simple CSV conversion for flat data
        return {"message": "CSV export not yet implemented", "data": report_data}


@router.post("/predictive/analyze", response_model=PredictiveAnalyticsResponse)
async def run_predictive_analytics(
    request: PredictiveAnalyticsRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Run predictive analytics models.
    Admin only access.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics_service = AnalyticsService()
    
    response_data = {
        "model_type": request.model_type,
        "prediction_date": datetime.utcnow(),
        "overall_summary": {},
        "recommendations": []
    }
    
    if request.model_type == "attrition" or request.model_type == "all":
        attrition_predictions = await analytics_service.predict_employee_attrition()
        response_data["attrition_predictions"] = attrition_predictions
        response_data["overall_summary"]["high_risk_employees"] = sum(
            1 for p in attrition_predictions if p["attrition_risk"] == "High"
        )
        
        if attrition_predictions:
            response_data["recommendations"].extend([
                "Schedule retention conversations with high-risk employees",
                "Review compensation and career growth opportunities",
                "Implement employee engagement initiatives"
            ])
    
    if request.model_type == "project_risk" or request.model_type == "all":
        project_risks = await analytics_service.predict_project_risks()
        response_data["project_risks"] = project_risks
        response_data["overall_summary"]["at_risk_projects"] = sum(
            1 for p in project_risks if p["risk_level"] in ["High", "Critical"]
        )
        
        if project_risks:
            response_data["recommendations"].extend([
                "Conduct immediate review of high-risk projects",
                "Reallocate resources to critical projects",
                "Consider scope reduction or timeline adjustments"
            ])
    
    if request.model_type == "resource_shortage" or request.model_type == "all":
        resource_shortages = await analytics_service.predict_resource_shortages()
        response_data["resource_shortages"] = resource_shortages
        response_data["overall_summary"]["skill_gaps"] = len(resource_shortages)
        
        if resource_shortages:
            response_data["recommendations"].extend([
                "Initiate hiring for critical skill gaps",
                "Plan cross-training programs",
                "Consider contractor support for immediate needs"
            ])
    
    if request.model_type == "hiring_demand" or request.model_type == "all":
        hiring_demands = await analytics_service.predict_hiring_demand()
        response_data["hiring_demands"] = hiring_demands
        response_data["overall_summary"]["predicted_hires"] = sum(
            h["predicted_openings"] for h in hiring_demands
        )
        
        if hiring_demands:
            response_data["recommendations"].extend([
                "Begin recruitment planning for predicted roles",
                "Update job descriptions and requirements",
                "Allocate budget for upcoming hiring needs"
            ])
    
    # Store prediction in database
    prediction = PredictiveModel(
        model_type=request.model_type,
        predictions=response_data.get("attrition_predictions", []) + 
                   response_data.get("project_risks", []) +
                   response_data.get("resource_shortages", []) +
                   response_data.get("hiring_demands", []),
        recommendations=response_data["recommendations"],
        data_points_used=response_data["overall_summary"].get("data_points", 0)
    )
    
    prediction_dict = prediction.dict(by_alias=True, exclude_none=True)
    await db.predictive_models.insert_one(prediction_dict)
    
    return response_data


@router.get("/predictive/history")
async def get_prediction_history(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get history of predictive analytics runs.
    Admin only access.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    predictions = await db.predictive_models.find().sort("prediction_date", -1).limit(limit).to_list(None)
    
    return [
        {
            "id": str(p["_id"]),
            "model_type": p["model_type"],
            "prediction_date": p["prediction_date"],
            "data_points_used": p.get("data_points_used", 0),
            "predictions_count": len(p.get("predictions", [])),
            "recommendations_count": len(p.get("recommendations", []))
        }
        for p in predictions
    ]


@router.get("/trends")
async def get_trends(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db),
    metric: str = Query(..., description="Metric to analyze trends for"),
    days: int = Query(30, ge=7, le=365, description="Number of days to analyze")
):
    """
    Get trend analysis for specific metrics over time.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Query metrics from database
    metrics = await db.analytics_metrics.find({
        "metric_name": metric,
        "calculated_at": {"$gte": start_date, "$lte": end_date}
    }).sort("calculated_at", 1).to_list(None)
    
    if not metrics:
        return {
            "metric": metric,
            "period_days": days,
            "data_points": [],
            "trend": "insufficient_data"
        }
    
    data_points = [
        {
            "date": m["calculated_at"].isoformat(),
            "value": m["metric_value"],
            "metadata": m.get("metric_metadata", {})
        }
        for m in metrics
    ]
    
    # Calculate trend direction
    if len(metrics) >= 2:
        first_value = metrics[0]["metric_value"]
        last_value = metrics[-1]["metric_value"]
        change_percent = ((last_value - first_value) / first_value * 100) if first_value != 0 else 0
        
        if change_percent > 10:
            trend = "increasing"
        elif change_percent < -10:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"
    
    return {
        "metric": metric,
        "period_days": days,
        "data_points": data_points,
        "trend": trend,
        "summary": {
            "first_value": data_points[0]["value"] if data_points else 0,
            "last_value": data_points[-1]["value"] if data_points else 0,
            "min_value": min(d["value"] for d in data_points) if data_points else 0,
            "max_value": max(d["value"] for d in data_points) if data_points else 0,
            "avg_value": sum(d["value"] for d in data_points) / len(data_points) if data_points else 0
        }
    }
