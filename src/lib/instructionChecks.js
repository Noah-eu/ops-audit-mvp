const TIME_REGEX = /\b\d{1,2}[:.]\d{2}\b|\b(?:od|do|po)\s+\d{1,2}(?:[:.]\d{2})?(?:\s*hod(?:in(?:y|ě|u|a)?)?)?/giu
const PHONE_REGEX = /(?:\+?\d[\d\s()/-]{7,}\d)/g
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu
const URL_REGEX = /\b(?:https?:\/\/|www\.)\S+/giu
const ACCESS_CODE_REGEX = /(?:pin|k[oó]d|code|box|keybox|lockbox|schr[aá]nka|schr[aá]nky|schr[aá]nce|boxu)[^\n.!?]{0,24}?\b([A-Z0-9]{3,8})\b/giu

const ADDRESS_HINT_REGEX = /\b(?:ul\.?|ulice|n[aá]m[eě]st[ií]|n[aá]b[rř]e[zž][ií]|t[rř][ií]da|trida|praha|brno|ostrava|plze[nň]|plzen|liberec|olomouc|č\.?\s*p\.?|cp)\b/iu
const STREET_NUMBER_REGEX = /\b\d{1,4}(?:\/\d{1,4})?\b/

const UNCLEAR_PHRASE_RULES = [
    'pozdě',
    'brzy',
    'včas',
    'u domu',
    'vedle domu',
    'podle potřeby',
    'případně',
    'zpravidla',
    'obvykle',
    'někdy',
    'snadno najdete',
    'poblíž',
]

const CONTEXT_LABEL_BY_KEY = {
    arrival_instructions: 'Příjezdové instrukce',
    house_manual: 'House manuál',
    housekeeping_instructions: 'Interní instrukce úklidu',
    other_notes: 'Další poznámky',
}

export const INSTRUCTION_NOTE_FIELDS = [
    {
        field: 'checkinInstructions',
        context: 'arrival_instructions',
        label: CONTEXT_LABEL_BY_KEY.arrival_instructions,
    },
    {
        field: 'houseManual',
        context: 'house_manual',
        label: CONTEXT_LABEL_BY_KEY.house_manual,
    },
    {
        field: 'internalCleaningInstructions',
        context: 'housekeeping_instructions',
        label: CONTEXT_LABEL_BY_KEY.housekeeping_instructions,
    },
    {
        field: 'extraNotes',
        context: 'other_notes',
        label: CONTEXT_LABEL_BY_KEY.other_notes,
    },
]

const INSTRUCTION_NOTE_FIELD_BY_NAME = Object.fromEntries(
    INSTRUCTION_NOTE_FIELDS.map((entry) => [entry.field, entry]),
)

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
}

function uniqueValues(values) {
    return [...new Set(values.filter(Boolean))]
}

function getMatches(regex, text, mapper = (match) => match[0].trim()) {
    return uniqueValues(Array.from(text.matchAll(regex), mapper))
}

function containsAny(text, keywords) {
    const normalized = normalizeSearchText(text)
    return keywords.some((keyword) => normalized.includes(normalizeSearchText(keyword)))
}

function splitSentences(text) {
    return text
        .split(/[\n.!?]+/)
        .map((part) => part.trim())
        .filter(Boolean)
}

function normalizeTimeToken(value) {
    const match = value.match(/(\d{1,2})(?:[:.](\d{2}))?/)

    if (!match) {
        return value.trim()
    }

    return `${match[1].padStart(2, '0')}:${(match[2] || '00').padStart(2, '0')}`
}

function collectTimeFacts(text) {
    return getMatches(TIME_REGEX, text)
}

function collectTimesNearKeywords(text, keywords) {
    const sentences = splitSentences(text).filter((sentence) => containsAny(sentence, keywords))
    return uniqueValues(
        sentences.flatMap((sentence) => collectTimeFacts(sentence).map((time) => normalizeTimeToken(time))),
    )
}

function collectAccessCodes(text) {
    return getMatches(ACCESS_CODE_REGEX, text, (match) => match[1]?.trim())
}

function hasAddress(text) {
    return ADDRESS_HINT_REGEX.test(text) && STREET_NUMBER_REGEX.test(text)
}

function hasProcedure(text) {
    return (
        /^\s*\d+[.)]/m.test(text) ||
        containsAny(text, ['postup', 'krok', 'nejdrive', 'nejdřív', 'potom', 'pak', 'nakonec', 'zkontroluj'])
    )
}

