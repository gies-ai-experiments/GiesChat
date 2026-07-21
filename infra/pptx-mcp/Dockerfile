FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PPT_TEMPLATE_PATH=/app/templates \
    GIES_TEMPLATE_PATH=/app/templates/gies.pptx \
    PPTX_SANDBOX_ROOT=/tmp/decks

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "gies_server.py"]
