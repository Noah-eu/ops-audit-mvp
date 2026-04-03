import { useState } from 'react'
import { INSPECTION_TYPE_OPTIONS } from '../data/checklistTemplates.js'
import { getTodayDate } from '../lib/auditUtils.js'

const INITIAL_FORM = {
    facilityName: '',
    location: '',
    date: getTodayDate(),
    inspectionTypeKey: INSPECTION_TYPE_OPTIONS[0].key,
    unitName: '',
}

export default function NewAuditForm({ creating, onCancel, onCreate }) {
    const [formValues, setFormValues] = useState(INITIAL_FORM)
    const [error, setError] = useState('')

    function updateField(fieldName, value) {
        setFormValues((currentValues) => ({
            ...currentValues,
            [fieldName]: value,
        }))
    }

    async function handleSubmit(event) {
        event.preventDefault()

        if (!formValues.facilityName.trim() || !formValues.location.trim() || !formValues.date) {
            setError('Vyplň název provozu, lokalitu a datum.')
            return
        }

        setError('')

        try {
            await onCreate(formValues)
        } catch (createError) {
            setError(createError.message || 'Nepodařilo se založit kontrolu.')
        }
    }

    return (
        <section className="screen">
            <header className="panel form-panel">
                <h1>Nová kontrola</h1>
                <p className="muted">Vytvoř prázdnou kontrolu podle typu a ihned pokračuj do checklistu.</p>
            </header>

            <form className="panel form-panel" onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="field">
                        <label htmlFor="facilityName">Název provozu</label>
                        <input
                            id="facilityName"
                            value={formValues.facilityName}
                            onChange={(event) => updateField('facilityName', event.target.value)}
                            placeholder="Např. Villa Letná"
                            type="text"
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="location">Lokalita / adresa</label>
                        <input
                            id="location"
                            value={formValues.location}
                            onChange={(event) => updateField('location', event.target.value)}
                            placeholder="Např. Praha 7, Milady Horákové 12"
                            type="text"
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="date">Datum</label>
                        <input
                            id="date"
                            value={formValues.date}
                            onChange={(event) => updateField('date', event.target.value)}
                            type="date"
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="inspectionType">Typ kontroly</label>
                        <select
                            id="inspectionType"
                                value={formValues.inspectionTypeKey}
                                onChange={(event) => updateField('inspectionTypeKey', event.target.value)}
                        >
                            {INSPECTION_TYPE_OPTIONS.map((type) => (
                                <option key={type.key} value={type.key}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field field--full">
                        <label htmlFor="unitName">Název konkrétní jednotky</label>
                        <input
                            id="unitName"
                            value={formValues.unitName}
                            onChange={(event) => updateField('unitName', event.target.value)}
                            placeholder="Volitelné, např. Apartmán 2A"
                            type="text"
                        />
                    </div>
                </div>

                {error ? <p className="error-text">{error}</p> : null}

                <div className="form-actions">
                    <button className="button" type="submit" disabled={creating}>
                        {creating ? 'Vytvářím kontrolu...' : 'Vytvořit kontrolu'}
                    </button>
                    <button className="ghost-button" type="button" onClick={onCancel}>
                        Zpět na přehled
                    </button>
                </div>
            </form>
        </section>
    )
}