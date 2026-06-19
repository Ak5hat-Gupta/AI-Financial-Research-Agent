from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.core.tasks import job_status
from app.models.user import User

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}")
def get_job(job_id: str, _: User = Depends(get_current_user)) -> dict:
    return job_status(job_id)
