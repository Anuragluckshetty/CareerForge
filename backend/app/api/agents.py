from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.graph.state import AgentName

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentCatalogItem(BaseModel):
    id: AgentName
    name: str
    description: str
    capabilities: list[str]


CATALOG = [
    AgentCatalogItem(
        id="dsa",
        name="DSA Preparation",
        description="Practice algorithms, coding patterns, hints, and complexity analysis.",
        capabilities=["questions", "hints", "solution review", "complexity"],
    ),
    AgentCatalogItem(
        id="sql",
        name="SQL Preparation",
        description="Work through practical SQL problems and query optimization.",
        capabilities=["joins", "aggregations", "CTEs", "window functions"],
    ),
    AgentCatalogItem(
        id="technical",
        name="Technical Interview",
        description="Prepare for core computer science and programming interviews.",
        capabilities=["Python", "Java", "OOP", "DBMS", "OS", "networks"],
    ),
    AgentCatalogItem(
        id="hr",
        name="HR Interview",
        description="Improve behavioral answers using clear STAR structure.",
        capabilities=["strengths", "conflict", "teamwork", "leadership", "goals"],
    ),
]


@router.get("", response_model=list[AgentCatalogItem])
def list_agents() -> list[AgentCatalogItem]:
    return CATALOG

