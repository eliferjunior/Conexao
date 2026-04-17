// Headless smoke test — runs the pure-JS parts of Konektra in Node to catch
// syntax/logic errors without a browser. Browser-DOM features are stubbed
// minimally. Full end-to-end tests run in tests.html.
import assert from 'node:assert/strict';

// --- minimal browser shims ---
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k,v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};
globalThis.sessionStorage = { ...globalThis.localStorage, store:new Map() };
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (b) => Buffer.from(b, 'base64').toString('binary');
// Node 20+ exposes globalThis.crypto with subtle + getRandomValues; confirm:
assert.ok(globalThis.crypto?.subtle, 'Node crypto.subtle not available');

const cryptoMod = await import('../js/crypto.js');
const { hashPassword, verifyPassword, signSession, verifySession, sha256, randomId } = cryptoMod;

let ok = 0, fail = 0;
async function t(name, fn){
  try{ await fn(); console.log('  ✓', name); ok++; }
  catch(e){ console.log('  ✗', name, '—', e.message); fail++; }
}

console.log('Konektra smoke tests');

await t('hashPassword / verifyPassword happy path', async () => {
  const out = await hashPassword('senha@123');
  assert.ok(out.salt && out.hash && out.iter === 120000);
  assert.equal(await verifyPassword('senha@123', out), true);
  assert.equal(await verifyPassword('wrong', out), false);
});

await t('signSession / verifySession roundtrip', async () => {
  const payload = { sub:'u1', exp: Date.now()+10000 };
  const tok = await signSession(payload, 'secret');
  const dec = await verifySession(tok, 'secret');
  assert.equal(dec.sub, 'u1');
  assert.equal(await verifySession(tok, 'wrong'), null);
});

await t('sha256 deterministic', async () => {
  const a = await sha256('x'); const b = await sha256('x'); const c = await sha256('y');
  assert.equal(a, b); assert.notEqual(a, c);
});

await t('randomId unique', () => {
  const a = randomId('u'); const b = randomId('u');
  assert.ok(a.startsWith('u_')); assert.notEqual(a, b);
});

// geo
const geo = await import('../js/geo.js');
await t('haversine SP-RJ ~ 360km', () => {
  const d = geo.haversineKm({lat:-23.55,lng:-46.63}, {lat:-22.91,lng:-43.17});
  assert.ok(Math.abs(d - 360) < 30, 'got ' + d.toFixed(1));
});
await t('proMatchesCall filters correctly', () => {
  const pro = { available:true, services:['petsitter'], location:{lat:-23.55,lng:-46.63}, radiusKm:10 };
  const call = { serviceCat:'petsitter', lat:-23.553, lng:-46.635, radiusKm:10 };
  assert.ok(geo.proMatchesCall(pro, call));
  assert.ok(!geo.proMatchesCall({...pro, available:false}, call));
  assert.ok(!geo.proMatchesCall({...pro, services:['manicure']}, call));
});

// auth module (uses db which uses localStorage — already shimmed)
const auth = await import('../js/auth.js');
await t('validateEmail / validateCPF / passwordStrength', () => {
  assert.ok(auth.validateEmail('a@b.co'));
  assert.ok(!auth.validateEmail('no-at'));
  assert.ok(auth.validateCPF('529.982.247-25'));
  assert.ok(!auth.validateCPF('111.111.111-11'));
  assert.ok(auth.passwordStrength('Abcdef12!') >= 4);
  assert.equal(auth.passwordStrength(''), 0);
});

await t('validatePhone accepts masked, unmasked, and +55', () => {
  assert.ok(auth.validatePhone('(11) 90000-0000'));
  assert.ok(auth.validatePhone('11900000000'));
  assert.ok(auth.validatePhone('+55 (11) 98765-4321'));
  assert.ok(auth.validatePhone('1134567890')); // 10-digit landline
  assert.ok(!auth.validatePhone('1234'));
  assert.ok(!auth.validatePhone(''));
  assert.ok(!auth.validatePhone('abc'));
});

await t('register with masked phone succeeds', async () => {
  localStorage.clear(); sessionStorage.clear();
  const u = await auth.register({
    name:'Erika Lima', email:'erika@x.co', phone:'(11) 98765-4321', cpf:'529.982.247-25',
    password:'Forte@12345', role:'client', termsAccepted:true, privacyAccepted:true,
  });
  assert.ok(u.id);
});

await t('register → login → currentUser (client)', async () => {
  localStorage.clear(); sessionStorage.clear();
  const u = await auth.register({
    name:'Ana', email:'ana@x.co', phone:'11900000000', cpf:'529.982.247-25',
    password:'Forte@12345', role:'client', termsAccepted:true, privacyAccepted:true,
  });
  assert.equal(u.email, 'ana@x.co');
  const lu = await auth.login('ana@x.co', 'Forte@12345');
  assert.equal(lu.id, u.id);
  const cu = await auth.currentUser();
  assert.ok(cu && cu.id === u.id);
  await assert.rejects(auth.login('ana@x.co', 'wrong'), /Credenciais/);
});

