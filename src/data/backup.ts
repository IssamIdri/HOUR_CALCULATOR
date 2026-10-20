import { readDataset } from '../domain/sanitize.ts'
import { isRecord } from '../domain/sanitize.ts'
import type { BackupFile, Dataset } from '../domain/types.ts'

export function serializeBackup(dataset: Dataset, now = new Date()): string {
  const file: BackupFile = {
    version: 1,
    kind: 'restaurant-heures-backup',
    exportedAt: now.toISOString(),
    dataset,
  }
  return JSON.stringify(file, null, 2)
}

export function parseBackup(raw: string): { ok: true; dataset: Dataset } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Ce fichier n'est pas un JSON valide." }
  }
  if (!isRecord(parsed) || parsed.kind !== 'restaurant-heures-backup') {
    return { ok: false, error: "Ce fichier n'est pas une sauvegarde de l'application." }
  }
  if (parsed.version !== 1) {
    return { ok: false, error: "Cette version de sauvegarde n'est pas prise en charge." }
  }
  return readDataset(parsed.dataset, 'strict')
}
