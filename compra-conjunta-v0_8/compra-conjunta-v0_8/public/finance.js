/* Motor demonstrativo, não executa pagamentos. Valores sempre em centavos inteiros. */
(function(root){
'use strict';
const defaultRates={general:6, categories:{alimentos:8,limpeza:4,higiene:5,bebidas:7},modes:{},stores:{},products:{}};
function cents(n){if(!Number.isFinite(Number(n))||Number(n)<0)throw Error('Valor inválido');return Math.round(Number(n)*100)}
function percentage(n){if(!Number.isFinite(Number(n))||Number(n)<0||Number(n)>100)throw Error('Taxa fora do intervalo 0–100%');return Number(n)}
function rateOf(p,rules){const r=rules||defaultRates;const scope=p.store||'';const k=p.category||'outros';const mode=p.mode||'individual';const keys=[`${scope}|${p.id}|${mode}`,`${scope}|${k}|${mode}`,`${scope}|${k}`,`${k}|${mode}`];for(const key of keys){if(r.products&&r.products[key]!=null)return percentage(r.products[key]);if(r.stores&&r.stores[key]!=null)return percentage(r.stores[key]);if(r.modes&&r.modes[key]!=null)return percentage(r.modes[key]);}return percentage(r.categories&&r.categories[k]!=null?r.categories[k]:r.general??0)}
function calculate(lines,lookup,rules){let gross=0,fee=0;const items=lines.map(row=>{const p=lookup(row.id);if(!p)throw Error('Produto desconhecido');const qty=Number(row.qty);if(!Number.isInteger(qty)||qty<=0)throw Error('Quantidade inválida');const unit=cents(p.price);const total=unit*qty;const rate=rateOf(p,rules);const commission=Math.round(total*rate/100);gross+=total;fee+=commission;return {productId:p.id,name:p.name,category:p.category||'outros',mode:p.mode,store:p.store,qty,unitCents:unit,grossCents:total,ratePercent:rate,platformFeeCents:commission,storeAmountCents:total-commission}});if(fee>gross)throw Error('Divisão inconsistente');return {currency:'BRL',grossCents:gross,platformFeeCents:fee,storeAmountCents:gross-fee,items,splitStatus:'SIMULATED_NOT_SENT',providerTransactionId:null}}
root.CCFinance={defaultRates,calculate,rateOf,cents};
})(typeof window!=='undefined'?window:globalThis);