function hasSuppliesOrLinen(text) {
    return containsAny(text, [
        'pradlo',
        'prádlo',
        'zasoby',
        'zásoby',
        'doplnit',
        'rucnik',
        'ručník',
        'toaletni papir',
        'toaletní papír',
        'kontrola',
    ])
}

function hasEscalation(text) {
    return containsAny(text, [
        'eskal',
        'problem',
        'problém',
        'zavada',
        'závada',
        'volej',
        'volejte',
        'kontaktuj',
        'nahlas',
        'hlaste',
    ])
}

function hasContactInfo(text) {
    const detectedPhones = getMatches(PHONE_REGEX, text, (match) => match[0].trim())
        .filter((phone) => phone.replace(/\D/g, '').length >= 9)
    const detectedEmails = getMatches(EMAIL_REGEX, text, (match) => match[0].trim())

    return (
        detectedPhones.length > 0 ||
        detectedEmails.length > 0 ||
        containsAny(text, ['kontakt', 'volejte', 'telefon', 'tel', 'email', 'recepce', 'hostitel'])
    )
}

function hasAccessInstructions(text) {
    return containsAny(text, [
        'klic',
        'klíč',
        'box',
        'schranka',
        'schránka',
        'pin',
        'kod',
        'kód',
        'vstup',
        'dvere',
        'dveře',
        'zamek',
        'zámek',
    ])
}

function hasCheckinReference(text) {
    return containsAny(text, ['check-in', 'check in', 'prijezd', 'příjezd', 'ubytovani', 'ubytování'])
}

function hasCheckoutReference(text) {
    return containsAny(text, ['check-out', 'check out', 'odjezd'])
}

function hasWifi(text) {
    return containsAny(text, ['wifi', 'wi-fi', 'internet'])
}

function hasStayRules(text) {
    return containsAny(text, [
        'pravidla',
        'house rules',
        'odpad',
        'topeni',
        'topení',
        'klimatizace',
        'spotrebice',
        'spotřebiče',
        'manual',
        'manuál',
        'klid',
    ])
}

function detectFacts(text) {
    const phones = getMatches(PHONE_REGEX, text, (match) => match[0].trim())
        .filter((phone) => phone.replace(/\D/g, '').length >= 9)
    const emails = getMatches(EMAIL_REGEX, text, (match) => match[0].trim())
    const urls = getMatches(URL_REGEX, text, (match) => match[0].trim())
    const times = collectTimeFacts(text)
    const accessCodes = collectAccessCodes(text)

    const facts = []

    if (times.length > 0) {
        facts.push({ type: 'times', label: 'Časy', values: times })
    }

    if (phones.length > 0) {
        facts.push({ type: 'phones', label: 'Telefonní čísla', values: phones })
    }

    if (emails.length > 0) {
        facts.push({ type: 'emails', label: 'E-maily', values: emails })
    }

    if (urls.length > 0) {
        facts.push({ type: 'urls', label: 'Odkazy', values: urls })
    }

    if (accessCodes.length > 0) {
        facts.push({ type: 'codes', label: 'Kódy / PIN / box', values: accessCodes })
    }

    if (hasWifi(text)) {
        facts.push({ type: 'wifi', label: 'Wi-Fi', values: ['zmíněno v textu'] })
    }

    if (containsAny(text, ['parkovani', 'parkování', 'parking', 'garaz', 'garáž'])) {
        facts.push({ type: 'parking', label: 'Parkování', values: ['zmíněno v textu'] })
    }

    if (hasCheckinReference(text)) {
        facts.push({ type: 'checkin', label: 'Check-in / příjezd', values: ['zmíněno v textu'] })
    }

    if (hasCheckoutReference(text)) {
        facts.push({ type: 'checkout', label: 'Check-out / odjezd', values: ['zmíněno v textu'] })
    }

    if (hasAccessInstructions(text)) {
        facts.push({ type: 'access', label: 'Vstup / klíče', values: ['zmíněno v textu'] })
    }

    if (hasContactInfo(text)) {
        facts.push({ type: 'contact', label: 'Kontakt', values: ['zmíněno v textu'] })
    }

    if (containsAny(text, ['nouze', 'problem', 'problém', 'issue', 'emergency'])) {
        facts.push({ type: 'emergency', label: 'Problém / nouze', values: ['zmíněno v textu'] })
    }

    return facts
}

