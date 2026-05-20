# vector-mind-ai

A **multi-agent research orchestration platform** that combines RAG (Retrieval-Augmented Generation) with a team of specialized AI agents to research, analyze, synthesize, and generate polished output on any topic.

Think **NotebookLM + multi-agent orchestration** — open source, local-first, and extensible.

---

## ✨ Key Differentiators vs NotebookLM

| Feature | Google NotebookLM | **vector-mind-ai** |
|---------|-------------------|----------------|
| **Model** | Gemini only | Bring your own: Ollama (local), OpenAI, Anthropic, Google |
| **Architecture** | Single model Q&A | **Multi-agent orchestration** — 6 specialized agents collaborate |
| **Research Style** | Passive Q&A | **Active research pipeline**: Plan → Research → Analyze → Write → Review → Verify |
| **Knowledge Graph** | No | **Yes** — visualizes connections between concepts across sessions |
| **Output Formats** | Audio + Study guides | Research brief, Blog post, Twitter thread, Presentation, Podcast script, Executive summary |
| **Collaboration** | Single user | Multi-session with history and knowledge persistence |
| **Source** | Closed | **Open source** |
| **Deployment** | Google Cloud only | **Local-first** — run entirely on your machine |
| **API** | No | API-first — build on top of it |

---

## 🧠 Multi-Agent Architecture

```
User Query
    │
    ▼
┌──────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                       │
│  Coordinates agents in waves, manages state, streams │
└──────────────────────────────────────────────────────┘
    │
    ├── Wave 1: PLANNER ─── Breaks query into sub-questions & research plan
    ├── Wave 2: RESEARCHER ─ Gathers info from documents + web
    ├── Wave 3: ANALYST ─── Synthesizes findings, detects contradictions
    ├── Wave 4: WRITER ──── Generates output in chosen format
    ├── Wave 5: CRITIC ──── Reviews for gaps, errors, weaknesses
    └── Wave 6: FACT CHECKER ─ Verifies claims against sources
```

Even with **one LLM provider**, the system simulates a full research team — each agent gets a specialized system prompt, different temperature, and focused task context.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (for Qdrant vector database)
- Ollama (optional — for local LLM, or use OpenAI/Anthropic/Google)

### 1. Setup

```bash
# Copy environment config
cp .env.example .env
# Edit .env to configure your LLM provider

# Start Qdrant (vector database)
docker compose up -d

# Start everything
./start.sh
```

### 2. Ingest Documents (Optional)

```bash
# Index documents for RAG
./ingest.sh --dir ./documents

# Or a single file
./ingest.sh --file ./documents/my-paper.pdf

# Reset and re-index
./ingest.sh --dir ./documents --reset
```

### 3. Open Browser

```
http://localhost:5173
```

---

## 🎯 How It Works

### Research Pipeline

1. **Ask** — Type any research question
2. **Plan** — The Planner agent breaks it into sub-questions
3. **Research** — The Researcher searches your documents (via Qdrant) and the web
4. **Analyze** — The Analyst finds patterns, contradictions, and key insights
5. **Write** — The Writer generates polished output in your chosen format
6. **Review** — The Critic (optional) reviews for gaps and weaknesses
7. **Verify** — The Fact Checker (optional) verifies claims against sources

### Knowledge Graph

Every research session builds a knowledge graph — a visual map of concepts, sources, and findings that grows over time. See connections between different research topics and revisit past findings.

### Output Formats

| Format | Best For |
|--------|----------|
| Research Brief | Quick understanding of a topic |
| Blog Post | Publishing findings |
| Twitter Thread | Sharing key insights on social media |
| Presentation | Teaching or presenting |
| Podcast Script | Audio content creation |
| Executive Summary | Decision-makers |

---

## ⚙️ Configuration

### LLM Providers

Edit `.env` to choose your provider:

```env
# Local (default — requires Ollama)
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:3b

# OR OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# OR Anthropic
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# OR Google
LLM_PROVIDER=google
GOOGLE_API_KEY=...
GOOGLE_MODEL=gemini-2.5-flash
```

### Research Depth

