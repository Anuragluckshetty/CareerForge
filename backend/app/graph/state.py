from typing import Literal, TypedDict

AgentName = Literal["dsa", "sql", "technical", "hr"]


class CareerForgeState(TypedDict, total=False):
    request: str
    context: str
    agent: AgentName
    response: str

