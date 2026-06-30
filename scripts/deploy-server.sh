#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/手绘网站}"
BRANCH="${BRANCH:-main}"
LOCK_FILE="/tmp/aihuatang-deploy.lock"
LOG_FILE="${APP_DIR}/deploy.log"

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Another deploy is already running."
  exit 0
fi

cd "${APP_DIR}"

{
  echo "=============================="
  echo "Deploy started: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "App dir: ${APP_DIR}"

  git fetch origin "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
  git clean -fd -e .env.local -e deploy.log -e node_modules

  npm install
  npm run build

  NEW_REV="$(git rev-parse --short HEAD)"
  echo "${NEW_REV}" > "${APP_DIR}/.deployed-rev"
  echo "Built revision: ${NEW_REV}"

  if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe aihuatang >/dev/null 2>&1; then
      pm2 restart aihuatang --update-env
    else
      pm2 restart all --update-env || true
    fi
    pm2 save || true
  elif command -v bt >/dev/null 2>&1; then
    echo "PM2 not found. Please restart the BaoTa Node project if BaoTa did not auto-restart it."
  fi

  echo "Deploy finished: $(date '+%Y-%m-%d %H:%M:%S')"
} 2>&1 | tee -a "${LOG_FILE}"
