// Konektra — landing/nav glue. Page-specific logic lives in their own modules.
import { currentUser, logout } from './auth.js';
import { seedIfEmpty } from './seed.js';
import {
  unreadMessagesCount, unreadNotificationsCount,
  notificationsFor, markNotificationsRead,
} from './db.js';

seedIfEmpty().catch(() => {});

// Register the service worker for offline shell support (only over http(s)).
if ('serviceWorker' in navigator && location.protocol !== 'file:'){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[c]));
}

(async function initNav(){
  const user = await currentUser();
  const links = document.querySelector('.nav-links');
  if (!links) return;
  if (!user) return;

  links.innerHTML = '';
  const add = (href, label) => {
    const a = document.createElement('a'); a.href = href; a.textContent = label; links.append(a); return a;
  };
  add('dashboard.html','Painel');
  add('search.html','Buscar');
  add('urgent.html','Urgente');
  add('subscription.html','Planos');

  // Quick chat link with unread badge
  const chatLink = document.createElement('a');
  chatLink.href = 'chat.html';
  chatLink.className = 'chat-quick';
  chatLink.title = 'Mensagens';
  chatLink.innerHTML = '<span class="chat-quick-icon">💬</span><span class="chat-badge" hidden>0</span>';
  links.append(chatLink);

  // Notification bell with popover
  const bellWrap = document.createElement('div');
  bellWrap.className = 'bell-wrap';
  bellWrap.innerHTML = `
    <button class="bell" type="button" aria-label="Notificações">
      <span class="bell-icon">🔔</span>
      <span class="bell-badge" hidden>0</span>
    </button>
    <div class="bell-pop" hidden>
      <div class="bell-pop-head">Notificações</div>
      <div class="bell-pop-body"></div>
      <a class="bell-pop-foot" href="chat.html">Abrir mensagens →</a>
    </div>
  `;
  links.append(bellWrap);

  const out = document.createElement('a');
  out.href = '#'; out.textContent = 'Sair (' + user.name.split(' ')[0] + ')'; out.className = 'btn btn-ghost';
  out.onclick = (e) => { e.preventDefault(); logout(); location.href='index.html'; };
  links.append(out);

  const bellBtn = bellWrap.querySelector('.bell');
  const bellBadge = bellWrap.querySelector('.bell-badge');
  const pop = bellWrap.querySelector('.bell-pop');
  const popBody = bellWrap.querySelector('.bell-pop-body');
  const chatBadge = chatLink.querySelector('.chat-badge');

  function refreshBadge(){
    const ns = unreadNotificationsCount(user.id);
    const ms = unreadMessagesCount(user.id);
    const total = ns + ms;
    bellBadge.textContent = total > 99 ? '99+' : String(total);
    bellBadge.hidden = total === 0;
    chatBadge.textContent = ms ? (ms > 9 ? '9+' : String(ms)) : '';
    chatBadge.hidden = ms === 0;
  }

  function renderNotifs(){
    const ns = notificationsFor(user.id).slice(0, 12);
    popBody.innerHTML = '';
    if (!ns.length){
      popBody.innerHTML = '<div class="bell-empty muted">Nada por aqui ainda.</div>';
      return;
    }
    for (const n of ns){
      const a = document.createElement('a');
      a.className = 'bell-item' + (n.readAt ? '' : ' unread');
      a.href = n.href || '#';
      a.innerHTML = `
        <div class="bell-item-title">${escapeHtml(n.title)}</div>
        ${n.body ? `<div class="bell-item-body">${escapeHtml(n.body)}</div>` : ''}
        <div class="bell-item-time muted">${new Date(n.createdAt).toLocaleString('pt-BR')}</div>
      `;
      popBody.append(a);
    }
  }

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !pop.hidden;
    pop.hidden = open;
    if (!open){
      renderNotifs();
      markNotificationsRead(user.id);
      refreshBadge();
    }
  });
  document.addEventListener('click', (e) => {
    if (!bellWrap.contains(e.target)) pop.hidden = true;
  });

  refreshBadge();
  setInterval(refreshBadge, 4000);
})();
