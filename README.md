# TrazaDoc completo — Aplicación + Docker público 2900

Versión 0.1.1. Este ZIP SÍ contiene el código de la aplicación, no solo la configuración.

## Estructura que debe aparecer al descomprimir

```
TrazaDoc/
  public/          Interfaz web (index.html, app.js, styles.css, api.html)
  services/        auth.js, catalog.js, cases.js, forms.js, gateway.js
  lib/             core.js, templates.js
  test/            integration.js
  docs/            API, límites e informe de pruebas
  compose.yaml
  Dockerfile
  .dockerignore
  .env.example
  init-env.cjs
  patch-http.cjs
  VERIFICAR_PAQUETE.cjs
  start.js
  package.json
```

## Linux con Docker instalado: instalación nueva

Descomprime y ENTRA en la carpeta TrazaDoc. Los comandos se ejecutan allí, no en la carpeta que contiene el ZIP.

```bash
unzip TrazaDoc_COMPLETO_Puerto_2900.zip
cd TrazaDoc
ls public/app.js services/gateway.js lib/core.js compose.yaml
```

Verifica sin instalar Node en el host:

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$PWD:/work" -w /work \
  node:22-alpine node VERIFICAR_PAQUETE.cjs
```

Crea contraseñas aleatorias antes del primer arranque:

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$PWD:/work" -w /work \
  node:22-alpine node init-env.cjs
```

Si .env existe, no se modifica. Consulta las credenciales en una sesión privada:

```bash
grep -E '^(ADMIN_PASSWORD|OPERATOR_PASSWORD|REVIEWER_PASSWORD)=' .env
```

Usuarios: `admin`, `operador`, `revisor`. No envíes la salida ni el archivo .env en capturas o chats.

Construye y levanta:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:2900/health
```

Abre `http://TU_IP_PUBLICA:2900`. Si hay router delante: TCP WAN 2900 → IP LAN del servidor:2900. Docker hace el mapeo host 2900 → Gateway 3000. No abrir 3001–3004.

El Compose contiene cinco servicios. Solo Gateway tiene ports. La red backend es interna y Gateway comparte una red de entrada. Los volúmenes se llaman auth_data, cases_data y forms_data bajo el proyecto trazadoc-mvp.

## Ya no necesitas aplicar patch-http.cjs

El frontend de este paquete usa identificadores generados mediante crypto.randomUUID si está disponible y crypto.getRandomValues si no. No usa Math.random. Ejecutar `patch-http.cjs` solo comprueba que esa compatibilidad está presente y no modifica archivos.

Esto NO añade TLS. HTTP transmite credenciales y contenido sin cifrar. Restringe el acceso por IP o VPN y usa solo datos ficticios. Para HTTPS en el puerto 2900 necesitas un proxy TLS publicado como 2900:443 con un certificado válido y Gateway sin puerto público.

## Si ya tenías un despliegue o .env

1. No elimines volúmenes ni auth.json. Respalda todos los datos y el .env antes de cambiar de versión.
2. Conserva el mismo archivo .env para no confundir las contraseñas que usaste al sembrar usuarios. Si instalas en una carpeta nueva, copia allí tu .env anterior sin publicarlo.
3. Conserva el nombre de proyecto Compose anterior. El archivo usa trazadoc-mvp, igual al paquete original; si usaste `-p`, mantén ese nombre.
4. Detén los contenedores previos y luego reconstruye con el código completo. No ejecutes dos instancias sobre los mismos archivos JSON.
5. Verifica usuarios, casos y snapshots antes de continuar. No incluye migraciones automáticas de datos.

El modelo de datos local se mantiene compatible en los campos principales (auth, cases, instances, snapshots) con el MVP anterior, pero no se ha probado la actualización sobre tus volúmenes reales. Usa respaldo y una copia aislada antes de actualizar datos que quieras conservar.

Cambiar ADMIN_PASSWORD en .env DESPUÉS de crear auth.json no cambia el usuario existente. No borres solo los usuarios: sus IDs se relacionan con los casos. `docker compose down -v` ELIMINA todos los datos de los volúmenes.

## Recorrido funcional

1. Operador crea un caso ficticio.
2. Abre Registro documental de donación, ingresa datos ficticios y guarda.
3. Crea Acta documental de extracción en el mismo caso y comprueba los comunes recuperados.
4. Revisor abre el caso y valida los comunes.
5. Completa específicos, guarda y envía a revisión.
6. Revisor finaliza. La versión final conserva valores, fuentes, hash y responsable.
7. Abre esa versión y usa Imprimir / guardar PDF en el navegador.
8. Correcciones de comunes requieren motivo y nueva validación. Borradores leen el valor vigente al recargar; snapshots anteriores no cambian.

El administrador puede autorizar el operador en un caso creado por otro usuario. El revisor puede ver todos los casos de la única institución ficticia.

## Logs y operación

```bash
docker compose logs -f gateway
docker compose logs --tail=100 auth cases forms
docker compose restart
docker compose down
```

Si localmente funciona y remotamente no, revisa NAT, IP pública, firewall del proveedor y CGNAT. Docker puede publicar puertos fuera del filtrado habitual de UFW; controla el acceso desde el firewall del proveedor/router o reglas compatibles con Docker. No deshabilites las reglas de red de Docker.

## Pruebas

Con Node 20 o superior en tu equipo:

```bash
node test/integration.js
```

También puedes probar desde un contenedor temporal con red propia y directorio temporal de datos (no usa tus volúmenes):

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$PWD:/work:ro" -w /work \
  node:22-alpine node test/integration.js
```

Se comprobaron 34 pruebas con procesos Node reales y datos aislados. Se incluyeron reutilización, versiones, roles, concurrencia, persistencia y generación de IDs sin randomUUID. El reporte está en docs/PRUEBAS.txt. No se ejecutó Docker Compose ni una prueba interactiva de navegador en el entorno de construcción.

## Ejecución local sin Docker

```bash
node start.js
```

Abre http://localhost:3000. No requiere npm install. Con .env se usan las credenciales de ese archivo. Sin .env usa contraseñas públicas de demostración (Admin-Demo-2026!, Operador-Demo-2026!, Revisor-Demo-2026!), por lo que esa modalidad solo sirve para pruebas locales. No ejecutar local y Docker simultáneamente sobre el mismo conjunto de datos.

## Límites

MVP académico, SOLO DATOS FICTICIOS. No es sistema clínico, no autoriza donación ni implementa decisiones de asignación de órganos.

- JSON local por dominio; no MariaDB ni soporte multi-réplica.
- Plantillas en código, no editor de catálogo productivo.
- Recuperación desde la fuente al consultar, no RabbitMQ ni sincronización push.
- PDF mediante navegador, no firma digital, sellado de tiempo ni PDF del servidor.
- Identidad local, no OIDC institucional, MFA o revocación inmediata.
- IA y adjuntos externos no conectados; no se simulan resultados.
- La auditoría puede ser alterada por un administrador de disco: no es almacenamiento WORM.

Antes de datos reales se requieren revisión jurídica y clínica, persistencia transaccional, cifrado, autenticación institucional, retención, respaldos y restauración, evaluación de seguridad y controles de producción.
