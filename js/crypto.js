// Konektra — crypto helpers (PBKDF2 via Web Crypto)
const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes){
  let s=''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(b64){
  const bin = atob(b64); const a = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i);
  return a;
}

export async function hashPassword(password, saltB64){
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name:'PBKDF2', salt, iterations:120000, hash:'SHA-256' }, key, 256
  );
  return { salt: toB64(salt), hash: toB64(new Uint8Array(bits)), iter:120000, algo:'PBKDF2-SHA256' };
}

export async function verifyPassword(password, stored){
  if (!stored || !stored.salt || !stored.hash) return false;
  const { hash } = await hashPassword(password, stored.salt);
  // constant-time compare
  if (hash.length !== stored.hash.length) return false;
  let diff = 0;
  for (let i=0;i<hash.length;i++) diff |= hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}

export function randomId(prefix='id'){
  const rnd = crypto.getRandomValues(new Uint8Array(9));
  return prefix+'_'+toB64(rnd).replace(/[^a-zA-Z0-9]/g,'').slice(0,12);
}

export async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return toB64(new Uint8Array(buf));
}

// Minimal HMAC-signed session token (client-side; for a real backend this would be server-side JWT)
export async function signSession(payload, secret){
  const body = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return body+'.'+toB64(new Uint8Array(sig)).replace(/=+$/,'');
}
export async function verifySession(token, secret){
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  try{
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']);
    const ok = await crypto.subtle.verify('HMAC', key, fromB64(sig+'='), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(atob(body));
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  }catch{ return null; }
}

export { toB64, fromB64 };
