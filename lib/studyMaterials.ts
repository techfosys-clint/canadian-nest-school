export function materialsForBatch<T extends { batch?: unknown }>(
  materials: readonly T[] | undefined,
  batch: unknown,
): T[] {
  return (materials ?? []).filter(material =>
    !material.batch || (batch != null && String(material.batch) === String(batch)),
  )
}

export function matchesStudyMaterialFile(url: string, filename: string): boolean {
  try {
    const parsed = new URL(url, 'https://local.invalid')
    return parsed.pathname === '/api/study-materials/download' &&
      parsed.searchParams.get('file') === filename
  } catch {
    return false
  }
}
