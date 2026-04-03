import {
    getInspectionTypeLabel,
    normalizeInspectionTypeKey,
} from '../data/checklistTemplates.js'
import { createDefaultAuditNotes, normalizeAuditNotes } from './instructionChecks.js'

const STATUS_LABELS = {
    good: 'Dobré',
    weak: 'Slabé',
    critical: 'Kritické',
    na: 'N/A',
}

const PRIORITY_LABELS = {
    low: 'Nízká',
    medium: 'Střední',
    high: 'Vysoká',
}

const ISSUE_TYPE_LABELS = {
    cleaning: 'Úklid',
    technical_condition: 'Technický stav',
    communication: 'Komunikace',
    checkin: 'Check-in',
    checkout: 'Check-out',
    equipment: 'Vybavení',
    comfort: 'Hluk / komfort',
    operations: 'Organizace provozu',
    safety: 'Bezpečnost',
    house_manual: 'House manual / instrukce',
}

const IMPACT_LABELS = {
    cosmetic: 'Kosmetický',
    comfort_drop: 'Zhoršuje komfort',
    complaint_risk: 'Zvyšuje riziko stížnosti',
    review_risk: 'Zvyšuje riziko špatné recenze',
    operational_chaos: 'Způsobuje provozní chaos',
    money_risk: 'Může stát peníze',
}

const RECOMMENDATION_LABELS = {
    quick_win: 'Quick win',
    systemic_problem: 'Systémový problém',
    process_change: 'Procesní změna',
    communication_change: 'Změna komunikace',
    technical_fix: 'Technická oprava',
    operational_standardization: 'Provozní standardizace',
}

const QUICK_TAG_LABELS = {
    missing_info: 'Chybí info',
    unclear_instruction: 'Nejasná instrukce',
    recurring_problem: 'Opakující se problém',
    weak_standard: 'Slabý standard',
    cosmetic_issue: 'Kosmetická vada',
    urgent_fix: 'Nutná oprava',
    missing_check: 'Chybí kontrola',
    inconsistent_communication: 'Nekonzistentní komunikace',
}

const VALID_STATUSES = new Set(Object.keys(STATUS_LABELS))
const VALID_PRIORITIES = new Set(Object.keys(PRIORITY_LABELS))
const VALID_ISSUE_TYPES = new Set(Object.keys(ISSUE_TYPE_LABELS))
const VALID_IMPACTS = new Set(Object.keys(IMPACT_LABELS))
const VALID_RECOMMENDATIONS = new Set(Object.keys(RECOMMENDATION_LABELS))
const VALID_QUICK_TAGS = new Set(Object.keys(QUICK_TAG_LABELS))
const SYSTEMIC_RECOMMENDATIONS = new Set(['systemic_problem', 'process_change'])
const BIGGEST_RISK_IMPACTS = new Set(['money_risk', 'review_risk', 'operational_chaos'])
const COMPLAINT_OR_REVIEW_IMPACTS = new Set(['complaint_risk', 'review_risk'])

export const ITEM_STATUSES = Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
}))

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
}))

export const ISSUE_TYPE_OPTIONS = Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
}))

export const IMPACT_OPTIONS = Object.entries(IMPACT_LABELS).map(([value, label]) => ({
    value,
    label,
}))

export const RECOMMENDATION_OPTIONS = Object.entries(RECOMMENDATION_LABELS).map(
    ([value, label]) => ({
        value,
        label,
    }),
)

export const QUICK_TAG_OPTIONS = Object.entries(QUICK_TAG_LABELS).map(([value, label]) => ({
    value,
    label,
}))

export const DETAIL_FILTERS = [
    { value: 'all', label: 'Vše' },
    { value: 'critical', label: 'Jen kritické' },
    { value: 'weak', label: 'Jen slabé' },
    { value: 'quick_wins', label: 'Jen quick wins' },
    { value: 'systemic', label: 'Jen systémové problémy' },
    { value: 'with_photos', label: 'Jen body s fotkou' },
]

function normalizeSingleValue(value, validValues, fallback = '') {
    return validValues.has(value) ? value : fallback
}

function normalizeMultiValue(value, validValues) {
    if (Array.isArray(value)) {
        return [...new Set(value.filter((entry) => validValues.has(entry)))]
    }

    if (typeof value === 'string' && validValues.has(value)) {
        return [value]
    }

    return []
}

function getStatusWeight(status) {
    switch (status) {
        case 'critical':
            return 4
        case 'weak':
            return 3
        case 'good':
            return 2
        case 'na':
            return 1
        default:
            return 0
    }
}

