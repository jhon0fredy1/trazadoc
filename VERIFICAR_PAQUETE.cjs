'use strict';const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const required=['public/index.html','public/app.js','public/styles.css','services/auth.js','services/catalog.js','services/cases.js','services/forms.js','services/gateway.js','lib/core.js','lib/templates.js','compose.yaml','Dockerfile','init-env.cjs'];
let bad=false;for(const f of required){const ok=fs.existsSync(f);console.log((ok?'OK   ':'FALTA ')+f);if(!ok)bad=true;else if(/\.(js|cjs)$/.test(f))try{execFileSync(process.execPath,['--check',f])}catch{bad=true}}
if(bad)process.exit(1);console.log('\nPaquete completo y archivos JavaScript con sintaxis válida.');
