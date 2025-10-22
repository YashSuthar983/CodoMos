from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId

from app.api.deps import get_current_user
from app.models import Candidate, User
from app.schemas.candidate import CandidateCreate, CandidateOut, CandidateUpdate

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("/", response_model=List[CandidateOut])
async def list_candidates(current_user: User = Depends(get_current_user)):
    items = await Candidate.find_all().sort(-Candidate.created_at).to_list()
    return items


@router.post("/", response_model=CandidateOut)
async def create_candidate(payload: CandidateCreate, current_user: User = Depends(get_current_user)):
    cand = Candidate(name=payload.name, email=payload.email, resume_text=payload.resume_text, status=payload.status or "applied", score=payload.score or 0)
    await cand.insert()
    return cand


@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(candidate_id: str, current_user: User = Depends(get_current_user)):
    cand = await Candidate.get(PydanticObjectId(candidate_id))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand


@router.patch("/{candidate_id}", response_model=CandidateOut)
async def update_candidate(candidate_id: str, payload: CandidateUpdate, current_user: User = Depends(get_current_user)):
    cand = await Candidate.get(PydanticObjectId(candidate_id))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(cand, field, value)
    await cand.save()
    return cand


@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: str, current_user: User = Depends(get_current_user)):
    cand = await Candidate.get(PydanticObjectId(candidate_id))
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    await cand.delete()
    return {"message": "deleted"}
