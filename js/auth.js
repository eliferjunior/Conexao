// Konektra — auth module (registration, login, session)
import { db, logEvent, findUserByEmail, findUser } from './db.js';
import { hashPassword, verifyPassword, randomId, signSession, verifySession } from './crypto.js';

const SESSION_KEY = 'konektra.session';
const SESSION_SECRET = 'konektra-dev-secret-rotate-me'; // demo only; server-side in prod

export const SERVICE_CATEGORIES = [
  { id:'dentista', label:'Dentista', emoji:'🦷' },
  { id:'medico', label:'Médico(a)', emoji:'🩺' },
  { id:'psicologo', label:'Psicólogo(a)', emoji:'🧠' },
  { id:'personal', label:'Personal Trainer', emoji:'🏋️' },
  { id:'fisio', label:'Fisioterapeuta', emoji:'🤸' },
  { id:'petsitter', label:'Pet sitter / Passeador', emoji:'🐕' },
  { id:'manicure', label:'Manicure', emoji:'💅' },
  { id:'cabeleireiro', label:'Cabeleireiro(a)', emoji:'💇' },
  { id:'maquiador', label:'Maquiador(a)', emoji:'💄' },
  { id:'cozinheiro', label:'Cozinheiro(a) / Chef', emoji:'👨‍🍳' },
  { id:'eletricista', label:'Eletricista', emoji:'🔌' },
  { id:'encanador', label:'Encanador(a)', emoji:'🚿' },
  { id:'pedreiro', label:'Pedreiro / Reformas', emoji:'🧱' },
  { id:'marceneiro', label:'Marceneiro(a)', emoji:'🪚' },
  { id:'diarista', label:'Diarista / Limpeza', emoji:'🧹' },
  { id:'baba', label:'Babá', emoji:'👶' },
  { id:'cuidador', label:'Cuidador(a) de idosos', emoji:'🧓' },
  { id:'professor', label:'Professor(a) particular', emoji:'📚' },
  { id:'designer', label:'Designer gráfico', emoji:'🎨' },
  { id:'dev', label:'Desenvolvedor(a)', emoji:'💻' },
  { id:'fotografo', label:'Fotógrafo(a)', emoji:'📸' },
  { id:'motorista', label:'Motorista particular', emoji:'🚗' },
];

export function validateEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email||'');
}
export function validatePhone(phone){
  // Accepts masked or unmasked Brazilian numbers (10 or 11 digits) and
  // optional country code up to 13 digits total, e.g. "+55 (11) 90000-0000".
  const s = (phone||'').replace(/\D/g, '');
  return s.length >= 10 && s.length <= 13;
}
export function validateCPF(cpf){
  const s = (cpf||'').replace(/\D/g,'');
  if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
  const calc = (slice, factor) => {
    let sum = 0;
    for (let i=0;i<slice.length;i++) sum += Number(slice[i]) * (factor - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(s.slice(0,9), 10);
  const d2 = calc(s.slice(0,10), 11);
  return d1 === Number(s[9]) && d2 === Number(s[10]);
}
export function passwordStrength(pw){
  let score = 0;
  if (!pw) return 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..5
}

export async function register({ name, email, phone, cpf, password, role, termsAccepted, privacyAccepted }){
  if (!name || name.trim().length < 2) throw new Error('Nome muito curto.');
  if (!validateEmail(email)) throw new Error('E-mail inválido.');
  if (!validatePhone(phone)) throw new Error('Telefone inválido. Informe DDD + número (ex.: (11) 90000-0000).');
  if (!validateCPF(cpf)) throw new Error('CPF inválido.');
  if (passwordStrength(password) < 3) throw new Error('Senha fraca. Use 8+ caracteres com letras, números e símbolo.');
  if (!['client','pro','both'].includes(role)) throw new Error('Tipo de conta inválido.');
  if (!termsAccepted || !privacyAccepted) throw new Error('Aceite os Termos de Uso e a Política de Privacidade.');
  if (findUserByEmail(email)) throw new Error('E-mail já cadastrado.');

  const { salt, hash, iter } = await hashPassword(password);
  const user = {
    id: randomId('u'),
    name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(),
    cpf: cpf.replace(/\D/g,''),
    role, photo:null,
    passHash:hash, passSalt:salt, passIter:iter,
    createdAt: Date.now(),
    termsAcceptedAt: Date.now(),
    privacyAcceptedAt: Date.now(),
  };
  db.save(d => {
    d.users.push(user);
    if (role === 'pro' || role === 'both'){
      d.pros.push({
        userId: user.id, headline:'', bio:'', services:[], hourly:0,
        radiusKm:10, available:false, verified:false, doc:null,
        location:null, plan:'free', planSince:Date.now(), planPaidUntil:null,
      });
    }
  });
  logEvent('user.register', { id:user.id, role });
  return user;
}

export async function login(email, password){
  const u = findUserByEmail(email);
  if (!u) throw new Error('Credenciais inválidas.');
  const ok = await verifyPassword(password, { salt:u.passSalt, hash:u.passHash });
  if (!ok){ logEvent('auth.fail', { email }); throw new Error('Credenciais inválidas.'); }
  const payload = { sub:u.id, role:u.role, iat:Date.now(), exp:Date.now()+1000*60*60*24*7 };
  const token = await signSession(payload, SESSION_SECRET);
  sessionStorage.setItem(SESSION_KEY, token);
  logEvent('auth.login', { id:u.id });
  return u;
}
export function logout(){
  sessionStorage.removeItem(SESSION_KEY);
  logEvent('auth.logout', {});
}

export async function currentUser(){
  const token = sessionStorage.getItem(SESSION_KEY);
  if (!token) return null;
  const data = await verifySession(token, SESSION_SECRET);
  if (!data) { sessionStorage.removeItem(SESSION_KEY); return null; }
  return findUser(data.sub);
}

export async function requireAuth(redirect='login.html'){
  const u = await currentUser();
  if (!u){ location.href = redirect + '?next=' + encodeURIComponent(location.pathname.split('/').pop()||''); throw new Error('redirect'); }
  return u;
}
