import { normalizeAuditRecord } from './auditUtils.js'

const TRANSFER_SCHEMA_VERSION = 1

function slugify(value, fallback = 'rozbor') {
    const normalized = String(value || fallback)
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    return normalized || fallback
}

function encodeBase64(bytes) {
    let binary = ''

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
    })

    return btoa(binary)
}

function decodeBase64(base64Value) {
    const binaryString = atob(base64Value)
    const bytes = new Uint8Array(binaryString.length)

    for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index)
    }

    return bytes
}

async function blobToDataUrl(blob) {
    if (!(blob instanceof Blob)) {
        return ''
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const mimeType = blob.type || 'application/octet-stream'
    return `data:${mimeType};base64,${encodeBase64(bytes)}`
}

function dataUrlToBlob(dataUrl) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return null
    }

    const [metadata, base64Value] = dataUrl.split(',', 2)
    const mimeMatch = metadata.match(/^data:(.*?);base64$/)
    const mimeType = mimeMatch?.[1] || 'application/octet-stream'
    const bytes = decodeBase64(base64Value || '')

    return new Blob([bytes], { type: mimeType })
}

async function serializePhoto(photo) {
    return {
        id: photo.id,
        name: photo.name || '',
        createdAt: photo.createdAt || '',
        mimeType: photo.blob?.type || 'application/octet-stream',
        dataUrl: await blobToDataUrl(photo.blob),
    }
}

async function serializeAudit(audit) {
    const normalizedAudit = normalizeAuditRecord(audit)

    return {
        ...normalizedAudit,
        originalId: normalizedAudit.id ?? null,
        items: await Promise.all(
            normalizedAudit.items.map(async (item) => ({
                ...item,
                photos: await Promise.all(item.photos.map((photo) => serializePhoto(photo))),
            })),
        ),
    }
}

function deserializePhoto(photo) {
    return {
        id: crypto.randomUUID(),
        name: photo.name || '',
        createdAt: photo.createdAt || new Date().toISOString(),
        blob: dataUrlToBlob(photo.dataUrl),
    }
}

function prepareImportedAudit(rawAudit) {
    const now = new Date().toISOString()
    const normalizedAudit = normalizeAuditRecord({
        ...rawAudit,
        id: undefined,
        createdAt: rawAudit.createdAt || now,
        updatedAt: now,
        items: Array.isArray(rawAudit.items)
            ? rawAudit.items.map((item) => ({
                ...item,
                id: crypto.randomUUID(),
                photos: Array.isArray(item.photos)
                    ? item.photos.map((photo) => deserializePhoto(photo)).filter((photo) => photo.blob)
                    : [],
            }))
            : [],
    })

    return {
        ...normalizedAudit,
        createdAt: normalizedAudit.createdAt || now,
        updatedAt: now,
    }
}

function triggerDownload(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = objectUrl
    anchor.download = fileName
    anchor.click()

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export async function buildAuditTransferBundle(audits, exportKind = 'single') {
    return {
        app: 'ops-audit-mvp',
        schemaVersion: TRANSFER_SCHEMA_VERSION,
        exportKind,
        exportedAt: new Date().toISOString(),
        audits: await Promise.all(audits.map((audit) => serializeAudit(audit))),
    }
}

export async function exportAuditToJsonFile(audit) {
    const bundle = await buildAuditTransferBundle([audit], 'single')
    const fileName = `${slugify(audit.facilityName)}-${audit.date || 'rozbor'}.json`

    triggerDownload(
        new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
        fileName,
    )
}

export async function exportAllAuditsToJsonFile(audits) {
    const bundle = await buildAuditTransferBundle(audits, 'all')

    triggerDownload(
        new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
        `ops-audit-mvp-all-${bundle.exportedAt.slice(0, 10)}.json`,
    )
}

export async function parseAuditTransferJson(jsonText) {
    const parsed = JSON.parse(jsonText)
    const rawAudits = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.audits)
            ? parsed.audits
            : parsed?.items
                ? [parsed]
                : []

    if (rawAudits.length === 0) {
        throw new Error('JSON neobsahuje žádný použitelný rozbor.')
    }

    return rawAudits.map((audit) => prepareImportedAudit(audit))
}

export function getJsonPhotoExportLimitations() {
    return 'Fotky se do JSON exportu převádějí do data URL, takže se zachovají i bez backendu, ale export může být u většího množství fotek výrazně větší.'
}