| Depth | Agents Used | Best For |
|-------|-------------|----------|
| 1 (Basic) | Planner → Researcher → Analyst → Writer | Quick answers |
| 2 (Deep) | + Critic refinement | Important research |
| 3 (Expert) | + Fact Checker | Published work |

---

## 🏗️ Project Structure

```
├── codebase/
│   ├── backend/                  # FastAPI server
│   │   ├── main.py               # Entry point
│   │   ├── config.py             # Configuration
│   │   ├── core/
│   │   │   ├── orchestrator.py   # Multi-agent orchestrator
│   │   │   └── llm.py            # LLM provider abstraction
│   │   ├── agents/
│   │   │   ├── base.py           # Base agent class
│   │   │   ├── planner.py        # Research planning agent
│   │   │   ├── researcher.py     # Information gathering agent
│   │   │   ├── analyst.py        # Synthesis & analysis agent
│   │   │   ├── writer.py         # Output generation agent
│   │   │   ├── critic.py         # Review & critique agent
│   │   │   └── fact_checker.py   # Fact verification agent
│   │   ├── services/
│   │   │   ├── web_search.py     # Web search integration (Exa, Firecrawl)
│   │   │   └── knowledge_graph.py # Knowledge graph management
│   │   ├── retrieval/
│   │   │   ├── embedder.py       # Embedding generation
│   │   │   └── retriever.py      # Hybrid search (Qdrant)
│   │   └── api/
│   │       ├── routes_research.py # Research endpoints
│   │       └── routes_admin.py    # Admin endpoints
│   ├── ingestion/                # Document ingestion pipeline
│   │   ├── main.py               # CLI entry point
│   │   ├── loader.py             # PDF/DOCX/TXT/MD parsing
│   │   ├── chunker.py            # Text chunking
│   │   ├── embedder.py           # Embedding generation
│   │   └── qdrant_writer.py      # Qdrant upsert
│   └── frontend/                 # React UI (dark theme)
│       ├── src/
│       │   ├── App.jsx           # Root with routing
│       │   ├── components/       # Reusable components
│       │   │   ├── Layout.jsx       # Sidebar + main layout
│       │   │   ├── AgentView.jsx    # Agent activity visualization
│       │   │   ├── SourcePanel.jsx  # Source citations
│       │   │   ├── OutputPanel.jsx  # Formatted output
│       │   │   ├── SettingsPanel.jsx # Settings & diagnostics
│       │   │   └── KnowledgeGraph.jsx # D3.js graph visualization
│       │   ├── pages/            # Page-level components
│       │   │   ├── ResearchPage.jsx   # Main research interface
│       │   │   ├── KnowledgePage.jsx  # Knowledge graph viewer
│       │   │   ├── HistoryPage.jsx    # Past research sessions
│       │   │   └── SettingsPage.jsx   # Settings page
│       │   └── api/
│       │       └── client.js      # API client
│       └── package.json
├── docker-compose.yml             # Qdrant service
├── start.sh                       # Start all services
├── stop.sh                        # Stop all services
├── ingest.sh                      # Run ingestion pipeline
└── .env.example                   # Environment configuration
```

---

## 🔌 API Endpoints

### Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/research` | Full multi-agent research |
| GET | `/api/research/stream` | SSE streaming research |
| POST | `/api/research/quick` | Single-agent Q&A |
| GET | `/api/research/history` | Past research sessions |

### Knowledge Graph
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge/graph` | Graph data for visualization |
| GET | `/api/knowledge/stats` | Graph statistics |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Authenticate |
| GET | `/api/admin/documents` | List indexed documents |
| POST | `/api/admin/upload` | Upload & index document |
| DELETE | `/api/admin/documents/{filename}` | Remove document |
| POST | `/api/admin/reindex` | Re-index all documents |
| POST | `/api/admin/reset` | Reset collection |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/diagnostics` | System diagnostics |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | FastAPI (Python) |
| **Vector DB** | Qdrant (Docker) |
| **LLM** | Ollama (local) / OpenAI / Anthropic / Google |
| **Embeddings** | sentence-transformers (BAAI/bge-small-en-v1.5) |
| **Graph** | NetworkX + D3.js |
| **Web Search** | Exa API / Firecrawl (optional) |

---

## 📄 License

MIT
