# ARREGLOS PRE DEPLOY

## Backend

##### AUTHENTICATION
✅ acortar tiempo de la request de token por medio de llamados a bd

##### REPORTING
⭕️ Terminar reporte de resumido

##### PROTOCOLS
- ⭕️ agregar funcionalidad de a reintegro en el pago de los protocolos 
- ⭕️ agregar campo de coseguro en las ooss y el funcionamiento es que si o si ese se debe pagar para enviar el protocolo y forma parte del precio del protocolo
- ⭕️ agregar que no se transforme a precio del ub sino que se mantengan los ub y se hagan en vivo las muestras de lo que se estaria pagando hasta que el paciente lo pague o hasta que se facture a la obra social en ese momento se toma el valor de ub de la ooss y se hace la conversion.
- ✅ arreglar el status__in en las query params de listar los protocolos y demas filtros como search, por estado de pago y por si esta impreso o no
- ✅  arreglar endpoint de impresion de protocolo como esta en la documentacion de la api
- ✅ arreglar porque el send-email de protocolos devuelve esto (failed)net::ERR_NETWORK_CHANGED
- ✅ arreglar que al crear un protocolo no se haga un resultado de los analisis 660001 y 661001 (que son los de facturacion), pero si se debe agregar como analisis porque es necesario para la facturacion
- ✅ arreglar estado de envio fallido poner que se evalue
- ✅ arreglar que el estado del protocolo pueda cambiar de envio fallido a completado cuando se reenvia. de igual manera que se marque el campo de is_printed

##### AUDIT
- ⭕️ arreglar las frases de auditoria
- ⭕️ arreglar auditaje de usuarios para algunos cambios que se realizan automaticamente y el sistema lo toma como que no tiene usuario que haya hecho el cambio

##### ANALYTICS
- ⭕️ arreglar la estadistica de analisis realizados el dia de hoy
- ⭕️ arreglar la estadistica de pacientes atendidos el dia de hoy
- ⭕️ arreglar la estadistica de protocolos completados este mes
- ⭕️ arreglar el tiempo promedio de carga de resultados 

---

## Frontend

##### NAVBAR
- ✅ agrreglar hambutton de navbar en telefono

##### INGRESO
- ✅ arreglar tabla de analisis para que no aparezca el scroll horizontal en desktop y mobile

##### INICIO
- ✅ arreglar el porcentaje de mas en crecimiento

##### CONFIGURACIONES
- ✅ pedir filtro de analisis y determinaciones de parametro is_active=true
- ✅ en el dialog para crear determinaciones y en el de editar determinaciones, eliminar el input de codigo porque este lo genera automaticamente el backend

##### PROTOCOLOS
- ✅ arreglar dialog de analisis para que no haya barra horizontal

##### PACIENTES
- ✅ arreglar la busqueda de pacientes por endpoint

##### GESTION DE USUARIOS
- ✅ arreglar que no aparecen los roles de los usuarios en la lista

##### RESULTADOS
- ✅ agregar estado de envio fallido en los toogles de filtro


# ACTUALIZACIONES

## IDEAS
- separar en el backend tema pagos de protocolos y hacer una app aparte
- refactorizar frontend sin cambiar mucha estetica
- App de facturacion
- Hacer de todo el sistema un software enlatado

## MAQUETAS