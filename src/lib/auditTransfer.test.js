/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest'
import { CHECKLIST_TEMPLATES } from '../data/checklistTemplates.js'
import { buildAuditFromTemplate } from './auditUtils.js'
import { buildAuditTransferBundle, parseAuditTransferJson } from './auditTransfer.js'

describe('auditTransfer', () => {
    it('serializes and deserializes an audit including photos', async () => {
        const audit = buildAuditFromTemplate(
            {
                facilityName: 'Villa Letna',
                location: 'Praha 7',
                date: '2026-04-03',
                inspectionTypeKey: 'apartment_room',
                unitName: '2A',
            },
            CHECKLIST_TEMPLATES[0],
        )

        audit.notes.executiveSummary = 'Krátké shrnutí pro vedení.'
        audit.items[0] = {
            ...audit.items[0],
            status: 'critical',
            recommendationType: 'quick_win',
            issueType: 'cleaning',
            impacts: ['money_risk'],
            quickTags: ['urgent_fix'],
            photos: [
                {
                    id: 'photo-1',
                    name: 'vada.jpg',
                    createdAt: '2026-04-03T12:00:00.000Z',
                    blob: new Blob(['photo-content'], { type: 'image/jpeg' }),
                },
            ],
        }

        const bundle = await buildAuditTransferBundle([audit], 'single')
        const jsonText = JSON.stringify(bundle)
        const importedAudits = await parseAuditTransferJson(jsonText)

        expect(bundle.audits).toHaveLength(1)
        expect(bundle.audits[0].items[0].photos[0].dataUrl).toContain('data:image/jpeg;base64,')
        expect(importedAudits).toHaveLength(1)
        expect(importedAudits[0].facilityName).toBe('Villa Letna')
        expect(importedAudits[0].notes.executiveSummary).toBe('Krátké shrnutí pro vedení.')
        expect(importedAudits[0].items[0].recommendationType).toBe('quick_win')
        expect(importedAudits[0].items[0].photos).toHaveLength(1)
        expect(importedAudits[0].items[0].photos[0].blob).toBeInstanceOf(Blob)
    })

    it('imports a raw legacy audit object as a usable new audit', async () => {
        const importedAudits = await parseAuditTransferJson(
            JSON.stringify({
                facilityName: 'Legacy audit',
                location: 'Brno',
                inspectionType: 'Firma / proces',
                notes: {
                    recommendedSteps: 'Doplnit procesní standard.',
                },
                items: [
                    {
                        id: 'legacy-item',
                        sectionId: 'legacy',
                        sectionTitle: 'Legacy',
                        title: 'Starý bod',
                        status: 'weak',
                    },
                ],
            }),
        )

        expect(importedAudits).toHaveLength(1)
        expect(importedAudits[0].inspectionTypeKey).toBe('company_process')
        expect(importedAudits[0].items[0].id).not.toBe('legacy-item')
        expect(importedAudits[0].notes.addressNow).toBe('Doplnit procesní standard.')
    })
})