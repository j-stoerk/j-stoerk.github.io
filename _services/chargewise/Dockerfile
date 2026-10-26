FROM python:3.12-slim

# Run the portable release itself. No rebuilt or replacement frontend.
RUN pip install --no-cache-dir uv==0.9.7 \
    && useradd --create-home --uid 1000 chargewise \
    && mkdir /app && chown chargewise:chargewise /app
COPY fetch_release.py /opt/chargewise/fetch_release.py
RUN python /opt/chargewise/fetch_release.py /app \
    && chown -R chargewise:chargewise /app

USER chargewise
WORKDIR /app
ENV UV_CACHE_DIR=/tmp/chargewise-uv-cache \
    PYTHONUNBUFFERED=1 \
    CLOUD_INFERENCE_ENABLED=false \
    NEBIUS_API_KEY="" \
    HF_TOKEN="" \
    NEMOTRON_BASE_URL="" \
    NEMOTRON_MODEL=""
RUN uv sync --locked --no-dev

EXPOSE 7860
# A single process retains the original per-browser simulation workspaces.
CMD ["/app/.venv/bin/uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
