import Dexie from 'dexie'
import { CHECKLIST_TEMPLATES } from './data/checklistTemplates.js'

class OpsAuditDatabase extends Dexie {
  constructor() {
    super('ops-audit-mvp')

    this.version(1).stores({
      audits: '++id, status, inspectionType, updatedAt, date',
      templates: '&id, type',
    })
  }
}

export const db = new OpsAuditDatabase()

export async function ensureSeedTemplates() {
  const templateCount = await db.templates.count()

  if (templateCount === 0) {
    await db.templates.bulkAdd(CHECKLIST_TEMPLATES)
  }
}