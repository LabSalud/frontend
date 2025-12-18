# ARREGLOS PRE DEPLOY

## Backend

##### REPORTING
- Terminar reporte de resumido

##### PROTOCOLS
- agregar funcionalidad de a reintegro en el pago de los protocolos 
- agregar tema de coseguro en los pagos 
- arreglar el status__in en las query params de listar los protocolos y demas filtros como search, por estado de pago y por si esta impreso o no
- arreglar endpoint de impresion de protocolo como esta en la documentacion de la api
- arreglar porque el send-email de protocolos devuelve esto (failed)net::ERR_NETWORK_CHANGED
- arreglar que al crear un protocolo no se haga un resultado de los analisis 660001 y 661001 (que son los de facturacion), pero si se debe agregar como analisis porque es necesario para la facturacion
- arreglar endpoint que deberia devolver los analisis que pertenecen a un protocolo con carga pendiente


##### AUDIT
- arreglar las frases de auditoria
- arreglar auditaje de usuarios para algunos cambios que se realizan automaticamente y el sistema lo toma como que no tiene usuario que haya hecho el cambio

---

## Frontend

#### NAVBAR
- agrreglar hambutton de navbar en telefono

#### INGRESO
- arreglar tabla de analisis para que no aparezca el scroll horizontal en desktop y mobile

#### CONFIGURACIONES
- pedir filtro de analisis y determinaciones de parametro is_active=true
- en el dialog para crear determinaciones y en el de editar determinaciones, eliminar el input de codigo porque este lo genera automaticamente el backend

#### PROTOCOLOS
- arreglar dialog de analisis para que no haya barra horizontal

#### PACIENTES
- arreglar la busqueda de pacientes por endpoint


# ACTUALIZACIONES

## IDEAS
- separar en el backend tema pagos de protocolos y hacer una app aparte
- refactorizar frontend sin cambiar mucha estetica
- App de facturacion
- Hacer de todo el sistema un software enlatado

## MAQUETAS