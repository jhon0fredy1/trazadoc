# Persistencia, concurrencia y seguridad

## Procesos
Gateway/web 3000; identidad 3001; catálogo 3002; casos 3003; formularios 3004. Docker publica únicamente 2900:3000. Las llamadas entre dominios usan HTTP por nombre de servicio. En modo local se usan direcciones loopback.

Los servicios mantienen archivos propios auth.json, cases.json y forms.json. Escritura con temporal, fsync y rename; transacción local basada en copia y confirmación síncrona. Una instancia por almacén; no constituye BD relacional ACID ni transacción distribuida.

El guardado coordinado actualiza comunes en Casos y específicos en Formularios. Si falla el segundo paso después de confirmar el primero, puede devolver sharedCommitted=true. Se debe recargar y conciliar: no existe rollback global.

La idempotencia se registra después de confirmar el negocio; hay una ventana ante caída del proceso. No garantiza exactamente una vez en todos los escenarios de reinicio. Para producción debe incluirse la idempotencia en una misma transacción de BD.

La finalización conserva los datos y versiones observados; no bloquea otros servicios de forma distribuida. Un cambio posterior no altera snapshots. Falta definir un protocolo completo de cierre/impacto para uso clínico.

## Seguridad
Scrypt con sal por usuario, JWT HS256 con emisor/audiencia/expiración, comprobación de permisos en cada servicio, límites de tamaño y control básico de intentos de login. El control de login usa la dirección de conexión del Gateway; no es rate limiting distribuido por usuario final.

Token solo en memoria del navegador; al recargar se inicia sesión de nuevo. Salida del usuario escapada. CSP restrictiva, anti-framing y protección MIME. Estos controles no sustituyen un análisis de seguridad completo.

Contraseñas iniciales solo se siembran una vez. No hay endpoint de cambio de clave, revocación inmediata, MFA, cifrado en reposo ni firma digital. El hash del snapshot no prueba que un administrador no lo haya alterado.

Proteger y respaldar juntos identidad, casos y formularios. La prueba de reinicio no equivale a ensayo de restauración de backups.
