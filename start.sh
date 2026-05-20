#!/bin/bash
set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           vector-mind-ai — Starting Services       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"

# ─── 1. Qdrant ──────────────────────────────────────────
echo -e "\n${YELLOW}[1/3] Starting Qdrant vector database...${NC}"
docker compose up -d qdrant
echo -n "  Waiting for Qdrant"
until curl -sf http://localhost:6333/readyz > /dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo -e " ${GREEN}ready → http://localhost:6333/dashboard${NC}"

# ─── 2. Backend ─────────────────────────────────────────
echo -e "\n${YELLOW}[2/3] Starting backend API server...${NC}"
cd codebase/backend

# Create venv if needed
if [ ! -d "venv" ]; then
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt --quiet
else
  source venv/bin/activate
fi

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ../..
echo -e "  ${GREEN}Backend running → http://localhost:8000/docs${NC}"

# ─── 3. Frontend ────────────────────────────────────────
echo -e "\n${YELLOW}[3/3] Starting frontend dev server...${NC}"
cd codebase/frontend
npm install --silent 2>/dev/null
npm run dev &
FRONTEND_PID=$!
cd ../..
echo -e "  ${GREEN}Frontend running → http://localhost:5173${NC}"

# ─── Summary ────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           All services running!                  ║${NC}"
echo -e "${CYAN}║──────────────────────────────────────────────────║${NC}"
echo -e "${CYAN}║  Frontend  →  http://localhost:5173              ║${NC}"
echo -e "${CYAN}║  API Docs  →  http://localhost:8000/docs        ║${NC}"
echo -e "${CYAN}║  Qdrant    →  http://localhost:6333/dashboard   ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
