import { useRef, useState } from 'react'
import {
    countTemplateItems,
    formatDisplayDate,
    getAuditInspectionTypeLabel,
    getCriticalCount,
} from '../lib/auditUtils.js'
import { getJsonPhotoExportLimitations } from '../lib/auditTransfer.js'

function StatusPill({ tone, children }) {
    return <span className={`status-pill status-pill--${tone}`}>{children}</span>
}

function AuditCard({ audit, onDeleteAudit, onOpenAudit }) {
    const criticalCount = getCriticalCount(audit.items)

    async function handleDelete() {
        const confirmed = window.confirm('Smazat tento rozbor? Tato akce nejde vrátit.')

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
                    {audit.status === 'done' ? 'Uzavřeno' : 'Rozpracováno'}
                </StatusPill>
            </div>

            <div className="audit-meta">
                <span className="count-pill">{formatDisplayDate(audit.date)}</span>
                <span className="count-pill">{getAuditInspectionTypeLabel(audit)}</span>
                <span className="count-pill">Kritické: {criticalCount}</span>
            </div>

            <div className="card-actions">
                <button className="button" type="button" onClick={() => onOpenAudit(audit.id)}>
                    Otevřít rozbor
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
                <span className="count-pill">{template.label}</span>
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
    onExportAllAudits,
    onImportAudits,
    onOpenAudit,
}) {
    const [transferFeedback, setTransferFeedback] = useState('')
    const [transferError, setTransferError] = useState('')
    const importInputRef = useRef(null)
    const draftAudits = audits.filter((audit) => audit.status !== 'done')
    const finishedAudits = audits.filter((audit) => audit.status === 'done')
    const isCompletelyEmpty = !loading && !error && audits.length === 0

    async function handleImportSelection(event) {
        const selectedFile = event.target.files?.[0]

        if (!selectedFile) {
            return
        }

        try {
            setTransferError('')
            const importedCount = await onImportAudits(selectedFile)
            setTransferFeedback(
                importedCount === 1
                    ? 'JSON import proběhl a rozbor je uložený jako nový záznam.'
                    : `JSON import proběhl a bylo uloženo ${importedCount} rozborů jako nové záznamy.`,
            )
        } catch (importError) {
            setTransferFeedback('')
            setTransferError(importError.message || 'Import JSON selhal.')
        } finally {
            event.target.value = ''
        }
    }

    async function handleExportAll() {
        try {
            setTransferError('')
            await onExportAllAudits()
            setTransferFeedback('JSON export všech rozborů byl připraven ke stažení.')
        } catch (exportError) {
            setTransferFeedback('')
            setTransferError(exportError.message || 'Export všech rozborů selhal.')
        }
    }

    return (
        <section className="screen">
            <header className="hero-panel">
                <div className="stack">
                    <div>
                        <h1>Jednorázový provozní rozbor</h1>
                        <p>
                            Interní nástroj pro rychlý sběr nálezů, fotek, dopadů a doporučení pro vedení,
                            čistě lokálně bez backendu.
                        </p>
                    </div>
                    <div className="hero-actions">
                        <button className="button" type="button" onClick={onCreateNew}>
                            Nový rozbor
                        </button>
                    </div>
                </div>
            </header>

            <section className="panel info-panel">
                <div className="stack">
                    <div>
                        <h2>Local-first uložení</h2>
                        <p>
                            Rozbory jsou uložené jen v tomto zařízení a prohlížeči. Pro přenos mezi
                            zařízeními použij export/import.
                        </p>
                        <p className="muted">{getJsonPhotoExportLimitations()}</p>
                    </div>
                    <div className="card-actions">
                        <button className="ghost-button" type="button" onClick={() => importInputRef.current?.click()}>
                            Import JSON
                        </button>
                        <button
                            className="ghost-button"
                            type="button"
                            disabled={audits.length === 0}
                            onClick={handleExportAll}
                        >
                            Export všech rozborů do JSON
                        </button>
                    </div>
                    <input
                        ref={importInputRef}
                        className="hidden-input"
                        accept="application/json,.json"
                        onChange={handleImportSelection}
                        type="file"
                    />
                    {transferFeedback ? <p>{transferFeedback}</p> : null}
                    {transferError ? <p className="error-text">{transferError}</p> : null}
                </div>
            </section>

            {loading ? (
                <section className="empty-state loading-state">
                    <h2>Načítám lokální data</h2>
                    <p>Rozbory a šablony připravuji z IndexedDB.</p>
                </section>
            ) : null}

            {!loading && error ? (
                <section className="empty-state error-state">
                    <h2>Lokální data nejsou dostupná</h2>
                    <p className="error-text">{error}</p>
                </section>
            ) : null}

            {isCompletelyEmpty ? (
                <section className="empty-state panel">
                    <h2>Zatím tu nejsou žádné rozbory</h2>
                    <p>Začni novým rozborem nebo si přenes data přes JSON import.</p>
                    <div className="card-actions">
                        <button className="button" type="button" onClick={onCreateNew}>
                            Nový rozbor
                        </button>
                    </div>
                </section>
            ) : null}

            {!loading && !error && audits.length > 0 ? (
                <div className="dashboard-groups">
                    <AuditSection
                        audits={draftAudits}
                        emptyMessage="Začni nový rozbor a průběžně zaznamenané nálezy se objeví tady."
                        title="Rozpracované rozbory"
                        onDeleteAudit={onDeleteAudit}
                        onOpenAudit={onOpenAudit}
                    />

                    <AuditSection
                        audits={finishedAudits}
                        emptyMessage="Uzavřené rozbory zůstávají lokálně jako podklad pro finální doporučení."
                        title="Uzavřené rozbory"
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