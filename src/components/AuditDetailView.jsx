import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db.js'
import {
    DETAIL_FILTERS,
    IMPACT_OPTIONS,
    ISSUE_TYPE_OPTIONS,
    ITEM_STATUSES,
    PRIORITY_OPTIONS,
    QUICK_TAG_OPTIONS,
    RECOMMENDATION_OPTIONS,
    formatDateTime,
    formatDisplayDate,
    getAuditInspectionTypeLabel,
    getAuditSummary,
    getImpactLabel,
    getIssueTypeLabel,
    getPriorityLabel,
    getQuickTagLabel,
    getRecommendationLabel,
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

function ToggleChipGroup({ options, selectedValue, onSelect, allowClear = true }) {
    return (
        <div className="chip-group">
            {options.map((option) => {
                const isActive = selectedValue === option.value

                return (
                    <button
                        key={option.value}
                        className={`tag-button ${isActive ? 'active' : ''}`}
                        type="button"
                        onClick={() => onSelect(isActive && allowClear ? '' : option.value)}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

function MultiToggleChipGroup({ options, selectedValues, onToggle }) {
    return (
        <div className="chip-group">
            {options.map((option) => {
                const isActive = selectedValues.includes(option.value)

                return (
                    <button
                        key={option.value}
                        className={`tag-button ${isActive ? 'active' : ''}`}
                        type="button"
                        onClick={() => onToggle(option.value)}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
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
            <span className="photo-count">{photo.name || 'Fotka k nálezu'}</span>
            <button className="ghost-button" type="button" onClick={() => onRemove(photo.id)}>
                Odebrat
            </button>
        </article>
    )
}

function FindingList({ items, emptyText }) {
    if (items.length === 0) {
        return <p className="muted">{emptyText}</p>
    }

    return (
        <ul className="summary-list">
            {items.map((item) => (
                <li key={item.id}>
                    <strong>{item.sectionTitle}</strong>
                    <div>{item.title}</div>
                    <div className="summary-list-meta">
                        <StatusPill tone={item.status}>{getStatusLabel(item.status)}</StatusPill>
                        <StatusPill tone={item.priority}>{getPriorityLabel(item.priority)}</StatusPill>
                        {item.issueType ? <span className="count-pill">{getIssueTypeLabel(item.issueType)}</span> : null}
                        {item.recommendationType ? (
                            <span className="count-pill">{getRecommendationLabel(item.recommendationType)}</span>
                        ) : null}
                        {item.impacts.map((impact) => (
                            <span key={impact} className="count-pill">
                                {getImpactLabel(impact)}
                            </span>
                        ))}
                    </div>
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

function ChecklistItem({ item, onChange, onPhotoAdd, onPhotoRemove, onToggleCollapsed }) {
    async function handlePhotoSelection(event) {
        const selectedFiles = Array.from(event.target.files ?? [])

        if (selectedFiles.length > 0) {
            await onPhotoAdd(item.id, selectedFiles)
            event.target.value = ''
        }
    }

    function toggleListValue(fieldName, value) {
        const nextValues = item[fieldName].includes(value)
            ? item[fieldName].filter((entry) => entry !== value)
            : [...item[fieldName], value]

        onChange(item.id, fieldName, nextValues)
    }

    return (
        <article className="item-card">
            <div className="item-header">
                <div className="item-title-row">
                    <h4 className="item-title">{item.title}</h4>
                    <div className="pill-row">
                        <StatusPill tone={item.status}>{getStatusLabel(item.status)}</StatusPill>
                        <StatusPill tone={item.priority}>{getPriorityLabel(item.priority)}</StatusPill>
                        {item.issueType ? <span className="count-pill">{getIssueTypeLabel(item.issueType)}</span> : null}
                        {item.recommendationType ? (
                            <span className="count-pill">{getRecommendationLabel(item.recommendationType)}</span>
                        ) : null}
                        <span className="photo-count">Fotky: {item.photos.length}</span>
                    </div>
                </div>
                <button className="toggle-link" type="button" onClick={() => onToggleCollapsed(item.id)}>
                    {item.collapsed ? 'Rozbalit' : 'Sbalit'}
                </button>
            </div>

            {!item.collapsed ? (
                <>
                    <div className="field-group">
                        <div className="field field--full">
                            <label>Stav nálezu</label>
                            <ToggleChipGroup
                                allowClear={false}
                                options={ITEM_STATUSES}
                                selectedValue={item.status}
                                onSelect={(value) => onChange(item.id, 'status', value)}
                            />
                        </div>

                        <div className="field field--full">
                            <label>Priorita pro report</label>
                            <ToggleChipGroup
                                allowClear={false}
                                options={PRIORITY_OPTIONS}
                                selectedValue={item.priority}
                                onSelect={(value) => onChange(item.id, 'priority', value)}
                            />
                        </div>
                    </div>

                    <div className="field field--full">
                        <label>Typ problému</label>
                        <ToggleChipGroup
                            options={ISSUE_TYPE_OPTIONS}
                            selectedValue={item.issueType}
                            onSelect={(value) => onChange(item.id, 'issueType', value)}
                        />
                    </div>

                    <div className="field field--full">
                        <label>Dopad</label>
                        <MultiToggleChipGroup
                            options={IMPACT_OPTIONS}
                            selectedValues={item.impacts}
                            onToggle={(value) => toggleListValue('impacts', value)}
                        />
                    </div>

                    <div className="field field--full">
                        <label>Charakter doporučení</label>
                        <ToggleChipGroup
                            options={RECOMMENDATION_OPTIONS}
                            selectedValue={item.recommendationType}
                            onSelect={(value) => onChange(item.id, 'recommendationType', value)}
                        />
                    </div>

                    <div className="field field--full">
                        <label>Quick tags</label>
                        <MultiToggleChipGroup
                            options={QUICK_TAG_OPTIONS}
                            selectedValues={item.quickTags}
                            onToggle={(value) => toggleListValue('quickTags', value)}
                        />
                    </div>

                    <div className="field">
                        <label htmlFor={`note-${item.id}`}>Krátká poznámka</label>
                        <input
                            id={`note-${item.id}`}
                            type="text"
                            value={item.note}
                            onChange={(event) => onChange(item.id, 'note', event.target.value)}
                            placeholder="Jedna stručná věta k nálezu"
                        />
                    </div>

                    <div className="field">
                        <label htmlFor={`evidence-${item.id}`}>Důkaz / příklad</label>
                        <textarea
                            id={`evidence-${item.id}`}
                            value={item.evidence}
                            onChange={(event) => onChange(item.id, 'evidence', event.target.value)}
                            placeholder="Konkrétní situace, detail vady, číslo pokoje, citace komunikace..."
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

                    {item.quickTags.length > 0 ? (
                        <div className="pill-row">
                            {item.quickTags.map((tag) => (
                                <span key={tag} className="count-pill">
                                    {getQuickTagLabel(tag)}
                                </span>
                            ))}
                        </div>
                    ) : null}

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
                <p className="tab-note">Nález je sbalený. Klasifikace i fotky zůstávají uložené.</p>
            )}
        </article>
    )
}

export default function AuditDetailView({ auditId, onBack, onDelete, onSaved }) {
    const [audit, setAudit] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState('findings')
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
                    throw new Error('Rozbor nebyl nalezen.')
                }

                if (!cancelled) {
                    skipAutosaveRef.current = true
                    setAudit(normalizedAudit)
                    setLastSavedAt(normalizedAudit.updatedAt)
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError.message || 'Rozbor se nepodařilo načíst.')
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
        const confirmed = window.confirm('Smazat tento rozbor? Tato akce nejde vrátit.')

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
                <h2>Načítám rozbor</h2>
                <p>Připravuji nálezy, fotky a poznámky z lokální databáze.</p>
            </section>
        )
    }

    if (error && !audit) {
        return (
            <section className="empty-state error-state">
                <h2>Rozbor se nepodařilo otevřít</h2>
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
                                {audit.status === 'done' ? 'Uzavřený rozbor' : 'Rozpracovaný rozbor'}
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
                            Smazat rozbor
                        </button>
                    </div>
                </div>

                <div className="meta-grid meta-panel summary-metrics-grid">
                    <div>
                        <strong>Kritické body</strong>
                        <p>{summary.criticalCount}</p>
                    </div>
                    <div>
                        <strong>Slabé body</strong>
                        <p>{summary.weakCount}</p>
                    </div>
                    <div>
                        <strong>Quick wins</strong>
                        <p>{summary.quickWinCount}</p>
                    </div>
                    <div>
                        <strong>Systémové problémy</strong>
                        <p>{summary.systemicCount}</p>
                    </div>
                </div>

                {error ? <p className="error-text">{error}</p> : null}
            </header>

            <div className="tab-list">
                <button
                    className={`tab-button ${activeTab === 'findings' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('findings')}
                >
                    Nálezy
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
                    Shrnutí pro vedení
                </button>
            </div>

            {activeTab === 'findings' ? (
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
                            <h2>Žádné nálezy pro zvolený filtr</h2>
                            <p>Zkus přepnout filtr zpět na kompletní seznam bodů.</p>
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
                            placeholder="Vlož nebo napiš příjezdové instrukce."
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="houseManual">House manuál</label>
                        <textarea
                            id="houseManual"
                            value={getInstructionNoteContent(audit.notes, 'houseManual')}
                            onChange={(event) => updateNotes('houseManual', event.target.value)}
                            placeholder="Poznámky k manuálu a informacím pro hosta."
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
                            placeholder="Volné poznámky k provozu nebo kontextu."
                        />
                    </div>

                    <div className="form-actions">
                        <button className="button" type="button" onClick={() => setInstructionCheckRequested(true)}>
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
                    <div className="summary-grid summary-grid--metrics">
                        <article className="summary-card">
                            <h3>Počet kritických bodů</h3>
                            <span className="summary-number">{summary.criticalCount}</span>
                            <p>Body, které by měly být ve vedení zmíněné jako nejvážnější.</p>
                        </article>

                        <article className="summary-card">
                            <h3>Počet slabých bodů</h3>
                            <span className="summary-number">{summary.weakCount}</span>
                            <p>Body, které zhoršují výsledek rozboru, ale nejsou kritické.</p>
                        </article>

                        <article className="summary-card">
                            <h3>Počet quick wins</h3>
                            <span className="summary-number">{summary.quickWinCount}</span>
                            <p>Rychlá zlepšení s okamžitým dopadem na výsledek provozu.</p>
                        </article>

                        <article className="summary-card">
                            <h3>Počet systémových problémů</h3>
                            <span className="summary-number">{summary.systemicCount}</span>
                            <p>Slabiny, které ukazují na potřebu změnit proces nebo standard.</p>
                        </article>

                        <article className="summary-card">
                            <h3>Počet bodů, které mohou stát peníze</h3>
                            <span className="summary-number">{summary.moneyRiskCount}</span>
                            <p>Body se zjevným finančním rizikem.</p>
                        </article>

                        <article className="summary-card">
                            <h3>Počet bodů s rizikem stížnosti / recenze</h3>
                            <span className="summary-number">{summary.complaintReviewRiskCount}</span>
                            <p>Body, které zvyšují pravděpodobnost negativní zpětné vazby od hosta.</p>
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Hlavní zjištění</h3>
                            <FindingList
                                emptyText="Zatím nejsou označená žádná hlavní zjištění."
                                items={summary.mainFindings}
                            />
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Největší rizika</h3>
                            <FindingList
                                emptyText="Aktuálně nejsou označená hlavní rizika pro vedení."
                                items={summary.biggestRiskItems}
                            />
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Nejrychlejší zlepšení</h3>
                            <FindingList
                                emptyText="Zatím není označený žádný quick win."
                                items={summary.fastestImprovements}
                            />
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Systémové slabiny</h3>
                            <FindingList
                                emptyText="Zatím není označený žádný systémový problém nebo procesní změna."
                                items={summary.systemicWeaknesses}
                            />
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Doporučené první kroky pro vedení</h3>
                            <FindingList
                                emptyText="Zatím není z čeho odvodit první kroky pro vedení."
                                items={summary.recommendedFirstSteps}
                            />
                        </article>

                        <article className="summary-card summary-card--full">
                            <h3>Manažerské poznámky</h3>
                            <div className="field">
                                <label htmlFor="executiveSummary">Executive summary</label>
                                <textarea
                                    id="executiveSummary"
                                    value={audit.notes.executiveSummary}
                                    onChange={(event) => updateNotes('executiveSummary', event.target.value)}
                                    placeholder="Krátké shrnutí hlavního sdělení pro vedení."
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="addressNow">Co řešit hned</label>
                                <textarea
                                    id="addressNow"
                                    value={audit.notes.addressNow}
                                    onChange={(event) => updateNotes('addressNow', event.target.value)}
                                    placeholder="Body, které mají být řešené okamžitě."
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="addressThisWeek">Co řešit tento týden</label>
                                <textarea
                                    id="addressThisWeek"
                                    value={audit.notes.addressThisWeek}
                                    onChange={(event) => updateNotes('addressThisWeek', event.target.value)}
                                    placeholder="Krátký seznam věcí na nejbližší týden."
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="structuralProblem">Co je strukturální problém</label>
                                <textarea
                                    id="structuralProblem"
                                    value={audit.notes.structuralProblem}
                                    onChange={(event) => updateNotes('structuralProblem', event.target.value)}
                                    placeholder="Poznámky k systémovým slabinám a opakujícím se příčinám."
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="finalReportNotes">Poznámky pro finální report</label>
                                <textarea
                                    id="finalReportNotes"
                                    value={audit.notes.finalReportNotes}
                                    onChange={(event) => updateNotes('finalReportNotes', event.target.value)}
                                    placeholder="Podklady pro e-mail, prezentaci nebo finální doporučení."
                                />
                            </div>

                            <div className="form-actions">
                                <button className="button" type="button" onClick={toggleCompletionStatus}>
                                    {audit.status === 'done'
                                        ? 'Vrátit mezi rozpracované rozbory'
                                        : 'Uzavřít rozbor'}
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