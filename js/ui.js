// Konektra — tiny UI helpers
export function $(sel, root=document){ return root.querySelector(sel); }
export function $$(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function h(tag, attrs={}, ...kids){
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs||{})){
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()){
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
export function stars(n, max=5){
  const full = Math.round(Math.max(0, Math.min(max, n)));
  return '★'.repeat(full) + '☆'.repeat(max - full);
}
export function initials(name){
  return (name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
}
export function fmtMoney(v){
  return (Number(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
export function fmtTime(ts){
  if (!ts) return '—';
  return new Date(ts).toLocaleString('pt-BR');
}
export function toast(msg, kind='ok', ms=3200){
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap){ wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.append(wrap); }
  const t = document.createElement('div'); t.className = 'toast ' + (kind||''); t.textContent = msg;
  wrap.append(t); setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(12px)'; setTimeout(()=>t.remove(), 200); }, ms);
}
export function confirm2(msg){ return Promise.resolve(window.confirm(msg)); }

export function fileToDataURL(file, maxSide=512){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), hh = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = hh;
        canvas.getContext('2d').drawImage(img, 0, 0, w, hh);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = () => resolve(r.result);
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

export function qs(name){
  return new URL(location.href).searchParams.get(name);
}
