import { useEffect, useState } from 'react'
import './App.css'
import DashboardView from './components/DashboardView.jsx'
import NewAuditForm from './components/NewAuditForm.jsx'
import AuditDetailView from './components/AuditDetailView.jsx'
import { db, ensureSeedTemplates } from './db.js'
import {
  buildAuditFromTemplate,
  sortAuditsByUpdatedAt,
} from './lib/auditUtils.js'

function App() {
  const [view, setView] = useState('dashboard')
  const [audits, setAudits] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedAuditId, setSelectedAuditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        setLoading(true)
        setError('')
        await ensureSeedTemplates()

        const [auditRows, templateRows] = await Promise.all([
          db.audits.toArray(),
          db.templates.toArray(),
        ])

        if (!cancelled) {
          setAudits(sortAuditsByUpdatedAt(auditRows))
          setTemplates(templateRows)
        }
      } catch {
        if (!cancelled) {
          setError('Nepodařilo se načíst lokální data aplikace.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreateAudit(formValues) {
    const template = templates.find(
      (templateOption) => templateOption.type === formValues.inspectionType,
    )

    if (!template) {
      throw new Error('Pro zvolený typ kontroly chybí šablona checklistu.')
    }

    setCreating(true)

    try {
      const newAudit = buildAuditFromTemplate(formValues, template)
      const newId = await db.audits.add(newAudit)
      const savedAudit = { ...newAudit, id: newId }

      setAudits((currentAudits) => sortAuditsByUpdatedAt([savedAudit, ...currentAudits]))
      setSelectedAuditId(newId)
      setView('detail')
      return savedAudit
    } finally {
      setCreating(false)
    }
  }

  function handleOpenAudit(auditId) {
    setSelectedAuditId(auditId)
    setView('detail')
  }

  function handleAuditSaved(savedAudit) {
    setAudits((currentAudits) => {
      const withoutCurrent = currentAudits.filter((audit) => audit.id !== savedAudit.id)
      return sortAuditsByUpdatedAt([savedAudit, ...withoutCurrent])
    })
  }

  async function handleDeleteAudit(auditId) {
    await db.audits.delete(auditId)
    setAudits((currentAudits) => currentAudits.filter((audit) => audit.id !== auditId))

    if (selectedAuditId === auditId) {
      setSelectedAuditId(null)
      setView('dashboard')
    }
  }

  function handleBackToDashboard() {
    setView('dashboard')
    setSelectedAuditId(null)
  }

  return (
    <main className="app-shell">
      {view === 'dashboard' ? (
        <DashboardView
          audits={audits}
          error={error}
          loading={loading}
          templates={templates}
          onCreateNew={() => setView('new')}
          onDeleteAudit={handleDeleteAudit}
          onOpenAudit={handleOpenAudit}
        />
      ) : null}

      {view === 'new' ? (
        <NewAuditForm
          creating={creating}
          onCancel={handleBackToDashboard}
          onCreate={handleCreateAudit}
        />
      ) : null}

      {view === 'detail' && selectedAuditId ? (
        <AuditDetailView
          auditId={selectedAuditId}
          onBack={handleBackToDashboard}
          onDelete={handleDeleteAudit}
          onSaved={handleAuditSaved}
        />
      ) : null}
    </main>
  )
}

export default App
