import json

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.assistant import ResumeContent


client = TestClient(app)


def test_chat_requires_groq_configuration() -> None:
    response = client.post(
        "/api/v1/assistant/chat",
        json={"message": "Give me one array question."},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "GROQ_API_KEY is not configured."


def test_chat_rejects_empty_messages() -> None:
    response = client.post("/api/v1/assistant/chat", json={"message": ""})

    assert response.status_code == 422


def test_resume_txt_upload_extracts_text() -> None:
    resume = b"Anurag Student\nPython Developer\nBuilt a FastAPI placement platform."
    response = client.post(
        "/api/v1/assistant/resume/upload",
        files={"file": ("resume.txt", resume, "text/plain")},
    )

    assert response.status_code == 200
    assert response.json()["filename"] == "resume.txt"
    assert "Python Developer" in response.json()["resume_text"]


def test_resume_generation_returns_structured_resume_and_escaped_latex(monkeypatch) -> None:
    generated = {
        "contact": {"name": "Maya & Lee_#"},
        "summary": "Built tools that improved response time by 20%.",
        "technical_skills": [
            {"category": "Languages", "skills": ["Python", "C#"]}
        ],
        "education": [
            {
                "title": "B.Sc. Computer Science",
                "organization": "Example University",
                "dates": "2021–2025",
                "details": [],
            }
        ],
        "projects": [],
        "experience": [],
        "certifications": [],
        "achievements": [],
    }
    monkeypatch.setattr(
        "app.api.assistant.invoke_chat",
        lambda messages: json.dumps(generated),
    )

    response = client.post(
        "/api/v1/assistant/resume/generate",
        json={
            "resume_text": "Maya Lee, Python developer, B.Sc. Computer Science.",
            "target_job_role": "Software Engineer",
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["resume"]["contact"]["name"] == "Maya & Lee_#"
    assert r"Maya \& Lee\_\#" in result["latex_source"]
    assert r"20\%" in result["latex_source"]
    assert "Technical Skills" in result["latex_source"]
    assert "Projects" not in result["latex_source"]


def test_resume_generation_rejects_invalid_model_output(monkeypatch) -> None:
    monkeypatch.setattr("app.api.assistant.invoke_chat", lambda messages: "not JSON")

    response = client.post(
        "/api/v1/assistant/resume/generate",
        json={
            "resume_text": "A sufficiently long resume text to pass validation.",
            "target_job_role": "Software Engineer",
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "The generated resume could not be validated. Please try again."


def test_resume_content_normalizes_common_education_field_names() -> None:
    resume = ResumeContent.model_validate(
        {
            "education": [
                {
                    "degree": "B.Sc. Computer Science",
                    "institution": "Example University",
                    "year": "2022-2025",
                }
            ]
        }
    )

    education = resume.education[0]
    assert education.title == "B.Sc. Computer Science"
    assert education.organization == "Example University"
    assert education.dates == "2022-2025"
