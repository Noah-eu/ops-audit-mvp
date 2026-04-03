import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db.js'
import {
    DETAIL_FILTERS,
    ITEM_STATUSES,
    PRIORITY_OPTIONS,
    formatDateTime,
    formatDisplayDate,
    getAuditInspectionTypeLabel,
    getAuditSummary,
    getPriorityLabel,
    getStatusLabel,
    groupItemsBySection,
    normalizeAuditRecord,
} from '../lib/auditUtils.js'
import {
    getInstructionNoteContent,
    isInstructionNoteField,
    normalizeInstructionNoteValue,
    runInstructionChecksForAudit,
} from '../lib/instructionChecks.js'

function StatusPill({ tone, children }) {
    return <span className={`status-pill status-pill--${tone}`}>{children}</span>
}

function PhotoPreview({ photo, onRemove }) {
    const previewUrl = useMemo(() => URL.createObjectURL(photo.blob), [photo.blob])

    useEffect(() => {
        return () => {
            URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    return (
        <article className="photo-card">
            <img alt={photo.name || 'Přiložená fotka'} src={previewUrl} />
            <span className="photo-count">{photo.name || 'Fotka z kontroly'}</span>
            <button className="ghost-button" type="button" onClick={() => onRemove(photo.id)}>
                Odebrat
            </button>
        </article>
    )
}

function ChecklistItem({ item, onChange, onPhotoAdd, onPhotoRemove, onToggleCollapsed }) {
    async function handlePhotoSelection(event) {
        const selectedFiles = Array.from(event.target.files ?? [])

        if (selectedFiles.length > 0) {
            await onPhotoAdd(item.id, selectedFiles)
            event.target.value = ''
        }
    }

    return (
        <article className="item-card">
            <div className="item-header">
                <div className="item-title-row">
                    <h4 className="item-title">{item.title}</h4>
                    <div className="pill-row">
                        <StatusPill tone={item.status}>{getStatusLabel(item.status)}</StatusPill>
                        <StatusPill tone={item.priority}>{getPriorityLabel(item.priority)}</StatusPill>
                        <span className="photo-count">Fotky: {item.photos.length}</span>
                    </div>
                </div>
                <button className="toggle-link" type="button" onClick={() => onToggleCollapsed(item.id)}>
                    {item.collapsed ? 'Rozbalit' : 'Sbalit'}
                </button>
            </div>

            {!item.collapsed ? (
                <>
                    <div className="item-controls compact">
                        <div className="field">
                            <label htmlFor={`status-${item.id}`}>Stav</label>
                            <select
                                id={`status-${item.id}`}
                                value={item.status}
                                onChange={(event) => onChange(item.id, 'status', event.target.value)}
                            >
                                {ITEM_STATUSES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor={`priority-${item.id}`}>Priorita</label>
                            <select
                                id={`priority-${item.id}`}
                                value={item.priority}
                                onChange={(event) => onChange(item.id, 'priority', event.target.value)}
                            >
                                {PRIORITY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="field">
                        <label htmlFor={`note-${item.id}`}>Poznámka</label>
                        <textarea
                            id={`note-${item.id}`}
                            value={item.note}
                            onChange={(event) => onChange(item.id, 'note', event.target.value)}
                            placeholder="Co je dobře nebo co je problém?"
                        />
                    </div>

                    <div className="field">
                        <label htmlFor={`evidence-${item.id}`}>Důkaz / příklad</label>
                        <textarea
                            id={`evidence-${item.id}`}
                            value={item.evidence}
                            onChange={(event) => onChange(item.id, 'evidence', event.target.value)}
                            placeholder="Krátký příklad, konkrétní situace, číslo pokoje, detail vady..."
                        />
                    </div>

                    <div className="field">
                        <label htmlFor={`photos-${item.id}`}>Přidat fotky</label>
                        <input
                            accept="image/*"
                            capture="environment"
                            id={`photos-${item.id}`}
                            multiple
                            onChange={handlePhotoSelection}
                            type="file"
                        />
                        <p className="helper-text">Fotky zůstávají uložené lokálně i po reloadu stránky.</p>
                    </div>

                    {item.photos.length > 0 ? (
                        <div className="photo-grid">
                            {item.photos.map((photo) => (
                                <PhotoPreview
                                    key={photo.id}
                                    photo={photo}
                                    onRemove={(photoId) => onPhotoRemove(item.id, photoId)}
                                />
                            ))}
                        </div>
                    ) : null}
                </>
            ) : (
                <p className="tab-note">Bod je sbalený. Stav a priorita zůstávají uložené.</p>
            )}
        </article>
    )
}

function SummaryList({ items, emptyText }) {
    if (items.length === 0) {
        return <p className="muted">{emptyText}</p>
    }

    return (
        <ul className="summary-list">
            {items.map((item) => (
                <li key={item.id}>
                    <strong>{item.sectionTitle}</strong>
                    <div>{item.title}</div>
                </li>
            ))}
        </ul>
    )
}

function InstructionMessageList({ items, emptyText }) {
    if (items.length === 0) {
        return <p className="muted">{emptyText}</p>
    }

    return (
        <ul className="instruction-check-list">
            {items.map((item) => (
                <li key={item.code ?? item.phrase ?? item.message}>{item.message}</li>
            ))}
        </ul>
    )
}

function InstructionFactsList({ facts }) {
    if (facts.length === 0) {
        return <p className="muted">V textu zatím nebyly rozpoznané konkrétní údaje.</p>
    }

    return (
        <ul className="instruction-check-list">
            {facts.map((fact) => (
                <li key={fact.type}>
                    <strong>{fact.label}:</strong> {fact.values.join(', ')}
                </li>
            ))}
        </ul>
    )
}

export default function AuditDetailView({ auditId, onBack, onDelete, onSaved }) {
    const [audit, setAudit] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState('checklist')
    const [filterValue, setFilterValue] = useState('all')
    const [saveState, setSaveState] = useState('idle')
    const [lastSavedAt, setLastSavedAt] = useState('')
    const [instructionCheckRequested, setInstructionCheckRequested] = useState(false)
    const initialLoadRef = useRef(true)
    const skipAutosaveRef = useRef(false)

    useEffect(() => {
        let cancelled = false
        initialLoadRef.current = true

        async function loadAudit() {
            try {
                setLoading(true)
                setError('')
                const storedAudit = await db.audits.get(auditId)
                const normalizedAudit = normalizeAuditRecord(storedAudit)

                if (!normalizedAudit) {
                    throw new Error('Kontrola nebyla nalezena.')
                }

                if (!cancelled) {
                    skipAutosaveRef.current = true
                    setAudit(normalizedAudit)
                    setLastSavedAt(normalizedAudit.updatedAt)
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError.message || 'Kontrolu se nepodařilo načíst.')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        loadAudit()

        return () => {
            cancelled = true
        }
    }, [auditId])

    useEffect(() => {
        if (!audit) {
            return undefined
        }

        if (initialLoadRef.current) {
            initialLoadRef.current = false
            return undefined
        }

        if (skipAutosaveRef.current) {
            skipAutosaveRef.current = false
            return undefined
        }

        setSaveState('saving')

        const timeoutId = window.setTimeout(async () => {
            try {
                const savedAudit = {
                    ...audit,
                    updatedAt: new Date().toISOString(),
                }

                await db.audits.put(savedAudit)
                skipAutosaveRef.current = true
                setAudit(savedAudit)
                setLastSavedAt(savedAudit.updatedAt)
                setSaveState('saved')
                onSaved(savedAudit)
            } catch {
                setSaveState('error')
                setError('Průběžné uložení selhalo.')
            }
        }, 450)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [audit, onSaved])

    const summary = useMemo(() => getAuditSummary(audit?.items ?? []), [audit?.items])
    const groupedSections = useMemo(
        () => groupItemsBySection(audit?.items ?? [], filterValue),
        [audit?.items, filterValue],
    )
    const instructionCheckResults = useMemo(
        () => runInstructionChecksForAudit(audit?.notes),
        [audit?.notes],
    )

    function updateAudit(mutator) {
        setAudit((currentAudit) => {
            if (!currentAudit) {
                return currentAudit
            }

            return mutator(currentAudit)
        })
    }

    function updateItem(itemId, fieldName, value) {
        updateAudit((currentAudit) => ({
            ...currentAudit,
            items: currentAudit.items.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        [fieldName]: value,
                    }
                    : item,
            ),
        }))
    }

    function toggleItemCollapsed(itemId) {
        updateAudit((currentAudit) => ({
            ...currentAudit,
            items: currentAudit.items.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        collapsed: !item.collapsed,
                    }
                    : item,
            ),
        }))
    }

    async function addPhotos(itemId, files) {
        const photoEntries = files.map((file) => ({
            id: crypto.randomUUID(),
            name: file.name,
            blob: file,
            createdAt: new Date().toISOString(),
        }))

        updateAudit((currentAudit) => ({
            ...currentAudit,
            items: currentAudit.items.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        photos: [...item.photos, ...photoEntries],
                    }
                    : item,
            ),
        }))
    }

    function removePhoto(itemId, photoId) {
        updateAudit((currentAudit) => ({
            ...currentAudit,
            items: currentAudit.items.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        photos: item.photos.filter((photo) => photo.id !== photoId),
                    }
                    : item,
            ),
        }))
    }

    function updateNotes(fieldName, value) {
        updateAudit((currentAudit) => ({
            ...currentAudit,
            notes: {
                ...currentAudit.notes,
                [fieldName]: isInstructionNoteField(fieldName)
                    ? normalizeInstructionNoteValue(value, currentAudit.notes[fieldName]?.context)
                    : value,
            },
        }))
    }

    async function persistAudit(nextAudit, errorMessage) {
        try {
            setSaveState('saving')
            const savedAudit = {
                ...nextAudit,
                updatedAt: new Date().toISOString(),
            }

            await db.audits.put(savedAudit)
            skipAutosaveRef.current = true
            setAudit(savedAudit)
            setLastSavedAt(savedAudit.updatedAt)
            setSaveState('saved')
            onSaved(savedAudit)
            return true
        } catch {
            setSaveState('error')
            setError(errorMessage)
            return false
        }
    }

    async function saveImmediately() {
        if (!audit) {
            return true
        }

        return persistAudit(audit, 'Ruční uložení selhalo.')
    }

    async function handleBack() {
        const saved = await saveImmediately()

        if (saved) {
            onBack()
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm('Smazat tuto kontrolu? Tato akce nejde vrátit.')

        if (confirmed) {
            await onDelete(auditId)
        }
    }

    async function toggleCompletionStatus() {
        const nextAudit = {
            ...audit,
            status: audit.status === 'done' ? 'draft' : 'done',
        }

        setAudit(nextAudit)
        await persistAudit(nextAudit, 'Změnu stavu se nepodařilo uložit.')
    }

    if (loading) {
        return (
            <section className="empty-state loading-state">
                <h2>Načítám kontrolu</h2>
                <p>Připravuji checklist, fotky a poznámky z lokální databáze.</p>
            </section>
        )
    }

    if (error && !audit) {
        return (
            <section className="empty-state error-state">
                <h2>Kontrolu se nepodařilo otevřít</h2>
                <p className="error-text">{error}</p>
                <button className="ghost-button" type="button" onClick={onBack}>
                    Zpět na přehled
                </button>
            </section>
        )
    }

    if (!audit) {
        return null
    }

    return (
        <section className="screen">
            <header className="panel">
                <div className="detail-header">
                    <div className="detail-title-block">
                        <button className="ghost-button" type="button" onClick={handleBack}>
                            Zpět na přehled
                        </button>
                        <div>
                            <h1>{audit.facilityName}</h1>
                            <p className="muted">{audit.location}</p>
                        </div>
                        <div className="pill-row">
                            <span className="count-pill">{formatDisplayDate(audit.date)}</span>
                            <span className="count-pill">{getAuditInspectionTypeLabel(audit)}</span>
                            {audit.unitName ? <span className="count-pill">{audit.unitName}</span> : null}
                            <StatusPill tone={audit.status === 'done' ? 'done' : 'draft'}>
                                {audit.status === 'done' ? 'Hotovo' : 'Rozpracováno'}
                            </StatusPill>
                        </div>
                    </div>
                    <div className="detail-actions">
                        <span className="save-indicator">
                            {saveState === 'saving'
                                ? 'Ukládám...'
                                : saveState === 'error'
                                    ? 'Chyba při ukládání'
                                    : `Uloženo ${formatDateTime(lastSavedAt)}`}
                        </span>
                        <button className="ghost-button" type="button" onClick={saveImmediately}>
                            Uložit teď
                        </button>
                        <button className="danger-button" type="button" onClick={handleDelete}>
                            Smazat kontrolu
                        </button>
                    </div>
                </div>

                <div className="meta-grid meta-panel">
                    <div>
                        <strong>Kritické body</strong>
                        <p>{summary.criticalCount}</p>
                    </div>
                    <div>
                        <strong>Slabé body</strong>
                        <p>{summary.weakCount}</p>
                    </div>
                </div>

                {error ? <p className="error-text">{error}</p> : null}
            </header>

            <div className="tab-list">
                <button
                    className={`tab-button ${activeTab === 'checklist' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('checklist')}
                >
                    Checklist
                </button>
                <button
                    className={`tab-button ${activeTab === 'instructions' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('instructions')}
                >
                    Instrukce / texty
                </button>
                <button
                    className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('summary')}
                >
                    Shrnutí
                </button>
            </div>

            {activeTab === 'checklist' ? (
                <section className="screen">
                    <div className="filter-row">
                        {DETAIL_FILTERS.map((filterOption) => (
                            <button
                                key={filterOption.value}
                                className={`filter-chip ${filterValue === filterOption.value ? 'active' : ''}`}
                                type="button"
                                onClick={() => setFilterValue(filterOption.value)}
                            >
                                {filterOption.label}
                            </button>
                        ))}
                    </div>

                    {groupedSections.length === 0 ? (
                        <section className="empty-state">
                            <h2>Žádné body pro zvolený filtr</h2>
                            <p>Zkus přepnout filtr zpět na kompletní checklist.</p>
                        </section>
                    ) : (
                        groupedSections.map((section) => (
                            <section key={section.id} className="section-card section-items">
                                <div className="panel-header">
                                    <div>
                                        <h3>{section.title}</h3>
                                        <p className="section-subtitle">{section.items.length} bodů v aktuálním filtru</p>
                                    </div>
                                </div>

                                {section.items.map((item) => (
                                    <ChecklistItem
                                        key={item.id}
                                        item={item}
                                        onChange={updateItem}
                                        onPhotoAdd={addPhotos}
                                        onPhotoRemove={removePhoto}
                                        onToggleCollapsed={toggleItemCollapsed}
                                    />
                                ))}
                            </section>
                        ))
                    )}
                </section>
            ) : null}

            {activeTab === 'instructions' ? (
                <section className="panel instructions-grid">
                    <div className="field">
                        <label htmlFor="checkinInstructions">Check-in instrukce</label>
                        <textarea
                            id="checkinInstructions"
                            value={getInstructionNoteContent(audit.notes, 'checkinInstructions')}
                            onChange={(event) => updateNotes('checkinInstructions', event.target.value)}
                            placeholder="Vlož nebo napiš check-in instrukce."
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="houseManual">House manuál</label>
                        <textarea
                            id="houseManual"
                            value={getInstructionNoteContent(audit.notes, 'houseManual')}
                            onChange={(event) => updateNotes('houseManual', event.target.value)}
                            placeholder="Poznámky k house manuálu a informacím pro hosta."
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="internalCleaningInstructions">Interní instrukce úklidu</label>
                        <textarea
                            id="internalCleaningInstructions"
                            value={getInstructionNoteContent(audit.notes, 'internalCleaningInstructions')}
                            onChange={(event) => updateNotes('internalCleaningInstructions', event.target.value)}
                            placeholder="Co má úklid vědět nebo dodržet navíc."
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="extraNotes">Další poznámky</label>
                        <textarea
                            id="extraNotes"
                            value={getInstructionNoteContent(audit.notes, 'extraNotes')}
                            onChange={(event) => updateNotes('extraNotes', event.target.value)}
                            placeholder="Volné poznámky ke kontrole."
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            className="button"
                            type="button"
                            onClick={() => setInstructionCheckRequested(true)}
                        >
                            Zkontrolovat instrukce
                        </button>
                    </div>

                    {instructionCheckRequested ? (
                        <div className="instruction-results-grid">
                            {instructionCheckResults.map(({ field, label, result }) => (
                                <article key={field} className="panel instruction-check-card">
                                    <div className="instruction-check-heading">
                                        <h4>{label}</h4>
                                        <div className="pill-row">
                                            <span className="instruction-severity instruction-severity--critical">
                                                Kritické: {result.summaryCounts.critical}
                                            </span>
                                            <span className="instruction-severity instruction-severity--recommended">
                                                Doplnit: {result.summaryCounts.recommended}
                                            </span>
                                            <span className="instruction-severity instruction-severity--check">
                                                Zkontrolovat: {result.summaryCounts.check}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="instruction-check-section">
                                        <strong>Chybí</strong>
                                        <InstructionMessageList
                                            items={result.missingItems}
                                            emptyText="Žádný kritický nedostatek nebyl nalezen."
                                        />
                                    </div>

                                    <div className="instruction-check-section">
                                        <strong>Doporučeno doplnit</strong>
                                        <InstructionMessageList
                                            items={result.recommendedItems}
                                            emptyText="Žádné doplnění není aktuálně doporučené."
                                        />
                                    </div>

                                    <div className="instruction-check-section">
                                        <strong>Nejasné formulace</strong>
                                        <InstructionMessageList
                                            items={result.unclearPhrases}
                                            emptyText="Text nepůsobí nejasně podle základních pravidel."
                                        />
                                    </div>

                                    <div className="instruction-check-section">
                                        <strong>Nalezené údaje</strong>
                                        <InstructionFactsList facts={result.detectedFacts} />
                                    </div>

                                    <div className="instruction-check-section">
                                        <strong>Možné rozpory</strong>
                                        <InstructionMessageList
                                            items={result.possibleConflicts}
                                            emptyText="Nebyl nalezen zjevný konflikt v časech nebo instrukcích."
                                        />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : null}
                </section>
            ) : null}

            {activeTab === 'summary' ? (
                <section className="screen">
                    <div className="summary-grid">
                        <article className="summary-card">
                            <h3>Počet kritických bodů</h3>
                            <span className="summary-number">{summary.criticalCount}</span>
                            <p>Kritické body vyžadují okamžitý zásah nebo rychlé rozhodnutí.</p>
                        </article>

                        <article className="summary-card">
                            <h3>Počet slabých bodů</h3>
                            <span className="summary-number">{summary.weakCount}</span>
                            <p>Slabé body nejsou havárie, ale táhnou dolů kvalitu provozu.</p>
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Seznam kritických bodů</h3>
                            <SummaryList
                                emptyText="Žádný kritický bod zatím není označený."
                                items={summary.criticalItems}
                            />
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Quick wins</h3>
                            <SummaryList
                                emptyText="Žádné quick wins podle aktuálních priorit."
                                items={summary.quickWins}
                            />
                        </article>

                        <article className="summary-card summary-card--full">
                            <div className="field">
                                <label htmlFor="recommendedSteps">Doporučené první kroky</label>
                                <textarea
                                    id="recommendedSteps"
                                    value={audit.notes.recommendedSteps}
                                    onChange={(event) => updateNotes('recommendedSteps', event.target.value)}
                                    placeholder="Sepiš 2-5 prvních kroků, které dávají největší smysl řešit hned."
                                />
                            </div>
                            <div className="form-actions">
                                <button className="button" type="button" onClick={toggleCompletionStatus}>
                                    {audit.status === 'done'
                                        ? 'Vrátit mezi rozpracované'
                                        : 'Označit kontrolu jako hotovou'}
                                </button>
                                <button className="ghost-button" type="button" onClick={saveImmediately}>
                                    Uložit shrnutí
                                </button>
                            </div>
                        </article>
                    </div>
                </section>
            ) : null}
        </section>
    )
}