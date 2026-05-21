import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Loader2, Sparkles, BookOpen, Brain, StopCircle, Upload } from 'lucide-react'
import AgentView from '../components/AgentView'
import SourcePanel from '../components/SourcePanel'
import OutputPanel from '../components/OutputPanel'
import { streamResearch } from '../api/client'

const EXAMPLE_QUERIES = [
  'What are the key differences between GPT-4 and Claude?',
  'Explain the transformer architecture and its evolution',
  'How does RAG improve LLM accuracy?',
  'Compare modern vector databases: Qdrant vs Pinecone vs Weaviate',
]

export default function ResearchPage({ onResearchComplete, lastState }) {
  const [query, setQuery] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [outputFormat, setOutputFormat] = useState(localStorage.getItem('research_format') || 'research_brief')
  const [depth, setDepth] = useState(parseInt(localStorage.getItem('research_depth') || '1'))
  const [activeTab, setActiveTab] = useState('output') // output | sources | agents
  const [streamingContent, setStreamingContent] = useState('')
  const [sources, setSources] = useState([])
  const [agentTrace, setAgentTrace] = useState([])
  const [currentAgent, setCurrentAgent] = useState('')
  const [critique, setCritique] = useState('')
  const [factCheck, setFactCheck] = useState('')
  const [showExamples, setShowExamples] = useState(true)
  const [agentInstructions, setAgentInstructions] = useState({})
  const inputRef = useRef(null)
  const cancelRef = useRef(null) // Holds cancel function for EventSource

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && query.trim() && !isRunning) {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [query, isRunning])

  // Restore last state if navigated back from history
  useEffect(() => {
    if (lastState) {
      setStreamingContent(lastState.output || '')
      setSources(lastState.sources || [])
      setAgentTrace(lastState.agent_trace || [])
      setCritique(lastState.critique || '')
      setFactCheck(lastState.fact_check || '')
      setShowExamples(false)
      if (lastState.query) setQuery(lastState.query)
    }
  }, [lastState])

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelRef.current?.()
  }, [])

  const handleCancel = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    setIsRunning(false)
    setCurrentAgent('')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isRunning) return
    setIsRunning(true)
    setStreamingContent('')
    setSources([])
    setAgentTrace([])
    setCritique('')
    setFactCheck('')
    setShowExamples(false)
    setActiveTab('agents')

    const submittedQuery = query.trim()
    setQuery('') // Clear input immediately

    // Auto-timeout: cancel after 5 minutes
    const timeoutId = setTimeout(() => {
      handleCancel()
    }, 300000)

    const close = streamResearch(submittedQuery, outputFormat, depth, {
      onStatus: (msg, agent) => {
        setAgentTrace(prev => [...prev, { agent: agent || 'system', status: 'running', message: msg, timestamp: Date.now() }])
      },
      onAgentStart: (agent, label) => {
        setCurrentAgent(agent)
        setAgentTrace(prev => [...prev, { agent, status: 'running', label, timestamp: Date.now() }])
      },
      onAgentComplete: (agent, data) => {
        setAgentTrace(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.agent === agent && last?.status === 'running') {
            last.status = 'completed'
            last.output_preview = data?.plan ? JSON.stringify(data.plan).slice(0, 200) : undefined
          }
          return updated
        })
      },
      onToken: (text) => {
        setStreamingContent(prev => prev + text)
        setActiveTab('output')
      },
      onDone: (state) => {
        clearTimeout(timeoutId)
        if (state) {
          setSources(state.sources_used || [])
          setCritique(state.critique || '')
          setFactCheck(state.fact_check || '')
          setAgentTrace(state.agent_trace || [])
          onResearchComplete?.(state)
        }
        setIsRunning(false)
        setCurrentAgent('')
        cancelRef.current = null
      },
      onError: (msg) => {
        clearTimeout(timeoutId)
        console.error('Research error:', msg)
        setIsRunning(false)
        setCurrentAgent('')
        cancelRef.current = null
      },
    }, agentInstructions)

    cancelRef.current = () => {
      clearTimeout(timeoutId)
      close()
    }
  }, [query, outputFormat, depth, isRunning, onResearchComplete, handleCancel, agentInstructions])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ─── Top Bar ──────────────────────────────────── */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-blue" />
          <span className="text-sm font-medium text-text-primary">Research</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="bg-surface-raised border border-surface-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent-blue"
          >
            <option value="research_brief">Research Brief</option>
            <option value="blog_post">Blog Post</option>
            <option value="twitter_thread">Twitter Thread</option>
            <option value="presentation">Presentation</option>
            <option value="podcast_script">Podcast Script</option>
            <option value="executive_summary">Executive Summary</option>
          </select>
          <select
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="bg-surface-raised border border-surface-border rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent-blue"
          >
            <option value={1}>Basic</option>
            <option value={2}>Deep (+ critique)</option>
            <option value={3}>Expert (+ fact-check)</option>
          </select>
        </div>
      </div>

      {/* ─── Content Area ─────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-2 border-b border-surface-border">
            {[
              { id: 'output', label: 'Output', icon: BookOpen },
              { id: 'sources', label: 'Sources', icon: Upload },
              { id: 'agents', label: 'Agents', icon: Brain },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-t transition-colors
                  ${activeTab === tab.id
                    ? 'text-accent-blue border-b-2 border-accent-blue'
                    : 'text-text-muted hover:text-text-secondary'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'output' && (
              <OutputPanel
                content={streamingContent}
                format={outputFormat}
                critique={critique}
                factCheck={factCheck}
                isLoading={isRunning && !streamingContent}
                showExamples={showExamples && !streamingContent && !isRunning}
                exampleQueries={EXAMPLE_QUERIES}
                onExampleClick={(q) => { setQuery(q); setShowExamples(false); inputRef.current?.focus() }}
              />
            )}
            {activeTab === 'sources' && (
              <div className="h-full overflow-y-auto p-4">
                <SourcePanel sources={sources} />
              </div>
            )}
            {activeTab === 'agents' && (
              <div className="h-full overflow-y-auto p-4">
                <AgentView
                  trace={agentTrace}
                  isRunning={isRunning}
                  currentAgent={currentAgent}
                  onInstructionsChange={setAgentInstructions}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Input Bar ────────────────────────────────── */}
      <div className="border-t border-surface-border p-3 flex-shrink-0">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a research question... (Cmd+Enter to submit)"
              rows={1}
              className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue resize-none transition-colors"
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={isRunning}
            />
          </div>
          {isRunning ? (
            <button
              onClick={handleCancel}
              className="h-10 flex items-center gap-2 px-4 rounded-lg text-sm font-medium transition-all bg-accent-red/10 text-accent-red hover:bg-accent-red/20"
            >
              <StopCircle size={16} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!query.trim()}
              className={`
                h-10 flex items-center gap-2 px-4 rounded-lg text-sm font-medium transition-all
                ${query.trim()
                  ? 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20'
                  : 'bg-surface-raised text-text-muted cursor-not-allowed'
                }
              `}
            >
              <Send size={16} />
              Research
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
