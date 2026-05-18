import React, { useEffect, useState, useRef } from 'react'
import { Network, RefreshCw, BarChart3, BookOpen, Database, TrendingUp } from 'lucide-react'
import KnowledgeGraph from '../components/KnowledgeGraph'
import { getKnowledgeGraph, getKnowledgeStats } from '../api/client'

export default function KnowledgePage() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  useEffect(() => {
    loadData()
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight - 40,
        })
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [graph, statsData] = await Promise.all([
        getKnowledgeGraph(),
        getKnowledgeStats(),
      ])
      setGraphData(graph)
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Network size={16} className="text-accent-purple" />
          <span className="text-sm font-medium text-text-primary">Knowledge Graph</span>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'spin-slow' : ''} />
          Refresh
        </button>
      </div>

      {/* ─── Content ──────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph */}
        <div ref={containerRef} className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-3">
                  <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse-dot" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                </div>
                <p className="text-sm text-text-muted">Loading knowledge graph...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-accent-red mb-2">Failed to load graph</p>
                <p className="text-xs text-text-muted">{error}</p>
                <button onClick={loadData} className="mt-3 text-xs text-accent-blue hover:underline">Retry</button>
              </div>
            </div>
          ) : (
            <KnowledgeGraph data={graphData} width={dimensions.width} height={dimensions.height} />
          )}
        </div>

        {/* Stats sidebar */}
        <div className="w-64 border-l border-surface-border p-4 overflow-y-auto flex-shrink-0">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Statistics</h3>

          <div className="space-y-3">
            <StatCard icon={Database} label="Total Nodes" value={stats?.total_nodes ?? '-'} />
            <StatCard icon={Database} label="Total Edges" value={stats?.total_edges ?? '-'} />
            <StatCard icon={TrendingUp} label="Sessions" value={stats?.recent_sessions?.length ?? '-'} />
            <StatCard icon={BarChart3} label="Node Types" value={stats?.node_types ? Object.keys(stats.node_types).length : '-'} />
          </div>

          {/* Recent sessions */}
          {stats?.recent_sessions?.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Recent Sessions</h4>
              <div className="space-y-2">
                {stats.recent_sessions.map((s, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-text-primary truncate">{s.query || 'Unknown query'}</p>
                    <p className="text-text-muted mt-0.5">
                      {s.timestamp ? new Date(s.timestamp * 1000).toLocaleDateString() : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!stats && !loading && (
            <p className="text-xs text-text-muted mt-4">No data yet. Run some research queries to build the graph.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={12} className="text-text-muted" />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-lg font-semibold text-text-primary">{value}</p>
    </div>
  )
}
