#!/bin/bash
# Run Archon migration 007 to add priority column

echo "Running migration 007_add_priority_column_to_tasks.sql..."

# Read the SQL file and execute it via psql using Supabase connection
PGPASSWORD="${SUPABASE_SERVICE_KEY}" psql \
  "postgresql://postgres.etwryhqpgqibdjyaqdjz:${SUPABASE_SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  -f /Users/mitchdornich/Documents/GitHub/Archon/migration/0.1.0/007_add_priority_column_to_tasks.sql

echo "Migration complete!"
echo ""
echo "Now restart Archon containers to pick up the change:"
echo "cd /Users/mitchdornich/Documents/GitHub/Archon"
echo "docker compose restart"
