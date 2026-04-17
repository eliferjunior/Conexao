// Konektra — geolocation & urgency matching
export function haversineKm(a, b){
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const x = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export function getCurrentLocation(){
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Geolocalização indisponível.'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat:p.coords.latitude, lng:p.coords.longitude, accuracy:p.coords.accuracy }),
      e => reject(new Error(e.message || 'Não foi possível obter sua localização.')),
      { enableHighAccuracy:true, timeout:10000, maximumAge:60000 }
    );
  });
}

// Decide if pro matches an urgent call
export function proMatchesCall(pro, call){
  if (!pro || !pro.available) return false;
  if (!pro.location || !call) return false;
  if (!pro.services.includes(call.serviceCat)) return false;
  const dist = haversineKm(pro.location, { lat:call.lat, lng:call.lng });
  const radius = Math.min(pro.radiusKm || 10, call.radiusKm || 10);
  return dist <= radius;
}

// Score: closer + higher rating + plan tier
export function scoreMatch(pro, call, ratingInfo){
  const dist = haversineKm(pro.location, { lat:call.lat, lng:call.lng });
  const distScore = Math.max(0, 1 - dist / (call.radiusKm || 10)); // 0..1
  const rating = (ratingInfo?.avg || 0) / 5; // 0..1
  const planBonus = pro.plan === 'infinity' ? 0.25 : pro.plan === 'plus' ? 0.12 : 0;
  return distScore * 0.5 + rating * 0.35 + planBonus;
}
