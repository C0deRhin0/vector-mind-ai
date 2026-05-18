import React from 'react'
import { Settings } from 'lucide-react'
import SettingsPanel from '../components/SettingsPanel'

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-surface-border flex-shrink-0">
        <Settings size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">Settings</span>
      </div>

      {/* ─── Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <SettingsPanel />
        </div>
      </div>
    </div>
  )
}
