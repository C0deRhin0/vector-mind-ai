import React from 'react'
import { Brain, Search, BarChart3, FileText, Crosshair, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react'

const AGENT_CONFIG = {
  planner:     { label: 'Planner',     icon: Brain,      color: 'text-accent-purple', desc: 'Research strategy' },
  researcher:  { label: 'Researcher',  icon: Search,     color: 'text-accent-blue',   desc: 'Gathering info' },
  analyst:     { label: 'Analyst',     icon: BarChart3,  color: 'text-accent-green',  desc: 'Synthesizing' },
  writer:      { label: 'Writer',      icon: FileText,   color: 'text-accent-yellow', desc: 'Writing output' },
  critic:      { label: 'Critic',      icon: Crosshair,  color: 'text-accent-orange', desc: 'Reviewing' },
  fact_checker:{ label: 'Fact Checker',icon: ShieldCheck,color: 'text-accent-red',    desc: 'Verifying' },
}

export default function AgentView({ trace = [], isRunning = false, currentAgent = '' }) {
  return (
    <div className="space-y-2">
      {/* Agent timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-surface-border" />

        {trace.map((step, i) => {
          const agent = AGENT_CONFIG[step.agent] || AGENT_CONFIG.planner
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
                    {agent.label}
                  </span>
                  {isActive && (
                    <span className="text-xs text-accent-blue animate-pulse">
                      {agent.desc}...
                    </span>
                  )}
                  {isComplete && (
                    <span className="text-xs text-accent-green">done</span>
                  )}
                  {isError && (
                    <span className="text-xs text-accent-red">{step.error || 'error'}</span>
                  )}
                  {step.output_preview && !isActive && (
                    <button
                      onClick={() => {/* Could expand */}}
                      className="text-xs text-text-muted hover:text-text-secondary ml-auto"
                    >
                      preview
                    </button>
                  )}
                </div>
                {step.output_preview && !isActive && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">
                    {step.output_preview}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

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
