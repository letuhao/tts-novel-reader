# Docker Setup Guide

## Prerequisites

- Docker and Docker Compose installed
- Ollama running locally (if using host networking)

## Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your configuration:
   - PostgreSQL credentials
   - Ollama base URL (use `http://host.docker.internal:11434` for local Ollama)
   - Other service URLs

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop services:**
   ```bash
   docker-compose down
   ```

## Services

- **PostgreSQL**: Database on port 5432 (default)
- **Backend**: API server on port 11200 (default)
- **Frontend**: Web app on port 11201 (default)

## Database Initialization

The backend automatically runs migrations on startup. The initial schema includes:

- `system_settings` - Application-wide settings (hot-reloadable)
- `user_settings` - User-specific settings
- `users` - User accounts
- `user_progress` - Learning progress tracking

## Environment Variables

See `.env.example` for all available configuration options.

## Development Mode

For development, you can mount volumes to enable hot-reload:

```bash
docker-compose up
```

The backend service mounts the source code, so changes will be reflected after rebuild.

## Production Mode

Build and run with optimized images:

```bash
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
```

## Database Access

Connect to PostgreSQL:

```bash
docker-compose exec postgres psql -U english_tutor -d english_tutor
```

## Troubleshooting

1. **Port conflicts**: Change ports in `.env` file
2. **Database connection**: Check PostgreSQL is healthy: `docker-compose ps`
3. **Ollama connection**: Ensure Ollama is accessible from container (use `host.docker.internal` on Docker Desktop)

