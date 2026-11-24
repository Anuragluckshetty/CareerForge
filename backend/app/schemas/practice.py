from typing import Literal

from pydantic import BaseModel, Field

from app.graph.state import AgentName


class PracticeRequest(BaseModel):
    request: str = Field(min_length=1, max_length=8_000)
    context: str | None = Field(default=None, max_length=8_000)


class PracticeResponse(BaseModel):
    agent: AgentName
    response: str

