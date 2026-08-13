#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Guarded deploy: the ONLY way you should push to main.
#   Run from the repo root:   bash scripts/push-live.sh
#
# main auto-deploys to the live site, so before pushing this
# verifies you are in the right repo, on the right branch, with a
# working tree that actually looks like kula (and not a workspace
# some tool has restructured). Fails loud, pushes only on your
# explicit yes.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

fail() {
  echo "❌ $1"
  echo "   Push aborted — nothing was sent."
  exit 1
}

EXPECTED_REPO="github.com/soreuh/kula-marketplace"

# 1 — right repository?
origin=$(git remote get-url origin 2>/dev/null) || fail "Not a git repository (or no 'origin' remote)."
case "$origin" in
  *"$EXPECTED_REPO"*) : ;;
  *) fail "origin is '$origin' — expected $EXPECTED_REPO. Wrong checkout." ;;
esac

# 2 — right branch?
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  fail "You are on '$branch', not main. Only main deploys to the live site — merge or checkout main first."
fi

# 3 — tree actually looks like kula (mangle detector)
for f in app/page.tsx components/ui.tsx supabase/migrations/001_init.sql proxy.ts next.config.ts; do
  if [ ! -e "$f" ]; then
    fail "Missing '$f' — this working tree does not look like the kula app."
  fi
done
if ! grep -q '"dev": "next dev"' package.json; then
  fail "package.json has no 'next dev' script — the tree may have been restructured."
fi
for junk in pnpm-lock.yaml pnpm-workspace.yaml artifacts; do
  if [ -e "$junk" ]; then
    fail "Found '$junk' — that's build-agent debris; this tree has been restructured. Do not push."
  fi
done

# 4 — show exactly what would ship, then ask
git fetch origin --quiet
echo "✅ Repo, branch, and files all check out."
echo
echo "Last local commit:"
git log --oneline -1
echo
echo "Changes vs the live site (origin/main):"
git diff --stat origin/main -- . || true
count=$(git rev-list --count origin/main..HEAD)
echo
if [ "$count" -eq 0 ]; then
  echo "Nothing to push — the live site already matches your local main."
  exit 0
fi
read -r -p "Push $count commit(s) to main and DEPLOY TO THE LIVE SITE? [y/N] " answer
if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
  fail "Cancelled by you."
fi

git push origin main
echo "🚀 Pushed. Netlify is deploying — watch app.netlify.com → Deploys."
