# ARREGLOS PRE DEPLOY

## Backend

##### AUTHENTICATION

##### REPORTING
- ⭕️ Terminar reporte de resumido

##### USERS_MANAGEMENT

##### PROTOCOLS
- ⭕️ agregar funcionalidad de a reintegro en el pago de los protocolos 
- ⭕️ agregar campo de coseguro en las ooss y el funcionamiento es que si o si ese se debe pagar para enviar el protocolo y forma parte del precio del protocolo

##### AUDIT
- ⭕️ arreglar las frases de auditoria
- ⭕️ arreglar auditaje de usuarios para algunos cambios que se realizan automaticamente y el sistema lo toma como que no tiene usuario que haya hecho el cambio

##### CATALOG
- ⭕️ actualizar tema de catalogos y que se puedan armar varios catalogos dependiendo de los que utilicen las diferentes obras sociales

##### INSURANCES
- ⭕️ agregar campo o algo que indique a que catalogo le pertenece cada obra social

##### ANALYTICS
- ⭕️ arreglar la estadistica de analisis realizados el dia de hoy
- ⭕️ arreglar la estadistica de pacientes atendidos el dia de hoy
- ⭕️ arreglar la estadistica de protocolos completados este mes
- ⭕️ arreglar el tiempo promedio de carga de resultados 

---

## Frontend

##### NAVBAR

##### INGRESO

##### INICIO

##### CONFIGURACIONES

##### PROTOCOLOS

##### PACIENTES

##### GESTION DE USUARIOS

##### RESULTADOS

##### FACTURACION

##### DIALOG DE INACTIVIDAD
- ⭕️ arreglar el dialog de inactiviadad para que los ultimos 5 o 10 segundos titile en rojo o algo para indicar que ya se termina el tiempo

##### TUTORIAL GUIADO (ONBOARDING)
- ⭕️ armar un tutorial paso a paso en las pantallas principales: **Ingreso**
  (`/ingreso`), **Protocolos** (`/protocolos`), **Pacientes** (`/pacientes`),
  **Resultados** (`/resultados`) y **Validación** (`/validacion`). Idea: un tour
  con globitos que resalten el elemento y expliquen qué hace, con botones
  *Siguiente / Anterior / Saltar*, que arranque solo la primera vez que el
  usuario entra a cada pantalla y se pueda volver a ver a mano desde un botón de
  ayuda (?) en el header de la página.

  Qué mostrar en cada una (borrador):
  - **Ingreso** — buscar/crear paciente (`patient-search.tsx`,
    `create-patient-dialog.tsx`), elegir médico y obra social
    (`medico-combobox.tsx`, `obra-social-combobox.tsx`), buscar y cargar
    análisis (`analysis-search.tsx`, `analysis-table.tsx`), el resumen de
    selección con el precio (`selection-info.tsx`) y confirmar el protocolo
    (`protocol-form.tsx` → `protocol-success.tsx`).
  - **Protocolos** — navegador de días (`navegador-de-dias.tsx`), filtros y
    estados de la tabla (`protocols-table.tsx`), acciones rápidas de la fila
    (`protocol-actions.tsx`), selección múltiple (`batch-action-bar.tsx`),
    envío por WhatsApp (`mensajes-de-whatsapp.tsx`) y el detalle
    (`protocol-detail-view.tsx`) con pagos.
  - **Pacientes** — buscador y tabla (`patients-table.tsx`), alta/edición,
    historial (`patient-history-dialog.tsx`) y sobre todo la **fusión de
    pacientes duplicados** (`merge-patient-dialog.tsx`), que es lo que más se
    presta a error.
  - **Resultados** — la cola de protocolos pendientes de carga
    (`results-queue-table.tsx`), cómo se carga cada determinación
    (`result-determination-row.tsx`), valores de referencia y fuera de rango,
    guardado parcial vs. cerrar la carga.
  - **Validación** — diferencia entre cargar y validar (quién puede hacer qué),
    revisión determinación por determinación (`validation-result-row.tsx`),
    validar todo junto, devolver a corrección y qué pasa después de validar
    (publicación / entrega del informe).

  A definir antes de arrancar:
  - Librería: hoy **no hay ninguna instalada** (ver `package.json`). Se puede
    usar `driver.js` / `react-joyride`, o armarlo a mano con
    `@radix-ui/react-popover`, que ya está y evita sumar dependencia.
  - Dónde se guarda el "ya lo vi": `localStorage` por navegador (rápido) o un
    campo por usuario en el backend (se mantiene entre PCs, que es lo real en el
    lab, donde se comparten máquinas).
  - Los pasos tienen que respetar permisos y rol: no mostrarle a una recepción
    pasos de validación que no puede tocar.
  - Hace falta agregarles `data-tour="..."` (o `id`) a los elementos que se van
    a resaltar; conviene hacerlo en la misma pasada.

##### BUSQUEDA — ESTADO
Se midió con 39 búsquedas realistas contra la base. **Empezaron fallando 20 y
hoy no falla ninguna por incapacidad**: las que vuelven vacías es porque el
dato no existe en la base de desarrollo (no hay protocolos de hoy, ni una nota
cargada, ni un cobro de ese importe).

Anda: cruce de palabras exigiendo TODAS, códigos, estados, fechas, conceptos de
cobro, estado de pago, valor y notas del resultado, valores numéricos,
domicilio y observaciones del paciente, el catálogo como columna propia,
cobertura por entidad, anclas por obra social y por médico, importes
tolerantes, teléfono y mail por adentro, plural/singular, abreviaturas del
laboratorio, ranking por campo y búsqueda por cómo suena el apellido.

**Decisiones tomadas, no olvidos**
- Buscar SOLO "sin cargar" o "fuera de rango", sin ningún nombre, no devuelve
  nada; combinados con una persona sí. Anclar por esos flags obliga a recorrer
  la tabla de resultados, que es la más grande del sistema, y para eso están
  los filtros de la pantalla de resultados. Ídem "debe" solo, que lista los
  cobros con deuda pero no los protocolos que nunca recibieron un pago.
- La búsqueda por parecido fonético corre SOLO cuando la exacta no encontró
  nada, y devuelve solo pacientes. Nunca compite con un resultado exacto.

**Lo que queda**
- ⭕️ **Abreviaturas del laboratorio.** El diccionario está armado
  (`SINONIMOS` en `global_search/services.py`) con unas veinte; las que faltan
  las sabe quien carga resultados todos los días. Agregar una es agregar una
  línea.
- ⭕️ **Recencia en el ranking.** Ya pesa el campo (el apellido más que el
  domicilio) pero no la fecha: un protocolo de 2019 compite de igual a igual
  con uno de hoy cuando el puntaje de texto empata.
- ⭕️ **El techo del cruce.** Arranca por los 200 pacientes más relevantes
  (`TOPE_CRUCE`), ahora priorizando a los que matchean el nombre COMPLETO. Con
  un padrón mucho más grande puede quedar corto igual.

# ACTUALIZACIONES

## IDEAS
- separar en el backend tema pagos de protocolos y hacer una app aparte
- App de facturacion
- Hacer de todo el sistema un software enlatado

## MAQUETAS