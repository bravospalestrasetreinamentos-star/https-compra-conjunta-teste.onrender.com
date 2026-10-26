// Extensão demonstrativa. Os perfis são visualizações de teste, não autenticação.
(function(){
 const initial=CCFinance.defaultRates;
 const keyRates='cc_rates_demo_v1';let rates;
 try{rates=JSON.parse(localStorage.getItem(keyRates))}catch{}
 if(!rates||typeof rates!=='object')rates=structuredClone(initial);
 const categories={1:'alimentos',2:'alimentos',3:'alimentos',4:'alimentos',5:'alimentos',6:'alimentos'};
 state.products.forEach(p=>{p.category=p.category||categories[p.id]||'outros'});
 const resetSeed=seed.forEach(p=>p.category=p.category||categories[p.id]||'outros');
 function saveRates(){localStorage.setItem(keyRates,JSON.stringify(rates))}
 function calcRows(rows){return CCFinance.calculate(rows,product,rates)}
 const oldPlaceOrder=window.placeOrder;
 window.placeOrder=function(){
   const before=new Set(state.orders.map(o=>o.id));
   oldPlaceOrder();
   let count=0;
   state.orders.forEach(o=>{if(!before.has(o.id)){const snapshot=calcRows(o.items);o.financial=snapshot;o.financialRulesSnapshot=JSON.parse(JSON.stringify(rates));count++}});
   if(count)save();
 };
 const originalCheckout=window.checkout;
 window.checkout=function(){
   originalCheckout();
   if(!state.cart.length)return;
   const root=document.getElementById('modal');
   if(!root||!document.getElementById('terms'))return;
   const byStore=Object.groupBy?Object.groupBy(state.cart,i=>product(i.id).store):state.cart.reduce((a,i)=>{(a[product(i.id).store]??=[]).push(i);return a},{});
   let markup='<div class="adminitem"><b>Divisão financeira prevista — demonstração</b><p class="muted">Os preços são definidos pela loja; a taxa é descontada do repasse dela. Nenhuma transação ou split real será executado.</p>';
   for(const [store,rows] of Object.entries(byStore)){const v=calcRows(rows);markup+=`<div class="line"><span>${safe(store)}<br><small>Loja: ${brl(v.storeAmountCents/100)} • Plataforma: ${brl(v.platformFeeCents/100)}</small></span><b>${brl(v.grossCents/100)}</b></div>`}markup+='</div>';
   const formButton=root.querySelector('button.primary[onclick="placeOrder()"]');if(formButton)formButton.insertAdjacentHTML('beforebegin',markup);
 };
 function lineItem(p){return `<div class="line"><span>${safe(p.name)} <span class="muted">(${safe(p.category)} · ${safe(p.mode)})</span></span><b>${brl(p.price)}</b></div>`}
 window.openSystemAdmin=function(){
  let preview=state.products.slice(0,6).map(p=>{const r=CCFinance.rateOf(p,rates);return `<div class="line"><span>${safe(p.name)}<br><small>${safe(p.category)} / ${safe(p.mode)} / ${safe(p.store)}</small></span><b>${r}%</b></div>`}).join('');
  show(head('Administrador do sistema · demonstração')+`<p class="notice">Módulo demonstrativo sem autenticação. As taxas não são aplicadas a transações reais.</p><h3>Taxas por categoria</h3><form onsubmit="saveSystemRates(event)">${Object.entries({alimentos:'Alimentos',limpeza:'Limpeza',higiene:'Higiene',bebidas:'Bebidas'}).map(([k,title])=>`<div class="line"><label for="rate-${k}">${title}</label><input style="width:100px" id="rate-${k}" name="${k}" type="number" min="0" max="100" step="0.01" required value="${Number(rates.categories?.[k]??rates.general)}"></div>`).join('')}<div class="line"><label for="rate-general">Taxa geral (%)</label><input style="width:100px" id="rate-general" name="general" type="number" min="0" max="100" step="0.01" required value="${Number(rates.general||0)}"></div><button class="primary" type="submit">Salvar taxas demonstrativas</button></form><h3>Taxas aplicáveis no catálogo</h3>${preview}<p class="muted">Na operação real, a plataforma terá regras específicas por loja, modalidade, categoria e produto, com versão e vigência registradas no servidor.</p><button class="ghost" onclick="openSystemFinance()">Consultar conciliação simulada</button><button class="ghost" onclick="openAdAdmin()">Publicidade</button>`);
 };
 window.saveSystemRates=function(e){e.preventDefault();const f=e.target;const next=structuredClone(rates);for(const k of ['alimentos','limpeza','higiene','bebidas'])next.categories[k]=Number(f.elements.namedItem(k).value);next.general=Number(f.elements.namedItem('general').value);Object.values(next.categories).concat(next.general).forEach(n=>{if(!Number.isFinite(n)||n<0||n>100)throw Error('Taxa inválida')});rates=next;saveRates();openSystemAdmin()};
 window.openSystemFinance=function(){const orders=state.orders;const sum=orders.reduce((a,o)=>{const f=o.financial||calcRows(o.items);a.gross+=f.grossCents;a.platform+=f.platformFeeCents;a.store+=f.storeAmountCents;return a},{gross:0,platform:0,store:0});show(head('Conciliação financeira · simulação')+`<p class="notice">Divisão prevista, não confirmada por provedor de pagamento.</p><div class="adminitem">Vendas: <b>${brl(sum.gross/100)}</b><br>Plataforma: <b>${brl(sum.platform/100)}</b><br>Lojas: <b>${brl(sum.store/100)}</b></div>${orders.map(o=>{const f=o.financial||calcRows(o.items);return `<div class="adminitem"><b>${safe(o.id)}</b> — ${safe(o.store)}<div>Venda: ${brl(f.grossCents/100)} · Loja: ${brl(f.storeAmountCents/100)} · Plataforma: ${brl(f.platformFeeCents/100)}</div><small>Split: somente simulação; provedor não conectado</small></div>`}).join('')}<button class="ghost" onclick="openSystemAdmin()">Voltar</button>`)};
 window.openStoreSelector=function(){const stores=[...new Set(state.products.map(p=>p.store))];show(head('Administrador de loja · demonstração')+`<p class="notice">Selecione uma loja para demonstrar o isolamento da área operacional. Em produção, a loja será determinada pelas permissões do login.</p>${stores.map((s,i)=>`<button class="ghost" onclick="openStoreAdmin(${i})">🏪 ${safe(s)}</button>`).join('')}`)};
 window.openStoreAdmin=function(idx){const stores=[...new Set(state.products.map(p=>p.store))];const selected=stores[idx];if(!selected)return;const products=state.products.filter(p=>p.store===selected);const orders=state.orders.filter(o=>o.store===selected);const gross=orders.reduce((a,o)=>a+(o.financial||calcRows(o.items)).grossCents,0);const net=orders.reduce((a,o)=>a+(o.financial||calcRows(o.items)).storeAmountCents,0);show(head('Loja · '+safe(selected))+`<p class="notice">Visão demonstrativa. Preços são definidos pela loja e não são alterados pelas taxas de intermediação.</p><div class="adminitem">Pedidos: <b>${orders.length}</b> · Venda: <b>${brl(gross/100)}</b> · Repasse previsto: <b>${brl(net/100)}</b></div><h3>Produtos e preços</h3>${products.map(p=>`<div class="line"><span>${safe(p.name)}<small class="muted"> · Intermediação ${CCFinance.rateOf(p,rates)}%</small></span><b>${brl(p.price)}</b></div>`).join('')}<h3>Retirada de pedidos</h3>${orders.length?orders.map(o=>`<div class="adminitem"><b>${safe(o.id)}</b> · ${safe(o.status)} ${o.status==='Aguardando campanha'?`<button class="ghost" onclick="storeStatus('${o.id}','A separar',${idx})">Simular campanha atingida</button>`:''}${o.status==='A separar'?`<button class="ghost" onclick="storeStatus('${o.id}','Em preparação',${idx})">Iniciar preparação</button>`:''}${o.status==='Em preparação'?`<button class="ghost" onclick="storeStatus('${o.id}','Pronto para retirada',${idx})">Pronto para retirada</button>`:''}${o.status==='Pronto para retirada'?`<input id="pickup-${safe(o.id)}" placeholder="Código de retirada"><button class="ghost" onclick="storePickup('${o.id}',${idx})">Validar retirada</button>`:''}</div>`).join(''):'<p class="muted">Nenhum pedido registrado para esta loja.</p>'}<button class="ghost" onclick="openStoreSelector()">Trocar loja (modo demonstração)</button>`)};
 window.storeStatus=function(id,status,idx){const o=state.orders.find(x=>x.id===id);if(!o)return;const stores=[...new Set(state.products.map(p=>p.store))];if(o.store!==stores[idx])return;setStatus(id,status);openStoreAdmin(idx)};
 window.storePickup=function(id,idx){const o=state.orders.find(x=>x.id===id);const stores=[...new Set(state.products.map(p=>p.store))];if(!o||o.store!==stores[idx])return;const typed=document.getElementById('pickup-'+id)?.value;if(typed!==o.token)return alert('Código inválido.');if(o.status!=='Pronto para retirada')return alert('Pedido não está pronto.');o.status='Retirado';save();openStoreAdmin(idx)};
 const nav=document.querySelector('.nav');nav.innerHTML=nav.innerHTML.replace('<button onclick="openAdmin()">Loja</button>','<button onclick="openStoreSelector()">Minha Loja</button><button onclick="openSystemAdmin()">Admin. Sistema</button>');
 // Notificação visível: os três papéis abaixo não são controles de segurança.
 document.querySelector('.bottom').insertAdjacentText('beforebegin','');
})();
