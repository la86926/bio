import * as XLSX from 'xlsx'
import { mkdirSync } from 'node:fs'
mkdirSync('public',{recursive:true})
const wb=XLSX.utils.book_new()
const add=(name,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),name)
add('Áreas',[
 {código_area:'MIC',nombre_area:'Microbiología',activo:true},
 {código_area:'HEM',nombre_area:'Hematología',activo:true}
])
add('Análisis',[
 {código_analisis:'ANA-A',nombre_analisis:'Análisis A',código_area:'MIC',jornal_por_muestra:0.05,activo:true},
 {código_analisis:'ANA-B',nombre_analisis:'Análisis B',código_area:'MIC',jornal_por_muestra:0.10,activo:true}
])
add('Insumos',[{código_insumo:'RX',nombre_insumo:'Reactivo X',unidad_base:'ml',presentación:'frasco',cantidad_por_presentación:100,activo:true,áreas:'MIC',observaciones:'Ejemplo obligatorio'}])
add('Consumos',[
 {código_analisis:'ANA-A',código_insumo:'RX',cantidad_por_muestra:2.5},
 {código_analisis:'ANA-B',código_insumo:'RX',cantidad_por_muestra:4}
])
add('Muestras',[
 {año:2026,semana:1,fecha_inicio:'',fecha_fin:'',mes:'Enero',código_area:'MIC',código_analisis:'ANA-A',cantidad_muestras:100},
 {año:2026,semana:1,fecha_inicio:'',fecha_fin:'',mes:'Enero',código_area:'MIC',código_analisis:'ANA-B',cantidad_muestras:50}
])
XLSX.writeFile(wb,'public/BioLog_Ejemplo.xlsx')
