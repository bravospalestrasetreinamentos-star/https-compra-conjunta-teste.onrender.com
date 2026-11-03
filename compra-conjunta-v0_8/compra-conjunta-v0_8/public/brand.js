(function () {
  'use strict';
  const DEFAULT_LOGO = '/app-icon.png';
  const clean = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allowedImage = s => {
    const v = String(s || '').trim();
    // URLs externas HTTPS ou imagem salva em formato data URI. URLs relativas apenas dentro do site.
    if (/^https:\/\/[^\s"'<>]+$/i.test(v) || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(v) || /^\/(?!\/)[^\s"'<>]*$/i.test(v)) return v;
    return DEFAULT_LOGO;
  };
  function apply(b) {
    if (!b) return;
    const colors = b.colors || {};
    const map = {primary:'--cc-primary',secondary:'--cc-secondary',accent:'--cc-accent',background:'--cc-bg',surface:'--cc-surface',text:'--cc-text'};
    Object.keys(map).forEach(k => {if (/^#[0-9a-f]{6}$/i.test(colors[k] || '')) document.documentElement.style.setProperty(map[k], colors[k]);});
    const name = clean(b.siteName || 'Compra Coletiva');
    const slogan = clean(b.slogan ?? 'Juntos, compramos mais.');
    const customLogo = typeof b.logo === 'string' && b.logo.trim().length > 0;
    const logoSrc = allowedImage(customLogo ? b.logo : DEFAULT_LOGO);
    const layout = b.layout || 'logo_text';
    const icon = `<img class="managed-logo brand-default-icon" alt="Logomarca da Compra Coletiva" src="${logoSrc}">`;
    const words = `<span class="brand-words"><strong>${name}</strong><small>${slogan}</small></span>`;
    const page = document.querySelector('.logo');
    if (page) page.innerHTML = layout === 'image_only' && customLogo ? icon : (layout === 'text_only' ? words : icon + words);
    const header = document.querySelector('header .brand');
    if (header) header.innerHTML = layout === 'image_only' && customLogo ? icon : (layout === 'text_only' ? `<div><strong>${name}</strong><small>${slogan}</small></div>` : icon + `<div><strong>${name}</strong><small>${slogan}</small></div>`);
  }
  fetch('/api/brand', {credentials:'same-origin', cache:'no-store'})
    .then(r => r.ok ? r.json() : null)
    .then(d => {if(d) apply(d.brand);})
    .catch(() => {});
  window.CCBrand = {apply};
})();
