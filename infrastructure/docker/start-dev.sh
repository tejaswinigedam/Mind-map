#!/bin/bash
set -e

echo "Starting MindMap AI development environment..."

# Load environment variables
if [ -f "../../.env" ]; then
  export $(cat ../../.env | grep -v '#' | xargs)
fi

# Start infrastructure only (postgres + redis)
docker compose -f docker-compose.yml up postgres redis -d

echo "Waiting for postgres..."
until docker exec mindmap-postgres pg_isready -U mindmap > /dev/null 2>&1; do
  sleep 1
done

echo "Running migrations..."
cd ../../ && pnpm db:migrate

echo ""
echo "✓ Postgres running on localhost:5432"
echo "✓ Redis running on localhost:6379"
echo ""
echo "Now start the services:"
echo "  Terminal 1: cd apps/orchestration && uvicorn src.main:app --reload --port 8001"
echo "  Terminal 2: pnpm --filter @mind-map/api dev"
echo "  Terminal 3: pnpm --filter @mind-map/web dev"
echo ""
echo "App will be available at http://localhost:3000"
