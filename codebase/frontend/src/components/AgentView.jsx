import React, { useState, useEffect, useCallback } from 'react'
import {
  Brain, Search, BarChart3, FileText, Crosshair, ShieldCheck,
  CheckCircle, Loader2, Plus, Trash2, Save, Pencil, UserPlus,
} from 'lucide-react'

const DEFAULT_AGENTS = {
  planner: {
    label: 'Planner',
    icon: Brain,
    color: 'text-accent-purple',
    desc: 'Breaks down queries into research plans with sub-questions and methodology',
    system_prompt: 'You are a senior research planner. Analyze queries and break them into structured sub-questions, identify key domains, and create a logical research order.',
  },
  researcher: {
    label: 'Researcher',
    icon: Search,
    color: 'text-accent-blue',
    desc: 'Gathers information from vector database and web sources',
    system_prompt: 'You are a thorough research agent. Search and gather comprehensive information, extract key facts with source attribution, and organize findings by topic.',
  },
  analyst: {
    label: 'Analyst',
    icon: BarChart3,
    color: 'text-accent-green',
    desc: 'Synthesizes findings, identifies patterns and contradictions',
    system_prompt: 'You are a senior research analyst. Synthesize findings from multiple sources, identify patterns and contradictions, and evaluate the strength of evidence.',
  },
  writer: {
    label: 'Writer',
    icon: FileText,
    color: 'text-accent-yellow',
    desc: 'Generates polished output in the selected format',
    system_prompt: 'You are a versatile writer. Transform research findings into polished, engaging content adapted to the target format and audience.',
  },
  critic: {
    label: 'Critic',
    icon: Crosshair,
    color: 'text-accent-orange',
    desc: 'Reviews output for logical gaps, overreach, and quality',
    system_prompt: 'You are a rigorous academic reviewer. Critically evaluate outputs for logical gaps, unsupported claims, missing perspectives, and overreach.',
  },
  fact_checker: {
    label: 'Fact Checker',
    icon: ShieldCheck,
    color: 'text-accent-red',
    desc: 'Verifies factual claims against source material',
    system_prompt: 'You are a meticulous fact-checker. Extract and verify every factual claim against source material, flag unsupported claims.',
  },
}

const AGENT_ORDER = ['planner', 'researcher', 'analyst', 'writer', 'critic', 'fact_checker']
const STORAGE_KEY = 'agent_personas'
const CUSTOM_AGENTS_KEY = 'custom_agent_personas'

