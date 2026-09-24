import { describe, expect, it } from 'vitest'
import type { BioLogState } from '../models'
import { calculateJournals, consolidateSupplies, journalsByMonth, samplesByMonth, totalJournals, totalSamples } from '../core/calculations'
import { demoState } from '../data/demo'

function fixture(): BioLogState {
  const meta = { createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',updatedBy:'test' }
  return {
    areas:[{id:'A',code:'A',name:'Área',active:true,...meta}],
    analyses:[
      {id:'ANA',code:'ANA',name:'Análisis A',areaId:'A',jornalPerSample:0.05,active:true,...meta},
      {id:'ANB',code:'ANB',name:'Análisis B',areaId:'A',jornalPerSample:0.10,active:true,...meta}
    ],
    supplies:[{id:'RX',code:'RX',name:'Reactivo X',baseUnit:'ml',presentation:'frasco',quantityPerPresentation:100,areaIds:['A'],active:true,...meta}],
    rules:[
      {id:'ANA|RX',analysisId:'ANA',supplyId:'RX',quantityPerSample:2.5,...meta},
      {id:'ANB|RX',analysisId:'ANB',supplyId:'RX',quantityPerSample:4,...meta}
    ],
    samples:[
      {id:'2026-1-ANA',year:2026,week:1,startDate:'2025-12-29',endDate:'2026-01-04',month:1,areaId:'A',analysisId:'ANA',sampleCount:100,...meta},
      {id:'2026-1-ANB',year:2026,week:1,startDate:'2025-12-29',endDate:'2026-01-04',month:1,areaId:'A',analysisId:'ANB',sampleCount:50,...meta}
    ],
    users:[],audit:[],settings:{roundJornalsToInteger:false,decimalPlaces:4,selectedYear:2026},pendingSync:false,schemaVersion:1
  }
}

describe('motor de cálculo BioLog',()=>{
  it('1. calcula jornales por análisis',()=>{
    const rows=calculateJournals(fixture(),{year:2026})
    expect(rows.find(x=>x.analysisId==='ANA')?.journals).toBe(5)
    expect(rows.find(x=>x.analysisId==='ANB')?.journals).toBe(5)
    expect(totalJournals(fixture(),{year:2026})).toBe(10)
  })
  it('2. calcula consumo exacto de insumos',()=>{
    const result=consolidateSupplies(fixture(),{year:2026})[0]
    expect(result.exactQuantity).toBe(450)
  })
  it('3. consolida el mismo insumo usado por varios análisis',()=>{
    const result=consolidateSupplies(fixture(),{year:2026})[0]
    expect(result.contributions).toHaveLength(2)
    expect(result.contributions.map(x=>x.exactQuantity).sort((a,b)=>a-b)).toEqual([200,250])
  })
  it('4. redondea presentaciones hacia arriba después de consolidar',()=>{
    expect(consolidateSupplies(fixture(),{year:2026})[0].presentations).toBe(5)
  })
  it('5. consolida semanalmente',()=>{
    expect(totalSamples(fixture(),{year:2026,week:1})).toBe(150)
    expect(totalJournals(fixture(),{year:2026,week:1})).toBe(10)
  })
  it('6. consolida mensualmente',()=>{
    expect(samplesByMonth(fixture(),{year:2026})[0]).toBe(150)
    expect(journalsByMonth(fixture(),{year:2026})[0]).toBe(10)
  })
  it('7. consolida anualmente',()=>{
    expect(totalSamples(fixture(),{year:2026})).toBe(150)
    expect(totalJournals(fixture(),{year:2026})).toBe(10)
  })
  it('11. aplica filtros de área, análisis e insumo',()=>{
    expect(totalSamples(fixture(),{year:2026,analysisId:'ANA'})).toBe(100)
    expect(consolidateSupplies(fixture(),{year:2026,supplyId:'RX'})[0].exactQuantity).toBe(450)
  })
  it('12. refleja ediciones de datos sin lógica duplicada',()=>{
    const state=fixture(); state.samples[0].sampleCount=200
    expect(totalJournals(state,{year:2026})).toBe(15)
  })
  it('mantiene el conjunto demostrativo calculable',()=>{
    expect(totalSamples(demoState,{year:demoState.settings.selectedYear})).toBeGreaterThan(0)
  })
})
