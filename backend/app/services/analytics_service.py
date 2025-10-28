from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.models import User, Project, XPEvent, Candidate
import statistics


class AnalyticsService:
    def __init__(self, db=None):
        # Using Beanie ODM instead of raw Motor
        pass
        
    async def get_executive_dashboard(self) -> Dict[str, Any]:
        """Calculate all executive dashboard KPIs"""
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Employee metrics
        total_employees = await User.find_all().count()
        active_employees = await User.find({"is_active": True}).count()
        
        # Project metrics
        total_projects = await Project.find_all().count()
        active_projects = await Project.find({"status": {"$in": ["active", "in_progress"]}}).count()
        projects_on_track = await Project.find({"status": "active", "health": {"$in": ["good", "excellent"]}}).count()
        projects_at_risk = await Project.find({"health": {"$in": ["at_risk", "critical"]}}).count()
        
        # XP and productivity metrics
        xp_events = await XPEvent.find_all().to_list()
        total_org_xp = sum(event.amount for event in xp_events)
        avg_xp_per_employee = total_org_xp / active_employees if active_employees > 0 else 0
        
        # GitHub activity this week
        commits_this_week = await XPEvent.find({
            "source": "commit",
            "earned_at": {"$gte": week_ago}
        }).count()
        prs_merged_this_week = await XPEvent.find({
            "source": "pull_request",
            "earned_at": {"$gte": week_ago}
        }).count()
        
        # Hiring pipeline metrics
        total_candidates = await Candidate.find_all().count()
        candidates_by_stage = {}
        stages = ["Applied", "Screening", "Interview", "Technical Assessment", "Offer", "Hired", "Rejected"]
        for stage in stages:
            count = await Candidate.find({"current_stage": stage}).count()
            candidates_by_stage[stage] = count
        
        # Time to hire calculation
        hired_candidates = await Candidate.find({"current_stage": "Hired"}).to_list()
        avg_time_to_hire_days = 0
        if hired_candidates:
            time_diffs = []
            for candidate in hired_candidates:
                if candidate.created_at and candidate.updated_at:
                    days = (candidate.updated_at - candidate.created_at).days
                    time_diffs.append(days)
            avg_time_to_hire_days = statistics.mean(time_diffs) if time_diffs else 0
        
        # Offer acceptance rate
        offered_count = await Candidate.find({"stage_history": {"$elemMatch": {"stage": "Offer"}}}).count()
        hired_count = candidates_by_stage.get("Hired", 0)
        offer_acceptance_rate = (hired_count / offered_count * 100) if offered_count > 0 else 0
        
        # Growth rates (compare last month to previous month)
        two_months_ago = now - timedelta(days=60)
        employees_last_month = await User.find({"created_at": {"$gte": two_months_ago, "$lt": month_ago}}).count()
        employees_this_month = await User.find({"created_at": {"$gte": month_ago}}).count()
        employee_growth_rate = ((employees_this_month - employees_last_month) / employees_last_month * 100) if employees_last_month > 0 else 0
        
        # Project completion rate
        completed_projects = await Project.find({"status": "completed", "end_date": {"$gte": month_ago}}).count()
        started_projects = await Project.find({"start_date": {"$gte": month_ago}}).count()
        project_completion_rate = (completed_projects / started_projects * 100) if started_projects > 0 else 0
        
        # Hiring velocity (candidates progressing per week)
        stage_changes_this_week = await Candidate.find({
            "stage_history": {"$elemMatch": {"changed_at": {"$gte": week_ago}}}
        }).count()
        hiring_velocity = stage_changes_this_week / 7
        
        return {
            "snapshot_date": now,
            "total_employees": total_employees,
            "active_employees": active_employees,
            "total_projects": total_projects,
            "active_projects": active_projects,
            "projects_on_track": projects_on_track,
            "projects_at_risk": projects_at_risk,
            "avg_xp_per_employee": round(avg_xp_per_employee, 2),
            "total_org_xp": round(total_org_xp, 2),
            "commits_this_week": commits_this_week,
            "prs_merged_this_week": prs_merged_this_week,
            "total_candidates": total_candidates,
            "candidates_by_stage": candidates_by_stage,
            "avg_time_to_hire_days": round(avg_time_to_hire_days, 2),
            "offer_acceptance_rate": round(offer_acceptance_rate, 2),
            "avg_satisfaction_score": 0,
            "engagement_score": 0,
            "total_budget": 0,
            "budget_utilized": 0,
            "budget_utilization_percent": 0,
            "employee_growth_rate": round(employee_growth_rate, 2),
            "project_completion_rate": round(project_completion_rate, 2),
            "hiring_velocity": round(hiring_velocity, 2)
        }
    
    async def get_team_productivity_metrics(self) -> List[Dict[str, Any]]:
        """Calculate team-level productivity metrics"""
        projects = await Project.find_all().to_list()
        team_metrics = []
        
        for project in projects:
            member_ids = [m.user_id for m in project.members] if project.members else []
            if not member_ids:
                continue
            
            # Get XP for team members in this project context
            xp_events = await XPEvent.find({"person_id": {"$in": member_ids}}).to_list()
            total_xp = sum(event.amount for event in xp_events)
            commits_count = sum(1 for event in xp_events if event.source == "commit")
            prs_count = sum(1 for event in xp_events if event.source == "pull_request")
            issues_count = sum(1 for event in xp_events if event.source == "issue")
            
            team_metrics.append({
                "team_name": project.name or "Unknown",
                "total_members": len(member_ids),
                "active_members": len(member_ids),
                "total_xp": total_xp,
                "avg_xp_per_member": total_xp / len(member_ids) if member_ids else 0,
                "commits_count": commits_count,
                "prs_count": prs_count,
                "issues_closed": issues_count
            })
        
        return team_metrics
    
    async def get_hiring_pipeline_health(self) -> Dict[str, Any]:
        """Detailed hiring pipeline analytics"""
        now = datetime.utcnow()
        
        candidates = await Candidate.find_all().to_list()
        total_candidates = len(candidates)
        
        # Candidates by stage
        candidates_by_stage = {}
        stages = ["Applied", "Screening", "Interview", "Technical Assessment", "Offer", "Hired", "Rejected"]
        for stage in stages:
            candidates_by_stage[stage] = await Candidate.find({"current_stage": stage}).count()
        
        # Stage conversion rates
        stage_conversion_rates = {}
        for i in range(len(stages) - 1):
            current_stage = stages[i]
            next_stage = stages[i + 1]
            current_count = candidates_by_stage[current_stage]
            progressed = await Candidate.find({
                "stage_history": {"$elemMatch": {"stage": next_stage}}
            }).count()
            stage_conversion_rates[f"{current_stage}_to_{next_stage}"] = (
                (progressed / current_count * 100) if current_count > 0 else 0
            )
        
        # Average time per stage
        avg_time_per_stage_days = {}
        for stage in stages:
            stage_times = []
            for candidate in candidates:
                stage_history = candidate.get("stage_history", [])
                stage_entries = [h for h in stage_history if h.get("stage") == stage]
                if stage_entries:
                    entry_time = stage_entries[0].get("changed_at")
                    exit_time = stage_entries[-1].get("changed_at") if len(stage_entries) > 1 else datetime.utcnow()
                    if entry_time:
                        stage_times.append((exit_time - entry_time).days)
            avg_time_per_stage_days[stage] = statistics.mean(stage_times) if stage_times else 0
        
        # Monthly trends (last 6 months)
        monthly_trends = []
        for i in range(6):
            month_start = now - timedelta(days=30 * (i + 1))
            month_end = now - timedelta(days=30 * i)
            month_candidates = await Candidate.find({
                "created_at": {"$gte": month_start, "$lt": month_end}
            }).count()
            monthly_trends.insert(0, {
                "month": month_start.strftime("%b %Y"),
                "candidates": month_candidates
            })
        
        return {
            "total_candidates": total_candidates,
            "candidates_by_stage": candidates_by_stage,
            "stage_conversion_rates": stage_conversion_rates,
            "avg_time_to_hire_days": sum(avg_time_per_stage_days.values()),
            "avg_time_per_stage_days": avg_time_per_stage_days,
            "offer_acceptance_rate": (candidates_by_stage.get("Hired", 0) / 
                                     candidates_by_stage.get("Offer", 1) * 100),
            "rejection_reasons": {},
            "top_sources": [],
            "monthly_trends": monthly_trends
        }
    
    async def predict_employee_attrition(self) -> List[Dict[str, Any]]:
        """Predict employee attrition risk"""
        users = await User.find({"is_active": True}).to_list()
        predictions = []
        
        for user in users:
            user_id = str(user["_id"])
            
            # Calculate risk factors
            risk_factors = []
            risk_score = 0.0
            
            # Factor 1: XP activity decline
            now = datetime.utcnow()
            recent_xp = await XPEvent.find({
                "person_id": user_id,
                "earned_at": {"$gte": now - timedelta(days=30)}
            }).count()
            
            if recent_xp < 10:
                risk_factors.append("Low recent activity")
                risk_score += 0.3
            
            # Factor 2: No project involvement
            project_count = await Project.find({
                "members.user_id": user_id
            }).count()
            
            if project_count == 0:
                risk_factors.append("Not assigned to any projects")
                risk_score += 0.4
            
            # Factor 3: Long tenure (placeholder)
            created_at = user.get("created_at")
            if created_at:
                tenure_days = (now - created_at).days
                if tenure_days > 730:  # 2 years
                    risk_factors.append("Long tenure (potential growth plateau)")
                    risk_score += 0.2
            
            # Determine risk level
            if risk_score >= 0.7:
                risk_level = "High"
            elif risk_score >= 0.4:
                risk_level = "Medium"
            else:
                risk_level = "Low"
            
            if risk_score >= 0.4:  # Only include medium and high risk
                predictions.append({
                    "employee_id": user_id,
                    "employee_name": user.get("full_name", "Unknown"),
                    "position": user.get("position", "Unknown"),
                    "attrition_risk": risk_level,
                    "risk_score": round(risk_score, 2),
                    "risk_factors": risk_factors,
                    "recommendations": self._get_attrition_recommendations(risk_factors)
                })
        
        return sorted(predictions, key=lambda x: x["risk_score"], reverse=True)
    
    async def predict_project_risks(self) -> List[Dict[str, Any]]:
        """Predict project delivery risks"""
        projects = await Project.find({"status": {"$in": ["active", "in_progress"]}}).to_list()
        predictions = []
        
        for project in projects:
            project_id = str(project["_id"])
            risk_factors = []
            risk_score = 0.0
            estimated_delay = 0
            
            # Factor 1: Team size
            team_size = len(project.get("members", []))
            if team_size < 2:
                risk_factors.append("Understaffed team")
                risk_score += 0.3
                estimated_delay += 15
            
            # Factor 2: Project health
            health = project.get("health", "unknown")
            if health in ["at_risk", "critical"]:
                risk_factors.append(f"Poor health status: {health}")
                risk_score += 0.4
                estimated_delay += 30
            
            # Factor 3: Deadline proximity
            end_date = project.get("end_date")
            if end_date:
                days_remaining = (end_date - datetime.utcnow()).days
                if days_remaining < 14:
                    risk_factors.append("Approaching deadline")
                    risk_score += 0.2
            
            # Factor 4: Recent activity
            member_ids = [m.get("user_id") for m in project.get("members", [])]
            if member_ids:
                recent_commits = await XPEvent.find({
                    "person_id": {"$in": member_ids},
                    "source": "commit",
                    "earned_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
                }).count()
                
                if recent_commits < 5:
                    risk_factors.append("Low development activity")
                    risk_score += 0.25
                    estimated_delay += 10
            
            if risk_score >= 0.6:
                risk_level = "High"
            elif risk_score >= 0.3:
                risk_level = "Medium"
            else:
                risk_level = "Low"
            
            if risk_score >= 0.3:
                predictions.append({
                    "project_id": project_id,
                    "project_name": project.get("name", "Unknown"),
                    "risk_level": risk_level,
                    "risk_score": round(risk_score, 2),
                    "risk_factors": risk_factors,
                    "estimated_delay_days": estimated_delay,
                    "recommendations": self._get_project_risk_recommendations(risk_factors)
                })
        
        return sorted(predictions, key=lambda x: x["risk_score"], reverse=True)
    
    async def predict_resource_shortages(self) -> List[Dict[str, Any]]:
        """Predict resource/skill shortages"""
        # Get all XP events to analyze skill distribution
        xp_events = await XPEvent.find_all().to_list()
        
        # Aggregate skills across all XP events
        skill_data = {}
        for event in xp_events:
            if event.skill_distribution:
                for skill, xp in event.skill_distribution.items():
                    if skill not in skill_data:
                        skill_data[skill] = {"total_xp": 0, "user_ids": set()}
                    skill_data[skill]["total_xp"] += xp
                    skill_data[skill]["user_ids"].add(event.person_id)
        
        predictions = []
        
        # Analyze each skill area
        for skill_name, data in skill_data.items():
            current_capacity = len(data["user_ids"])
            
            # Simple heuristic: if few people have this skill, it's a shortage risk
            shortage_severity = "Low"
            shortage_gap = 0
            
            if current_capacity < 2:
                shortage_severity = "Critical"
                shortage_gap = 3 - current_capacity
            elif current_capacity < 3:
                shortage_severity = "High"
                shortage_gap = 5 - current_capacity
            elif current_capacity < 5:
                shortage_severity = "Medium"
                shortage_gap = 2
            
            if shortage_severity != "Low":
                predictions.append({
                    "skill_area": skill_name,
                    "shortage_severity": shortage_severity,
                    "current_capacity": current_capacity,
                    "projected_demand": current_capacity + shortage_gap,
                    "shortage_gap": shortage_gap,
                    "timeline_weeks": 12,
                    "recommendations": self._get_resource_shortage_recommendations(skill_name, shortage_gap)
                })
        
        return sorted(predictions, key=lambda x: x["shortage_gap"], reverse=True)
    
    async def predict_hiring_demand(self) -> List[Dict[str, Any]]:
        """Predict future hiring needs"""
        # Analyze project pipeline and team capacity
        active_projects = await Project.find({"status": {"$in": ["active", "in_progress"]}}).count()
        total_employees = await User.find({"is_active": True}).count()
        
        # Simple heuristic: project-to-employee ratio
        ratio = active_projects / total_employees if total_employees > 0 else 0
        
        predictions = []
        
        # If ratio is high, predict need for more developers
        if ratio > 1.5:
            predictions.append({
                "position": "Software Developer",
                "predicted_openings": int(ratio * 2),
                "confidence": 0.75,
                "reasoning": [
                    f"High project-to-employee ratio: {ratio:.2f}",
                    f"{active_projects} active projects for {total_employees} employees",
                    "Projected increased workload"
                ],
                "recommended_start_date": datetime.utcnow() + timedelta(days=30),
                "estimated_time_to_fill_days": 45
            })
        
        # Check for specific skill gaps
        skill_gaps = await self.predict_resource_shortages()
        for gap in skill_gaps[:2]:  # Top 2 gaps
            predictions.append({
                "position": f"{gap['skill_area']} Specialist",
                "predicted_openings": gap["shortage_gap"],
                "confidence": 0.8,
                "reasoning": [
                    f"Skill shortage in {gap['skill_area']}",
                    f"Only {gap['current_capacity']} employees with this skill",
                    f"Need {gap['shortage_gap']} additional hires"
                ],
                "recommended_start_date": datetime.utcnow() + timedelta(days=14),
                "estimated_time_to_fill_days": 60
            })
        
        return predictions
    
    def _get_attrition_recommendations(self, risk_factors: List[str]) -> List[str]:
        """Generate recommendations for attrition risk"""
        recommendations = []
        if "Low recent activity" in risk_factors:
            recommendations.append("Schedule 1-on-1 to discuss engagement and career goals")
            recommendations.append("Consider assigning challenging projects aligned with interests")
        if "Not assigned to any projects" in risk_factors:
            recommendations.append("Assign to active project immediately")
            recommendations.append("Review workload distribution across teams")
        if "Long tenure" in risk_factors:
            recommendations.append("Discuss career advancement opportunities")
            recommendations.append("Consider promotion or role expansion")
        return recommendations
    
    def _get_project_risk_recommendations(self, risk_factors: List[str]) -> List[str]:
        """Generate recommendations for project risks"""
        recommendations = []
        if "Understaffed team" in risk_factors:
            recommendations.append("Add 1-2 team members immediately")
            recommendations.append("Consider contractor support for critical tasks")
        if "Poor health status" in risk_factors:
            recommendations.append("Conduct emergency project review meeting")
            recommendations.append("Identify and resolve blocking issues")
        if "Approaching deadline" in risk_factors:
            recommendations.append("Review scope and consider deadline extension")
            recommendations.append("Focus on MVP features only")
        if "Low development activity" in risk_factors:
            recommendations.append("Investigate team blockers or bottlenecks")
            recommendations.append("Increase standup frequency to daily")
        return recommendations
    
    def _get_resource_shortage_recommendations(self, skill: str, gap: int) -> List[str]:
        """Generate recommendations for resource shortages"""
        return [
            f"Plan to hire {gap} {skill} specialist(s)",
            f"Consider upskilling existing team members in {skill}",
            "Explore contractor or consultant options",
            "Review project assignments to optimize skill utilization"
        ]
