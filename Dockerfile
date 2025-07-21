# Multi-stage build for Whisper CLI
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build 2>/dev/null || echo "No build step needed"

# Production stage - create slim runtime image
FROM node:18-alpine AS runtime

# Install required system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    bash \
    curl \
    ca-certificates

# Create app user
RUN addgroup -g 1001 -S whisper && \
    adduser -S whisper -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app /app

# Create global installation
RUN npm link

# Switch to non-root user
USER whisper

# Set default environment variables
ENV NODE_ENV=production
ENV WHISPER_DATA_DIR=/app/data

# Create data directory
RUN mkdir -p /app/data

# Expose any ports if needed (for future web UI)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD whisper --version || exit 1

# Default command
ENTRYPOINT ["whisper"]
CMD ["--help"]

# =============================================================================
# Python-compatible stage
FROM python:3.9-slim AS python-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Whisper CLI
COPY --from=builder /app /opt/whisper
WORKDIR /opt/whisper
RUN npm link

# Create Python wrapper
RUN pip install --no-cache-dir \
    click>=8.0.0 \
    requests>=2.25.0 \
    colorama>=0.4.4

# Copy Python wrapper
COPY python-wrapper /opt/whisper-python
WORKDIR /opt/whisper-python
RUN pip install -e .

# Create non-root user
RUN useradd -m -u 1001 whisper

# Set up environment
USER whisper
WORKDIR /workspace

# Default entrypoint for Python users
ENTRYPOINT ["whisper"]
CMD ["--help"]
