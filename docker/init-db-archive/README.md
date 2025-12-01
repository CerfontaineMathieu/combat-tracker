# Archived Init-DB Scripts

These SQL files were the original database initialization scripts that ran on container startup via PostgreSQL's `/docker-entrypoint-initdb.d` mechanism.

They have been replaced by the **node-pg-migrate** migration system in `/migrations/`.

## Why archived?

The old approach only ran scripts on **fresh containers**. The new migration system:
- Tracks which migrations have run
- Applies only new migrations
- Works on existing databases
- Supports rollback

## Reference

These files are kept for historical reference only. The equivalent migrations are:

| Old File | New Migration |
|----------|---------------|
| 01-schema.sql | 1733000000000_initial-baseline.sql |
| 02-seed.sql | 1733000000001_seed-monsters.sql |
| 03-images.sql | 1733000000002_seed-monster-images.sql |
| 04-seed-demo.sql | (demo data, optional) |
| 05-12-*.sql | Consolidated in initial-baseline.sql |
