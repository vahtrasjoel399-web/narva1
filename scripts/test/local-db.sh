#!/usr/bin/env bash
# TEST ONLY: start a throwaway local Postgres 16 and load bootstrap + migrations + seed.
#   scripts/test/local-db.sh start   # start (or restart) and reset the database
#   scripts/test/local-db.sh stop
# Needs PostgreSQL 16 server binaries. When run as root it uses the "postgres" OS user.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="${LOCAL_PG_DATA:-/tmp/autoshop-pg}"
PORT="${LOCAL_PG_PORT:-54329}"
DB="autoshop"

as_pg() {
  if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi
}

case "${1:-start}" in
  stop)
    as_pg "$PGBIN/pg_ctl -D $DATA stop -m fast" || true
    exit 0
    ;;
  start)
    if [ ! -f "$DATA/PG_VERSION" ]; then
      mkdir -p "$DATA"
      [ "$(id -u)" = "0" ] && chown postgres "$DATA"
      as_pg "$PGBIN/initdb -D $DATA -U postgres --auth=trust >/dev/null"
    fi
    as_pg "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -c max_connections=200' -l $DATA/log.txt status >/dev/null" \
      || as_pg "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -c max_connections=200' -l $DATA/log.txt start -w >/dev/null"

    PSQL="env PGOPTIONS=-cclient_min_messages=warning psql -h 127.0.0.1 -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
    $PSQL -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB"
    $PSQL -d $DB -f "$ROOT/supabase/tests/local-bootstrap.sql"
    for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -d $DB -f "$f"; done
    $PSQL -d $DB -f "$ROOT/supabase/seed.sql"
    $PSQL -d $DB -f "$ROOT/supabase/tests/test-users.sql"
    echo "postgres://postgres@127.0.0.1:$PORT/$DB"
    ;;
esac