function getPriorityWeight(priority) {
    switch (priority) {
        case 'high':
            return 3
        case 'medium':
            return 2
        case 'low':
            return 1
        default:
            return 0
    }
}

function sortFindingItems(items) {
    return [...items].sort((left, right) => {
        const statusDifference = getStatusWeight(right.status) - getStatusWeight(left.status)

        if (statusDifference !== 0) {
            return statusDifference
        }

        const priorityDifference = getPriorityWeight(right.priority) - getPriorityWeight(left.priority)

        if (priorityDifference !== 0) {
            return priorityDifference
        }

        return left.title.localeCompare(right.title, 'cs')
    })
}

function uniqueItems(items) {
    const seenIds = new Set()

    return items.filter((item) => {
        if (seenIds.has(item.id)) {
            return false
        }

        seenIds.add(item.id)
        return true
    })
}

function isSystemicRecommendation(value) {
    return SYSTEMIC_RECOMMENDATIONS.has(value)
}

function hasMeaningfulFinding(item) {
    return (
        item.status === 'weak' ||
        item.status === 'critical' ||
        item.issueType ||
        item.impacts.length > 0 ||
        item.recommendationType ||
        item.quickTags.length > 0 ||
        item.note ||
        item.evidence ||
        item.photos.length > 0
    )
}

function isBiggestRisk(item) {
    return (
        item.status === 'critical' ||
        item.impacts.some((impact) => BIGGEST_RISK_IMPACTS.has(impact))
    )
}

export function normalizeAuditItem(item) {
    const safeItem = item && typeof item === 'object' ? item : {}

    return {
        ...safeItem,
        status: normalizeSingleValue(safeItem.status, VALID_STATUSES, 'good'),
        priority: normalizeSingleValue(safeItem.priority, VALID_PRIORITIES, 'low'),
        note: typeof safeItem.note === 'string' ? safeItem.note : '',
        evidence: typeof safeItem.evidence === 'string' ? safeItem.evidence : '',
        photos: Array.isArray(safeItem.photos) ? safeItem.photos : [],
        collapsed: Boolean(safeItem.collapsed),
        issueType: normalizeSingleValue(safeItem.issueType, VALID_ISSUE_TYPES),
        impacts: normalizeMultiValue(safeItem.impacts ?? safeItem.impact, VALID_IMPACTS),
        recommendationType: normalizeSingleValue(
            safeItem.recommendationType,
            VALID_RECOMMENDATIONS,
        ),
        quickTags: normalizeMultiValue(safeItem.quickTags, VALID_QUICK_TAGS),
    }
}

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
    const inspectionTypeKey = normalizeInspectionTypeKey(
        formValues.inspectionTypeKey ?? formValues.inspectionType,
    )

    return {
        facilityName: formValues.facilityName.trim(),
        location: formValues.location.trim(),
        date: formValues.date,
        inspectionTypeKey,
        inspectionType: getInspectionTypeLabel(inspectionTypeKey),
        unitName: formValues.unitName.trim(),
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        notes: createDefaultAuditNotes(),
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
                issueType: '',
                impacts: [],
                recommendationType: '',
                quickTags: [],
            })),
        ),
    }
}

export function normalizeAuditRecord(audit) {
    if (!audit) {
        return audit
    }

    const inspectionTypeKey = normalizeInspectionTypeKey(
        audit.inspectionTypeKey ?? audit.inspectionType,
    )

    if (!inspectionTypeKey) {
        return audit
    }

    const inspectionType = getInspectionTypeLabel(inspectionTypeKey)
    const normalizedNotes = normalizeAuditNotes(audit.notes)
    const normalizedItems = Array.isArray(audit.items)
        ? audit.items.map((item) => normalizeAuditItem(item))
        : []
    const changed =
        audit.inspectionTypeKey !== inspectionTypeKey ||
        audit.inspectionType !== inspectionType ||
        JSON.stringify(audit.notes ?? {}) !== JSON.stringify(normalizedNotes) ||
        JSON.stringify(audit.items ?? []) !== JSON.stringify(normalizedItems)

    if (!changed) {
        return audit
    }

    return {
        ...audit,
        inspectionTypeKey,
        inspectionType,
        notes: normalizedNotes,
        items: normalizedItems,
    }
}

export function getAuditInspectionTypeLabel(audit) {
    if (!audit) {
        return 'Neznámý typ rozboru'
    }

    return getInspectionTypeLabel(audit.inspectionTypeKey ?? audit.inspectionType)
}

