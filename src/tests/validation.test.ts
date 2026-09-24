import { describe, expect, it } from 'vitest'
import { validateState } from '../core/validation'
import { demoState } from '../data/demo'

describe('validaciones y recuperación',()=>{
  it('13. detecta datos inválidos antes de sincronizar o guardar',()=>{
    const state=structuredClone(demoState)
    state.supplies[0].quantityPerPresentation=0
    state.samples[0].sampleCount=-1
    const issues=validateState(state)
    expect(issues.some(x=>x.message.includes('mayor que cero'))).toBe(true)
    expect(issues.some(x=>x.message.includes('muestras'))).toBe(true)
  })
  it('14. permite recuperar un estado serializado sin pérdida estructural',()=>{
    const restored=JSON.parse(JSON.stringify(demoState))
    expect(restored.schemaVersion).toBe(1)
    expect(restored.areas.length).toBe(demoState.areas.length)
    expect(restored.rules.length).toBe(demoState.rules.length)
  })
})