await t('register pro creates pro profile', async () => {
  localStorage.clear(); sessionStorage.clear();
  const u = await auth.register({
    name:'Beto', email:'b@x.co', phone:'11900000001', cpf:'529.982.247-25',
    password:'Forte@12345', role:'pro', termsAccepted:true, privacyAccepted:true,
  });
  const db = JSON.parse(localStorage.getItem('konektra.db.v1'));
  assert.equal(db.pros.length, 1);
  assert.equal(db.pros[0].userId, u.id);
  assert.equal(db.pros[0].plan, 'free');
});

await t('duplicate email rejected', async () => {
  localStorage.clear(); sessionStorage.clear();
  await auth.register({ name:'Carla Lima', email:'c@x.co', phone:'11900000002', cpf:'529.982.247-25', password:'Forte@12345', role:'client', termsAccepted:true, privacyAccepted:true });
  await assert.rejects(auth.register({ name:'Carla Outra', email:'c@x.co', phone:'11900000003', cpf:'529.982.247-25', password:'Forte@12345', role:'client', termsAccepted:true, privacyAccepted:true }), /já cadastrado/);
});

await t('terms not accepted is rejected', async () => {
  localStorage.clear();
  await assert.rejects(auth.register({ name:'Diego Souza', email:'d@x.co', phone:'11900000004', cpf:'529.982.247-25', password:'Forte@12345', role:'client', termsAccepted:false, privacyAccepted:true }), /Termos/);
});

// db helpers
const dbMod = await import('../js/db.js');
await t('avgRating', () => {
  localStorage.clear();
  dbMod.db.save(d => {
    d.users.push({ id:'u1', name:'X', email:'x@x.co', role:'pro', createdAt:Date.now() });
    d.ratings.push({ id:'r1', toId:'u1', fromId:'u2', stars:5, createdAt:Date.now() });
    d.ratings.push({ id:'r2', toId:'u1', fromId:'u3', stars:3, createdAt:Date.now() });
  });
  const r = dbMod.avgRating('u1');
  assert.equal(r.count, 2); assert.equal(r.avg, 4);
});

await t('threadIdFor is symmetric and stable', () => {
  assert.equal(dbMod.threadIdFor('a','b'), dbMod.threadIdFor('b','a'));
  assert.notEqual(dbMod.threadIdFor('a','b'), dbMod.threadIdFor('a','c'));
});

await t('messages: send, list, unread count, mark read', () => {
  localStorage.clear();
  const tid = dbMod.threadIdFor('u1','u2');
  dbMod.db.save(d => {
    d.messages.push({ id:'m1', threadId:tid, fromId:'u1', toId:'u2', text:'oi', createdAt:1, readAt:null });
    d.messages.push({ id:'m2', threadId:tid, fromId:'u2', toId:'u1', text:'oi de volta', createdAt:2, readAt:null });
    d.messages.push({ id:'m3', threadId:tid, fromId:'u1', toId:'u2', text:'tudo bem?', createdAt:3, readAt:null });
  });
  assert.equal(dbMod.messagesIn(tid).length, 3);
  assert.equal(dbMod.unreadMessagesCount('u2'), 2);
  assert.equal(dbMod.unreadMessagesCount('u1'), 1);
  dbMod.markThreadRead('u2', tid);
  assert.equal(dbMod.unreadMessagesCount('u2'), 0);
  assert.equal(dbMod.threadsFor('u1').length, 1);
});

await t('favorites: toggle and isFavorite', () => {
  localStorage.clear();
  assert.equal(dbMod.isFavorite('u1','p1'), false);
  assert.equal(dbMod.toggleFavorite('u1','p1'), true);
  assert.equal(dbMod.isFavorite('u1','p1'), true);
  assert.equal(dbMod.favoritesFor('u1').length, 1);
  assert.equal(dbMod.toggleFavorite('u1','p1'), false);
  assert.equal(dbMod.isFavorite('u1','p1'), false);
});

await t('notifications: notify, unread count, markRead', () => {
  localStorage.clear();
  dbMod.notify('u1', { kind:'message', title:'Olá', body:'corpo', href:'chat.html' });
  dbMod.notify('u1', { kind:'booking', title:'Pedido' });
  assert.equal(dbMod.unreadNotificationsCount('u1'), 2);
  assert.equal(dbMod.notificationsFor('u1').length, 2);
  dbMod.markNotificationsRead('u1');
  assert.equal(dbMod.unreadNotificationsCount('u1'), 0);
});

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
