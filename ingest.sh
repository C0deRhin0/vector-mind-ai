#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Research OS — Document Ingest${NC}"

# Default to ./documents directory
DOCS_DIR="${1:-./documents}"

# Activate ingestion venv or create it
cd codebase/ingestion
if [ ! -d "venv" ]; then
  echo "Creating ingestion virtual environment..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt --quiet
else
  source venv/bin/activate
fi

# Run ingestion
if [ "$2" = "--reset" ]; then
  echo "Resetting collection and re-ingesting..."
  python main.py --dir "$DOCS_DIR" --reset
else
  python main.py --dir "$DOCS_DIR"
fi

cd ../..
echo -e "${GREEN}Ingestion complete!${NC}"
