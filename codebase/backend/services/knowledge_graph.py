"""
Knowledge Graph Service — Tracks concepts, connections, and research evolution.

Uses NetworkX for in-memory graph operations and JSON persistence.
Each research session builds a subgraph that connects:
  - Research queries (nodes)
  - Sub-questions / concepts (nodes)
  - Sources (nodes)
  - Claims/findings (nodes)
  - Edges: relates_to, investigates, contradicts, supports, mentions

Stored as JSON in docs/knowledge_graph.json for persistence across sessions.
"""

import json
import os
import time
from pathlib import Path
from typing import Optional

import networkx as nx


class KnowledgeGraphService:
    """Manages the research knowledge graph."""

    def __init__(self, storage_path: str = ""):
        self.storage_path = storage_path or str(Path(__file__).parent.parent.parent.parent / "docs" / "knowledge_graph.json")
        self.graph = nx.MultiDiGraph()
        self._ensure_storage_dir()
        self._load()

    def _ensure_storage_dir(self):
        Path(self.storage_path).parent.mkdir(parents=True, exist_ok=True)

    def _load(self):
        """Load graph from disk if it exists."""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path) as f:
                    data = json.load(f)
                for node in data.get("nodes", []):
                    self.graph.add_node(node["id"], **node.get("attrs", {}))
                for edge in data.get("edges", []):
                    self.graph.add_edge(edge["source"], edge["target"], key=edge.get("key"), **edge.get("attrs", {}))
            except (json.JSONDecodeError, KeyError):
                pass

    def _save(self):
        """Persist graph to disk."""
        data = {
            "nodes": [{"id": n, "attrs": dict(self.graph.nodes[n])} for n in self.graph.nodes()],
            "edges": [
                {
                    "source": u,
                    "target": v,
                    "key": k,
                    "attrs": dict(d),
                }
                for u, v, k, d in self.graph.edges(keys=True, data=True)
            ],
        }
        with open(self.storage_path, "w") as f:
            json.dump(data, f, indent=2)

    def add_research_finding(self, query: str, sub_question: str, findings: str, sources: list[dict]):
        """Add nodes and edges for a research finding."""
        query_id = f"q:{hash(query)}"
        sq_id = f"sq:{hash(sub_question)}"
        finding_id = f"f:{hash(findings[:100])}"

        self.graph.add_node(query_id, type="query", label=query[:80], timestamp=time.time())
        self.graph.add_node(sq_id, type="sub_question", label=sub_question[:80])
        self.graph.add_node(finding_id, type="finding", label=findings[:100])

        self.graph.add_edge(query_id, sq_id, key="explores", attrs={"type": "explores"})
        self.graph.add_edge(sq_id, finding_id, key="produced", attrs={"type": "produced"})

        for source in sources[:5]:
            src_id = f"src:{hash(source.get('filename', ''))}"
            self.graph.add_node(src_id, type="source", label=source.get("filename", "unknown")[:80])
            self.graph.add_edge(finding_id, src_id, key="sourced_from", attrs={"type": "sourced_from"})

        self._save()

    def add_analysis(self, query: str, analysis: str):
        """Add analysis node connected to the query."""
        query_id = f"q:{hash(query)}"
        analysis_id = f"a:{hash(analysis[:100])}"
        self.graph.add_node(analysis_id, type="analysis", label=analysis[:100], timestamp=time.time())
        self.graph.add_edge(query_id, analysis_id, key="analyzed", attrs={"type": "analyzed"})
        self._save()

    def finalize_session(self, session_id: str, query: str, output: str):
        """Mark the research session as complete."""
        session_id_node = f"s:{session_id}"
        query_id = f"q:{hash(query)}"
        self.graph.add_node(session_id_node, type="session", label=f"Session {session_id}", query=query, output_preview=output[:100], timestamp=time.time())
        self.graph.add_edge(session_id_node, query_id, key="studied", attrs={"type": "studied"})
        self._save()

    def get_related_queries(self, query: str, max_results: int = 5) -> list[dict]:
        """Find related previous research queries."""
        query_id = f"q:{hash(query)}"
        if not self.graph.has_node(query_id):
            return []

        related = []
        for _, neighbor, data in self.graph.edges(query_id, data=True):
            if neighbor and self.graph.has_node(neighbor):
                node_data = self.graph.nodes[neighbor]
                related.append({
                    "id": neighbor,
                    "label": node_data.get("label", ""),
                    "type": node_data.get("type", ""),
                    "relationship": data.get("attrs", {}).get("type", ""),
                })

        # Also find queries with similar concepts
        for node, data in self.graph.nodes(data=True):
            if data.get("type") == "query" and node != query_id:
                related.append({
                    "id": node,
                    "label": data.get("label", ""),
                    "type": "related_query",
                    "relationship": "similar",
                })

        return related[:max_results]

    def get_graph_data(self) -> dict:
        """Return the full graph for visualization."""
        nodes = []
        for n, data in self.graph.nodes(data=True):
            nodes.append({
                "id": str(n),
                "label": data.get("label", str(n)[:40]),
                "type": data.get("type", "unknown"),
            })

        edges = []
        for u, v, k, data in self.graph.edges(keys=True, data=True):
            edges.append({
                "source": str(u),
                "target": str(v),
                "label": data.get("attrs", {}).get("type", "related"),
            })

        return {"nodes": nodes, "edges": edges}

    def get_stats(self) -> dict:
        """Get graph statistics."""
        return {
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges(),
            "node_types": {},
            "recent_sessions": [
                {
                    "id": n,
                    "query": data.get("query", ""),
                    "output_preview": data.get("output_preview", ""),
                    "timestamp": data.get("timestamp", 0),
                }
                for n, data in self.graph.nodes(data=True)
                if data.get("type") == "session"
            ][-10:],
        }
