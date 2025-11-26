FROM oven/bun:latest
WORKDIR /app

# Copy root package files
COPY package.json bun.lock* ./

# Install root dependencies
RUN bun install

# Copy frontend package files
COPY src/frontend/package.json src/frontend/bun.lock* ./src/frontend/

# Install frontend dependencies
RUN cd src/frontend && bun install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN bun run build:frontend

# Expose the port (default 80, configurable via PORT env var)
EXPOSE 80

# Set production environment
ENV NODE_ENV=production