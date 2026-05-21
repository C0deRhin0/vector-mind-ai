import React, { useState } from 'react'
import { Copy, Check, Download, FileText, Twitter, Presentation, Headphones, FileSpreadsheet, Brain } from 'lucide-react'

const FORMAT_ICONS = {
  research_brief: FileSpreadsheet,
  blog_post: FileText,
  twitter_thread: Twitter,
  presentation: Presentation,
  podcast_script: Headphones,
  executive_summary: FileSpreadsheet,
}

const FORMAT_LABELS = {
  research_brief: 'Research Brief',
  blog_post: 'Blog Post',
  twitter_thread: 'Twitter Thread',
  presentation: 'Presentation',
  podcast_script: 'Podcast Script',
  executive_summary: 'Executive Summary',
}

export default function OutputPanel({ content = '', format = 'research_brief', critique = '', factCheck = '', isLoading = false, showExamples = false, exampleQueries = [], onExampleClick = () => {} }) {
  const [copied, setCopied] = useState(false)
  const [showSidePanels, setShowSidePanels] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-${format}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const FormatIcon = FORMAT_ICONS[format] || FileText

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="flex gap-1 mb-4">
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse-dot" style={{ animationDelay: '0s' }} />
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
        </div>
        <p className="text-sm text-text-muted">Generating research output...</p>
        <p className="text-xs text-text-muted mt-1">This may take a moment</p>
      </div>
    )
  }

  if (!content) {
    if (showExamples) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-md">
            <Brain size={40} className="mx-auto text-text-muted mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">What would you like to research?</h2>
            <p className="text-sm text-text-muted mb-6">
              Ask any question and the multi-agent system will research, analyze, and synthesize findings for you.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {exampleQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onExampleClick(q)}
                  className="text-left px-4 py-2.5 bg-surface-raised border border-surface-border rounded-lg text-sm text-text-secondary hover:border-surface-hover hover:text-text-primary transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText size={32} className="text-text-muted mb-3" />
        <p className="text-sm text-text-muted">No output yet</p>
        <p className="text-xs text-text-muted mt-1">Run a research query to see results here</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <FormatIcon size={14} className="text-accent-blue" />
          <span className="text-xs font-medium text-text-primary">{FORMAT_LABELS[format] || format}</span>
        </div>
        <div className="flex items-center gap-2">
          {critique && (
            <button
              onClick={() => setShowSidePanels(!showSidePanels)}
              className={`text-xs px-2 py-1 rounded ${showSidePanels ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary'} transition-colors`}
            >
              {showSidePanels ? 'Hide review' : 'Show review'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary px-2 py-1 rounded hover:bg-surface-hover transition-colors"
          >
            {copied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary px-2 py-1 rounded hover:bg-surface-hover transition-colors"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Content + optional side panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose-custom max-w-none">
            {content.split('\n').map((line, i) => {
              if (line.startsWith('### ')) {
                return <h3 key={i} className="text-lg font-semibold text-text-primary mt-6 mb-2">{line.replace('### ', '')}</h3>
              }
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-xl font-semibold text-text-primary mt-6 mb-3">{line.replace('## ', '')}</h2>
              }
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-2xl font-semibold text-text-primary mt-6 mb-3">{line.replace('# ', '')}</h1>
              }
              if (line.startsWith('- **')) {
                const match = line.match(/- \*\*(.+?)\*\*[：:]?\s*(.*)/)
                if (match) {
                  return (
                    <p key={i} className="mb-2">
                      <strong className="text-text-primary">{match[1]}</strong>
                      {match[2] && <span className="text-text-secondary">{match[2]}</span>}
                    </p>
                  )
                }
              }
              if (line.startsWith('- ')) {
                return <li key={i} className="text-text-secondary ml-4 mb-1 list-disc">{line.replace('- ', '')}</li>
              }
              if (line.trim() === '') {
                return <div key={i} className="h-3" />
              }
              if (line.startsWith('|')) {
                return <p key={i} className="text-text-secondary font-mono text-sm mb-1">{line}</p>
              }
              return <p key={i} className="text-text-secondary mb-2">{line}</p>
            })}
          </div>
        </div>

        {/* Side panels for critique/fact-check */}
        {showSidePanels && (
          <div className="w-72 border-l border-surface-border overflow-y-auto p-3 space-y-4 bg-surface-raised">
            {critique && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Review</h4>
                <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {critique}
                </div>
              </div>
            )}
            {factCheck && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Fact Check</h4>
                <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {factCheck}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