export default function AgentView({ trace = [], isRunning = false, currentAgent = '', onInstructionsChange }) {
  const [mode, setMode] = useState('activity') // 'activity' | 'personas'
  const [instructions, setInstructions] = useState(() => loadInstructions())
  const [customAgents, setCustomAgents] = useState(() => loadCustomAgents())
  const [saved, setSaved] = useState({})
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentInstructions, setNewAgentInstructions] = useState('')
  const [editingCustom, setEditingCustom] = useState(null)

  // Notify parent whenever instructions or custom agents change
  useEffect(() => {
    onInstructionsChange?.(collectAllInstructions())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructions, customAgents])

  function loadInstructions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch {
      return {}
    }
  }

  function loadCustomAgents() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_AGENTS_KEY)) || []
    } catch {
      return []
    }
  }

  const collectAllInstructions = useCallback(() => {
    const result = { ...instructions }
    customAgents.forEach(a => {
      result[a.key] = a.instructions
    })
    return result
  }, [instructions, customAgents])

  const handleSave = (agentKey) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instructions))
    setSaved(prev => ({ ...prev, [agentKey]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [agentKey]: false })), 1500)
  }

  const handleSaveCustom = () => {
    localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(customAgents))
    setSaved(prev => ({ ...prev, '__custom__': true }))
    setTimeout(() => setSaved(prev => ({ ...prev, '__custom__': false })), 1500)
  }

  const handleAddCustom = () => {
    const key = newAgentName.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!key || !newAgentInstructions.trim()) return
    setCustomAgents(prev => [...prev, { key, label: newAgentName.trim(), instructions: newAgentInstructions.trim() }])
    setNewAgentName('')
    setNewAgentInstructions('')
    setTimeout(() => handleSaveCustom(), 50)
  }

  const handleRemoveCustom = (key) => {
    setCustomAgents(prev => prev.filter(a => a.key !== key))
    setTimeout(() => handleSaveCustom(), 50)
  }

  const handleUpdateCustom = (key, field, value) => {
    setCustomAgents(prev => prev.map(a => a.key === key ? { ...a, [field]: value } : a))
  }

  // ─── Persona Tab ──────────────────────────────────
  function PersonaPanel() {
    return (
      <div className="space-y-4">
        {/* Built-in agents */}
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Core Agents</h3>
          <div className="space-y-3">
            {AGENT_ORDER.map(key => {
              const agent = DEFAULT_AGENTS[key]
              const Icon = agent.icon
              const val = instructions[key] || ''
              return (
                <div key={key} className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-surface-border">
                    <Icon size={16} className={agent.color} />
                    <span className="text-sm font-medium text-text-primary">{agent.label}</span>
                    <span className="text-xs text-text-muted ml-1">— {agent.desc}</span>
                    <div className="ml-auto flex items-center gap-2">
                      {saved[key] && <span className="text-xs text-accent-green">Saved!</span>}
                      <button
                        onClick={() => handleSave(key)}
                        className="flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                      >
                        <Save size={12} />
                        Save
                      </button>
                    </div>
                  </div>
                  {/* Prompt reference */}
                  <div className="px-3 py-2 bg-surface/50 border-b border-surface-border">
                    <details className="group">
                      <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors select-none">
                        <span className="group-open:font-medium">Default system prompt</span>
                      </summary>
                      <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{agent.system_prompt}</p>
                    </details>
                  </div>
                  {/* Custom instructions */}
                  <div className="px-3 py-2.5">
                    <label className="block text-xs text-text-muted mb-1.5">Custom instructions (appended to system prompt)</label>
                    <textarea
                      value={val}
                      onChange={(e) => setInstructions(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="e.g., Focus on technical implementation details, cite specific version numbers..."
                      rows={2}
                      className="w-full bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue resize-none transition-colors"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Custom agents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Custom Agents</h3>
            {saved.__custom__ && <span className="text-xs text-accent-green">Saved!</span>}
          </div>

          {customAgents.length === 0 && (
            <div className="text-center py-6 bg-surface-raised border border-dashed border-surface-border rounded-lg">
              <UserPlus size={24} className="mx-auto text-text-muted mb-1.5" />
              <p className="text-xs text-text-muted">No custom agents yet. Add one below.</p>
            </div>
          )}

          <div className="space-y-3">
            {customAgents.map(agent => (
              <div key={agent.key} className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-border">
                  <Brain size={16} className="text-accent-purple" />
                  <input
                    value={agent.label}
                    onChange={(e) => handleUpdateCustom(agent.key, 'label', e.target.value)}
                    className="text-sm font-medium text-text-primary bg-transparent border-b border-transparent hover:border-surface-border focus:border-accent-blue focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => handleRemoveCustom(agent.key)}
                    className="ml-auto text-text-muted hover:text-accent-red transition-colors"
                    title="Remove agent"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="px-3 py-2.5">
                  <label className="block text-xs text-text-muted mb-1.5">System instructions for this agent</label>
                  <textarea
                    value={agent.instructions}
                    onChange={(e) => handleUpdateCustom(agent.key, 'instructions', e.target.value)}
                    placeholder="Define the agent's role and behavior. This becomes its full system prompt."
                    rows={3}
                    className="w-full bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue resize-none transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add custom agent */}
          <div className="mt-3 bg-surface-raised border border-dashed border-surface-border rounded-lg p-3">
            <h4 className="text-xs font-medium text-text-secondary mb-2">Add New Custom Agent</h4>
            <div className="flex items-center gap-2 mb-2">
              <input
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Agent name (e.g., Code Reviewer)"
                className="flex-1 bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>
            <textarea
              value={newAgentInstructions}
              onChange={(e) => setNewAgentInstructions(e.target.value)}
              placeholder="Full system prompt for this agent..."
              rows={2}
              className="w-full bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue resize-none transition-colors mb-2"
            />
            <button
              onClick={handleAddCustom}
              disabled={!newAgentName.trim() || !newAgentInstructions.trim()}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${newAgentName.trim() && newAgentInstructions.trim()
                  ? 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20'
                  : 'bg-surface-hover text-text-muted cursor-not-allowed'
                }
              `}
            >
              <Plus size={12} />
              Add Agent
            </button>
          </div>
        </div>

        <div className="text-center pb-2">
          <p className="text-xs text-text-muted">
            Personas are saved locally and sent with each research request.
          </p>
        </div>
      </div>
    )
  }

  // ─── Activity Tab ──────────────────────────────────
  function ActivityPanel() {
    return (
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-surface-border" />

        {trace.map((step, i) => {
          const agent = DEFAULT_AGENTS[step.agent] || { label: step.agent || 'Agent', icon: Brain, color: 'text-accent-blue' }
          const Icon = agent.icon
          const isActive = step.status === 'running'
          const isError = step.status === 'error'
          const isComplete = step.status === 'completed' || step.status?.includes('completed')

          return (
            <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {/* Dot */}
              <div className={`
                relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                ${isActive ? 'bg-accent-blue/20 agent-pulse' : ''}
                ${isComplete ? 'bg-accent-green/20' : ''}
                ${isError ? 'bg-accent-red/20' : ''}
                ${!isActive && !isComplete && !isError ? 'bg-surface-hover' : ''}
              `}>
                {isActive ? (
                  <Loader2 size={12} className="text-accent-blue spin-slow" />
                ) : isComplete ? (
                  <CheckCircle size={12} className="text-accent-green" />
                ) : (
                  <Icon size={12} className={agent.color} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isActive ? 'text-accent-blue' : 'text-text-primary'}`}>
                    {agent.label || step.agent}
                  </span>
                  {isActive && (
                    <span className="text-xs text-accent-blue animate-pulse">
                      Working...
                    </span>
                  )}
                  {isComplete && (
                    <span className="text-xs text-accent-green">done</span>
                  )}
                  {isError && (
                    <span className="text-xs text-accent-red">{step.error || 'error'}</span>
                  )}
                </div>
                {step.message && (
                  <p className="text-xs text-text-muted mt-0.5">{step.message}</p>
                )}
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {trace.length === 0 && (
          <div className="text-center py-8">
            <Brain size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">
              {isRunning ? 'Preparing agents...' : 'Run a research query to see agent activity'}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Mode switcher */}
      <div className="flex items-center gap-1 mb-4 pb-3 border-b border-surface-border">
        <button
          onClick={() => setMode('activity')}
          className={`
            px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${mode === 'activity'
              ? 'bg-accent-blue/10 text-accent-blue'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
            }
          `}
        >
          <div className="flex items-center gap-1.5">
            <Loader2 size={12} className={mode === 'activity' ? '' : 'opacity-50'} />
            Activity
          </div>
        </button>
        <button
          onClick={() => setMode('personas')}
          className={`
            px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${mode === 'personas'
              ? 'bg-accent-blue/10 text-accent-blue'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
            }
          `}
        >
          <div className="flex items-center gap-1.5">
            <Pencil size={12} className={mode === 'personas' ? '' : 'opacity-50'} />
            Personas
          </div>
        </button>
      </div>

      {/* Content */}
      {mode === 'activity' ? <ActivityPanel /> : <PersonaPanel />}
    </div>
  )
}
