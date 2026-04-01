# Web console only (Python stack). Rust bridge optional on host; see README for native Rust.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt pyproject.toml README.md LICENSE ./
COPY src ./src
COPY webui ./webui
COPY spec ./spec
COPY examples ./examples

RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["python", "-m", "webui", "--host", "0.0.0.0", "--no-reload"]
