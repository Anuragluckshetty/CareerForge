# CareerForge architecture

## Boundaries

CareerForge uses a two-service application boundary:

- **Frontend:** React and Vite provide the responsive user experience. It calls
  the backend through versioned REST endpoints and never receives provider
  secrets.
- **Backend:** FastAPI owns authentication, validation, orchestration, domain
  services, persistence, document access control, and calls to Groq.
- **PostgreSQL:** Stores SQLAlchemy users and profile models. Browser state for
  progress, chat, and resume text is currently stored locally.
- **Vector store:** Reserved for future RAG document embeddings.

## AI request flow

```text
React client
    -> FastAPI API
        -> LangGraph supervisor
            -> specialized agent node
                -> Groq chat model
        -> PostgreSQL activity record
    -> structured response
```

The supervisor will use a shared, typed state and conditional edges to route
requests. LangGraph is used instead of unrelated function calls because it
provides explicit state transitions, multi-turn context, and checkpoint hooks
for resumable conversations while keeping each specialized agent isolated.

## Document question-answering flow

```text
Upload -> validate ownership/type/size -> extract -> chunk -> embed -> index
Question -> embed -> retrieve owned chunks -> generate grounded answer + sources
```

If retrieval returns no relevant chunks, the API will state that the uploaded
materials do not contain enough information rather than inventing citations.

## Phase 1 decisions

- Configuration is loaded from environment variables through Pydantic Settings.
- PostgreSQL is available through Docker Compose for consistent local setup.
- The backend exposes only a readiness-style health endpoint until the
  application foundation is implemented in Phase 2.
- AI provider credentials are backend-only and are never placed in the React
  application.

