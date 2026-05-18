import React, { useState, useCallback } from 'react'
import Layout from './components/Layout'
import ResearchPage from './pages/ResearchPage'
import KnowledgePage from './pages/KnowledgePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

const PAGES = {
  research: { label: 'Research', icon: 'search' },
  knowledge: { label: 'Knowledge Graph', icon: 'graph' },
  history: { label: 'History', icon: 'clock' },
  settings: { label: 'Settings', icon: 'settings' },
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('research')
  const [researchState, setResearchState] = useState(null)

  const handleResearchComplete = useCallback((state) => {
    setResearchState(state)
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'research':
        return (
          <ResearchPage
            onResearchComplete={handleResearchComplete}
            lastState={researchState}
          />
        )
      case 'knowledge':
        return <KnowledgePage />
      case 'history':
        return <HistoryPage onSelectSession={(s) => { setResearchState(s); setCurrentPage('research') }} />
      case 'settings':
        return <SettingsPage />
      default:
        return <ResearchPage onResearchComplete={handleResearchComplete} lastState={researchState} />
    }
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      pages={PAGES}
    >
      {renderPage()}
    </Layout>
  )
}
