#!/usr/bin/env bash
# Runs the whole test suite against a fresh local stack (production build).
#   npm run test:e2e            # build + start, run SQL and E2E tests, stop
#   KEEP=1 npm run test:e2e     # leave the stack running afterwards
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
scripts/test/stack.sh start "${MODE:-prod}"
status=0
node --test --test-concurrency=1 tests/sql/*.test.mjs tests/e2e/*.test.mjs || status=$?
[ -z "${KEEP:-}" ] && scripts/test/stack.sh stop
exit $status
