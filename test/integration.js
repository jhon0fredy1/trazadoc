'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),{spawn}=require('node:child_process');
const project=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'trazadoc-full-')),port=20000+Math.floor(Math.random()*2000),root='http://127.0.0.1:'+port;
const env={...process.env,PORT:String(port),AUTH_PORT:String(port+1),CATALOG_PORT:String(port+2),CASES_PORT:String(port+3),FORMS_PORT:String(port+4),AUTH_URL:'http://127.0.0.1:'+(port+1),CATALOG_URL:'http://127.0.0.1:'+(port+2),CASES_URL:'http://127.0.0.1:'+(port+3),FORMS_URL:'http://127.0.0.1:'+(port+4),DATA_DIR:dir,DEMO_MODE:'true',JWT_SECRET:crypto.randomBytes(48).toString('hex'),ADMIN_PASSWORD:'Test-Admin-2026!',OPERATOR_PASSWORD:'Test-Operator-2026!',REVIEWER_PASSWORD:'Test-Reviewer-2026!',BIND_HOST:'127.0.0.1',SERVICE_HOST:'127.0.0.1'};
let proc,log='',count=0;
function check(name,fn){fn();count++;console.log('OK '+String(count).padStart(2,'0')+' · '+name)}
async function start(){proc=spawn(process.execPath,[path.join(project,'start.js')],{env,stdio:['ignore','pipe','pipe']});proc.stdout.on('data',x=>log+=x);proc.stderr.on('data',x=>log+=x);for(let n=0;n<100;n++){try{await Promise.all([port,port+1,port+2,port+3,port+4].map(async p=>{const r=await fetch('http://127.0.0.1:'+p+'/health');if(!r.ok)throw Error()}));return}catch{await new Promise(r=>setTimeout(r,80))}}throw Error('No inició: '+log)}
async function stop(){if(proc&&proc.exitCode===null){const p=new Promise(r=>proc.once('exit',r));proc.kill('SIGTERM');await p}proc=null}
async function req(p,m='GET',b,t,h={}){const headers={'Content-Type':'application/json',...h};if(t)headers.Authorization='Bearer '+t;if(m!=='GET'&&!headers['Idempotency-Key'])headers['Idempotency-Key']=crypto.randomUUID();const r=await fetch(root+p,{method:m,headers,...(b===undefined?{}:{body:JSON.stringify(b)})});return {status:r.status,body:await r.json(),headers:r.headers}}
const key=()=>crypto.randomUUID();async function login(username,password){const r=await req('/api/session','POST',{username,password});assert.equal(r.status,200);return r.body.token}
(async()=>{try{await start();
let r=await req('/api/cases');check('Rechaza acceso sin sesión',()=>assert.equal(r.status,401));
r=await req('/api/session','POST',{username:'admin',password:'incorrecta'});check('Rechaza contraseña inválida',()=>assert.equal(r.status,401));
const a=await login('admin',env.ADMIN_PASSWORD),o=await login('operador',env.OPERATOR_PASSWORD),v=await login('revisor',env.REVIEWER_PASSWORD);check('Tres perfiles inician sesión',()=>assert.ok(a&&o&&v));
r=await req('/api/cases','GET',undefined,a.slice(0,-5)+'AAAAA');check('Rechaza token alterado',()=>assert.equal(r.status,401));
r=await req('/api/templates','GET',undefined,o);check('Catálogo con tres plantillas',()=>assert.equal(r.body.length,3));
const k=key(),bcase={code:'DEMO-TEST',label:'Caso ficticio de prueba'};r=await req('/api/cases','POST',bcase,o,{'Idempotency-Key':k});const c=r.body;check('Crear caso',()=>assert.equal(r.status,201));
r=await req('/api/cases','POST',bcase,o,{'Idempotency-Key':k});check('Reintento idempotente devuelve el mismo caso',()=>assert.equal(r.body.id,c.id));
r=await req('/api/cases','POST',{code:'OTRO',label:'otro'},o,{'Idempotency-Key':k});check('Clave reutilizada con otro cuerpo genera conflicto',()=>assert.equal(r.status,409));
r=await req('/api/instances','POST',{caseId:c.id,templateId:'donation'},o);const i=r.body;check('Crear formulario',()=>assert.equal(r.status,201));
const values={'donor.code':'FICTICIO-001','donor.name':'Persona ficticia','donor.deathCause':'Causa ficticia','donor.deathAt':'2026-11-04T12:00','institution.origin':'IPS ficticia'};const items=Object.entries(values).map(([key,value])=>({key,value,expectedVersion:0}));
r=await req('/api/instances/'+i.id+'/values','PATCH',{specific:{coordinator:'Operador de prueba'},shared:items},o,{'If-Match':'"1"'});check('Guardar comunes y específicos',()=>assert.equal(r.status,200));
const second=(await req('/api/instances','POST',{caseId:c.id,templateId:'extraction'},o)).body;let f=(await req('/api/instances/'+second.id,'GET',undefined,o)).body;check('Otro formulario recupera comunes',()=>assert.equal(f.shared.find(x=>x.key==='donor.name').value,values['donor.name']));
r=await req('/api/instances/'+i.id+'/review','POST',{},o,{'If-Match':'"2"'});check('Bloquea revisión sin validar comunes',()=>assert.equal(r.status,422));
const cc=(await req('/api/cases/'+c.id,'GET',undefined,v)).body;const validation=Object.entries(cc.values).map(([key,x])=>({key,expectedVersion:x.version}));
r=await req('/api/cases/'+c.id+'/validate','POST',{items:validation},o);check('Operador no valida',()=>assert.equal(r.status,403));
r=await req('/api/cases/'+c.id+'/validate','POST',{items:validation},v);check('Revisor valida',()=>assert.equal(r.status,200));
r=await req('/api/instances/'+i.id+'/review','POST',{},o,{'If-Match':'"2"'});check('Enviar a revisión',()=>assert.equal(r.status,200));
r=await req('/api/instances/'+i.id+'/finalize','POST',{},o,{'If-Match':'"3"'});check('Operador no finaliza',()=>assert.equal(r.status,403));
r=await req('/api/instances/'+i.id+'/finalize','POST',{},v,{'If-Match':'"3"'});const snap=r.body.snapshots[0],original=JSON.stringify(snap);check('Revisor crea snapshot final',()=>{assert.equal(r.status,200);assert.ok(snap.hash)});
r=await req('/api/instances/'+i.id+'/values','PATCH',{specific:{coordinator:'Cambio'},shared:[]},o,{'If-Match':'"4"'});check('Finalizado bloquea edición directa',()=>assert.equal(r.status,409));
r=await req('/api/cases/'+c.id+'/values','PATCH',{items:[{key:'donor.name',value:'Corrección ficticia',expectedVersion:1}]},o);check('Corregir requiere motivo',()=>assert.equal(r.status,422));
r=await req('/api/cases/'+c.id+'/values','PATCH',{items:[{key:'donor.name',value:'Corrección ficticia',expectedVersion:1,reason:'Ajuste ficticio de prueba'}]},o);check('Corrección válida se guarda',()=>assert.equal(r.status,200));
f=(await req('/api/instances/'+second.id,'GET',undefined,o)).body;check('Borrador recupera corrección',()=>assert.equal(f.shared.find(x=>x.key==='donor.name').value,'Corrección ficticia'));
r=await req('/api/instances/'+i.id+'/snapshots','GET',undefined,v);check('Snapshot anterior no cambia',()=>assert.equal(JSON.stringify(r.body[0]),original));
r=await req('/api/cases/'+c.id+'/values','PATCH',{items:[{key:'donor.name',value:'Otra',expectedVersion:1,reason:'Prueba obsoleta'}]},o);check('Conflicto de versión compartida',()=>assert.equal(r.status,409));
const ac=(await req('/api/cases','POST',{code:'SOLO-ADMIN',label:'Otro caso'},a)).body;r=await req('/api/cases/'+ac.id,'GET',undefined,o);check('Otro caso no autorizado no es visible',()=>assert.equal(r.status,404));
const oi=(await req('/api/instances','POST',{caseId:ac.id,templateId:'donation'},a)).body;f=(await req('/api/instances/'+oi.id,'GET',undefined,a)).body;check('No mezcla datos entre casos',()=>assert.ok(f.shared.every(x=>!x.value)));
r=await req('/api/instances/'+second.id+'/values','PATCH',{specific:{team:'Equipo'},shared:[]},o);check('Exige If-Match',()=>assert.equal(r.status,428));
const concurrent=await Promise.all([1,2].map(n=>req('/api/instances/'+second.id+'/values','PATCH',{specific:{team:'Equipo '+n},shared:[]},o,{'If-Match':'"1"'})));check('Solo una edición concurrente gana',()=>{assert.equal(concurrent.filter(x=>x.status===200).length,1);assert.ok(concurrent.some(x=>[409,412].includes(x.status)))});
r=await req('/api/cases/'+c.id+'/values','PATCH',{items:[{key:'unknown',value:'x',expectedVersion:0}]},o);check('Rechaza campos desconocidos',()=>assert.equal(r.status,422));
r=await req('/api/audit','GET',undefined,v);check('Auditoría contiene finalización',()=>assert.ok(r.body.some(x=>x.action==='FORM_FINALIZED')));
const hp=await fetch(root+'/');check('Frontend y CSP disponibles',()=>{assert.equal(hp.status,200);assert.ok(hp.headers.get('content-security-policy'))});
const js=await fetch(root+'/app.js');check('JavaScript servido',()=>assert.equal(js.status,200));
await stop();await start();r=await req('/api/instances/'+i.id+'/snapshots','GET',undefined,v);check('Datos sobreviven reinicio',()=>assert.equal(JSON.stringify(r.body[0]),original));
const source=fs.readFileSync(path.join(project,'public/app.js'),'utf8'),helper=source.slice(source.indexOf('function requestId()'),source.indexOf('\nfunction toast'));const ctx={globalThis:{crypto:{getRandomValues:b=>crypto.randomFillSync(b)}}};vm.createContext(ctx);vm.runInContext(helper,ctx);const ids=new Set();for(let k=0;k<1000;k++)ids.add(vm.runInContext('requestId()',ctx));check('Frontend compatible sin randomUUID',()=>{assert.equal(ids.size,1000);assert.ok([...ids].every(x=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(x)))});
const users=(await req('/api/users','GET',undefined,a)).body;const operator=users.find(x=>x.username==='operador');r=await req('/api/cases/'+ac.id+'/members','POST',{userId:operator.id},a);r=await req('/api/cases/'+ac.id,'GET',undefined,o);check('Admin autoriza operador en otro caso',()=>assert.equal(r.status,200));
console.log('\nRESULTADO: '+count+' pruebas aprobadas.');
}catch(e){console.error(e.stack+'\n'+log);process.exitCode=1}finally{await stop();fs.rmSync(dir,{recursive:true,force:true})}})();
