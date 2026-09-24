# BioLog

BioLog es una aplicación web para convertir la producción semanal de un laboratorio en necesidades mensuales y anuales de **jornales e insumos físicos**. No maneja precios ni costos.

La regla central es:

**muestras procesadas → tipo de análisis → coeficientes → jornales + consumos → consolidación → presentaciones comerciales**

La aplicación está preparada para GitHub Pages y funciona desde navegadores de escritorio, tablet y móvil. Los datos se conservan localmente en IndexedDB y, cuando se configura Microsoft, pueden sincronizarse con una lista de SharePoint mediante Microsoft Graph.

## Funciones implementadas

- Catálogos configurables de áreas, análisis, insumos y reglas de consumo.
- Registro semanal con año, semana ISO, fechas, mes automático y corrección manual del mes.
- Cálculo centralizado de jornales y consumo exacto de insumos.
- Consolidación correcta de insumos compartidos antes de aplicar `CEIL` a las presentaciones.
- Análisis mensual con trazabilidad por análisis.
- Resumen anual de enero a diciembre.
- Gráficos mensuales de muestras, jornales e insumos.
- Importación `.xlsx` con validación por hoja, fila, columna y mensaje de error.
- Exportación mensual y anual a Excel.
- Respaldo y restauración JSON.
- Edición de catálogos en tablas y pegado masivo de filas desde Excel.
- Roles: Administrador, Responsable de área y Consulta.
- Auditoría básica con usuario, fecha y acción.
- IndexedDB para trabajo local y cambios pendientes ante cortes breves de Internet.
- Microsoft Identity Platform + MSAL + OAuth 2.0/PKCE; no se usan `client secrets`.
- Sincronización opcional con SharePoint mediante Microsoft Graph.
- GitHub Actions para pruebas, compilación y despliegue a GitHub Pages.

## Tecnologías

- React + TypeScript + Vite
- IndexedDB mediante `idb`
- SheetJS (`xlsx`)
- MSAL Browser
- Microsoft Graph
- Recharts
- Vitest
- GitHub Pages

## Desarrollo local

Requisitos: Node.js 22 o compatible.

```bash
npm install
npm test
npm run build
npm run dev
```

La compilación queda en `dist/`.

## Publicación en GitHub Pages

El repositorio usa GitHub Pages desde la rama `main`. Para mantener el código fuente y publicar una aplicación Vite compilada, `.github/workflows/deploy.yml`:

1. ejecuta `npm ci`;
2. ejecuta las pruebas;
3. compila BioLog con Vite;
4. publica automáticamente el bundle generado en `assets/`;
5. copia `biolog-config.json` y `BioLog_Ejemplo.xlsx` a la raíz pública.

El `index.html` detecta GitHub Pages y carga el bundle compilado. En desarrollo local carga `src/main.tsx` mediante Vite. No es necesario cambiar manualmente el origen de Pages.

URL pública:

`https://la86926.github.io/bio/`

## Estructura principal

```text
src/
  components/      Componentes de interfaz y gráficos
  context/         Estado global, auditoría y CRUD
  core/            Cálculos, fechas y validaciones
  data/            Datos demostrativos iniciales
  pages/           Pantallas de BioLog
  services/        IndexedDB, Excel, MSAL, Graph y sincronización
  tests/           Pruebas unitarias
  utils/           Formato numérico y meses
public/
  biolog-config.json
  BioLog_Ejemplo.xlsx
.github/workflows/
  deploy.yml
```

## Reglas de cálculo

### Jornales

```text
jornales = muestras × jornal_por_muestra
```

Los jornales conservan decimales. BioLog no fuerza el redondeo a enteros.

### Consumo exacto

```text
consumo = muestras × cantidad_por_muestra
```

### Presentaciones

```text
presentaciones = CEIL(consumo_total_consolidado / cantidad_por_presentacion)
```

El redondeo se aplica **después de sumar** las contribuciones de todos los análisis que usan el mismo insumo.

Ejemplo de control incluido en las pruebas:

- Análisis A: 100 muestras, 0.05 jornales/muestra, 2.5 ml de Reactivo X/muestra.
- Análisis B: 50 muestras, 0.10 jornales/muestra, 4 ml de Reactivo X/muestra.
- Reactivo X: frasco de 100 ml.

Resultado: 10 jornales, 450 ml exactos y 5 frascos.

## Plantilla Excel

BioLog acepta cinco hojas obligatorias. Los nombres y columnas deben mantenerse.

### Áreas

| columna | significado |
|---|---|
| `código_area` | identificador único |
| `nombre_area` | nombre visible |
| `activo` | sí/no, true/false o 1/0 |

### Análisis

| columna | significado |
|---|---|
| `código_analisis` | identificador único |
| `nombre_analisis` | nombre visible |
| `código_area` | área existente |
| `jornal_por_muestra` | coeficiente decimal no negativo |
| `activo` | estado |

### Insumos

| columna | significado |
|---|---|
| `código_insumo` | identificador único |
| `nombre_insumo` | nombre visible |
| `unidad_base` | unidad, ml, g, etc. |
| `presentación` | caja, frasco, kit, paquete, etc. |
| `cantidad_por_presentación` | capacidad mayor que 0 |
| `activo` | estado |
| `áreas` | opcional, códigos separados por coma |
| `observaciones` | opcional |

### Consumos

| columna | significado |
|---|---|
| `código_analisis` | análisis existente |
| `código_insumo` | insumo existente |
| `cantidad_por_muestra` | consumo no negativo |

