#!/bin/bash
# Builds a small, neutral "bookings" project in the current directory.
# Usage: repo.sh <variant>   variants: bare | base | quick-approved | quick-done | standard-route |
#        standard-awaiting-spec | standard-spec-approved | remote
set -euo pipefail
variant="${1:-base}"
git init -q -b main .
git config user.name "Eval Person"
git config user.email "eval@example.invalid"

mkdir -p src test
cat > package.json <<'JSON'
{ "name": "bookings", "version": "1.0.0", "type": "module",
  "scripts": { "test": "node --test", "lint": "node --check src/bookings.js" } }
JSON
cat > src/bookings.js <<'JS'
const bookings = new Map();

export function createBooking(id, guest, nights) {
  if (nights < 1) throw new Error('nights must be at least 1');
  const booking = { id, guest, nights, status: 'confirmed' };
  bookings.set(id, booking);
  return booking;
}

export function getBooking(id) {
  return bookings.get(id);
}

export function confirmationMessage(booking) {
  return `Your bookng is confirmed for ${booking.nights} night(s).`;
}
JS
cat > test/bookings.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBooking, getBooking } from '../src/bookings.js';

test('creates and reads a booking', () => {
  createBooking('b1', 'Ada', 2);
  assert.equal(getBooking('b1').status, 'confirmed');
});
JS
mkdir -p docs/specs
cat > docs/specs/bookings.md <<'MD'
---
status: verified
---
# Bookings

## Purpose
Guests create and read bookings.

## Requirements

### REQ-BOOK-1: Create a booking
A booking needs at least one night and starts as confirmed.

### REQ-BOOK-2: Read a booking
A booking can be read by its id.

## History
MD

if [ "$variant" != "bare" ]; then
  mkdir -p .sdd
  cat > .sdd/config.yaml <<'YAML'
version: 1
base_branch: main
packages:
  - path: .
    commands: { test: "npm test", test_single: "node --test", lint: "npm run lint", format: "", build: "" }
testing: { tdd: strict }
pr: { draft: true, auto_ready: false, forge: none }
gates: { enforce: true }
integrations: {}
YAML
  printf '# Rules\n' > .sdd/rules.md
  printf '.sdd/local/\n' > .gitignore
fi
git add -A && git commit -q -m "chore: initial bookings project"

change() { # id route approvals...
  local id="$1" route="$2"; shift 2
  mkdir -p "docs/changes/$id"
  { echo "id: $id"; echo "route: $route"; echo "capabilities: [bookings]"; echo "approvals:"
    for a in "$@"; do echo "  $a: { by: Eval Person, at: 2026-01-01T00:00:00Z }"; done
    [ $# -eq 0 ] && echo "  {}" ; echo "prs: []"; } > "docs/changes/$id/state.yaml"
  mkdir -p "$(git rev-parse --git-dir)/sdd" && echo "$id" > "$(git rev-parse --git-dir)/sdd/active"
}
delta() {
  cat > "docs/changes/$1/delta.md" <<'MD'
# Delta: cancel a booking

## Why
Guests need to cancel a booking they no longer want.

## Reuse
- `src/bookings.js` already stores bookings; extend it.

## ADDED
### REQ-BOOK-3: Cancel a booking
A confirmed booking can be cancelled by its id; its status becomes cancelled.

## MODIFIED

## REMOVED

## Acceptance criteria
- AC-1 Given a confirmed booking, When the guest cancels it, Then its status is cancelled.
- AC-2 Given an unknown booking id, When the guest cancels it, Then an error says it was not found.

## Open questions
MD
}

case "$variant" in
  bare|base) ;;
  quick-approved)
    change 20260101-fix-confirmation-typo quick route
    cat > docs/changes/20260101-fix-confirmation-typo/brief.md <<'MD'
# Brief: fix confirmation typo

## Problem
The confirmation message says "bookng".

## Expected behaviour
It says "Your booking is confirmed for N night(s)."

## Proving test
A unit test on `confirmationMessage` asserts the exact text.
MD
    ;;
  quick-done)
    change 20260101-fix-confirmation-typo quick route
    printf '# Brief: fix confirmation typo\n\n## Problem\n"bookng" in the confirmation message.\n\n## Expected behaviour\n"Your booking is confirmed".\n\n## Proving test\nUnit test on confirmationMessage.\n' > docs/changes/20260101-fix-confirmation-typo/brief.md
    git add -A && git commit -q -m "docs: brief for confirmation typo"
    git checkout -q -b fix/confirmation-typo
    sed -i.bak 's/bookng/booking/' src/bookings.js && rm -f src/bookings.js.bak
    cat >> test/bookings.test.js <<'JS'

import { confirmationMessage } from '../src/bookings.js';
test('confirmation message is spelled correctly', () => {
  assert.equal(confirmationMessage({ nights: 2 }), 'Your booking is confirmed for 2 night(s).');
});
JS
    git add -A && git commit -q -m "fix: spell booking in the confirmation message"
    ;;
  standard-route)          change 20260101-cancel-booking standard route ;;
  standard-awaiting-spec)  change 20260101-cancel-booking standard route; delta 20260101-cancel-booking ;;
  standard-spec-approved)  change 20260101-cancel-booking standard route spec; delta 20260101-cancel-booking ;;
  remote)
    git init -q --bare .remote.git
    git remote add origin ./.remote.git
    git push -q -u origin main
    echo "// tweak" >> src/bookings.js
    git commit -q -am "feat: tweak" && git push -q
    git reset -q --hard HEAD~1
    echo "// rewritten" >> src/bookings.js
    git commit -q -am "feat: rewritten tweak"
    ;;
  *) echo "unknown variant $variant" >&2; exit 2 ;;
esac
git add -A >/dev/null 2>&1 || true
git commit -q -m "chore: eval fixture state" >/dev/null 2>&1 || true
