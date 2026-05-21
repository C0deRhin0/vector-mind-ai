import React, { useState } from 'react'
import { FileText, ExternalLink, ChevronDown, ChevronUp, Upload, Loader2, CheckCircle, XCircle, Lock } from 'lucide-react'

const ADMIN_CODE = localStorage.getItem('admin_code') || ''

export default function SourcePanel({ sources = [] }) {
  const [expanded, setExpanded] = useState({})
  const [showUpload, setShowUpload] = useState(false)
  const [adminCode, setAdminCode] = useState(ADMIN_CODE)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null) // {ok, message}

  if (sources.length === 0 && !showUpload) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText size={32} className="text-text-muted mb-3" />
        <p className="text-sm text-text-muted">No sources yet</p>
        <p className="text-xs text-text-muted mt-1">Sources will appear here after research</p>
        <button
          onClick={() => setShowUpload(true)}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent-blue/10 text-accent-blue rounded-md hover:bg-accent-blue/20 transition-colors text-sm"
        >
          <Upload size={14} />
          Upload a Document
        </button>
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

  const handleUpload = async () => {
    if (!selectedFile || !adminCode) return
    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('code', adminCode)
      formData.append('file', selectedFile)

      const resp = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(err.detail || 'Upload failed')
      }

      const data = await resp.json()
      localStorage.setItem('admin_code', adminCode)
      setUploadResult({ ok: true, message: `Uploaded "${selectedFile.name}" — ${data.chunks} chunks indexed` })
      setSelectedFile(null)
    } catch (err) {
      setUploadResult({ ok: false, message: err.message })
    }
    setUploading(false)
  }

  return (
    <div className="space-y-2">
      {/* Upload toggle */}
      <div className="flex items-center justify-between">
        {sources.length > 0 && (
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
            Sources ({unique.length})
          </h3>
        )}
        <button
          onClick={() => setShowUpload(!showUpload)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
            showUpload ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Upload size={12} />
          {showUpload ? 'Close Upload' : 'Upload Document'}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-surface-raised border border-surface-border rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-semibold text-text-primary">Upload Document for Research</h4>

          {/* Admin code */}
          <div>
            <label className="block text-xs text-text-muted mb-1">Admin Code</label>
            <div className="relative">
              <Lock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter admin code from .env"
                className="w-full bg-surface border border-surface-border rounded-md pl-7 pr-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-xs text-text-muted mb-1">File (PDF, DOCX, TXT, MD)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-accent-blue/10 file:text-accent-blue hover:file:bg-accent-blue/20 file:cursor-pointer cursor-pointer"
            />
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !adminCode || uploading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedFile && adminCode && !uploading
                ? 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20'
                : 'bg-surface text-text-muted cursor-not-allowed'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="spin-slow" />
                Uploading & Indexing...
              </>
            ) : (
              <>
                <Upload size={14} />
                Upload & Index
              </>
            )}
          </button>

          {/* Result feedback */}
          {uploadResult && (
            <div className={`flex items-start gap-2 text-xs p-2 rounded ${
              uploadResult.ok ? 'bg-accent-green/5 text-accent-green' : 'bg-accent-red/5 text-accent-red'
            }`}>
              {uploadResult.ok ? <CheckCircle size={12} className="mt-0.5 flex-shrink-0" /> : <XCircle size={12} className="mt-0.5 flex-shrink-0" />}
              <span>{uploadResult.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Source cards */}
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