### Muestras

| columna | significado |
|---|---|
| `año` | año del registro |
| `semana` | semana ISO |
| `fecha_inicio` | opcional; si está vacía se calcula |
| `fecha_fin` | opcional; si está vacía se calcula |
| `mes` | 1–12 o nombre; si está vacío se calcula |
| `código_area` | área existente |
| `código_analisis` | análisis existente |
| `cantidad_muestras` | entero o número no negativo |

La aplicación no importa si detecta inconsistencias. Muestra exactamente hoja, fila, columna y problema.

## Archivo de ejemplo

`public/BioLog_Ejemplo.xlsx` contiene el caso de control del motor. También se puede generar con:

```bash
npm run generate:example
```

## Microsoft Entra ID

BioLog es una SPA pública y usa MSAL con Authorization Code + PKCE. **No debe crearse ni guardarse un client secret en GitHub.**

1. En Microsoft Entra admin center crea una **App registration**.
2. En **Authentication → Add a platform → Single-page application**, agrega:
   - `https://la86926.github.io/bio/`
   - opcional para desarrollo: `http://localhost:5173/bio/`
3. En **API permissions** agrega permisos delegados:
   - `User.Read`
   - `Sites.ReadWrite.All`
   - `Files.ReadWrite.All` si se usarán exportaciones/respaldos en OneDrive.
4. Dependiendo de la política de la organización, un administrador de Microsoft 365 puede tener que conceder consentimiento a `Sites.ReadWrite.All`.
5. Copia el **Application (client) ID** y el **Directory (tenant) ID**.

Estos identificadores son públicos en una SPA; no son contraseñas.

## SharePoint

BioLog usa una lista de SharePoint como almacén remoto genérico de entidades. Crea una lista llamada, por ejemplo, `BioLogData` con estas columnas:

| columna | tipo recomendado |
|---|---|
| `Title` | Texto de una línea |
| `EntityType` | Texto de una línea |
| `EntityId` | Texto de una línea |
| `Payload` | Varias líneas de texto, texto sin formato |
| `UpdatedAt` | Texto de una línea o fecha/hora |
| `Deleted` | Sí/No |

`Payload` debe admitir contenido suficientemente largo; usa **varias líneas de texto**.

El modelo guarda cada área, análisis, insumo, regla, registro semanal, usuario y configuración como una entidad independiente. `UpdatedAt` permite resolver cambios tomando la versión más reciente.

### Obtener `siteId` y `dataListId`

Se pueden obtener con Microsoft Graph Explorer o Graph API, por ejemplo consultando el sitio y luego sus listas. Una vez obtenidos, edita `public/biolog-config.json`:

```json
{
  "microsoft": {
    "enabled": true,
    "clientId": "APPLICATION_CLIENT_ID",
    "tenantId": "DIRECTORY_TENANT_ID",
    "siteId": "SHAREPOINT_SITE_ID",
    "dataListId": "BIOLOG_DATA_LIST_ID",
    "usersListId": ""
  }
}
```

Después vuelve a compilar/desplegar. No coloques secretos en ese archivo.

## OneDrive

La aplicación ya solicita `Files.ReadWrite.All` para permitir una ampliación de respaldo/exportación directa a OneDrive. En la versión actual, el almacenamiento estructurado principal se realiza en SharePoint y los Excel/JSON se descargan desde el navegador. Esto mantiene el núcleo simple y evita mezclar el motor de datos con archivos binarios remotos.

## Permisos de BioLog

- **Administrador:** catálogos, reglas, Excel, usuarios, edición y consulta completa.
- **Responsable de área:** registro de muestras de las áreas asignadas y consulta.
- **Consulta:** visualización y exportación sin modificación.

Cuando Microsoft está desactivado, BioLog inicia en modo local con un administrador local para facilitar la configuración inicial.

## Sin conexión

Cada modificación se guarda en IndexedDB. Si Microsoft está activo y una sincronización no puede realizarse, la interfaz muestra cambios pendientes. Al recuperar conexión, BioLog intenta sincronizar el estado local.

Para trabajo multiusuario real, SharePoint debe configurarse antes de depender del acceso desde varios equipos.

## Seguridad y trazabilidad

- No hay secretos ni contraseñas en el repositorio.
- Eliminación lógica para registros sincronizables.
- Confirmación antes de eliminar desde la interfaz.
- `createdAt`, `updatedAt` y `updatedBy` en entidades.
- Registro básico de auditoría.
- Validaciones contra códigos duplicados, valores negativos, capacidades cero y relaciones inexistentes.

## Pruebas

`npm test` verifica, entre otros puntos:

- jornales por análisis y total;
- consumo exacto;
- consolidación de un mismo insumo en varios análisis;
- `CEIL` posterior a la consolidación;
- consolidado semanal, mensual y anual;
- filtros;
- recálculo después de editar datos;
- importación Excel válida;
- rechazo de Excel inválido con localización del error;
- estructura de exportaciones mensual y anual;
- validación de datos corruptos;
- recuperación estructural de respaldo;
- conservación del modo local cuando Microsoft no está configurado.

## Nota sobre sincronización multiusuario

El repositorio contiene toda la integración cliente necesaria, pero la prueba real de autenticación y escritura en SharePoint requiere valores pertenecientes a tu tenant de Microsoft 365 y consentimiento de permisos. Esa parte no puede verificarse con datos ficticios. La aplicación funciona localmente hasta que esos valores sean proporcionados.
