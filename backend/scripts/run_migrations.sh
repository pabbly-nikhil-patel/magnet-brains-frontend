#!/bin/bash
# Run all migrations in order against the database
# Usage: ./run_migrations.sh <DATABASE_URL>

DB_URL="${1:-postgres://mb:password@localhost:5432/magnetbrains}"

echo "Running migrations against: $DB_URL"

for migration in ../migrations/*.sql; do
  echo "Running: $migration"
  psql "$DB_URL" -f "$migration"
  if [ $? -ne 0 ]; then
    echo "FAILED: $migration"
    exit 1
  fi
done

echo "All migrations completed successfully!"
