'use strict';const fs=require('node:fs'),crypto=require('node:crypto');
if(fs.existsSync('.env')){console.log('Ya existe .env. No se modificó. Conserva sus claves si ya sembraste usuarios o volúmenes.');process.exit(0)}
const vars={DEMO_MODE:'true',JWT_SECRET:crypto.randomBytes(48).toString('hex'),ADMIN_PASSWORD:crypto.randomBytes(24).toString('base64url'),OPERATOR_PASSWORD:crypto.randomBytes(24).toString('base64url'),REVIEWER_PASSWORD:crypto.randomBytes(24).toString('base64url')};
fs.writeFileSync('.env',Object.entries(vars).map(([k,v])=>k+'='+v).join('\n')+'\n',{flag:'wx',mode:0o600});console.log('.env creado. Usuarios: admin / operador / revisor. Consulta sus claves con grep; no compartas el archivo.');
