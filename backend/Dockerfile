FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./

ENV PYTHON_PORT=5001

EXPOSE 5001

CMD ["python", "app.py"]
