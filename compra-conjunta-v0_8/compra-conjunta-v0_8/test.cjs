const assert=require('node:assert/strict'),{server}=require('./server');
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${server.address().port}`;
async function login(email,password){let r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
async function get(path,cookie){return fetch(base+path,{headers:{cookie}})}
let cust=await login('cliente@demo.local','ClienteDemo2026!'),adm=await login('admin@demo.local','AdminDemo2026!'),shop=await login('loja@demo.local','LojaDemo2026!');
assert.equal((await get('/api/system',cust)).status,403);assert.equal((await get('/api/system',adm)).status,200);assert.equal((await get('/api/store?storeId=loja-2',shop)).status,403);assert.equal((await get('/api/store?storeId=loja-1',shop)).status,200);
let s=await get('/api/store?storeId=loja-1',shop),j=await s.json();assert.ok(j.orders.every(o=>o.storeId==='loja-1'));assert.equal((await get('/api/me','')).status,401);
let fail=await fetch(base+'/api/store/loja-2/orders/CC-002/status',{method:'POST',headers:{cookie:shop,'content-type':'application/json'},body:JSON.stringify({status:'em_preparacao'})});assert.equal(fail.status,403);
console.log('PASS: 7 testes de autenticação, RBAC, isolamento e sessões');server.close()})().catch(e=>{console.error(e);server.close();process.exitCode=1});
