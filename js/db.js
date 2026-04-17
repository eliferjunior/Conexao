// Konektra — localStorage-backed "database" with a simple collection API.
// In production, replace by REST/GraphQL calls to a real backend. Schema kept
// stable so a server port is mechanical.

const KEY = 'konektra.db.v1';

const defaultDb = () => ({
  users:        [],   // { id, email, name, phone, role:'client|pro|both', passHash, passSalt, passIter, cpf, photo, createdAt, termsAcceptedAt, privacyAcceptedAt }
  pros:         [],   // { userId, headline, bio, services:[cat], hourly, radiusKm, available, verified, doc:{type,number,fileName,fileDataHash}, location:{lat,lng,city}, plan:'free|plus|infinity', planSince, planPaidUntil }
  bookings:     [],   // { id, clientId, proId, serviceCat, status:'requested|accepted|done|cancelled', price, createdAt, doneAt, urgent:bool }
  ratings:      [],   // { id, bookingId, fromId, toId, stars, comment, createdAt }
  urgentCalls:  [],   // { id, clientId, serviceCat, lat, lng, radiusKm, note, status:'open|matched|cancelled', createdAt, matchedProId }
  sessions:     [],   // not stored — kept per-tab only
  events:       [],   // audit log
});

function read(){
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultDb();
    const obj = JSON.parse(raw);
    // merge with defaults to be resilient to schema growth
    return Object.assign(defaultDb(), obj);
  }catch{ return defaultDb(); }
}
function write(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

export const db = {
  get(){ return read(); },
  save(fn){ const d = read(); fn(d); write(d); return d; },
  reset(){ localStorage.removeItem(KEY); },
  export(){ return JSON.stringify(read(), null, 2); },
  import(json){ const d = JSON.parse(json); write(Object.assign(defaultDb(), d)); },
};

export function logEvent(type, data){
  db.save(d => d.events.push({ id:'ev_'+Math.random().toString(36).slice(2,10), type, data, at:Date.now() }));
}

// Convenience lookups
export function findUserByEmail(email){
  return db.get().users.find(u => u.email.toLowerCase() === (email||'').toLowerCase());
}
export function findUser(id){ return db.get().users.find(u => u.id === id); }
export function findPro(userId){ return db.get().pros.find(p => p.userId === userId); }
export function ratingsFor(userId){
  return db.get().ratings.filter(r => r.toId === userId);
}
export function avgRating(userId){
  const rs = ratingsFor(userId);
  if (!rs.length) return { avg:0, count:0 };
  const sum = rs.reduce((a,r)=>a+r.stars,0);
  return { avg: +(sum/rs.length).toFixed(2), count: rs.length };
}
