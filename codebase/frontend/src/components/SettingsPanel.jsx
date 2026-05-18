import React, { useState, useEffect } from 'react'
import { Save, RefreshCw, Info } from 'lucide-react'
import { getDiagnostics } from '../api/client'

const OUTPUT_FORMATS = [
  { value: 'research_brief', label: 'Research Brief' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'twitter_thread', label: 'Twitter Thread' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'podcast_script', label: 'Podcast Script' },
  { value: 'executive_summary', label: 'Executive Summary' },
]

const RESEARCH_DEPTHS = [
  { value: 1, label: 'Basic', desc: 'Single pass through all agents' },
  { value: 2, label: 'Deep', desc: 'With critique and refinement' },
  { value: 3, label: 'Expert', desc: 'With critique, refinement, and fact-checking' },
]

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    outputFormat: localStorage.getItem('research_format') || 'research_brief',
    depth: parseInt(localStorage.getItem('research_depth') || '1'),
    temperature: parseFloat(localStorage.getItem('research_temp') || '0.3'),
    maxSources: parseInt(localStorage.getItem('research_sources') || '10'),
  })
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadDiagnostics()
  }, [])

  const loadDiagnostics = async () => {
    setLoading(true)
    try {
      const data = await getDiagnostics()
      setDiagnostics(data)
    } catch (err) {
      setDiagnostics({ error: err.message })
    }
    setLoading(false)
  }

  const handleSave = () => {
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(`research_${key === 'outputFormat' ? 'format' : key === 'depth' ? 'depth' : key === 'temperature' ? 'temp' : 'sources'}`, value.toString())
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ─── Research Settings ─────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-text-primary mb-4">Research Settings</h3>

        <div className="space-y-4">
          {/* Output Format */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Default Output Format</label>
            <select
              value={settings.outputFormat}
              onChange={(e) => update('outputFormat', e.target.value)}
              className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
            >
              {OUTPUT_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Research Depth */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Research Depth</label>
            <div className="space-y-2">
              {RESEARCH_DEPTHS.map(d => (
                <label
                  key={d.value}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${settings.depth === d.value
                      ? 'border-accent-blue bg-accent-blue/5'
                      : 'border-surface-border hover:border-surface-hover'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="depth"
                    value={d.value}
                    checked={settings.depth === d.value}
                    onChange={() => update('depth', d.value)}
                    className="text-accent-blue focus:ring-accent-blue"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{d.label}</p>
                    <p className="text-xs text-text-muted">{d.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Creativity (Temperature): {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => update('temperature', parseFloat(e.target.value))}
              className="w-full accent-accent-blue"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── System Diagnostics ────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">System Status</h3>
          <button
            onClick={loadDiagnostics}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'spin-slow' : ''} />
            Refresh
          </button>
        </div>

        {diagnostics ? (
          <div className="space-y-2">
            <StatusRow label="Vector DB (Qdrant)" ok={diagnostics.qdrant} />
            <StatusRow label="LLM Provider" ok={diagnostics.llm} />
            <StatusRow label="Research Collection" ok={diagnostics.collection} />
            {diagnostics.vector_count != null && (
              <div className="text-xs text-text-muted ml-6">
                {diagnostics.vector_count} vectors indexed
              </div>
            )}
            {diagnostics.llm_response && (
              <div className="text-xs text-text-muted ml-6">
                LLM response: "{diagnostics.llm_response}"
              </div>
            )}
            {diagnostics.error && (
              <div className="text-xs text-accent-red ml-6">{diagnostics.error}</div>
            )}
          </div>
        ) : loading ? (
          <p className="text-sm text-text-muted">Running diagnostics...</p>
        ) : (
          <p className="text-sm text-text-muted">Click refresh to check system status</p>
        )}
      </section>

      {/* ─── Save ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue/10 text-accent-blue rounded-md hover:bg-accent-blue/20 transition-colors text-sm font-medium"
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        {saved && <span className="text-xs text-accent-green">Settings saved to local storage</span>}
      </div>
    </div>
  )
}

function StatusRow({ label, ok }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-accent-green' : 'bg-accent-red'}`} />
      <span className="text-sm text-text-primary">{label}</span>
      <span className="text-xs text-text-muted">{ok ? 'Connected' : 'Disconnected'}</span>
    </div>
  )
}
