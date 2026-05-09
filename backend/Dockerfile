# Hugging Face Spaces Docker image for JobScout AI API
# HF Spaces requires port 7860
FROM python:3.11-slim

WORKDIR /app

# System deps required by PyMuPDF and sentence-transformers/onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps before copying code (better Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# HF Spaces forwards traffic to port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
