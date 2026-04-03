import { getAuditInspectionTypeLabel, getAuditSummary, normalizeAuditRecord } from './auditUtils.js'

function formatFindingLine(item) {
    const details = []

    if (item.note) {
        details.push(item.note)
    }

    if (item.evidence) {
        details.push(`Důkaz: ${item.evidence}`)
    }

    if (item.photos.length > 0) {
        details.push(`Fotky: ${item.photos.length}`)
    }

    return `${item.sectionTitle}: ${item.title}${details.length > 0 ? ` - ${details.join(' | ')}` : ''}`
}

function toPdfBullets(items) {
    return items.map((item) => formatFindingLine(item))
}

function createTextBlock(value, fallback) {
    return value?.trim() ? value.trim() : fallback
}

export function buildAuditPdfSummaryModel(audit) {
    const normalizedAudit = normalizeAuditRecord(audit)
    const summary = getAuditSummary(normalizedAudit.items)

    return {
        fileName: `report-${normalizedAudit.facilityName || 'rozbor'}-${normalizedAudit.date || 'bez-data'}.pdf`,
        facilityName: normalizedAudit.facilityName,
        location: normalizedAudit.location,
        date: normalizedAudit.date,
        inspectionTypeLabel: getAuditInspectionTypeLabel(normalizedAudit),
        executiveSummary: createTextBlock(
            normalizedAudit.notes.executiveSummary,
            'Executive summary zatím není doplněné.',
        ),
        mainFindings: toPdfBullets(summary.mainFindings),
        biggestRisks: toPdfBullets(summary.biggestRiskItems),
        fastestImprovements: toPdfBullets(summary.fastestImprovements),
        systemicWeaknesses: toPdfBullets(summary.systemicWeaknesses),
        addressNow: createTextBlock(normalizedAudit.notes.addressNow, 'Zatím není doplněno.'),
        addressThisWeek: createTextBlock(normalizedAudit.notes.addressThisWeek, 'Zatím není doplněno.'),
        structuralProblem: createTextBlock(normalizedAudit.notes.structuralProblem, 'Zatím není doplněno.'),
        finalReportNotes: createTextBlock(normalizedAudit.notes.finalReportNotes, 'Zatím není doplněno.'),
        criticalFindings: toPdfBullets(summary.criticalItems),
        quickWinFindings: toPdfBullets(summary.quickWins),
        systemicFindings: toPdfBullets(summary.systemicProblems),
    }
}

function sectionBlock(title, lines) {
    return [
        { text: title, style: 'sectionHeading' },
        ...(Array.isArray(lines) && lines.length > 0
            ? [{ ul: lines.map((line) => ({ text: line, margin: [0, 0, 0, 4] })) }]
            : [{ text: 'Zatím není doplněno.', color: '#5d6b72' }]),
    ]
}

export async function exportAuditSummaryPdf(audit) {
    const pdfMakeModule = await import('pdfmake/build/pdfmake')
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
    const pdfMake = pdfMakeModule.default || pdfMakeModule
    const pdfFonts = pdfFontsModule.default || pdfFontsModule

    pdfMake.vfs = pdfFonts.vfs

    const model = buildAuditPdfSummaryModel(audit)
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [36, 40, 36, 40],
        content: [
            { text: 'Shrnutí pro vedení', style: 'title' },
            {
                columns: [
                    [
                        { text: model.facilityName, style: 'headline' },
                        { text: model.location || 'Bez lokality', color: '#5d6b72' },
                    ],
                    [
                        { text: `Datum: ${model.date || 'Bez data'}`, alignment: 'right' },
                        { text: `Typ rozboru: ${model.inspectionTypeLabel}`, alignment: 'right' },
                    ],
                ],
                columnGap: 12,
                margin: [0, 0, 0, 18],
            },
            { text: 'Executive summary', style: 'sectionHeading' },
            { text: model.executiveSummary, margin: [0, 0, 0, 14] },
            ...sectionBlock('Hlavní zjištění', model.mainFindings),
            ...sectionBlock('Největší rizika', model.biggestRisks),
            ...sectionBlock('Nejrychlejší zlepšení', model.fastestImprovements),
            ...sectionBlock('Systémové slabiny', model.systemicWeaknesses),
            { text: 'Co řešit hned', style: 'sectionHeading' },
            { text: model.addressNow, margin: [0, 0, 0, 12] },
            { text: 'Co řešit tento týden', style: 'sectionHeading' },
            { text: model.addressThisWeek, margin: [0, 0, 0, 12] },
            { text: 'Co je strukturální problém', style: 'sectionHeading' },
            { text: model.structuralProblem, margin: [0, 0, 0, 12] },
            { text: 'Poznámky pro finální report', style: 'sectionHeading' },
            { text: model.finalReportNotes, margin: [0, 0, 0, 14] },
            ...sectionBlock('Klíčové nálezy: kritické body', model.criticalFindings),
            ...sectionBlock('Klíčové nálezy: quick wins', model.quickWinFindings),
            ...sectionBlock('Klíčové nálezy: systémové problémy', model.systemicFindings),
        ],
        styles: {
            title: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 14],
            },
            headline: {
                fontSize: 14,
                bold: true,
                margin: [0, 0, 0, 4],
            },
            sectionHeading: {
                fontSize: 12,
                bold: true,
                margin: [0, 10, 0, 6],
            },
        },
        defaultStyle: {
            fontSize: 10,
            lineHeight: 1.25,
        },
    }

    pdfMake.createPdf(docDefinition).download(model.fileName)
}