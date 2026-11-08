# Endpoints implementados

Prefijo público /api. No implementa todas las operaciones de la arquitectura objetivo.

| Método | Ruta | Función |
|---|---|---|
|POST|/api/session|Inicio de sesión, sin token|
|GET|/api/me|Sesión actual|
|GET|/api/users|Usuarios (admin)|
|GET|/api/templates|Catálogo|
|GET|/api/templates/{templateId}|Plantilla|
|GET|/api/cases|Casos autorizados|
|POST|/api/cases|Crear caso|
|GET|/api/cases/{caseId}|Datos comunes del caso|
|PATCH|/api/cases/{caseId}/values|Corregir/registrar comunes|
|POST|/api/cases/{caseId}/validate|Validar comunes (revisor/admin)|
|POST|/api/cases/{caseId}/members|Autorizar miembro (admin)|
|GET|/api/instances?caseId=...|Listar instancias|
|POST|/api/instances|Crear instancia|
|GET|/api/instances/{instanceId}|Formulario resuelto|
|PATCH|/api/instances/{instanceId}/values|Guardar datos|
|POST|/api/instances/{instanceId}/review|Enviar a revisión|
|POST|/api/instances/{instanceId}/finalize|Conservar snapshot|
|POST|/api/instances/{instanceId}/correct|Iniciar corrección|
|GET|/api/instances/{instanceId}/snapshots|Versiones finales|
|GET|/api/audit|Trazabilidad (revisor/admin)|

## Reglas
Bearer JWT (salvo login). Escrituras con Idempotency-Key de 16–128 caracteres. Cambios de instancia: If-Match con versión entre comillas.

Crear caso: POST /api/cases con {"code":"DEMO-001","label":"Caso ficticio"}.
Crear instancia: POST /api/instances con {"caseId":"UUID","templateId":"donation","title":"Registro"}.
Guardar: PATCH /api/instances/{id}/values con {"specific":{"coordinator":"Ejemplo"},"shared":[{"key":"donor.name","value":"Persona ficticia","expectedVersion":0}]}.
Corregir comunes requiere reason cuando cambia un valor existente. Los campos específicos no se propagan.
Validación: POST /api/cases/{id}/validate con {"items":[{"key":"donor.name","expectedVersion":1}]}.
review/finalize: POST con {} y precondición If-Match. correct: POST con {"reason":"Motivo de corrección"}.
Errores JSON con title, status, code, correlationId y sharedCommitted si aplica.
/api/instances?caseId=UUID filtra las instancias del caso autorizado.
Consultar una instancia devuelve template, shared, specific, snapshots y version.