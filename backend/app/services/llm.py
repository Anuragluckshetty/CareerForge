from functools import lru_cache
import time

from langchain_core.messages import BaseMessage
from langchain_groq import ChatGroq

from app.config.settings import settings


@lru_cache
def get_chat_model() -> ChatGroq:
    """Create the configured Groq chat model only when it is first needed."""
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=settings.groq_temperature,
    )


def invoke_chat(messages: list[BaseMessage]) -> str:
    """Send messages to Groq and return the provider response text."""
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = get_chat_model().invoke(messages)
            return (
                response.content
                if isinstance(response.content, str)
                else str(response.content)
            )
        except Exception as error:
            last_error = error
            if attempt == 0:
                time.sleep(1)
    if last_error is not None:
        raise last_error
    raise RuntimeError("The AI provider returned no response.")

