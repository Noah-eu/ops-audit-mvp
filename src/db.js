import Dexie from 'dexie'
import { CHECKLIST_TEMPLATES } from './data/checklistTemplates.js'
import { normalizeAuditRecord } from './lib/auditUtils.js'

class OpsAuditDatabase extends Dexie {
    constructor() {
        super('ops-audit-mvp')

        this.version(1).stores({
            audits: '++id, status, inspectionType, updatedAt, date',
            templates: '&id, type',
        })

        this.version(2).stores({
            audits: '++id, status, inspectionTypeKey, updatedAt, date',
            templates: '&id, key',
        }).upgrade(async (transaction) => {
            const auditsTable = transaction.table('audits')
            const templatesTable = transaction.table('templates')
            const existingAudits = await auditsTable.toArray()
            const migratedAudits = existingAudits.map((audit) => normalizeAuditRecord(audit))

            if (migratedAudits.length > 0) {
                await auditsTable.bulkPut(migratedAudits)
            }

            await templatesTable.clear()
            await templatesTable.bulkPut(CHECKLIST_TEMPLATES)
        })
    }
}

export const db = new OpsAuditDatabase()

export async function ensureSeedTemplates() {
    await db.templates.clear()
    await db.templates.bulkPut(CHECKLIST_TEMPLATES)
}