# CareerForge

CareerForge is a full-stack placement-preparation platform that combines
specialized AI coaching, resume analysis, preparation tracking, and a
professional responsive interface.

The running application is available at:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Interactive API documentation: `http://localhost:8000/docs`

## Features

- **AI practice coach:** Sends requests to Groq through FastAPI and routes DSA,
  SQL, technical, and HR questions to specialized LangGraph agent nodes.
- **DSA practice:** Generates algorithm questions, examples, constraints,
  hints, starter code, and solutions.
- **SQL practice:** Handles SQL concepts, joins, CTEs, aggregations, and query
  optimization.
- **Technical interviews:** Supports Python, Java, OOP, DBMS, operating systems,
  networks, and system-design prompts.
- **HR interviews:** Uses structured behavioral interview coaching and the STAR
  method.
- **Resume upload:** Accepts PDF, DOCX, and TXT files and extracts readable
  resume text.
- **Resume analysis:** Sends the resume and a focused question to Groq for
  prioritized, actionable suggestions.
- **Resume generation:** Tailors a structured resume to a target role, shows a
  preview, and provides editable compilable LaTeX with `.tex` and PDF downloads.
  Generated sections use the candidate's source details; unsupported credentials
  or achievements are not intentionally filled in.
- **Formatted answers:** AI Markdown is rendered with headings, lists, tables,
  code blocks, and readable spacing.
- **Profile settings:** Stores name, language, skill level, target role,
  interests, and goals.
- **Preparation progress:** Tracks attempts, streaks, completed sessions, and
  profile completion in the browser.
- **Professional UI:** Responsive full-width blue recruitment theme with dark
  mode support.
- **Separate protected pages:** Overview, Practice, Mock Interviews, Resume
  Review, and Progress are available at their own client-side routes.
- **Account authentication:** Login and registration use the FastAPI JWT
  endpoints. A stored token is checked on refresh, and logged-out users are
  redirected to login.

## How the project works

### Practice request flow

```text
User enters a prompt in React
        |
        v
POST /api/v1/practice/ask
        |
        v
FastAPI validates and forwards the request
        |
        v
LangGraph supervisor analyzes keywords
        |
        +--> DSA agent
        +--> SQL agent
        +--> Technical agent
        +--> HR agent
        |
        v
Selected agent creates a focused Groq prompt
        |
        v
Groq generates the answer
        |
        v
FastAPI returns { agent, response }
        |
        v
React renders Markdown and stores chat/progress locally
```

The supervisor routes SQL/database requests to the SQL agent, HR/behavioral
requests to the HR agent, programming/computer-science requests to the technical
agent, and remaining preparation requests to the DSA agent.

### Resume request flow

```text
Upload PDF, DOCX, or TXT
        |
        v
POST /api/v1/assistant/resume/upload
        |
        v
Backend validates size and file type
        |
        v
PyPDF or python-docx extracts text
        |
        v
User asks a resume-specific question
        |
        v
POST /api/v1/assistant/resume/chat
        |
        v
Groq receives the resume text and question
        |
        v
React renders prioritized Markdown suggestions
```

TXT is decoded as UTF-8. PDF text is extracted from pages with PyPDF. DOCX text
is extracted from document paragraphs. The upload limit is controlled by
`MAX_UPLOAD_SIZE_MB`.

### Resume generation flow

```text
Resume text + target job role
        |
        v
POST /api/v1/assistant/resume/generate
        |
        v
Groq returns validated structured resume fields
        |
        +--> React renders a resume preview and downloadable PDF
        |
        +--> Backend creates escaped, compilable LaTeX from those same fields
                    |
                    +--> Editable source, copy, and .tex download
```

The generated sections are omitted when the source has no matching information.
Review the result for accuracy before using it; generated content should not be
treated as verification of qualifications.

### Frontend state

The React frontend stores profile details, theme choice, resume text, chat
history, and practice progress in `localStorage`, so they remain available in
the current browser after a refresh. User credentials and profile records are
handled by the backend and PostgreSQL.

### Routes and authentication

