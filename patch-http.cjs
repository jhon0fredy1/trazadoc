'use strict';const fs=require('node:fs');const file='public/app.js';
if(!fs.existsSync(file))throw Error('Falta public/app.js. Debes estar en la carpeta que contiene public/, services/ y lib/.');
const s=fs.readFileSync(file,'utf8');if(s.includes('function requestId()')&&s.includes('c.getRandomValues(b)')){console.log('Esta versión ya incluye compatibilidad de identificadores con HTTP. No necesita parche.');process.exit(0)}
console.error('Versión de app.js no reconocida. No se modificó. Usa el frontend del paquete completo.');process.exit(1);
