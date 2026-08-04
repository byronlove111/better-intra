# uv officiel : binaire précompilé, plus rapide/reproductible que "pip install uv"
FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Lockfile copié seul d'abord : ce layer n'est invalidé (et les deps réinstallées)
# que si pyproject.toml/uv.lock changent, pas à chaque modif du code.
COPY pyproject.toml uv.lock ./
# --frozen : n'installe que ce qui est dans uv.lock (jamais de résolution/maj surprise)
# --no-install-project : pas encore de code app/ copié, on ne veut que les deps
# --no-dev : pas besoin des deps de dev (lint/tests) dans l'image de run
RUN uv sync --frozen --no-install-project --no-dev

COPY app ./app
RUN uv sync --frozen --no-dev

EXPOSE 8000

ENTRYPOINT ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
