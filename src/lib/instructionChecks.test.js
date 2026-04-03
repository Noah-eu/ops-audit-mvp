import { describe, expect, it } from 'vitest'
import {
    createDefaultAuditNotes,
    normalizeAuditNotes,
    runInstructionChecks,
} from './instructionChecks.js'

describe('instructionChecks', () => {
    it('flags missing arrival check-in info and contact', () => {
        const result = runInstructionChecks('Klíč je v boxu vedle dveří.', 'arrival_instructions')

        expect(result.missingItems.map((item) => item.code)).toContain('missing_checkin_info')
        expect(result.missingItems.map((item) => item.code)).toContain('missing_problem_contact')
    })

    it('accepts house manual with wifi and contact without critical address requirement', () => {
        const result = runInstructionChecks(
            'Wi-Fi: Flat1234. V případě problému volejte recepci na +420 777 888 999.',
            'house_manual',
        )

        expect(result.missingItems).toHaveLength(0)
        expect(result.missingItems.map((item) => item.code)).not.toContain('recommended_address')
    })

    it('flags housekeeping instructions without escalation', () => {
        const result = runInstructionChecks(
            'Postup: nejdřív koupelna, potom ložnice. Doplň prádlo a zkontroluj zásoby.',
            'housekeeping_instructions',
        )

        expect(result.missingItems.map((item) => item.code)).toContain('missing_problem_escalation')
    })

    it('detects conflicting check-in times', () => {
        const result = runInstructionChecks(
            'Check-in je od 14:00. Později v textu je uvedeno, že check-in začíná v 16:00.',
            'arrival_instructions',
        )

        expect(result.possibleConflicts.map((item) => item.code)).toContain('multiple_checkin_times')
    })

    it('detects unclear phrases', () => {
        const result = runInstructionChecks(
            'Přijďte včas a box snadno najdete poblíž domu.',
            'arrival_instructions',
        )

        expect(result.unclearPhrases.map((item) => item.phrase)).toEqual(
            expect.arrayContaining(['včas', 'snadno najdete', 'poblíž']),
        )
    })

    it('normalizes legacy audit notes to contextual objects', () => {
        const notes = normalizeAuditNotes({
            checkinInstructions: 'Příjezd po 15:00',
            houseManual: 'Wi-Fi je na stole.',
            internalCleaningInstructions: 'Doplň prádlo.',
            extraNotes: 'Někdy bývá problém s výtahem.',
            recommendedSteps: 'Prověřit texty.',
        })

        expect(notes.checkinInstructions.context).toBe('arrival_instructions')
        expect(notes.houseManual.context).toBe('house_manual')
        expect(notes.internalCleaningInstructions.context).toBe('housekeeping_instructions')
        expect(notes.extraNotes.context).toBe('other_notes')
        expect(createDefaultAuditNotes().checkinInstructions.content).toBe('')
    })
})