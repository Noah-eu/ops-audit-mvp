import { describe, expect, it } from 'vitest'
import { CHECKLIST_TEMPLATES } from '../data/checklistTemplates.js'
import { buildAuditFromTemplate } from './auditUtils.js'
import { buildAuditPdfSummaryModel } from './reportExport.js'

describe('reportExport', () => {
    it('builds summary data for the PDF report from an audit', () => {
        const audit = buildAuditFromTemplate(
            {
                facilityName: 'Hotel Aurora',
                location: 'Praha',
                date: '2026-04-03',
                inspectionTypeKey: 'apartment_room',
                unitName: '',
            },
            CHECKLIST_TEMPLATES[0],
        )

        audit.notes.executiveSummary = 'Klíčové slabiny jsou v příjezdu a standardu úklidu.'
        audit.notes.addressNow = 'Upravit check-in zprávu.'
        audit.notes.addressThisWeek = 'Sepsat nový standard úklidu.'
        audit.notes.structuralProblem = 'Chybí jednotný proces předání informací.'
        audit.notes.finalReportNotes = 'Doporučit vedení zavést jednotný checklist.'

        audit.items[0] = {
            ...audit.items[0],
            status: 'critical',
            note: 'Host vidí nečistoty hned při vstupu.',
            recommendationType: 'technical_fix',
            impacts: ['review_risk'],
            photos: [{ id: '1' }],
        }

        audit.items[1] = {
            ...audit.items[1],
            status: 'weak',
            recommendationType: 'quick_win',
            note: 'Zpráva je nejasná.',
        }

        audit.items[2] = {
            ...audit.items[2],
            status: 'good',
            recommendationType: 'process_change',
            note: 'Předání mezi týmy je nekonzistentní.',
            impacts: ['operational_chaos'],
        }

        const model = buildAuditPdfSummaryModel(audit)

        expect(model.facilityName).toBe('Hotel Aurora')
        expect(model.inspectionTypeLabel).toBe('Apartmán / pokoj')
        expect(model.executiveSummary).toContain('Klíčové slabiny')
        expect(model.biggestRisks).toHaveLength(2)
        expect(model.fastestImprovements).toHaveLength(1)
        expect(model.systemicWeaknesses).toHaveLength(1)
        expect(model.criticalFindings[0]).toContain('Fotky: 1')
    })
})