function detectUnclearPhrases(text) {
    const normalized = normalizeSearchText(text)

    return UNCLEAR_PHRASE_RULES.filter((phrase) =>
        normalized.includes(normalizeSearchText(phrase)),
    ).map((phrase) => ({
        phrase,
        message: `Zvaž zpřesnění formulace „${phrase}“.`,
    }))
}

function detectConflicts(text) {
    const conflicts = []
    const checkinTimes = collectTimesNearKeywords(text, ['check-in', 'check in', 'prijezd', 'příjezd'])
    const checkoutTimes = collectTimesNearKeywords(text, ['check-out', 'check out', 'odjezd'])
    const accessCodes = collectAccessCodes(text)

    if (checkinTimes.length > 1) {
        conflicts.push({
            code: 'multiple_checkin_times',
            message: `V textu jsou více různé časy check-inu: ${checkinTimes.join(', ')}.`,
        })
    }

    if (checkoutTimes.length > 1) {
        conflicts.push({
            code: 'multiple_checkout_times',
            message: `V textu jsou více různé časy check-outu: ${checkoutTimes.join(', ')}.`,
        })
    }

    if (accessCodes.length > 1) {
        conflicts.push({
            code: 'multiple_access_codes',
            message: `V textu jsou více různé kódy nebo čísla boxu: ${accessCodes.join(', ')}.`,
        })
    }

    if (
        containsAny(text, ['self check-in', 'self check in', 'samostatny vstup', 'samostatný vstup', 'bezkontaktni', 'bezkontaktní']) &&
        containsAny(text, ['osobni predani', 'osobní předání', 'preda vam', 'předá vám', 'cekat vas bude', 'čekat vás bude'])
    ) {
        conflicts.push({
            code: 'mixed_handover_modes',
            message: 'Text zmiňuje self check-in i osobní předání bez zjevného vysvětlení.',
        })
    }

    return conflicts
}

function createResult(context, missingItems, recommendedItems, unclearPhrases, detectedFacts, possibleConflicts) {
    return {
        context,
        contextLabel: CONTEXT_LABEL_BY_KEY[context],
        missingItems,
        recommendedItems,
        unclearPhrases,
        detectedFacts,
        possibleConflicts,
        summaryCounts: {
            critical: missingItems.length,
            recommended: recommendedItems.length,
            check: unclearPhrases.length + possibleConflicts.length,
            detected: detectedFacts.length,
        },
    }
}

function runArrivalInstructionChecks(text) {
    const missingItems = []
    const recommendedItems = []

    if (!hasCheckinReference(text)) {
        missingItems.push({
            code: 'missing_checkin_info',
            message: 'Chybí jasná informace o check-inu nebo příjezdu.',
        })
    }

    if (!hasAccessInstructions(text)) {
        missingItems.push({
            code: 'missing_access_info',
            message: 'Chybí popis vstupu, klíčů, boxu, kódu nebo dveří.',
        })
    }

    if (!hasContactInfo(text)) {
        missingItems.push({
            code: 'missing_problem_contact',
            message: 'Chybí kontakt pro problém při příjezdu nebo vstupu.',
        })
    }

    if (!hasAddress(text)) {
        recommendedItems.push({
            code: 'recommended_address',
            message: 'Doporučeno doplnit adresu nebo přesné místo příjezdu.',
        })
    }

    if (containsAny(text, ['auto', 'vuz', 'vůz']) && !containsAny(text, ['parkovani', 'parkování', 'parking', 'garaz', 'garáž'])) {
        recommendedItems.push({
            code: 'recommended_parking_info',
            message: 'Text naznačuje příjezd autem, ale chybí upřesnění parkování.',
        })
    }

    return createResult(
        'arrival_instructions',
        missingItems,
        recommendedItems,
        detectUnclearPhrases(text),
        detectFacts(text),
        detectConflicts(text),
    )
}

function runHouseManualChecks(text) {
    const missingItems = []
    const recommendedItems = []

    if (!hasWifi(text) && !hasStayRules(text)) {
        missingItems.push({
            code: 'missing_stay_basics',
            message: 'Chybí Wi-Fi nebo jiné základní informace pro pobyt.',
        })
    }

    if (!hasContactInfo(text)) {
        missingItems.push({
            code: 'missing_house_manual_contact',
            message: 'Chybí kontakt pro problém během pobytu.',
        })
    }

    if (!hasCheckoutReference(text)) {
        recommendedItems.push({
            code: 'recommended_checkout_info',
            message: 'Doporučeno doplnit informaci o check-outu nebo odjezdu.',
        })
    }

    if (!hasStayRules(text)) {
        recommendedItems.push({
            code: 'recommended_stay_rules',
            message: 'Doporučeno doplnit základní pravidla pobytu.',
        })
    }

    return createResult(
        'house_manual',
        missingItems,
        recommendedItems,
        detectUnclearPhrases(text),
        detectFacts(text),
        detectConflicts(text),
    )
}

