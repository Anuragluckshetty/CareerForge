from langgraph.graph import END, START, StateGraph

from app.graph.state import AgentName, CareerForgeState
from app.services.llm import invoke_chat
from langchain_core.messages import HumanMessage, SystemMessage


def route_request(request: str) -> AgentName:
    """Choose one specialized agent from the user's request."""
    text = request.lower()
    if any(word in text for word in ("sql", "query", "join", "database", "cte")):
        return "sql"
    if any(word in text for word in ("hr", "strength", "weakness", "teamwork", "behavioral")):
        return "hr"
    if any(word in text for word in ("technical interview", "python", "java", "oops", "dbms")):
        return "technical"
    return "dsa"


def _agent_node(agent: AgentName, focus: str):
    def run(state: CareerForgeState) -> CareerForgeState:
        context = state.get("context", "").strip()
        messages = [
            SystemMessage(
                content=(
                    f"You are CareerForge's {agent.upper()} preparation agent. "
                    f"Focus on {focus}. Give useful, accurate, beginner-friendly "
                    "placement-preparation answers. Solve the user's exact question "
                    "step by step when appropriate. Include code and complexity "
                    "when relevant. Do not give generic advice or invent information "
                    "when a concrete answer is requested. Format answers in clean "
                    "Markdown with concise headings, short paragraphs, bullets, "
                    "numbered steps, and fenced code blocks when needed."
                )
            ),
        ]
        if context:
            messages.append(
                HumanMessage(content=f"Conversation and profile context:\n{context}")
            )
        messages.append(HumanMessage(content=state["request"]))
        return {"agent": agent, "response": invoke_chat(messages)}

    return run


def _agent_route(state: CareerForgeState) -> AgentName:
    return state.get("agent") or route_request(state["request"])


def build_supervisor():
    """Build the routed multi-agent graph used by practice requests."""
    graph = StateGraph(CareerForgeState)
    graph.add_node("classify", lambda state: {"agent": route_request(state["request"])})
    graph.add_node("dsa", _agent_node("dsa", "data structures, algorithms, complexity, and coding hints"))
    graph.add_node("sql", _agent_node("sql", "SQL concepts, query writing, and optimization"))
    graph.add_node(
        "technical",
        _agent_node("technical", "Python, Java, OOP, DBMS, operating systems, and networks"),
    )
    graph.add_node("hr", _agent_node("hr", "behavioral interview answers and the STAR method"))
    graph.add_edge(START, "classify")
    graph.add_conditional_edges(
        "classify",
        _agent_route,
        {"dsa": "dsa", "sql": "sql", "technical": "technical", "hr": "hr"},
    )
    for agent in ("dsa", "sql", "technical", "hr"):
        graph.add_edge(agent, END)
    return graph.compile()


supervisor = build_supervisor()

