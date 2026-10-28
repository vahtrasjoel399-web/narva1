#!/usr/bin/env bash
# TEST ONLY: start/stop the local stack — Postgres + mock Supabase/Resend + Next.js on :3100.
#   scripts/test/stack.sh start [dev|prod]   (default: dev)
#   scripts/test/stack.sh stop
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUN="${STACK_RUN_DIR:-/tmp/autoshop-stack}"
mkdir -p "$RUN"

stop_pid() {
  local f="$RUN/$1.pid"
  if [ -f "$f" ]; then
    local pid; pid="$(cat "$f")"
    # kill the whole process group (next spawns workers)
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    rm -f "$f"
  fi
}

wait_http() {
  for _ in $(seq 1 120); do
    if curl -s -o /dev/null "$1"; then return 0; fi
    sleep 0.5
  done
  echo "timeout waiting for $1" >&2
  return 1
}

case "${1:-start}" in
  stop)
    stop_pid next
    stop_pid mock
    "$ROOT/scripts/test/local-db.sh" stop >/dev/null 2>&1 || true
    ;;
  start)
    MODE="${2:-dev}"
    stop_pid next
    stop_pid mock
    "$ROOT/scripts/test/local-db.sh" start >/dev/null
    setsid node "$ROOT/scripts/test/mock-services.mjs" >"$RUN/mock.log" 2>&1 &
    echo $! >"$RUN/mock.pid"
    wait_http "http://127.0.0.1:54400/emails"
    set -a
    # shellcheck disable=SC1091
    . "$ROOT/scripts/test/test.env"
    set +a
    cd "$ROOT"
    if [ "$MODE" = "prod" ]; then
      npx next build >"$RUN/build.log" 2>&1 || { tail -40 "$RUN/build.log"; exit 1; }
      setsid npx next start -p 3100 >"$RUN/next.log" 2>&1 &
    else
      setsid npx next dev -p 3100 >"$RUN/next.log" 2>&1 &
    fi
    echo $! >"$RUN/next.pid"
    wait_http "http://localhost:3100/api/availability?services=oil-change"
    echo "stack up ($MODE): app http://localhost:3100  logs: $RUN"
    ;;
esac
