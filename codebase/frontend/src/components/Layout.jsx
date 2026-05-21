import React from 'react'
import { Search, Network, Clock, Settings, ChevronRight } from 'lucide-react'

const ICONS = {
  search: Search,
  graph: Network,
  clock: Clock,
  settings: Settings,
}

export default function Layout({ children, currentPage, onNavigate, pages }) {
  return (
    <div className="h-screen flex overflow-hidden bg-surface">
      {/* ─── Sidebar ─────────────────────────────────── */}
      <aside className="w-56 bg-surface-raised border-r border-surface-border flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="h-12 flex items-center px-4 border-b border-surface-border">
          <span className="text-sm font-semibold text-text-primary tracking-tight">
            <span className="text-accent-blue">◈</span> Vector Mind
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {Object.entries(pages).map(([key, page]) => {
            const Icon = ICONS[page.icon] || Search
            const isActive = currentPage === key
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150
                  ${isActive
                    ? 'bg-surface-hover text-text-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }
                `}
              >
                <Icon size={16} className={isActive ? 'text-accent-blue' : ''} />
                <span>{page.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto text-text-muted" />}
              </button>
            )
          })}
        </nav>

        {/* Footer spacer */}
      </aside>

      {/* ─── Main Content ────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
