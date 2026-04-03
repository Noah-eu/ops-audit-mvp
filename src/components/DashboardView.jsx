import {
  countTemplateItems,
  formatDisplayDate,
  getCriticalCount,
} from '../lib/auditUtils.js'

function StatusPill({ tone, children }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>
}

function AuditCard({ audit, onDeleteAudit, onOpenAudit }) {
  const criticalCount = getCriticalCount(audit.items)

  async function handleDelete() {
    const confirmed = window.confirm('Smazat tuto kontrolu? Tato akce nejde vrátit.')

    if (confirmed) {
      await onDeleteAudit(audit.id)
    }
  }

  return (
    <article className="audit-card">
      <div className="section-header">
        <div>
          <h3>{audit.facilityName}</h3>
          <p>{audit.location}</p>
        </div>
        <StatusPill tone={audit.status === 'done' ? 'done' : 'draft'}>
          {audit.status === 'done' ? 'Hotovo' : 'Rozpracováno'}
        </StatusPill>
      </div>

      <div className="audit-meta">
        <span className="count-pill">{formatDisplayDate(audit.date)}</span>
        <span className="count-pill">{audit.inspectionType}</span>
        <span className="count-pill">Kritické: {criticalCount}</span>
      </div>

      <div className="card-actions">
        <button className="button" type="button" onClick={() => onOpenAudit(audit.id)}>
          Otevřít kontrolu
        </button>
        <button className="ghost-button" type="button" onClick={handleDelete}>
          Smazat
        </button>
      </div>
    </article>
  )
}

function AuditSection({ audits, emptyMessage, title, onDeleteAudit, onOpenAudit }) {
  return (
    <section className="panel dashboard-section">
      <div className="dashboard-section-header">
        <div>
          <h2>{title}</h2>
          <p className="section-subtitle">{audits.length} záznamů</p>
        </div>
      </div>

      {audits.length === 0 ? (
        <div className="empty-state">
          <h2>Nic tady zatím není</h2>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        audits.map((audit) => (
          <AuditCard
            key={audit.id}
            audit={audit}
            onDeleteAudit={onDeleteAudit}
            onOpenAudit={onOpenAudit}
          />
        ))
      )}
    </section>
  )
}

function TemplateCard({ template }) {
  return (
    <article className="template-card">
      <div className="section-header">
        <div>
          <h3>{template.title}</h3>
          <p>{template.description}</p>
        </div>
        <span className="template-pill">{template.sections.length} sekcí</span>
      </div>
      <div className="audit-meta">
        <span className="count-pill">{countTemplateItems(template)} bodů</span>
        <span className="count-pill">{template.type}</span>
      </div>
    </article>
  )
}

export default function DashboardView({
  audits,
  error,
  loading,
  templates,
  onCreateNew,
  onDeleteAudit,
  onOpenAudit,
}) {
  const draftAudits = audits.filter((audit) => audit.status !== 'done')
  const finishedAudits = audits.filter((audit) => audit.status === 'done')

  return (
    <section className="screen">
      <header className="hero-panel">
        <div className="stack">
          <div>
            <h1>Provozní kontrola</h1>
            <p>
              Interní přehled pro rychlé založení kontroly, sběr nálezů, fotek a priorit bez
              backendu.
            </p>
          </div>
          <div className="hero-actions">
            <button className="button" type="button" onClick={onCreateNew}>
              Nová kontrola
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <section className="empty-state loading-state">
          <h2>Načítám lokální data</h2>
          <p>Kontroly a šablony připravuji z IndexedDB.</p>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="empty-state error-state">
          <h2>Lokální data nejsou dostupná</h2>
          <p className="error-text">{error}</p>
        </section>
      ) : null}

      {!loading && !error ? (
        <div className="dashboard-groups">
          <AuditSection
            audits={draftAudits}
            emptyMessage="Začni novou kontrolou a rozpracované věci se objeví tady."
            title="Rozpracované kontroly"
            onDeleteAudit={onDeleteAudit}
            onOpenAudit={onOpenAudit}
          />

          <AuditSection
            audits={finishedAudits}
            emptyMessage="Až kontrolu označíš jako hotovou, přesune se sem."
            title="Hotové kontroly"
            onDeleteAudit={onDeleteAudit}
            onOpenAudit={onOpenAudit}
          />

          <section className="panel dashboard-section">
            <div className="dashboard-section-header">
              <div>
                <h2>Šablony checklistů</h2>
                <p className="section-subtitle">Lokální seed pro první verzi</p>
              </div>
            </div>

            <div className="template-grid">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}