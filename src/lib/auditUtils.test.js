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
    getImpactLabel,
    getIssueTypeLabel,
    getQuickTagLabel,
    getRecommendationLabel,
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
        expect(audit.notes.checkinInstructions.context).toBe('arrival_instructions')
        expect(audit.notes.checkinInstructions.content).toBe('')
        expect(audit.notes.executiveSummary).toBe('')
        expect(audit.items.length).toBeGreaterThan(0)
        expect(audit.items[0].sectionTitle).toBeTruthy()
        expect(audit.items[0].photos).toEqual([])
        expect(audit.items[0].issueType).toBe('')
        expect(audit.items[0].impacts).toEqual([])
        expect(audit.items[0].recommendationType).toBe('')
        expect(audit.items[0].quickTags).toEqual([])
    })

    it('computes management summary blocks from finding classifications', () => {
        const summary = getAuditSummary([
            {
                id: '1',
                sectionTitle: 'Čistota',
                title: 'Podlahy',
                status: 'critical',
                priority: 'high',
                impacts: ['money_risk'],
                recommendationType: 'technical_fix',
                issueType: 'cleaning',
                quickTags: ['urgent_fix'],
                photos: [],
            },
            {
                id: '2',
                sectionTitle: 'Komunikace',
                title: 'Příjezdová zpráva',
                status: 'weak',
                priority: 'medium',
                impacts: ['review_risk'],
                recommendationType: 'quick_win',
                issueType: 'checkin',
                quickTags: ['unclear_instruction'],
                photos: [],
            },
            {
                id: '3',
                sectionTitle: 'Proces',
                title: 'Předání mezi rolemi',
                status: 'good',
                priority: 'medium',
                impacts: ['operational_chaos'],
                recommendationType: 'process_change',
                issueType: 'operations',
                quickTags: ['recurring_problem'],
                photos: [],
            },
        ])

        expect(summary.criticalCount).toBe(1)
        expect(summary.weakCount).toBe(1)
        expect(summary.quickWinCount).toBe(1)
        expect(summary.systemicCount).toBe(1)
        expect(summary.moneyRiskCount).toBe(1)
        expect(summary.complaintReviewRiskCount).toBe(1)
        expect(summary.fastestImprovements.map((item) => item.id)).toEqual(['2'])
        expect(summary.systemicWeaknesses.map((item) => item.id)).toEqual(['3'])
        expect(summary.biggestRiskItems.map((item) => item.id)).toEqual(['1', '2', '3'])
        expect(summary.recommendedFirstSteps.map((item) => item.id)).toEqual(['1', '2', '3'])
    })

    it('filters quick wins, systemic problems and photo findings', () => {
        expect(
            matchesFilter(
                { recommendationType: 'quick_win', impacts: [], quickTags: [], photos: [] },
                'quick_wins',
            ),
        ).toBe(true)
        expect(
            matchesFilter(
                { recommendationType: 'process_change', impacts: [], quickTags: [], photos: [] },
                'systemic',
            ),
        ).toBe(true)
        expect(
            matchesFilter(
                { recommendationType: '', impacts: [], quickTags: [], photos: [{ id: '1' }] },
                'with_photos',
            ),
        ).toBe(true)
        expect(matchesFilter({ status: 'weak', impacts: [], quickTags: [], photos: [] }, 'weak')).toBe(true)
    })

    it('maps legacy inspection labels to stable keys', () => {
        expect(normalizeInspectionTypeKey('Apartmán / pokoj')).toBe('apartment_room')
        expect(normalizeInspectionTypeKey('Firma / proces')).toBe('company_process')
        expect(normalizeInspectionTypeKey('Úklidový proces')).toBe('housekeeping_process')
        expect(getInspectionTypeLabel('apartment_room')).toBe('Apartmán / pokoj')
        expect(getIssueTypeLabel('operations')).toBe('Organizace provozu')
        expect(getImpactLabel('money_risk')).toBe('Může stát peníze')
        expect(getRecommendationLabel('quick_win')).toBe('Quick win')
        expect(getQuickTagLabel('missing_info')).toBe('Chybí info')
    })

    it('normalizes legacy audits for display and persistence', () => {
        const normalizedAudit = normalizeAuditRecord({
            id: 1,
            inspectionType: 'Firma / proces',
            status: 'draft',
            notes: {
                checkinInstructions: 'Příjezd po 15:00',
                recommendedSteps: 'Řešit vstupní komunikaci.',
            },
            items: [
                {
                    id: 'legacy-item',
                    sectionId: 'a',
                    sectionTitle: 'A',
                    title: 'Starý bod',
                    status: 'critical',
                },
            ],
        })

        expect(normalizedAudit.inspectionTypeKey).toBe('company_process')
        expect(getAuditInspectionTypeLabel(normalizedAudit)).toBe('Firma / proces')
        expect(normalizedAudit.notes.checkinInstructions.context).toBe('arrival_instructions')
        expect(normalizedAudit.notes.addressNow).toBe('Řešit vstupní komunikaci.')
        expect(normalizedAudit.items[0].issueType).toBe('')
        expect(normalizedAudit.items[0].impacts).toEqual([])
        expect(normalizedAudit.items[0].recommendationType).toBe('')
        expect(normalizedAudit.items[0].quickTags).toEqual([])
    })
})