export function normalizeTemplateRecord(template) {
    if (!template) {
        return template
    }

    const inspectionTypeKey = normalizeInspectionTypeKey(
        template.key ?? template.type ?? template.label ?? template.title,
    )

    if (!inspectionTypeKey) {
        return template
    }

    return {
        ...template,
        id: inspectionTypeKey,
        key: inspectionTypeKey,
        label: getInspectionTypeLabel(inspectionTypeKey),
        title: template.title ?? getInspectionTypeLabel(inspectionTypeKey),
    }
}

export function matchesFilter(item, filterValue) {
    const normalizedItem = normalizeAuditItem(item)

    if (filterValue === 'critical') {
        return normalizedItem.status === 'critical'
    }

    if (filterValue === 'weak') {
        return normalizedItem.status === 'weak'
    }

    if (filterValue === 'quick_wins') {
        return normalizedItem.recommendationType === 'quick_win'
    }

    if (filterValue === 'systemic') {
        return isSystemicRecommendation(normalizedItem.recommendationType)
    }

    if (filterValue === 'with_photos') {
        return normalizedItem.photos.length > 0
    }

    return true
}

export function groupItemsBySection(items, filterValue = 'all') {
    const groups = new Map()

    items.forEach((item) => {
        const normalizedItem = normalizeAuditItem(item)

        if (!matchesFilter(normalizedItem, filterValue)) {
            return
        }

        const currentSection = groups.get(normalizedItem.sectionId) ?? {
            id: normalizedItem.sectionId,
            title: normalizedItem.sectionTitle,
            items: [],
        }

        currentSection.items.push(normalizedItem)
        groups.set(normalizedItem.sectionId, currentSection)
    })

    return Array.from(groups.values())
}

export function getAuditSummary(items) {
    const normalizedItems = items.map((item) => normalizeAuditItem(item))
    const criticalItems = sortFindingItems(
        normalizedItems.filter((item) => item.status === 'critical'),
    )
    const weakItems = sortFindingItems(normalizedItems.filter((item) => item.status === 'weak'))
    const quickWinItems = sortFindingItems(
        normalizedItems.filter((item) => item.recommendationType === 'quick_win'),
    )
    const systemicItems = sortFindingItems(
        normalizedItems.filter((item) => isSystemicRecommendation(item.recommendationType)),
    )
    const monetaryRiskItems = sortFindingItems(
        normalizedItems.filter((item) => item.impacts.includes('money_risk')),
    )
    const complaintOrReviewRiskItems = sortFindingItems(
        normalizedItems.filter((item) =>
            item.impacts.some((impact) => COMPLAINT_OR_REVIEW_IMPACTS.has(impact)),
        ),
    )
    const mainFindings = sortFindingItems(normalizedItems.filter((item) => hasMeaningfulFinding(item)))
    const biggestRiskItems = uniqueItems(
        sortFindingItems(normalizedItems.filter((item) => isBiggestRisk(item))),
    )
    const recommendedFirstSteps = uniqueItems(
        sortFindingItems(
            normalizedItems.filter(
                (item) =>
                    item.status === 'critical' ||
                    item.recommendationType === 'quick_win' ||
                    item.recommendationType === 'process_change' ||
                    item.impacts.some((impact) => BIGGEST_RISK_IMPACTS.has(impact)),
            ),
        ),
    )

    return {
        criticalCount: criticalItems.length,
        weakCount: weakItems.length,
        quickWinCount: quickWinItems.length,
        systemicCount: systemicItems.length,
        moneyRiskCount: monetaryRiskItems.length,
        complaintReviewRiskCount: complaintOrReviewRiskItems.length,
        criticalItems,
        weakItems,
        quickWins: quickWinItems,
        systemicProblems: systemicItems,
        monetaryRiskItems,
        complaintReviewRiskItems: complaintOrReviewRiskItems,
        mainFindings,
        biggestRiskItems,
        fastestImprovements: quickWinItems,
        systemicWeaknesses: systemicItems,
        recommendedFirstSteps,
    }
}

export function getCriticalCount(items) {
    return items.filter((item) => normalizeAuditItem(item).status === 'critical').length
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

export function getIssueTypeLabel(value) {
    return ISSUE_TYPE_LABELS[value] ?? 'Bez typu'
}

export function getImpactLabel(value) {
    return IMPACT_LABELS[value] ?? value
}

export function getRecommendationLabel(value) {
    return RECOMMENDATION_LABELS[value] ?? 'Bez doporučení'
}

export function getQuickTagLabel(value) {
    return QUICK_TAG_LABELS[value] ?? value
}