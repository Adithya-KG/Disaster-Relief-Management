#!/usr/bin/env bash
set -e

# Change directory to project root
cd "$(dirname "$0")"

PORT="${PORT:-8080}"

echo "=========================================================="
echo "  Disaster Relief Management System - Local Deployment"
echo "=========================================================="

# 1. Check dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "✓ Dependencies installed"
fi

# 2. Free port if already in use
echo "🔍 Checking port ${PORT}..."
if fuser "${PORT}/tcp" >/dev/null 2>&1; then
  echo "⚠️  Port ${PORT} is occupied. Releasing port..."
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 1
fi
echo "✓ Port ${PORT} is ready"

# 3. Setup / Seed Database
echo "🗄️  Setting up SQLite database & triggers..."
npm run db:setup > /dev/null
echo "✓ Database initialized and seeded"

# 4. Build Frontend Production Assets
echo "⚡ Building frontend with Vite..."
npm run build > /dev/null
echo "✓ Frontend built to dist/"

# 5. Banner & Start Server
echo ""
echo "=========================================================="
echo "  🚀 App successfully deployed locally!"
echo "  👉 Open: http://localhost:${PORT}"
echo "=========================================================="
echo ""
echo "Demo Accounts:"
echo "  - Regional Dispatcher: dispatcher@reliefops.org / admin123"
echo "  - Camp Manager (East Ridge): maya@eastridge.org / camp123"
echo "  - Camp Manager (Riverbend):  omar@riverbend.org / camp123"
echo ""
echo "Press Ctrl+C to stop the server."
echo "=========================================================="
echo ""

exec node server/index.js
