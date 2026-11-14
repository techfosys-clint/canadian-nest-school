import { expect, it } from 'vitest'
import { materialsForBatch, matchesStudyMaterialFile } from './studyMaterials'

it('limits materials to shared items and the enrolled batch', () => {
  const materials = [
    { title: 'Shared' },
    { title: 'Batch A', batch: 'a' },
    { title: 'Batch B', batch: 'b' },
  ]
  expect(materialsForBatch(materials, 'a').map(item => item.title)).toEqual(['Shared', 'Batch A'])
  expect(materialsForBatch(materials, undefined).map(item => item.title)).toEqual(['Shared'])
})

it('requires the exact filename on a download URL', () => {
  expect(matchesStudyMaterialFile('/api/study-materials/download?file=batch%20a.pdf', 'batch a.pdf')).toBe(true)
  expect(matchesStudyMaterialFile('/api/study-materials/download?file=another-batch.pdf', 'batch.pdf')).toBe(false)
  expect(matchesStudyMaterialFile('https://example.com/batch.pdf', 'batch.pdf')).toBe(false)
})
