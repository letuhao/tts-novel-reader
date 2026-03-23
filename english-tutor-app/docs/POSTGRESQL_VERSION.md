# PostgreSQL Version Information

## Latest Version

As of the current date, the **latest stable PostgreSQL version is 18.1** (released November 13, 2025).

However, for Docker images, the latest available stable versions are:
- **PostgreSQL 17.7** (available as `postgres:17-alpine` or `postgres:17`)
- **PostgreSQL 16.11** (available as `postgres:16-alpine` or `postgres:16`)

## Version Selection for English Tutor App

We are currently using **PostgreSQL 17-alpine** which provides:
- Latest stable features
- Good performance improvements
- Enhanced JSON/JSONB capabilities
- Smaller image size (Alpine Linux)

## PostgreSQL 17 Key Features for JSON

PostgreSQL 17 includes several improvements for JSON handling:

1. **Improved JSON/JSONB Performance**
   - Better indexing and query performance
   - Enhanced parallel processing for JSON operations

2. **New JSON Functions**
   - Additional utility functions for JSON manipulation
   - Better support for JSON schema validation

3. **Better JSON Query Performance**
   - Optimized JSON path queries
   - Improved indexing strategies for JSONB

4. **Native JSON Support**
   - Better integration with JSON data types
   - Enhanced validation and parsing

## When PostgreSQL 18 Becomes Available in Docker

Once PostgreSQL 18 Docker images become available, we can update to:
```yaml
image: postgres:18-alpine
```

PostgreSQL 18 introduces:
- New asynchronous I/O subsystem for faster reads
- Native UUIDv7() support
- Planner statistics retention during pg_upgrade
- Additional performance improvements

## Migration Notes

The current database schema is compatible with PostgreSQL 16, 17, and 18. No changes are required when upgrading from 16 to 17 or 17 to 18.

## Current Configuration

```yaml
# docker-compose.yml
postgres:
  image: postgres:17-alpine
```

This provides:
- ✅ Latest stable features
- ✅ Good JSON/JSONB support
- ✅ Small image size
- ✅ Regular security updates
- ✅ Production-ready stability

