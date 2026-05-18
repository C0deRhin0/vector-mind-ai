import React, { useEffect, useState } from 'react'
import { Clock, ChevronRight, Brain, Search, Loader2, Trash2 } from 'lucide-react'
import { getHistory } from '../api/client'

const FORMAT_LABELS = {
  research_brief: 'Research Brief',
  blog_post: 'Blog Post',
  twitter_thread: 'Twitter Thread',
  presentation: 'Presentation',
  podcast_script: 'Podcast Script',
  executive_summary: 'Executive Summary',
}

export default function HistoryPage({ onSelectSession }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistory(50)
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const filtered = sessions.filter(s =>
    !searchTerm || s.query?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDuration = (seconds) => {
    if (!seconds) return ''
    if (seconds < 60) return `${Math.round(seconds)}s`
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-accent-blue" />
          <span className="text-sm font-medium text-text-primary">Research History</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="bg-surface-raised border border-surface-border rounded pl-7 pr-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue w-48"
            />
          </div>
          <button
            onClick={loadHistory}
            disabled={loading}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {loading ? <Loader2 size={12} className="spin-slow" /> : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="flex gap-1 justify-center mb-3">
                <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse-dot" />
                <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
              </div>
              <p className="text-sm text-text-muted">Loading history...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-accent-red mb-2">Failed to load history</p>
              <p className="text-xs text-text-muted">{error}</p>
              <button onClick={loadHistory} className="mt-3 text-xs text-accent-blue hover:underline">Retry</button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Brain size={32} className="mx-auto text-text-muted mb-3" />
              <p className="text-sm text-text-muted">
                {searchTerm ? 'No matching sessions found' : 'No research history yet'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {searchTerm ? 'Try a different search term' : 'Run a research query to see it here'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {filtered.map((session, i) => (
              <div
                key={session.session_id || i}
                onClick={() => onSelectSession?.(session)}
                className="flex items-start justify-between p-4 bg-surface-raised border border-surface-border rounded-lg hover:border-surface-hover cursor-pointer transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {session.query || 'Unknown query'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`
                      inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
                      ${session.status === 'completed' ? 'text-accent-green bg-accent-green/10' : ''}
                      ${session.status === 'error' ? 'text-accent-red bg-accent-red/10' : ''}
                      ${session.status === 'running' ? 'text-accent-blue bg-accent-blue/10' : ''}
                    `}>
                      {session.status || 'unknown'}
                    </span>
                    {session.created_at && (
                      <span className="text-xs text-text-muted">
                        {new Date(session.created_at * 1000).toLocaleString()}
                      </span>
                    )}
                    {session.agent_trace?.length > 0 && (
                      <span className="text-xs text-text-muted">
                        {session.agent_trace.filter(t => t.status === 'completed').length} agents
                      </span>
                    )}
                  </div>
                  {session.output && (
                    <p className="text-xs text-text-muted mt-2 line-clamp-2">
                      {session.output.slice(0, 200)}...
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
