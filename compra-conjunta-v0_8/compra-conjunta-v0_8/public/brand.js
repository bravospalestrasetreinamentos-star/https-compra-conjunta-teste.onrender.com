(function(){
const clean=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function apply(b){if(!b)return;const c=b.colors||{};const map={primary:'--cc-primary',secondary:'--cc-secondary',accent:'--cc-accent',background:'--cc-bg',surface:'--cc-surface',text:'--cc-text'};Object.keys(map).forEach(k=>{if(/^#[0-9a-f]{6}$/i.test(c[k]||''))document.documentElement.style.setProperty(map[k],c[k])});
const name=b.siteName||'Compra Coletiva';const text=b.slogan||'';const page=document.querySelector('.logo');if(page){if(b.layout==='image_only'&&b.logo){page.innerHTML='<img class="managed-logo alone" alt="Logomarca" src="'+b.logo+'">'}else{page.innerHTML=(b.layout==='logo_text'&&b.logo?'<img class="managed-logo" alt="Logomarca" src="'+b.logo+'">':'')+'<span class="brand-words"><strong>'+clean(name)+'</strong><small>'+clean(text)+'</small></span>'}}
const header=document.querySelector('header .brand');if(header){header.innerHTML=(b.layout!=='text_only'&&b.logo?'<img class="managed-logo" alt="Logomarca" src="'+b.logo+'">':'')+(b.layout==='image_only'?'':'<div><strong>'+clean(name)+'</strong><small>'+clean(text)+'</small></div>')}}
fetch('/api/brand',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(d=>{if(d)apply(d.brand)}).catch(()=>{});window.CCBrand={apply};
})();
