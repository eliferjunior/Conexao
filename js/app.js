// Konektra — landing/nav glue. Page-specific logic lives in their own modules.
import { currentUser, logout } from './auth.js';

(async function initNav(){
  const user = await currentUser();
  const links = document.querySelector('.nav-links');
  if (!links) return;
  if (user){
    links.innerHTML = '';
    const add = (href,label,cls='') => {
      const a = document.createElement('a'); a.href = href; a.textContent = label; if (cls) a.className = cls; links.append(a);
    };
    add('dashboard.html','Painel');
    add('search.html','Buscar');
    add('urgent.html','Urgente');
    add('subscription.html','Planos');
    const out = document.createElement('a');
    out.href = '#'; out.textContent = 'Sair ('+(user.name.split(' ')[0])+')'; out.className = 'btn btn-ghost';
    out.onclick = (e) => { e.preventDefault(); logout(); location.href='index.html'; };
    links.append(out);
  }
})();
