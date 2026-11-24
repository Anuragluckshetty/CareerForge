from fastapi.testclient import TestClient

from app.main import app


def test_agent_catalog_exposes_all_specialists() -> None:
    response = TestClient(app).get("/api/v1/agents")

    assert response.status_code == 200
    assert {agent["id"] for agent in response.json()} == {
        "dsa",
        "sql",
        "technical",
        "hr",
    }
