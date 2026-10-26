'use strict';
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const PORT=Number(process.env.PORT||3000), ROOT=__dirname, DB=path.join(ROOT,'data','db.json'), sessions=new Map(), attempts=new Map();
const seed=()=>({users:[],stores:[{id:'loja-1',name:'Mercado Exemplo',address:'Endereço demonstrativo',enabled:true},{id:'loja-2',name:'Mercearia Modelo',address:'Endereço demonstrativo',enabled:true}],orders:[{id:'CC-001',storeId:'loja-1',customerId:null,status:'a_separar',total:5990,items:[{name:'Arroz 5kg',qty:2}]},{id:'CC-002',storeId:'loja-2',customerId:null,status:'a_separar',total:2990,items:[{name:'Café 500g',qty:1}]}],audit:[],rates:[{category:'alimentos',percent:8},{category:'limpeza',percent:4}],products:[]});
let db=fs.existsSync(DB)?JSON.parse(fs.readFileSync(DB,'utf8')):seed();
function persist(){fs.mkdirSync(path.dirname(DB),{recursive:true});fs.writeFileSync(DB+'.tmp',JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(DB+'.tmp',DB)}
function hash(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,digest:crypto.scryptSync(password,salt,64).toString('hex')}}
function validPassword(password,user){const h=hash(password,user.salt);return crypto.timingSafeEqual(Buffer.from(h.digest,'hex'),Buffer.from(user.digest,'hex'))}
function addUser(email,password,name,roles){const {salt,digest}=hash(password);const u={id:crypto.randomUUID(),name,email:email.toLowerCase(),salt,digest,roles};db.users.push(u);return u}
if(!db.users.length){addUser('cliente@demo.local','ClienteDemo2026!','Cliente Demonstração',[{role:'customer'}]);addUser('admin@demo.local','AdminDemo2026!','Administrador da Plataforma',[{role:'system_admin'}]);addUser('loja@demo.local','LojaDemo2026!','Gestora da Loja',[{role:'customer'},{role:'store_admin',storeId:'loja-1'}]);persist()}
if(!Array.isArray(db.products)){db.products=[];persist()}
if(!Array.isArray(db.rateScenarios)){db.rateScenarios=[];persist()}
if(!Array.isArray(db.chats)){db.chats=[];persist()}
const chatId=()=>crypto.randomUUID();
const isCustomer=u=>u?.roles.some(r=>r.role==='customer');
function triage(message,store){const m=message.toLowerCase();if(/humano|atendente|pessoa|reclama[cç][aã]o|estorno|reembolso|cancelar|cobran[cç]a/.test(m))return {text:'Registrei sua solicitação para atendimento humano. A equipe da loja responderá por aqui durante o horário de atendimento.',handoff:true};if(/hor[aá]rio|aberto|fechado/.test(m))return {text:'Confira o horário diretamente com a loja. Este ambiente de demonstração não possui horários operacionais verificados.',handoff:false};if(/retir|pedido|c[oó]digo/.test(m))return {text:'No Clique e Retire, aguarde o status “Pronto para retirada”. Para consultar um pedido específico, solicite um atendente.',handoff:false};if(/pre[cç]o|dispon[ií]vel|produto|estoque/.test(m))return {text:'Os preços e estoques são definidos pela loja. Consulte o catálogo atualizado ou solicite um atendente para confirmar a disponibilidade.',handoff:false};return {text:'Posso orientar sobre retirada e dúvidas gerais. Para questões específicas ou não resolvidas, selecione “Falar com atendente”.',handoff:false}}
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const publicUser=u=>({id:u.id,name:u.name,email:u.email,roles:u.roles});
const parseBody=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>150000)throw Error('payload_large')}return raw?JSON.parse(raw):{}};
const reply=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data))};
const log=(u,action,entity)=>{db.audit.unshift({time:new Date().toISOString(),by:u.id,action,entity});db.audit=db.audit.slice(0,500);persist()};
const permitted=(u,role,storeId)=>u&&u.roles.some(r=>r.role===role&&(role!=='store_admin'||r.storeId===storeId));
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const originOk=req=>{const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===req.headers.host}catch{return false}};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
 if(pathname.startsWith('/api/')){
 const sess=sessions.get(cookies(req).cc_session),u=sess&&db.users.find(x=>x.id===sess.uid);
 if(req.method!=='GET'&&!originOk(req))return reply(res,403,{error:'Origem inválida'});
 if(pathname==='/api/login'&&req.method==='POST'){
 const {email,password}=await parseBody(req),mail=String(email||'').toLowerCase().trim(),key=req.socket.remoteAddress+':'+mail;
 const a=attempts.get(key)||{count:0,until:0};if(a.until>Date.now())return reply(res,429,{error:'Muitas tentativas; tente mais tarde'});
 const found=db.users.find(x=>x.email===mail);if(!found||typeof password!=='string'||!validPassword(password,found)){
 const count=a.count+1;attempts.set(key,{count,until:count>=5?Date.now()+15*60*1000:0});return reply(res,401,{error:'Credenciais inválidas'});
 }attempts.delete(key);
 const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{uid:found.id,expires:Date.now()+8*60*60*1000});
 return reply(res,200,{user:publicUser(found)},{'Set-Cookie':`cc_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`});
 }
 if(!u||sess.expires<Date.now()){if(sess)sessions.delete(cookies(req).cc_session);return reply(res,401,{error:'Faça login para continuar'});}
 if(pathname==='/api/me'&&req.method==='GET')return reply(res,200,{user:publicUser(u)});
 if(pathname==='/api/logout'&&req.method==='POST'){sessions.delete(cookies(req).cc_session);return reply(res,200,{ok:true},{'Set-Cookie':'cc_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0'});}

 // Chat local demonstrativo; não há API de modelo de IA conectada.
 if(pathname==='/api/chat/stores'&&req.method==='GET'){
  if(!isCustomer(u))return reply(res,403,{error:'Perfil de cliente necessário'});
  return reply(res,200,{stores:db.stores.filter(x=>x.enabled).map(x=>({id:x.id,name:x.name}))});
 }
 if(pathname==='/api/chat/conversations'&&req.method==='POST'){
  if(!isCustomer(u))return reply(res,403,{error:'Perfil de cliente necessário'});
  const b=await parseBody(req),store=db.stores.find(s=>s.id===b.storeId&&s.enabled);
  if(!store)return reply(res,404,{error:'Loja não encontrada'});
  const existing=db.chats.find(c=>c.storeId===store.id&&c.customerId===u.id&&c.status!=='closed');
  if(existing)return reply(res,200,{conversation:existing});
  const c={id:chatId(),storeId:store.id,customerId:u.id,customerName:u.name,status:'bot',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),messages:[{id:chatId(),by:'bot',text:'Olá! Sou o atendimento automático demonstrativo da '+store.name+'. Posso orientar sobre dúvidas gerais ou encaminhar a um atendente humano.',at:new Date().toISOString()}]};
  db.chats.unshift(c);log(u,'chat_opened',c.id);return reply(res,201,{conversation:c});
 }
 if(pathname==='/api/chat/conversations'&&req.method==='GET'){
  const storeId=url.searchParams.get('storeId');
  if(storeId){if(!permitted(u,'store_admin',storeId))return reply(res,403,{error:'Sem permissão para esta loja'});return reply(res,200,{conversations:db.chats.filter(c=>c.storeId===storeId).map(c=>({...c,messages:c.messages.slice(-1)}))});}
  if(!isCustomer(u))return reply(res,403,{error:'Sem permissão'});
  return reply(res,200,{conversations:db.chats.filter(c=>c.customerId===u.id)});
 }
 const chatGet=pathname.match(/^\/api\/chat\/conversations\/([a-f0-9-]+)$/);
 const chatMsg=pathname.match(/^\/api\/chat\/conversations\/([a-f0-9-]+)\/messages$/);
 const chatAction=pathname.match(/^\/api\/chat\/conversations\/([a-f0-9-]+)\/action$/);
 if((chatGet&&req.method==='GET')||(chatMsg&&req.method==='POST')||(chatAction&&req.method==='POST')){
  const id=(chatGet||chatMsg||chatAction)[1],c=db.chats.find(x=>x.id===id);
  if(!c)return reply(res,404,{error:'Conversa não encontrada'});
  const customer=isCustomer(u)&&c.customerId===u.id,staff=permitted(u,'store_admin',c.storeId);
  if(!customer&&!staff)return reply(res,403,{error:'Acesso negado'});
  if(chatGet)return reply(res,200,{conversation:c});
  const b=await parseBody(req);
  if(chatMsg){
   if(c.status==='closed')return reply(res,409,{error:'Atendimento encerrado'});
   const msg=String(b.message||'').trim();if(!msg||msg.length>1000)return reply(res,422,{error:'Mensagem deve ter até 1000 caracteres'});
   if(staff&&c.status==='bot')return reply(res,409,{error:'Aguardando transferência ao atendimento humano'});
   const at=new Date().toISOString();c.messages.push({id:chatId(),by:staff?'staff':'customer',text:msg,at});
   if(customer&&c.status==='bot'){const t=triage(msg,db.stores.find(x=>x.id===c.storeId));c.messages.push({id:chatId(),by:'bot',text:t.text,at});if(t.handoff)c.status='waiting_human';}
   if(staff)c.status='human';c.updatedAt=at;log(u,'chat_message',c.id);return reply(res,200,{conversation:c});
  }
  if(chatAction){
   if(b.action==='human'&&customer&&c.status!=='closed'){c.status='waiting_human';c.messages.push({id:chatId(),by:'system',text:'Atendimento humano solicitado pelo cliente.',at:new Date().toISOString()});}
   else if(b.action==='take'&&staff&&c.status==='waiting_human'){c.status='human';c.messages.push({id:chatId(),by:'system',text:'Um atendente assumiu a conversa.',at:new Date().toISOString()});}
   else if(b.action==='close'&&(staff||customer)&&c.status!=='closed'){c.status='closed';c.messages.push({id:chatId(),by:'system',text:'Conversa encerrada.',at:new Date().toISOString()});}
   else return reply(res,409,{error:'Ação não permitida neste estado'});
   c.updatedAt=new Date().toISOString();log(u,'chat_'+b.action,c.id);return reply(res,200,{conversation:c});
  }
 }
 if(pathname==='/api/customer'&&req.method==='GET')return reply(res,200,{orders:db.orders.filter(o=>o.customerId===u.id),note:'Pedidos legados não estão vinculados a contas'});
 if(pathname==='/api/system'&&req.method==='GET'){if(!permitted(u,'system_admin'))return reply(res,403,{error:'Sem permissão'});return reply(res,200,{users:db.users.map(publicUser),stores:db.stores,ordersCount:db.orders.length,rates:db.rates,audit:db.audit.slice(0,20)})}
 // Simulador isolado: NUNCA altera db.rates, pedidos ou pagamentos.
 if(pathname==='/api/system/rate-simulator'&&req.method==='GET'){
  if(!permitted(u,'system_admin'))return reply(res,403,{error:'Sem permissão'});
  return reply(res,200,{baseline:{alimentos:8,limpeza:4,higiene:5},volumes:{alimentos:20000000,limpeza:12000000,higiene:8000000},demo:true,scenarios:db.rateScenarios.slice(0,100)});
 }
 if(pathname==='/api/system/rate-simulator'&&req.method==='POST'){
  if(!permitted(u,'system_admin'))return reply(res,403,{error:'Sem permissão'});
  const b=await parseBody(req),rates=b.rates||{},title=String(b.title||'Cenário sem título').trim();
  if(!title||title.length>100||!['alimentos','limpeza','higiene'].every(c=>typeof rates[c]==='number'&&Number.isFinite(rates[c])&&rates[c]>=0&&rates[c]<=20&&Number.isInteger(rates[c]*2)))return reply(res,422,{error:'Informe título e taxas de 0% a 20%, com incrementos de 0,5%'});
  const volumes={alimentos:20000000,limpeza:12000000,higiene:8000000};
  const baseline={alimentos:8,limpeza:4,higiene:5};
  const aggregate=rs=>Object.keys(volumes).reduce((total,c)=>total+Math.round(volumes[c]*rs[c]/100),0);
  const current=aggregate(baseline),projected=aggregate(rates);
  const scenario={id:crypto.randomUUID(),title,createdAt:new Date().toISOString(),createdBy:u.id,status:'draft',rates:Object.fromEntries(Object.entries(rates).map(([c,r])=>[c,r])),volumes,currentCents:current,projectedCents:projected,deltaCents:projected-current,approval:null,demo:true};
  db.rateScenarios.unshift(scenario);db.rateScenarios=db.rateScenarios.slice(0,100);
  log(u,'rate_scenario_created',scenario.id);
  return reply(res,201,{scenario});
 }
 const approval=pathname.match(/^\/api\/system\/rate-simulator\/([a-f0-9-]+)\/decision$/);
 if(approval&&req.method==='POST'){
  if(!permitted(u,'system_admin'))return reply(res,403,{error:'Sem permissão'});
  const scenario=db.rateScenarios.find(x=>x.id===approval[1]);if(!scenario)return reply(res,404,{error:'Cenário não encontrado'});
  if(scenario.status!=='draft')return reply(res,409,{error:'Cenário já foi decidido'});
  const b=await parseBody(req);
  if(!['approved_simulation','rejected'].includes(b.decision))return reply(res,422,{error:'Decisão inválida'});
  const note=String(b.note||'').trim();if(note.length>500)return reply(res,422,{error:'Justificativa extensa demais'});
  scenario.status=b.decision;scenario.approval={by:u.id,at:new Date().toISOString(),note};
  log(u,'rate_scenario_decision',scenario.id+': '+b.decision);
  return reply(res,200,{scenario,notice:'Aprovação exclusiva do cenário fictício. Nenhuma taxa operacional foi modificada.'});
 }
 if(pathname==='/api/store/products'&&req.method==='GET'){
 const storeId=url.searchParams.get('storeId');if(!permitted(u,'store_admin',storeId))return reply(res,403,{error:'Acesso restrito à sua loja'});
 return reply(res,200,{products:db.products.filter(p=>p.storeId===storeId)});
 }
 if(pathname==='/api/store/products/import'&&req.method==='POST'){
 const body=await parseBody(req),storeId=body.storeId;
 if(!permitted(u,'store_admin',storeId))return reply(res,403,{error:'Acesso restrito à sua loja'});
 if(!db.stores.some(s=>s.id===storeId&&s.enabled))return reply(res,404,{error:'Loja indisponível'});
 if(!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>100)return reply(res,400,{error:'Envie entre 1 e 100 produtos por lote'});
 const seen=new Set(),errors=[],normalized=[];
 for(let i=0;i<body.rows.length;i++){
  const r=body.rows[i]||{},sku=String(r.sku||'').trim(),name=String(r.name||'').trim(),category=String(r.category||'').trim().toLowerCase();
  const price=Number(r.price),stock=Number(r.stock),expiry=String(r.expiry||'').trim(),batch=String(r.batch||'').trim();
  const problems=[];
  if(!/^[\w.-]{1,40}$/.test(sku))problems.push('Código inválido');
  if(!name||name.length>120)problems.push('Nome inválido');
  if(!['alimentos','limpeza','higiene','bebidas','outros'].includes(category))problems.push('Categoria inválida');
  if(!Number.isFinite(price)||price<=0||Math.round(price*100)!==price*100)problems.push('Preço inválido');
  if(!Number.isSafeInteger(stock)||stock<0||stock>1000000)problems.push('Estoque inválido');
  if(expiry&&!/^\d{4}-\d{2}-\d{2}$/.test(expiry))problems.push('Validade inválida');
  if(expiry&&!(new Date(expiry+'T12:00:00Z').toISOString().startsWith(expiry)))problems.push('Data inválida');
  if(expiry&&expiry<new Date().toISOString().slice(0,10))problems.push('Lote vencido');
  const key=sku+'|'+batch;
  if(seen.has(key))problems.push('Código/lote repetido na importação');seen.add(key);
  if(problems.length)errors.push({row:i+2,sku,problems});
  else normalized.push({storeId,sku,name,category,priceCents:Math.round(price*100),stock,expiry,batch,updatedAt:new Date().toISOString()});
 }
 if(errors.length)return reply(res,422,{error:'Existem linhas inválidas. Nenhum produto foi gravado.',errors});
 let created=0,updated=0;
 for(const item of normalized){const old=db.products.find(p=>p.storeId===storeId&&p.sku===item.sku&&p.batch===item.batch);
 if(old){Object.assign(old,item);updated++}else{db.products.push({...item,id:crypto.randomUUID()});created++}}
 log(u,'products_bulk_import',`${storeId}: ${created} novos, ${updated} atualizados`);
 return reply(res,200,{ok:true,created,updated,total:normalized.length});
 }
 if(pathname==='/api/store'&&req.method==='GET'){const storeId=url.searchParams.get('storeId');if(!permitted(u,'store_admin',storeId))return reply(res,403,{error:'Acesso restrito à sua loja'});return reply(res,200,{store:db.stores.find(s=>s.id===storeId),orders:db.orders.filter(o=>o.storeId===storeId)})}
 const statusRoute=pathname.match(/^\/api\/store\/([^/]+)\/orders\/([^/]+)\/status$/);
 if(statusRoute&&req.method==='POST'){
 const [,storeId,orderId]=statusRoute;if(!permitted(u,'store_admin',storeId))return reply(res,403,{error:'Acesso restrito à sua loja'});
 const body=await parseBody(req),o=db.orders.find(o=>o.id===orderId&&o.storeId===storeId),next={a_separar:'em_preparacao',em_preparacao:'pronto_para_retirada'};
 if(!o)return reply(res,404,{error:'Pedido não encontrado'});
 if(body.status!==next[o.status])return reply(res,409,{error:'Transição inválida'});
 o.status=body.status;log(u,'order_status',orderId);return reply(res,200,{order:o});
 }
 return reply(res,404,{error:'Rota desconhecida'});
 }
 if(req.method!=='GET')return reply(res,405,{error:'Método inválido'});
 const name=pathname==='/'?'index.html':pathname.slice(1),file=path.resolve(ROOT,'public',name);
 if(!file.startsWith(path.resolve(ROOT,'public')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Não encontrado');return}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch(e){reply(res,e.message==='payload_large'?413:400,{error:'Solicitação inválida'})}});
if(require.main===module)server.listen(PORT,()=>console.log(`Compra Conjunta: http://localhost:${PORT}`));module.exports={server,permitted};
