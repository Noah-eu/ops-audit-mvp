import { describe, expect, it } from 'vitest'
import {
    CHECKLIST_TEMPLATES,
    getInspectionTypeLabel,
    normalizeInspectionTypeKey,
} from '../data/checklistTemplates.js'
import {
    buildAuditFromTemplate,
    getAuditInspectionTypeLabel,
    getAuditSummary,
    groupItemsBySection,
    matchesFilter,
    normalizeAuditRecord,
} from './auditUtils.js'

describe('auditUtils', () => {
    it('creates a draft audit from template sections', () => {
        const audit = buildAuditFromTemplate(
            {
                facilityName: 'Testovací provoz',
                location: 'Praha',
                date: '2026-04-03',
                inspectionTypeKey: 'apartment_room',
                unitName: '2A',
            },
            CHECKLIST_TEMPLATES[0],
        )

        expect(audit.status).toBe('draft')
        expect(audit.inspectionTypeKey).toBe('apartment_room')
        expect(audit.inspectionType).toBe('Apartmán / pokoj')
        expect(audit.items.length).toBeGreaterThan(0)
        expect(audit.items[0].sectionTitle).toBeTruthy()
        expect(audit.items[0].photos).toEqual([])
    })

    it('computes critical items and quick wins', () => {
        const summary = getAuditSummary([
            { id: '1', sectionTitle: 'Čistota', title: 'Podlahy', status: 'critical', priority: 'high' },
            { id: '2', sectionTitle: 'Koupelna', title: 'Sprcha', status: 'weak', priority: 'medium' },
            { id: '3', sectionTitle: 'Postel', title: 'Textil', status: 'good', priority: 'low' },
        ])

        expect(summary.criticalCount).toBe(1)
        expect(summary.weakCount).toBe(1)
        expect(summary.quickWins).toHaveLength(2)
    })

    it('groups filtered items by section', () => {
        const groups = groupItemsBySection(
            [
                { id: '1', sectionId: 'a', sectionTitle: 'A', status: 'critical' },
                { id: '2', sectionId: 'a', sectionTitle: 'A', status: 'good' },
                { id: '3', sectionId: 'b', sectionTitle: 'B', status: 'weak' },
            ],
            'critical',
        )

        expect(groups).toHaveLength(1)
        expect(groups[0].items).toHaveLength(1)
        expect(matchesFilter({ status: 'weak' }, 'weak')).toBe(true)
    })

    it('maps legacy inspection labels to stable keys', () => {
        expect(normalizeInspectionTypeKey('Apartmán / pokoj')).toBe('apartment_room')
        expect(normalizeInspectionTypeKey('Firma / proces')).toBe('company_process')
        expect(normalizeInspectionTypeKey('Úklidový proces')).toBe('housekeeping_process')
        expect(getInspectionTypeLabel('apartment_room')).toBe('Apartmán / pokoj')
    })

    it('normalizes legacy audits for display and persistence', () => {
        const normalizedAudit = normalizeAuditRecord({
            id: 1,
            inspectionType: 'Firma / proces',
            status: 'draft',
        })

        expect(normalizedAudit.inspectionTypeKey).toBe('company_process')
        expect(getAuditInspectionTypeLabel(normalizedAudit)).toBe('Firma / proces')
    })
})