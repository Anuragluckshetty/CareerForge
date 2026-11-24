from fastapi import APIRouter, HTTPException, status
import logging

from app.graph.supervisor import supervisor
from app.schemas.practice import PracticeRequest, PracticeResponse

router = APIRouter(prefix="/practice", tags=["practice"])
logger = logging.getLogger(__name__)


@router.post("/ask", response_model=PracticeResponse)
def ask_practice_agent(request: PracticeRequest) -> PracticeResponse:
    """Route a preparation request through the LangGraph supervisor."""
    try:
        result = supervisor.invoke(
            {"request": request.request, "context": request.context or ""}
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except Exception as error:
        logger.exception("Practice request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI coach is temporarily unavailable. Please try again.",
        ) from error

    return PracticeResponse(agent=result["agent"], response=result["response"])

