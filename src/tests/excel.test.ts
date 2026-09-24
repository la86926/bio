import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { createAnnualExport, createMonthlyExport, createTemplateWorkbook, parseBioLogWorkbook } from '../services/excel'
import { demoState } from '../data/demo'

describe('Excel BioLog',()=>{
  it('8. importa una plantilla Excel válida',()=>{
    const wb=createTemplateWorkbook()
    const data=XLSX.write(wb,{type:'array',bookType:'xlsx'})
    const result=parseBioLogWorkbook(data)
    expect(result.problems).toEqual([])
    expect(result.state?.areas).toHaveLength(1)
    expect(result.state?.samples).toHaveLength(1)
  })
  it('9. rechaza Excel incorrecto indicando hoja, fila y columna',()=>{
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['otra_columna'],['x']]),'Áreas')
    const result=parseBioLogWorkbook(XLSX.write(wb,{type:'array',bookType:'xlsx'}))
    expect(result.problems.length).toBeGreaterThan(0)
    expect(result.problems[0]).toHaveProperty('sheet')
    expect(result.problems[0]).toHaveProperty('row')
    expect(result.problems[0]).toHaveProperty('column')
  })
  it('10. exporta mes y año con las hojas requeridas',()=>{
    const year=demoState.settings.selectedYear
    const monthly=createMonthlyExport(demoState,year,3)
    expect(monthly.SheetNames).toEqual(expect.arrayContaining(['Resumen','Muestras','Jornales','Insumos']))
    const annual=createAnnualExport(demoState,year)
    expect(annual.SheetNames).toEqual(expect.arrayContaining(['Resumen anual','Resultados por mes','Jornales mensuales','Insumos mensuales','Muestras por análisis','Muestras por área']))
  })
})
