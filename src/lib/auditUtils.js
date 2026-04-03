const STATUS_LABELS = {
  good: 'Dobré',
  weak: 'Slabé',
  critical: 'Kritické',
}

const PRIORITY_LABELS = {
  low: 'Nízká',
  medium: 'Střední',
  high: 'Vysoká',
}

export const ITEM_STATUSES = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const DETAIL_FILTERS = [
  { value: 'all', label: 'Vše' },
  { value: 'critical', label: 'Jen kritické' },
  { value: 'weak', label: 'Jen slabé' },
]

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function formatDisplayDate(dateValue) {
  if (!dateValue) {
    return 'Bez data'
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(dateValue))
}

export function formatDateTime(dateValue) {
  if (!dateValue) {
    return 'Zatím neuloženo'
  }

  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue))
}

export function buildAuditFromTemplate(formValues, template) {
  const now = new Date().toISOString()

  return {
    facilityName: formValues.facilityName.trim(),
    location: formValues.location.trim(),
    date: formValues.date,
    inspectionType: formValues.inspectionType,
    unitName: formValues.unitName.trim(),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    notes: {
      checkinInstructions: '',
      houseManual: '',
      internalCleaningInstructions: '',
      extraNotes: '',
      recommendedSteps: '',
    },
    items: template.sections.flatMap((section) =>
      section.items.map((item) => ({
        id: crypto.randomUUID(),
        sectionId: section.id,
        sectionTitle: section.title,
        title: item.title,
        status: 'good',
        priority: 'low',
        note: '',
        evidence: '',
        collapsed: false,
        photos: [],
      })),
    ),
  }
}

export function matchesFilter(item, filterValue) {
  if (filterValue === 'critical') {
    return item.status === 'critical'
  }

  if (filterValue === 'weak') {
    return item.status === 'weak'
  }

  return true
}

export function groupItemsBySection(items, filterValue = 'all') {
  const groups = new Map()

  items.forEach((item) => {
    if (!matchesFilter(item, filterValue)) {
      return
    }

    const currentSection = groups.get(item.sectionId) ?? {
      id: item.sectionId,
      title: item.sectionTitle,
      items: [],
    }

    currentSection.items.push(item)
    groups.set(item.sectionId, currentSection)
  })

  return Array.from(groups.values())
}

export function getAuditSummary(items) {
  const criticalItems = items.filter((item) => item.status === 'critical')
  const weakItems = items.filter((item) => item.status === 'weak')
  const quickWins = items.filter(
    (item) =>
      (item.status === 'weak' || item.status === 'critical') &&
      (item.priority === 'medium' || item.priority === 'high'),
  )

  return {
    criticalCount: criticalItems.length,
    weakCount: weakItems.length,
    criticalItems,
    quickWins,
  }
}

export function getCriticalCount(items) {
  return items.filter((item) => item.status === 'critical').length
}

export function sortAuditsByUpdatedAt(audits) {
  return [...audits].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

export function countTemplateItems(template) {
  return template.sections.reduce((total, section) => total + section.items.length, 0)
}

export function getStatusLabel(statusValue) {
  return STATUS_LABELS[statusValue] ?? statusValue
}

export function getPriorityLabel(priorityValue) {
  return PRIORITY_LABELS[priorityValue] ?? priorityValue
}