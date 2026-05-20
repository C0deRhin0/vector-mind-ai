/**
 * API Client for vector-mind-ai
 *
 * Endpoints:
 *   POST /api/research          - Full research (non-streaming)
 *   GET  /api/research/stream   - SSE streaming research
 *   POST /api/research/quick    - Quick Q&A
 *   GET  /api/research/history  - Past sessions
 *   GET  /api/knowledge/graph   - Knowledge graph data
 *   GET  /api/knowledge/stats   - Graph statistics
 *   GET  /api/diagnostics       - System health
 */

const API_BASE = '/api';

// ─── Helpers ────────────────────────────────────────────

async function post(path, body) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function get(path) {
  const resp = await fetch(`${API_BASE}${path}`);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  return resp.json();
}

// ─── Research API ───────────────────────────────────────

export async function runResearch(question, outputFormat = 'research_brief', depth = 1) {
  return post('/research', { question, output_format: outputFormat, depth });
}

export function streamResearch(question, outputFormat = 'research_brief', depth = 1, callbacks) {
  const url = `${API_BASE}/research/stream?question=${encodeURIComponent(question)}&output_format=${outputFormat}&depth=${depth}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);

      switch (data.type) {
        case 'status':
          callbacks.onStatus?.(data.message, data.agent);
          break;
        case 'agent_start':
          callbacks.onAgentStart?.(data.agent, data.label);
          break;
        case 'agent_complete':
          callbacks.onAgentComplete?.(data.agent, data);
          break;
        case 'token':
          callbacks.onToken?.(data.text);
          break;
        case 'done':
          callbacks.onDone?.(data.state);
          es.close();
          break;
        case 'error':
          callbacks.onError?.(data.message);
          es.close();
          break;
      }
    } catch (err) {
      // ignore parse errors
    }
  };

  es.onerror = () => {
    callbacks.onError?.('Connection lost');
    es.close();
  };

  return () => es.close();
}

export async function quickAsk(question) {
  return post('/research/quick', { question });
}

export async function getHistory(limit = 20) {
  return get(`/research/history?limit=${limit}`);
}

// ─── Knowledge API ──────────────────────────────────────

export async function getKnowledgeGraph() {
  return get('/knowledge/graph');
}

export async function getKnowledgeStats() {
  return get('/knowledge/stats');
}

// ─── Diagnostics ────────────────────────────────────────

export async function getDiagnostics() {
  return get('/diagnostics');
}
