# syntax=docker/dockerfile:1

FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS base

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

COPY pyproject.toml uv.lock ./
COPY app ./app

RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
