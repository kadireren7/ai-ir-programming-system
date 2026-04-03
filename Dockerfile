# Web console only (Python stack). Rust bridge optional on host; see README for native Rust.
FROM python:3.12-slim

LABEL org.opencontainers.image.title="TORQA"
LABEL org.opencontainers.image.description="TORQA semantic core — web console (FastAPI)"
LABEL org.opencontainers.image.version="0.0.0"
LABEL org.opencontainers.image.documentation="https://github.com/"

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt pyproject.toml README.md LICENSE ./
COPY src ./src
COPY website ./website
COPY spec ./spec
COPY examples ./examples

RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["python", "-m", "website.server", "--host", "0.0.0.0", "--no-reload"]