function runHousekeepingInstructionChecks(text) {
    const missingItems = []

    if (!hasProcedure(text)) {
        missingItems.push({
            code: 'missing_cleaning_procedure',
            message: 'Chybí jasný postup nebo kroky úklidu.',
        })
    }

    if (!hasSuppliesOrLinen(text)) {
        missingItems.push({
            code: 'missing_supplies_or_checks',
            message: 'Chybí zmínka o zásobách, prádle nebo kontrolním bodu.',
        })
    }

    if (!hasEscalation(text)) {
        missingItems.push({
            code: 'missing_problem_escalation',
            message: 'Chybí postup pro eskalaci problému nebo závady.',
        })
    }

    return createResult(
        'housekeeping_instructions',
        missingItems,
        [],
        detectUnclearPhrases(text),
        detectFacts(text),
        detectConflicts(text),
    )
}

function runOtherNotesChecks(text) {
    const recommendedItems = []

    if (!text.trim()) {
        recommendedItems.push({
            code: 'recommended_note_context',
            message: 'Poznámku lze využít pro doplnění provozního kontextu nebo výjimek.',
        })
    }

    return createResult(
        'other_notes',
        [],
        recommendedItems,
        detectUnclearPhrases(text),
        detectFacts(text),
        detectConflicts(text),
    )
}

export function getInstructionNoteContext(fieldName) {
    return INSTRUCTION_NOTE_FIELD_BY_NAME[fieldName]?.context ?? 'other_notes'
}

export function isInstructionNoteField(fieldName) {
    return Boolean(INSTRUCTION_NOTE_FIELD_BY_NAME[fieldName])
}

export function normalizeInstructionNoteValue(value, context) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
            context: value.context || context,
            content:
                typeof value.content === 'string'
                    ? value.content
                    : typeof value.text === 'string'
                        ? value.text
                        : '',
        }
    }

    return {
        context,
        content: typeof value === 'string' ? value : '',
    }
}

export function createDefaultAuditNotes() {
    return {
        checkinInstructions: normalizeInstructionNoteValue('', 'arrival_instructions'),
        houseManual: normalizeInstructionNoteValue('', 'house_manual'),
        internalCleaningInstructions: normalizeInstructionNoteValue('', 'housekeeping_instructions'),
        extraNotes: normalizeInstructionNoteValue('', 'other_notes'),
        recommendedSteps: '',
    }
}

export function normalizeAuditNotes(notes) {
    const safeNotes = notes && typeof notes === 'object' ? notes : {}

    return {
        checkinInstructions: normalizeInstructionNoteValue(
            safeNotes.checkinInstructions,
            'arrival_instructions',
        ),
        houseManual: normalizeInstructionNoteValue(safeNotes.houseManual, 'house_manual'),
        internalCleaningInstructions: normalizeInstructionNoteValue(
            safeNotes.internalCleaningInstructions,
            'housekeeping_instructions',
        ),
        extraNotes: normalizeInstructionNoteValue(safeNotes.extraNotes, 'other_notes'),
        recommendedSteps:
            typeof safeNotes.recommendedSteps === 'string' ? safeNotes.recommendedSteps : '',
    }
}

export function getInstructionNoteContent(notes, fieldName) {
    const normalizedNotes = normalizeAuditNotes(notes)
    return normalizedNotes[fieldName]?.content ?? ''
}

export function runInstructionChecks(text, context) {
    switch (context) {
        case 'arrival_instructions':
            return runArrivalInstructionChecks(text)
        case 'house_manual':
            return runHouseManualChecks(text)
        case 'housekeeping_instructions':
            return runHousekeepingInstructionChecks(text)
        default:
            return runOtherNotesChecks(text)
    }
}

export function runInstructionChecksForAudit(notes) {
    const normalizedNotes = normalizeAuditNotes(notes)

    return INSTRUCTION_NOTE_FIELDS.map((config) => ({
        field: config.field,
        label: config.label,
        context: config.context,
        text: normalizedNotes[config.field].content,
        result: runInstructionChecks(normalizedNotes[config.field].content, config.context),
    }))
}