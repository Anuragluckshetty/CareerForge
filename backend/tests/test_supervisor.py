from app.graph.supervisor import route_request


def test_routes_sql_requests_to_sql_agent() -> None:
    assert route_request("Explain SQL joins with an example") == "sql"


def test_routes_behavioral_requests_to_hr_agent() -> None:
    assert route_request("Help me answer a teamwork question") == "hr"


def test_routes_algorithm_requests_to_dsa_agent() -> None:
    assert route_request("Give me an array coding problem") == "dsa"
