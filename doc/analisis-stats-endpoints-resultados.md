# Análisis: estadísticas del inicio, endpoints y rediseño de Resultados

## A. Estadísticas del inicio (dashboard)

### Mantener (accionables en el día a día)
- **Pendientes de carga / de validación** — dirigen el trabajo. *Mejorar:* agregar antigüedad del más viejo ("hay 3 sin cargar hace +2 días").
- **Impresos con pago incompleto** — riesgo real (se entregó sin cobrar). Mantener.
- **Caja de hoy** (`today_cash_revenue`) con su breakdown — clave. Mantener.
- **Serie diaria 7 días** (carrusel) — tendencia. Mantener.
- **Bloqueos** (`missing_info`, `preauth_breakdown`) — qué destraba protocolos. Mantener, idealmente linkeando a la lista filtrada.
- **ARCA mes** (facturado/pendiente/error) — mantener; el `failed` debería resaltar.

### Quitar o mover a una sección de "reportes" (no son del día a día)
- **`protocols_completed_growth_percent`** — métrica de vanidad, poco accionable a diario.
- **`insurance_mix_month`** — interesante para gestión, no para operar. Moverlo a un panel de reportes/mensual.
- **`analysis_today` / `patients_today`** sueltos — bajo valor informativo por sí solos; sirven más dentro de la serie diaria.

### Dar más detalle
- **`avg_result_load_time_human`** — agregar tendencia (mejora/empeora) y, si se puede, discriminar por bioquímico/turno.
- **Pendientes de validación** — desglosar por antigüedad y, opcional, por analista.
- **Bloqueos** — cada número debería ser un link que abra Protocolos ya filtrado (ej: "info faltante").

**Regla general:** el inicio debería responder "¿qué tengo que hacer HOY y qué está trabado?", no "¿cómo venimos el mes?". Lo mensual/gestión, a otra pestaña.

---

## B. Endpoints — over/under-fetch y memoria

### 🔴 `InfiniteScrollPagination` no devuelve `count`
`get_paginated_response` sólo manda `next` + `results`. Pero `LimitOffsetPagination` **ya computa `self.count`** en cada request (hace el `.count()`), así que **omitirlo no ahorra nada** y encima rompía el total ("undefined de undefined").
- **Cambio (gratis):** agregar `('count', self.count)` al `OrderedDict`. Arregla el total en Protocolos y Pacientes sin costo extra.

### 🟡 Listado de protocolos "completo" (`ProtocolListSerializer`, sin `?view=table`)
Sigue siendo pesado: `get_protocol_payment_info` se llamaba ~9×/fila (lo memoicé) y arma breakdown + auditoría + unplanned por fila. La tabla nueva usa `?view=table` (slim) — bien. **Recomendación:** dejar el serializer completo sólo para donde de verdad se necesita; si algún consumidor usa el listado completo "por las dudas", migrarlo a `?view=table`.

### 🟡 Detalle de protocolo — falta `is_loaded` por análisis
`ProtocolDetailSerializer` trae `is_valid` pero no si el resultado está **cargado sin validar**. Por eso el badge de código no puede pintar amarillo.
- **Cambio:** agregar `is_loaded` (bool) por análisis = existe al menos un `Result` con `value` no vacío. El front ya lo consume (badge gris/amarillo/verde).

### 🟢 Pacientes — búsqueda por DNI en la lista
`search_fields` no incluye `dni` (por diseño del ingreso). En la **lista de gestión** conviene que el buscador encuentre por DNI: agregar `'dni'` a `search_fields` (no afecta la identidad DNI+sexo del ingreso).

### 🟢 Home dashboard — 1 request pesado
Trae muchísimo en una sola llamada (serie diaria, mix OOSS, caja con breakdown, ARCA, bloqueos, promedios). Está bien como pantalla única, pero varias de esas agregaciones son costosas y algunas no se muestran siempre. **Recomendación:** si se quita `insurance_mix`/growth del inicio (sección A), sacarlos también del payload del dashboard y exponerlos en un endpoint de reportes aparte → menos cómputo por carga de inicio.

### 🟢 Endpoints ya correctos
- `POST /protocols/quote/` (cotización) — reusa la lógica de creación, exacto.
- `GET /protocols/:id/` — una sola llamada, completo, sin waterfalls.
- `GET /protocols/?patient=:id&view=table` — ficha del paciente, liviano.

---

## C. Rediseño de Resultados — plan + datos

Estado actual: `results-page` con 2 tabs (Por Análisis / Por Protocolo) y **acordeones de ~1.188 líneas c/u**. Objetivo: **lista + página por protocolo**, contenedor único, toggles como Protocolos, y mantener el flujo de carga con **Enter** (bajar al siguiente/anterior campo).

### Estructura propuesta
- **`/resultados`** — contenedor único: título · búsqueda · (Filtros popover). Toggles de estado con la estética de Protocolos (Pend. carga / Pend. validación). **Tabla** de protocolos con resultados a cargar: paciente, obra social, **progreso (cargados/validados de N)**, antigüedad, fila → detalle.
- **`/resultados/:protocolId`** — página de carga: cabecera del protocolo (paciente, estado) + los análisis con sus determinaciones para cargar valores. Se **reutiliza el componente de carga actual** (`analysis-input`, con el Enter→siguiente/anterior, fórmulas y rangos de referencia) dentro del nuevo shell; se retira el acordeón.
- Tab "Por Análisis" (cargar el mismo análisis en varios protocolos) se mantiene como modo alternativo, también en tabla.

### Datos que hoy faltan / convienen del backend
1. **Progreso por protocolo en el listado** — `loaded_count` / `total_count` / `validated_count` por protocolo para la columna de progreso. (`protocols-with-loaded-results` ya trae algo; confirmar que incluya total y validados; si no, agregarlo.)
2. **`is_loaded`** por análisis (mismo que B) — para marcar en el detalle qué análisis ya tienen valor.
3. **Endpoint de carga por protocolo** — `GET /results/results/by-protocol/:id/` ya existe; confirmar que devuelva determinaciones + valores + `reference_range_evaluation` en una sola llamada (evitar N requests por determinación).

### Por qué lo dejo como próximo paso
Es un refactor grande (2 acordeones de ~1.2k líneas + `analysis-input` + batch update + navegación por teclado). Hacerlo bien = 1 sesión enfocada. La infra ya está lista (DataTable, contenedor, toggles, StatusPill) para acelerarlo.
