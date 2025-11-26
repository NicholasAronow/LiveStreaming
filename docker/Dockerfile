FROM oven/bun:latest
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (including dev dependencies for build)
RUN bun install

# Copy the application code
COPY . .

# Build the frontend
RUN bun run build:frontend

# Expose the port (default 80, configurable via PORT env var)
EXPOSE 80

# Set production environment
ENV NODE_ENV=production