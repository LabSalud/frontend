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

# ACTUALIZACIONES

## IDEAS
- separar en el backend tema pagos de protocolos y hacer una app aparte
- App de facturacion
- Hacer de todo el sistema un software enlatado

## MAQUETAS