| Route | Page | Authentication |
|---|---|---|
| `/login` | Sign in | Public |
| `/register` | Create an account | Public |
| `/overview` | Dashboard overview | Protected |
| `/practice` | Practice tracks and coach | Protected |
| `/mock-interviews` | Mock interview activities | Protected |
| `/resume-review` | Resume upload and analysis | Protected |
| `/progress` | Preparation progress | Protected |

The shared sidebar and header remain mounted across all five protected pages.
The frontend stores the JWT returned by `/api/v1/auth/login` or
`/api/v1/auth/register`, validates it on page load with `/api/v1/auth/me`, and
removes it on logout. Password hashing and token signing are handled by the
backend authentication service.

## Repository layout

```text
backend/
  app/
    api/                 Health, auth, practice, agents, and assistant routes
    agents/              Specialized agent package
    config/              Application settings
    database/            SQLAlchemy engine and session management
    graph/               LangGraph state and supervisor
    models/              SQLAlchemy user and profile models
    rag/                 Retrieval package reserved for document RAG
    schemas/             Pydantic request and response models
    services/             Groq and authentication services
    main.py              FastAPI application entry point
frontend/                Vite React client
docs/                    Architecture and API documentation
docker-compose.yml       Frontend, backend, and PostgreSQL services
```

## Configuration

Create `backend/.env` from the example:

```powershell
Copy-Item backend/.env.example backend/.env
```

Set at least:

```dotenv
GROQ_API_KEY=your-real-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
JWT_SECRET_KEY=a-long-random-production-secret
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
MAX_UPLOAD_SIZE_MB=10
```

Keep API keys only in backend environment files or deployment secrets. Never
place provider credentials in `VITE_*` variables or commit them to Git.

## Run with Docker

From the repository root:

```powershell
docker compose up --build -d
docker compose ps
```

The frontend and backend use Nginx as the browser-facing reverse proxy:

- `http://localhost:5173/` serves the React application.
- Requests beginning with `/api/` are proxied to the FastAPI container.
- `http://localhost:5173/health` is proxied to the backend health endpoint.

Stop the application:

```powershell
docker compose down
```

To remove PostgreSQL data as well:

```powershell
docker compose down -v
```

## Run locally without Docker

Backend:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/Activate.ps1
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --reload
```

Frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The local frontend runs on Vite's port, usually `5173`, and `VITE_API_URL`
can be set to a remote backend if needed.

## Test

Backend:

```powershell
python -m pytest backend/tests -q
```

Frontend production build:

```powershell
cd frontend
npm run build
```

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend readiness |
| GET | `/api/v1/agents` | Available specialist agents |
| POST | `/api/v1/practice/ask` | Routed practice chat |
| POST | `/api/v1/assistant/chat` | General assistant chat |
| POST | `/api/v1/assistant/resume/upload` | Extract uploaded resume text |
| POST | `/api/v1/assistant/resume/chat` | Ask resume-specific questions |
| POST | `/api/v1/assistant/resume/generate` | Generate a resume preview and LaTeX source |
| POST | `/api/v1/auth/register` | Create a user |
| POST | `/api/v1/auth/login` | Obtain an access token |
| GET | `/api/v1/auth/me` | Return the authenticated user |
| PUT | `/api/v1/auth/profile` | Update the authenticated profile |

## Deployment notes

- Use a real PostgreSQL database and strong JWT secret in hosted deployments.
- Set the Groq key in the backend environment only.
- Configure CORS for the exact hosted frontend origin.
- Serve the frontend build through Nginx or a static host.
- The current browser activity uses local storage; move this state to PostgreSQL
  when multi-device accounts and server-side history are required.
- The RAG package is prepared as an architecture boundary but does not yet
  provide embedded-document retrieval.

## Roadmap

1. Project setup and architecture
2. Backend foundation and Groq integration
3. DSA and SQL agents
4. Technical and HR interview agents
5. LangGraph supervisor and routing
6. Document RAG assistant
7. Resume analyzer
8. PostgreSQL persistence and personalization
9. React frontend
10. Integration, testing, and deployment

