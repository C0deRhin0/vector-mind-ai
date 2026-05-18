import React, { useState } from 'react'
import { FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

export default function SourcePanel({ sources = [] }) {
  const [expanded, setExpanded] = useState({})

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText size={32} className="text-text-muted mb-3" />
        <p className="text-sm text-text-muted">No sources yet</p>
        <p className="text-xs text-text-muted mt-1">Sources will appear here after research</p>
      </div>
    )
  }

  const toggleExpand = (i) => {
    setExpanded(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const getConfidenceColor = (score) => {
    if (score >= 80) return 'bg-accent-green'
    if (score >= 60) return 'bg-accent-yellow'
    if (score >= 30) return 'bg-accent-orange'
    return 'bg-accent-red'
  }

  // Deduplicate by filename
  const unique = []
  const seen = new Set()
  for (const s of sources) {
    const key = s.filename || s.url
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(s)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
        Sources ({unique.length})
      </h3>
      {unique.map((source, i) => (
        <div
          key={i}
          className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden hover:border-surface-hover transition-colors"
        >
          {/* Header */}
          <div
            className="flex items-start justify-between p-3 cursor-pointer"
            onClick={() => toggleExpand(i)}
          >
            <div className="flex items-start gap-2 min-w-0">
              <FileText size={14} className="text-accent-blue flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {source.title || source.filename || 'Unknown'}
                </p>
                {source.page && (
                  <p className="text-xs text-text-muted">Page {source.page}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {source.score != null && (
                <span className="text-xs text-text-muted">
                  {Math.round(source.score * 100)}%
                </span>
              )}
              {expanded[i] ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
            </div>
          </div>

          {/* Confidence bar */}
          {source.confidence != null && (
            <div className="px-3 pb-1">
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getConfidenceColor(source.confidence)}`}
                  style={{ width: `${Math.min(100, source.confidence)}%` }}
                />
              </div>
            </div>
          )}

          {/* Excerpt (expandable) */}
          {source.text && (
            <div className={`px-3 pb-3 ${expanded[i] ? '' : ''}`}>
              <p className={`text-xs text-text-secondary leading-relaxed ${expanded[i] ? '' : 'line-clamp-3'}`}>
                {source.text}
              </p>
              {source.text.length > 200 && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(i) }}
                  className="text-xs text-accent-blue hover:underline mt-1"
                >
                  {expanded[i] ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* URL link */}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 pb-3 text-xs text-accent-blue hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={10} />
              Open source
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
