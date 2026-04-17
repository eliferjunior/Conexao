// Auto-seed a handful of demo pros on first visit so the landing/search
// pages are never empty. Runs only if the DB has zero users. Idempotent.
import { db } from './db.js';
import { hashPassword, randomId } from './crypto.js';

const DEMO_PASSWORD_HASH = null; // lazily computed

async function seedUser({ name, email, phone, role }){
  const { salt, hash, iter } = await hashPassword('Demo@12345');
  return {
    id: randomId('u'), name, email, phone, role, photo:null,
    cpf: '52998224725',
    passHash: hash, passSalt: salt, passIter: iter,
    createdAt: Date.now() - Math.floor(Math.random()*30)*86400000,
    termsAcceptedAt: Date.now(), privacyAcceptedAt: Date.now(),
    _demo: true,
  };
}

export async function seedIfEmpty(){
  const d = db.get();
  if (d.users.length > 0) return false;

  const users = await Promise.all([
    seedUser({ name:'Nicki Pereira',  email:'nicki@demo.konektra',  phone:'(11) 90000-1111', role:'pro' }),
    seedUser({ name:'André Costa',    email:'andre@demo.konektra',  phone:'(11) 90000-2222', role:'pro' }),
    seedUser({ name:'Dra. Helena Sá', email:'helena@demo.konektra', phone:'(11) 90000-3333', role:'pro' }),
    seedUser({ name:'Lucas Moreira',  email:'lucas@demo.konektra',  phone:'(11) 90000-4444', role:'pro' }),
    seedUser({ name:'Lia Souza',      email:'lia@demo.konektra',    phone:'(11) 90000-5555', role:'client' }),
  ]);

  db.save(d => {
    users.forEach(u => d.users.push(u));
    const [nicki, andre, helena, lucas] = users;

    const pros = [
      { userId: nicki.id, headline:'Pet sitter premiada — São Paulo', bio:'Apaixonada por cães há 10 anos. Passeios e hospedagem com relatório em vídeo.', services:['petsitter','baba'], hourly:60, radiusKm:15, available:true, verified:true, plan:'plus', planSince:Date.now(), planPaidUntil:Date.now()+30*86400000, location:{ lat:-23.550, lng:-46.633, city:'São Paulo — Pinheiros' }, doc:{ type:'rg', number:'12.345.678-9', fileName:'rg.pdf', fileDataHash:'demo' } },
      { userId: andre.id, headline:'Eletricista 24h — emergências',   bio:'Atende chamados urgentes em até 40 min. Instalações, quadros, DPS e aterramento.', services:['eletricista','encanador'], hourly:120, radiusKm:20, available:true, verified:true, plan:'infinity', planSince:Date.now(), planPaidUntil:Date.now()+30*86400000, location:{ lat:-23.560, lng:-46.652, city:'São Paulo — Vila Madalena' }, doc:{ type:'cnh', number:'01234567890', fileName:'cnh.pdf', fileDataHash:'demo' } },
      { userId: helena.id, headline:'Dentista clínica geral — 12 anos', bio:'Atendimento humanizado, convênios e particular. Urgências à tarde.', services:['dentista'], hourly:200, radiusKm:10, available:false, verified:true, plan:'free', planSince:Date.now(), planPaidUntil:null, location:{ lat:-23.533, lng:-46.625, city:'São Paulo — Santa Cecília' }, doc:{ type:'conselho', number:'CRO 55555', fileName:'cro.pdf', fileDataHash:'demo' } },
      { userId: lucas.id, headline:'Personal Trainer & Funcional',    bio:'Treinos personalizados em casa ou no parque. Foco em hipertrofia e mobilidade.', services:['personal','fisio'], hourly:90, radiusKm:12, available:true, verified:false, plan:'free', planSince:Date.now(), planPaidUntil:null, location:{ lat:-23.570, lng:-46.640, city:'São Paulo — Butantã' }, doc:null },
    ];
    pros.forEach(p => d.pros.push(p));

    // seed ratings for reputation
    const client = users.find(u => u.role === 'client');
    const fake = (to, stars, days, comment) => ({ id: randomId('r'), bookingId:'demo', fromId:client.id, toId:to, stars, comment, createdAt: Date.now() - days*86400000 });
    d.ratings.push(
      fake(nicki.id,5,12,'Cuidou do meu golden com muito carinho!'),
      fake(nicki.id,5,30,'Fotos e vídeos diários — recomendo muito.'),
      fake(nicki.id,4,45,'Pontual e atenciosa.'),
      fake(andre.id,5, 2,'Resolveu um curto-circuito em 30 min, salvou a noite.'),
      fake(andre.id,4,10,'Serviço limpo e preço justo.'),
      fake(helena.id,5,20,'Mão leve e muito empática.'),
      fake(lucas.id,4, 7,'Treino desafiador, resultado aparecendo.'),
    );
  });
  return true;
}
