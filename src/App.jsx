import { useState } from "react";
// ═══════════════════════════════════════════════════════════════
// FIT BRO — Evidence-Based Adaptive Coach
// ═══════════════════════════════════════════════════════════════
var SI={'bike-road':'🚴','bike-mtb':'🚵',run:'🏃',trail:'⛰️',gym:'🏋️',swim:'🏊',rest:'😴',stretch:'🤸',hydro:'💧',yoga:'🧘',crossfit:'🏆',padel:'🏓',tennis:'🎾',climbing:'🧗',boxing:'🥊',martial:'🥋',rowing:'🚣',soccer:'⚽',basketball:'🏀',dance:'💃',spinning:'🔄',hiking:'🥾'};
var WD=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
var PH={base:{name:'Base',color:'#22c55e',icon:'🏗️'},build:{name:'Construcción',color:'#f97316',icon:'📈'},peak:{name:'Pico',color:'#ef4444',icon:'🔥'},taper:{name:'Tapering',color:'#8b5cf6',icon:'🎯'},recovery:{name:'Recuperación',color:'#94a3b8',icon:'🧘'}};
var ST={lb:{display:'flex',flexDirection:'column',gap:4,fontSize:'0.88rem',color:'#374151'},inp:{padding:'10px 12px',borderRadius:8,border:'1px solid #d1d5db',fontSize:'0.9rem',outline:'none',background:'#fff',width:'100%',boxSizing:'border-box'},bp:{padding:'12px 24px',borderRadius:10,border:'none',background:'#1e40af',color:'#fff',fontWeight:700,fontSize:'0.95rem',cursor:'pointer'},bs:{padding:'12px 24px',borderRadius:10,border:'1px solid #cbd5e1',background:'#fff',color:'#475569',fontWeight:600,fontSize:'0.95rem',cursor:'pointer'}};
function hasPM(p){return p.devices&&p.devices.indexOf('Potenciómetro')>=0}
function hasHR(p){return p.devices&&(p.devices.indexOf('Banda FC')>=0||p.devices.indexOf('Amazfit')>=0)}
function bz(p,lo,hi,flo,fhi){if(hasPM(p))return Math.round(p.ftp*lo)+'-'+Math.round(p.ftp*hi)+'W';if(hasHR(p))return 'FC '+Math.round(p.maxHR*flo)+'-'+Math.round(p.maxHR*fhi);return 'Esfuerzo '+Math.round(lo*100)+'%'}
function hasGymPool(p){return p.gymAmenities&&p.gymAmenities.indexOf('piscina')>=0}
function hasGymSauna(p){return p.gymAmenities&&p.gymAmenities.indexOf('turco')>=0}
function hasGymJacuzzi(p){return p.gymAmenities&&p.gymAmenities.indexOf('hidromasaje')>=0}

// ═══════════════════════════════════════════════════════════════
// READINESS SCORE — Based on sleep, soreness, recent load, stress
// Green (≥7): Train normally | Yellow (4-6): Reduce intensity | Red (≤3): Recovery only
// ═══════════════════════════════════════════════════════════════
function calcReadiness(fbHistory,dayIdx){
  if(!fbHistory||!fbHistory.length) return {score:7,level:'green',label:'Listo',icon:'🟢'};
  var recent=fbHistory.slice(-3);
  var avgSleep=recent.reduce(function(a,f){return a+f.sleep},0)/recent.length;
  var avgSore=recent.reduce(function(a,f){return a+f.soreness},0)/recent.length;
  var avgStress=recent.reduce(function(a,f){return a+f.stress},0)/recent.length;
  var avgEnergy=recent.reduce(function(a,f){return a+f.energy},0)/recent.length;
  var bigRecent=recent.some(function(f){return f.prevActivityHours>=3});
  // Score: 1-10 (higher = more ready)
  var s=avgSleep*0.3+(10-avgSore)*0.25+avgEnergy*0.25+(10-avgStress)*0.2;
  if(bigRecent) s=Math.max(s-1.5,1);
  s=Math.round(Math.min(10,Math.max(1,s)));
  if(s>=7) return {score:s,level:'green',label:'Listo para entrenar',icon:'🟢'};
  if(s>=4) return {score:s,level:'yellow',label:'Reducir intensidad',icon:'🟡'};
  return {score:s,level:'red',label:'Recuperación',icon:'🔴'};
}

// ═══════════════════════════════════════════════════════════════
// MUSCLE FATIGUE MONITOR — Heatmap by zones
// Zones: legs, glutes, back, chest, shoulders, arms, core
// Decay: 48-72h based on volume × intensity × recency
// ═══════════════════════════════════════════════════════════════
var MUSCLE_ZONES=[
  {id:'legs',name:'Piernas',emoji:'🦵',muscles:['Cuáds','Isquios','Gemelos']},
  {id:'glutes',name:'Glúteos',emoji:'🍑',muscles:['Glúteo mayor','Glúteo medio']},
  {id:'back',name:'Espalda',emoji:'🔙',muscles:['Dorsal','Romboides','Trapecio']},
  {id:'chest',name:'Pecho',emoji:'💪',muscles:['Pectoral','Serrato']},
  {id:'shoulders',name:'Hombros',emoji:'🫁',muscles:['Deltoides','Manguito']},
  {id:'arms',name:'Brazos',emoji:'💪',muscles:['Bíceps','Tríceps','Antebrazo']},
  {id:'core',name:'Core',emoji:'🧱',muscles:['Recto abdominal','Oblicuos','Transverso']}
];
var EX_MUSCLES={
  squat:{primary:['legs','glutes'],secondary:['core']},
  legpress:{primary:['legs','glutes'],secondary:[]},
  rdl:{primary:['glutes','legs'],secondary:['back']},
  lunges:{primary:['legs','glutes'],secondary:['core']},
  bulgarian:{primary:['legs','glutes'],secondary:['core']},
  stepup:{primary:['legs','glutes'],secondary:[]},
  boxjump:{primary:['legs'],secondary:['glutes']},
  kbswing:{primary:['glutes'],secondary:['legs','core','back']},
  bench:{primary:['chest'],secondary:['arms','shoulders']},
  row:{primary:['back'],secondary:['arms']},
  pullup:{primary:['back'],secondary:['arms']},
  ohp:{primary:['shoulders'],secondary:['arms','core']},
  facepull:{primary:['shoulders','back'],secondary:[]},
  plank:{primary:['core'],secondary:[]},
  sideplank:{primary:['core'],secondary:['glutes']},
  deadbug:{primary:['core'],secondary:[]},
  hipthrust:{primary:['glutes'],secondary:['legs','core']},
};
function calcMuscleFatigue(weekPlan){
  var fatigue={};MUSCLE_ZONES.forEach(function(z){fatigue[z.id]=0});
  if(!weekPlan) return fatigue;
  weekPlan.forEach(function(day,dayIdx){
    var decay=1-dayIdx*0.14; // decay over week: day0=1.0, day6=0.16
    if(decay<0) decay=0;
    day.sessions.forEach(function(sess){
      if(!sess.details||!sess.done) return;
      sess.details.forEach(function(exId){
        var mu=EX_MUSCLES[exId];if(!mu) return;
        mu.primary.forEach(function(z){fatigue[z]=(fatigue[z]||0)+3*decay});
        mu.secondary.forEach(function(z){fatigue[z]=(fatigue[z]||0)+1.5*decay});
      });
    });
    // Endurance adds leg/glute fatigue
    day.sessions.forEach(function(sess){
      if(!sess.done) return;
      if(sess.sport&&(sess.sport.indexOf('bike')>=0||sess.sport==='run'||sess.sport==='trail')){
        var load=sess.duration/60*decay;
        fatigue.legs=(fatigue.legs||0)+load*1.5;
        fatigue.glutes=(fatigue.glutes||0)+load*0.8;
      }
    });
  });
  return fatigue;
}
function fatigueLevel(val){
  if(val<3) return {color:'#22c55e',label:'Fresco',bg:'#f0fdf4'};
  if(val<6) return {color:'#eab308',label:'Moderado',bg:'#fefce8'};
  if(val<9) return {color:'#f97316',label:'Cargado',bg:'#fff7ed'};
  return {color:'#ef4444',label:'Sobrecargado',bg:'#fef2f2'};
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCE ENGINE — Scientific justification for each session
// ═══════════════════════════════════════════════════════════════
var EVIDENCE={
  concurrent:{claim:'El entrenamiento de fuerza pesada mejora la economía de carrera y potencia en ciclismo sin interferir con adaptaciones aeróbicas cuando se separan las sesiones >6h.',grade:'Alta',refs:['Rønnestad et al. 2015 (Scand J Med Sci Sports)','Vikmoen et al. 2016 (PLoS ONE)','Petré et al. 2021 (meta-análisis)'],tags:['ciclismo','running','gym']},
  polarized:{claim:'La distribución polarizada (80% Z1-Z2, 20% Z4-Z5) produce mejores adaptaciones que el entrenamiento en zona media (umbral) para atletas de resistencia.',grade:'Alta',refs:['Stöggl & Sperlich 2014 (Front Physiol)','Muñoz et al. 2014 (J Strength Cond Res)'],tags:['ciclismo','running','natación']},
  protein:{claim:'La ingesta de proteína de 1.6-2.1g/kg/día maximiza la síntesis proteica muscular. El timing post-ejercicio (30min) con ratio 3:1 carbs:proteína optimiza la recuperación.',grade:'Alta',refs:['ISSN Position Stand 2017 (J Int Soc Sports Nutr)','Morton et al. 2018 (Br J Sports Med)'],tags:['nutrición','gym','recuperación']},
  cwi:{claim:'La inmersión en agua fría (10-15°C, 10-15min) acelera la recuperación perceptual y de rendimiento post-ejercicio. Sin embargo, el uso crónico puede atenuar las adaptaciones de hipertrofia.',grade:'Media',refs:['Moore et al. 2022 (Sports Med)','Roberts et al. 2015 (J Physiol)','Peake et al. 2020 (Front Physiol)'],tags:['recuperación','hidroterapia']},
  rpe:{claim:'La autorregulación por RPE/RIR es efectiva para progresar en fuerza. RPE ≤7 indica margen para subir carga, RPE 8-9 mantener, RPE ≥9 reducir.',grade:'Alta',refs:['Helms et al. 2016 (J Strength Cond Res)','Zourdos et al. 2016 (J Strength Cond Res)'],tags:['gym','principiantes']},
  fondo:{claim:'Las salidas largas en Z2 (65-75% FCmax) desarrollan la base aeróbica, mejoran la oxidación de grasas y la eficiencia metabólica. La nutrición en ruta (30-60g carbs/h) es clave.',grade:'Alta',refs:['Seiler 2010 (Int J Sports Physiol Perform)','UCI Nutrition Project 2025'],tags:['ciclismo','running','nutrición']},
  sleep:{claim:'El sueño de 7-9h es fundamental para la recuperación y adaptación al entrenamiento. La privación de sueño reduce la síntesis proteica y aumenta el riesgo de lesión.',grade:'Alta',refs:['Watson et al. 2017 (Sleep)','Milewski et al. 2014 (J Pediatr Orthop)'],tags:['recuperación','salud']},
  periodization:{claim:'La periodización por bloques (base → construcción → pico → tapering) produce mejores adaptaciones que el entrenamiento monótono.',grade:'Alta',refs:['Issurin 2010 (Sports Med)','Mujika et al. 2018 (Int J Sports Physiol Perform)'],tags:['planificación']},
};
function getEvidenceForSession(sess,prof){
  var cards=[];
  if(sess.sport==='gym') cards.push(EVIDENCE.concurrent,EVIDENCE.rpe);
  if(sess.sport&&(sess.sport.indexOf('bike')>=0||sess.sport==='run'||sess.sport==='trail')){
    cards.push(EVIDENCE.polarized);
    if(sess.zone&&sess.zone.indexOf('Z2')>=0) cards.push(EVIDENCE.fondo);
  }
  if(sess.sport==='hydro') cards.push(EVIDENCE.cwi);
  if(!cards.length) cards.push(EVIDENCE.periodization);
  return cards;
}
// ═══════════════════════════════════════════════════════════════
// RPE TRACKING + AUTO-PROGRESSION — Per exercise weight history
// ═══════════════════════════════════════════════════════════════
function calcProgression(lastWeight,lastRPE){
  if(!lastWeight) return {suggestion:null,action:'Haz un set de prueba con peso ligero'};
  if(lastRPE<=6) return {suggestion:Math.round(lastWeight*1.05),action:'⬆️ Subir peso (+5%): RPE bajo, tienes margen'};
  if(lastRPE<=7) return {suggestion:Math.round(lastWeight*1.025),action:'⬆️ Subir ligeramente (+2.5%)'};
  if(lastRPE<=9) return {suggestion:lastWeight,action:'✅ Mantener peso: RPE correcto'};
  return {suggestion:Math.round(lastWeight*0.9),action:'⬇️ Reducir peso (-10%): RPE muy alto'};
}

// ═══════════════════════════════════════════════════════════════
// NUTRITION ENGINE — ISSN + UCI periodized
// ═══════════════════════════════════════════════════════════════
function getNutrition(prof,sessions,phase){
  var w=prof.weight||70;
  var isHigh=sessions.some(function(s){return s.zone&&(s.zone.indexOf('Z4')>=0||s.zone.indexOf('Z5')>=0)});
  var isLong=sessions.reduce(function(a,s){return a+s.duration},0)>120;
  var isGym=sessions.some(function(s){return s.sport==='gym'});
  var isRest=sessions.every(function(s){return s.sport==='rest'||s.sport==='stretch'||s.sport==='hydro'});
  var totalMin=sessions.reduce(function(a,s){return a+s.duration},0);
  var protein,carbs,fat;
  if(isRest){protein=1.6;carbs=3;fat=1.2}
  else if(isGym&&isHigh){protein=2.1;carbs=5;fat=1.0}
  else if(isGym){protein=2.0;carbs=4;fat=1.0}
  else if(isHigh||isLong){protein=1.8;carbs=7;fat=0.9}
  else{protein=1.7;carbs=5;fat=1.0}
  if(prof.goal==='weight'){carbs=Math.max(carbs*0.8,3);fat=Math.max(fat*0.85,0.8)}
  var kcal=Math.round(protein*w*4+carbs*w*4+fat*w*9);
  var meals=[];
  if(!isRest){
    if(isHigh||isLong) meals.push({time:'🌅 Pre-entreno (2h antes)',items:['Avena con banana y miel (60-80g carbs)','Café (mejora rendimiento)',isLong?'Tostada con mermelada':''],tip:'Cargar glucógeno.'});
    else meals.push({time:'🌅 Pre-entreno (2h antes)',items:['Tostada integral con aguacate','Banana'],tip:'Energía estable.'});
  }
  if(totalMin>90) meals.push({time:'🚴 Durante (>90min)',items:['30-60g carbs/hora (gel, banana, isotónica)','500-750ml agua/hora'],tip:'Practica en entrenos.'});
  if(!isRest){
    if(isGym) meals.push({time:'💪 Post-gym (30min)',items:['Whey 30g + banana + leche','O: yogur griego con granola',Math.round(w*0.4)+'g proteína + '+Math.round(w*0.4*3)+'g carbs'],tip:'Ventana anabólica.'});
    else meals.push({time:'🔄 Post-entreno (30min)',items:['Batido: leche + banana + avena + whey','Ratio 3:1 carbs:proteína'],tip:'Reponer glucógeno.'});
  }
  meals.push({time:'🍽️ Comida principal',items:['Proteína: '+Math.round(w*protein/4)+'g','Carbs: '+Math.round(w*carbs/4)+'g','Verduras variadas','Grasas: aceite oliva, aguacate, frutos secos'],tip:isGym?'Prioriza proteína.':isHigh?'Prioriza carbs.':'Equilibra.'});
  meals.push({time:'💧 Hidratación',items:[Math.round(w*0.035+totalMin*0.01)+'L agua mínimo'],tip:'Orina clara = OK.'});
  if(isGym||isHigh) meals.push({time:'🌙 Noche',items:['Caseína o yogur griego (20g proteína lenta)'],tip:'Repara mientras duermes.'});
  return {protein:protein,carbs:carbs,fat:fat,kcal:kcal,meals:meals,summary:(isRest?'Descanso':isGym?'Fuerza: prot '+protein.toFixed(1)+'g/kg':isHigh?'Intenso: carbs '+carbs+'g/kg':isLong?'Fondo: máx carbs':'Moderado')};
}

// ═══════════════════════════════════════════════════════════════
// GYM ENGINE — Sport-specific + clear names
// ═══════════════════════════════════════════════════════════════
function getGymForSports(disc,phase,dayType){
  var isCyclist=disc.some(function(d){return d.indexOf('bike')>=0});
  var isRunner=disc.indexOf('run')>=0||disc.indexOf('trail')>=0;
  var isTeam=disc.indexOf('soccer')>=0||disc.indexOf('basketball')>=0;
  if(phase==='taper'||phase==='recovery') return {n:'Movilidad y Activación',ex:['foamroll','mobility'],f:'Mantener sin fatiga.'};
  if(dayType==='legs'){
    if(isCyclist&&isRunner) return {n:'Gym: Piernas (Pedal + Zancada)',ex:['squat','bulgarian','stepup','hipthrust','plank','sideplank'],f:'Potencia pedal + economía carrera.'};
    if(isCyclist) return {n:'Gym: Piernas Ciclismo',ex:['squat','legpress','bulgarian','stepup','hipthrust','plank'],f:'Fuerza máxima para potencia en pedal.'};
    if(isRunner) return {n:'Gym: Piernas Running',ex:['squat','lunges','stepup','boxjump','plank','deadbug'],f:'Economía de carrera + prevención lesiones.'};
    if(isTeam) return {n:'Gym: Piernas Explosivas',ex:['squat','boxjump','lunges','kbswing','plank','sideplank'],f:'Explosividad y cambios dirección.'};
    return {n:'Gym: Fuerza Piernas',ex:['squat','legpress','lunges','hipthrust','plank','sideplank'],f:'Fuerza base.'};
  }
  if(dayType==='upper'){
    if(isCyclist) return {n:'Gym: Espalda y Core',ex:['row','facepull','ohp','plank','sideplank','deadbug'],f:'Compensa postura ciclista.'};
    if(isRunner) return {n:'Gym: Tren Superior + Core',ex:['bench','row','ohp','plank','sideplank','deadbug'],f:'Braceo + estabilidad.'};
    return {n:'Gym: Tren Superior',ex:['bench','row','pullup','ohp','facepull','deadbug'],f:'Equilibrio muscular.'};
  }
  if(dayType==='power') return {n:'Gym: Potencia Explosiva',ex:['boxjump','kbswing','bulgarian','stepup','plank','hipthrust'],f:'Transferencia al deporte.'};
  if(dayType==='recovery_active') return {n:'Gym: Recuperación Activa',ex:['foamroll','mobility','hipthrust','deadbug'],f:'Máquinas suaves + movilidad.'};
  return {n:'Gym: Full Body',ex:['squat','bench','row','hipthrust','plank','deadbug'],f:'Sesión completa.'};
}
// ═══════════════════════════════════════════════════════════════
// EXERCISE DATABASE — Detailed steps + muscle tags
// ═══════════════════════════════════════════════════════════════
var EX={
  squat:{name:'Sentadilla',muscle:'🦵 Cuáds, Glúteos, Core',img:'🏋️',sets:'4x6',rest:'2-3min',steps:['Barra en trapecios, pies ancho de hombros, puntas ligeramente afuera','Inspira, baja controlado, espalda recta, pecho arriba','Muslos paralelos al suelo, rodillas en dirección de puntas','Empuja desde talones, expira al subir, bloquea arriba'],tips:'Clave ciclismo y running. Principiante: solo barra.',errors:['Rodillas hacia adentro','Espalda redondeada','Subir con la espalda primero']},
  legpress:{name:'Prensa',muscle:'🦵 Cuáds, Glúteos',img:'🦿',sets:'4x8',rest:'2min',steps:['Espalda pegada al respaldo, cabeza apoyada','Pies en plataforma separación de hombros','Baja controlado hasta 90° en rodillas','Empuja sin bloquear rodillas'],tips:'Pies arriba = más glúteo.',errors:['Bloquear rodillas arriba','Levantar glúteos del asiento']},
  lunges:{name:'Zancadas',muscle:'🦵 Cuáds, Glúteos, Equilibrio',img:'🚶',sets:'3x10/lado',rest:'90s',steps:['De pie con mancuernas, paso largo adelante','Ambas rodillas 90°, trasera casi toca suelo','Empuja con pie delantero para volver','Alterna piernas, tronco recto y core activado'],tips:'Específico running: simula zancada.',errors:['Rodilla pasa la punta del pie','Tronco inclinado adelante']},
  bulgarian:{name:'Sentadilla Búlgara',muscle:'🦵 Cuáds, Glúteo medio',img:'🦵',sets:'3x8/lado',rest:'90s',steps:['Pie trasero en banco, pie delantero adelantado','Baja hasta rodilla delantera 90°','Peso en talón delantero, tronco ligeramente inclinado','Empuja desde talón, aprieta glúteo al subir'],tips:'CLAVE ciclismo: potencia unilateral.',errors:['Pie delantero muy cerca del banco','Rodilla hacia adentro']},
  stepup:{name:'Step-Ups',muscle:'🦵 Cuáds, Glúteos',img:'📦',sets:'3x10/lado',rest:'90s',steps:['Banco a rodilla, mancuernas en manos','Sube empujando desde talón del pie arriba','No te impulses con pie de abajo','Baja controlado, completa un lado primero'],tips:'Simula pedaleo y zancada.',errors:['Impulsarse con el pie de abajo','Inclinar el tronco']},
  boxjump:{name:'Box Jumps',muscle:'🦵 Explosividad',img:'📦',sets:'4x6',rest:'2min',steps:['Frente a cajón 50-60cm, pies separados','Baja rápido a media sentadilla, brazos atrás','Salta explosivo, aterriza suave en cajón','Baja caminando (no saltando)'],tips:'Calidad > cantidad.',errors:['Aterrizar con piernas rectas','Saltar sin preparación']},
  kbswing:{name:'KB Swing',muscle:'🍑 Glúteos, Cardio',img:'🔔',sets:'3x15',rest:'60s',steps:['Pies más anchos que hombros, KB entre pies','Agarra con ambas manos, cadera atrás, espalda recta','Explosión de cadera al frente, KB sube a pecho','KB baja, absorbe con cadera atrás. Ritmo fluido'],tips:'TODO es cadera. Brazos no tiran.',errors:['Tirar con los brazos','Redondear espalda']},
  bench:{name:'Press Banca',muscle:'💪 Pectoral, Tríceps',img:'🏋️',sets:'3x10',rest:'2min',steps:['Acostado, pies firmes, espalda con arco natural','Agarre ancho hombros, barra sobre pecho','Baja controlado al pecho, codos ~45°','Empuja explosivo arriba, bloquea brazos'],tips:'Pide ayuda sin compañero.',errors:['Rebotar en el pecho','Codos muy abiertos (90°)']},
  row:{name:'Remo con Barra',muscle:'💪 Espalda, Bíceps',img:'🏋️',sets:'3x12',rest:'90s',steps:['Inclínate 45°, rodillas flexionadas, barra colgando','Tira al abdomen bajo apretando omóplatos','Aguanta 1s arriba, baja controlado','Core firme, sin impulso de espalda baja'],tips:'COMPENSA postura ciclista.',errors:['Usar impulso de espalda','No apretar omóplatos']},
  pullup:{name:'Dominadas',muscle:'💪 Dorsal, Bíceps',img:'🔝',sets:'3x8',rest:'2min',steps:['Agarre prono más ancho que hombros','Cuelga, activa escápulas','Tira hasta barbilla sobre barra','Baja controlado hasta extensión completa'],tips:'Usa banda elástica si necesitas.',errors:['Balancear el cuerpo','No bajar completo']},
  ohp:{name:'Press Militar',muscle:'💪 Deltoides, Tríceps',img:'🏋️',sets:'3x10',rest:'90s',steps:['De pie o sentado, mancuernas a orejas','Empuja arriba hasta extensión','Baja controlado hasta orejas, codos 90°','Core apretado, no arquees lumbar'],tips:'Más ligero > compensar con espalda.',errors:['Arquear la espalda','Inclinar el tronco']},
  facepull:{name:'Face Pulls',muscle:'💪 Trapecio, Rotadores',img:'🔄',sets:'3x15',rest:'60s',steps:['Polea alta con cuerda, posición retrasada','Tira hacia cara, codos hacia afuera','Manos a orejas, omóplatos juntos, aguanta 2s','Vuelve controlado'],tips:'IMPRESCINDIBLE ciclistas.',errors:['Codos abajo','Usar demasiado peso']},
  plank:{name:'Plancha',muscle:'🧱 Core completo',img:'📏',sets:'3x45s',rest:'60s',steps:['Antebrazos en suelo, codos bajo hombros','Cuerpo en línea recta de cabeza a talones','Abdomen apretado, glúteos activados','Respira normal, aguanta sin hundirte'],tips:'30s perfectos > 60s mala forma.',errors:['Cadera muy alta','Cadera hundida']},
  sideplank:{name:'Plancha Lateral',muscle:'🧱 Oblicuos, Glúteo medio',img:'📐',sets:'3x30s/lado',rest:'45s',steps:['Apoyado en antebrazo, pies apilados','Sube cadera formando línea recta','Mano libre al cielo o cadera','Aguanta sin que caiga la cadera'],tips:'Estabilidad MTB y trail.',errors:['Cadera caída','Rotar el tronco']},
  deadbug:{name:'Dead Bug',muscle:'🧱 Core profundo',img:'🐛',sets:'3x12',rest:'45s',steps:['Boca arriba, brazos al cielo, rodillas 90°','Extiende brazo derecho + pierna izquierda','Espalda baja PEGADA al suelo (crucial)','Vuelve al centro, repite lado opuesto'],tips:'Anti-rotación ideal para ciclistas.',errors:['Espalda se despega del suelo','Mover demasiado rápido']},
  hipthrust:{name:'Hip Thrust',muscle:'🍑 Glúteos, Isquios',img:'🍑',sets:'3x12',rest:'90s',steps:['Espalda alta en banco, pies a 90°','Barra/peso sobre caderas con almohadilla','Empuja caderas al cielo apretando glúteos','Aguanta 1s arriba, baja sin tocar suelo'],tips:'Mejor ejercicio de glúteos.',errors:['Hiperextender la espalda','No apretar glúteos arriba']},
  foamroll:{name:'Foam Rolling',muscle:'🔄 Auto-masaje',img:'🧴',sets:'2min/zona',rest:'-',steps:['Rueda lentamente buscando puntos de tensión','En puntos dolorosos quédate 20-30s','Zonas: IT band, cuáds, gemelos, glúteos, espalda alta'],tips:'Antes y después de entrenar.',errors:[]},
  mobility:{name:'Movilidad Articular',muscle:'🔄 Articulaciones',img:'🤸',sets:'10/ejercicio',rest:'-',steps:['Círculos de cadera 10 en cada dirección','Sentadilla profunda 30s','Flexores de cadera 30s/lado','Rotación torácica 10/lado','Gemelos en escalón 30s/pierna'],tips:'10 minutos diarios previenen lesiones.',errors:[]},
  'bike-z2':{name:'Rodaje Aeróbico Z2',muscle:'🦵 Base aeróbica',img:'🚴',sets:'Continuo',rest:'-',stepsGen:function(p){return ['Calentamiento progresivo 15min','Mantén '+bz(p,0.56,0.75,0.6,0.7)+' constante','Cadencia 85-95rpm, pedaleo redondo','Hidratación c/20min','Vuelta calma 10min']},tips:'Debes poder hablar frases completas.'},
  'bike-ss':{name:'Sweet Spot (Umbral)',muscle:'🦵 Resistencia muscular',img:'🚴',sets:'3x15min',rest:'5min Z1',stepsGen:function(p){return ['Calentamiento 20min + 2x30s aceleraciones','15min a '+bz(p,0.88,0.93,0.8,0.87),'Cad 80-90rpm, posición estable','Recuperación 5min Z1, repite 3x','Vuelta calma 15min']},tips:'Incómodo pero sostenible.'},
  'bike-vo2':{name:'Intervalos VO2max',muscle:'🫁 Capacidad máxima',img:'🚴',sets:'5x5min',rest:'5min',stepsGen:function(p){return ['Calentamiento 20min + 3x30s sprints','5min a '+bz(p,1.06,1.2,0.9,0.95)+' MUY duro','Recuperación 5min suave','Repite 5x (si no aguantas la 5a, para en 4)','Vuelta calma 10min']},tips:'Al LÍMITE.'},
  'bike-fondo':{name:'Fondo Largo',muscle:'🦵 Resistencia',img:'🚴',sets:'Continuo',rest:'-',stepsGen:function(p){return ['Desayuno 2-3h antes: avena + banana','30min Z1 calentamiento','Mantén '+bz(p,0.56,0.70,0.58,0.68)+' estable','Nutrición: 30-60g carbs/h desde min 45','Hidratación: 500-750ml/h + electrolitos','Últimos 30min baja a Z1']},tips:'CONSISTENCIA + NUTRICIÓN.'},
  'run-z2':{name:'Rodaje Aeróbico Z2',muscle:'🦵 Resistencia base',img:'🏃',sets:'Continuo',rest:'-',stepsGen:function(p){return ['5min caminata + trote suave','FC '+Math.round(p.maxHR*0.6)+'-'+Math.round(p.maxHR*0.7)+', conversacional','Zancada corta y frecuente','5min trote + caminata final']},tips:'Si no puedes hablar, vas fuerte.'},
  'run-intervals':{name:'Intervalos 5x1km',muscle:'🫁 VO2max, Velocidad',img:'🏃',sets:'5x1km',rest:'2min',stepsGen:function(p){return ['15min calentamiento + 4 aceleraciones 80m','1km a FC '+Math.round(p.maxHR*0.85)+'-'+Math.round(p.maxHR*0.9),'Rec 2min trote suave','Repite 5x','15min vuelta calma']},tips:'Ritmo CONSTANTE en cada km.'},
  'run-fartlek':{name:'Fartlek Competitivo',muscle:'🫁 Cambios de ritmo',img:'🏃',sets:'40min',rest:'Variable',stepsGen:function(p){return ['10min trote calentamiento','2min rápido + 1min trote','C/10min: sprint 30s','Últimos 2min al máximo','10min vuelta calma']},tips:'Simula carrera real.'},
  'hydro':{name:'Hidroterapia Piscina',muscle:'🔄 Recuperación',img:'💧',sets:'30-40min',rest:'-',steps:['5min nado suave','10min caminar en agua al pecho','5min movilidad acuática','5min flotar relajando','Contraste: 2min caliente + 30s fría x3'],tips:'NO nades fuerte. RECUPERAR.'},
  'sauna':{name:'Turco / Sauna',muscle:'🔄 Relajación',img:'🧖',sets:'15-20min',rest:'-',steps:['Ducha tibia antes','10-15min en turco','Hidrátate','Ducha fría 30s al salir','Reposa 5min'],tips:'No excedas 20min. Post-gym ideal.'},
  'jacuzzi':{name:'Hidromasaje',muscle:'🔄 Relajación profunda',img:'♨️',sets:'15min',rest:'-',steps:['15min máx, jets en zonas tensas','Hidrátate al salir'],tips:'Post-sesión intensa.'},
};
function getBD(ph,mtb){if(mtb)return 'bike-z2';if(ph==='base'||ph==='recovery'||ph==='taper')return 'bike-z2';if(ph==='build')return 'bike-ss';return 'bike-vo2'}
function getRD(ph){if(ph==='base'||ph==='recovery'||ph==='taper')return 'run-z2';if(ph==='build')return 'run-intervals';return 'run-fartlek'}
// ═══════════════════════════════════════════════════════════════
// SESSION BUILDER + PLAN GENERATOR + ADAPTATION ENGINE
// ═══════════════════════════════════════════════════════════════
function mkS(sport,dur,phase,prof,gymType){
  var m=prof.maxHR||190;
  var gen=['yoga','crossfit','padel','tennis','climbing','boxing','rowing','soccer','basketball','dance','martial','spinning','hiking'];
  if(gen.indexOf(sport)>=0) return {sport:sport,name:(SI[sport]||'')+' '+sport.charAt(0).toUpperCase()+sport.slice(1),desc:'Ajusta intensidad.',zone:'Variable',duration:dur,tss:Math.round(dur*0.5),done:false,details:null}
  var db={
    'bike-road':{base:{n:'Rodaje Z2',z:'Z2',d:bz(prof,0.56,0.75,0.6,0.7)+'. Cad 85-95rpm.'},build:{n:'Sweet Spot',z:'Z3-Z4',d:'3x15min a '+bz(prof,0.88,0.93,0.8,0.87)+'.'},peak:{n:'VO2max',z:'Z5',d:'5x5min a '+bz(prof,1.06,1.2,0.9,0.95)+'.'},taper:{n:'Activación',z:'Z2',d:'Suave + strides.'},recovery:{n:'Regenerativo',z:'Z1',d:'Muy suave.'}},
    'bike-mtb':{base:{n:'Técnica MTB Z2',z:'Z2',d:'Single track.'},build:{n:'MTB Subidas',z:'Z4',d:'4x8min subida.'},peak:{n:'Simulación XCO',z:'Z4-Z5',d:'Explosivo.'},taper:{n:'MTB Suave',z:'Z1-Z2',d:'Técnico.'},recovery:{n:'Paseo MTB',z:'Z1',d:'Fácil.'}},
    run:{base:{n:'Rodaje Aeróbico',z:'Z2',d:'FC '+Math.round(m*.6)+'-'+Math.round(m*.7)+'. Conversacional.'},build:{n:'Intervalos 5x1km',z:'Z4',d:'FC '+Math.round(m*.85)+'-'+Math.round(m*.9)+'.'},peak:{n:'Fartlek',z:'Z3-Z5',d:'Cambios explosivos.'},taper:{n:'Trote',z:'Z1-Z2',d:'30min suave.'},recovery:{n:'Regen',z:'Z1',d:'FC máx '+Math.round(m*.6)+'.'}},
    trail:{base:{n:'Trail Z2',z:'Z2',d:'400-600m D+.'},build:{n:'Cuestas',z:'Z3-Z4',d:'6x4min.'},peak:{n:'Simulación',z:'Z3-Z5',d:'Perfil competencia.'},taper:{n:'Trail Suave',z:'Z1-Z2',d:'200m D+.'},recovery:{n:'Caminata',z:'Z1',d:'Fácil.'}},
    swim:{base:{n:'Técnica+Aeróbico',z:'Z2',d:'4x100téc+6x100Z2.'},build:{n:'Progresivos',z:'Z2-Z3',d:'3x300+4x50.'},peak:{n:'Umbral',z:'Z3-Z4',d:'8x100.'},taper:{n:'Técnico',z:'Z1',d:'20min.'},recovery:{n:'Regen',z:'Z1',d:'15min.'}},
    rest:{base:{n:'Descanso Total',z:'-',d:'Hidratación, sueño.'},build:{n:'Descanso',z:'-',d:'Recupera.'},peak:{n:'Descanso',z:'-',d:'Total.'},taper:{n:'Descanso',z:'-',d:'Total.'},recovery:{n:'Descanso',z:'-',d:'Total.'}},
  };
  if(sport==='gym'){var gw=getGymForSports(prof.disciplines,phase,gymType||'legs');return {sport:'gym',name:gw.n,desc:gw.f,zone:'Gym',duration:dur,tss:Math.round(dur*0.5),done:false,details:gw.ex}}
  if(sport==='hydro'){var rd=[];if(hasGymPool(prof))rd.push('hydro');if(hasGymSauna(prof))rd.push('sauna');if(hasGymJacuzzi(prof))rd.push('jacuzzi');if(!rd.length)rd=['foamroll','mobility'];return {sport:'hydro',name:'Recuperación'+(rd.length>1?' ('+rd.map(function(r){return EX[r]?EX[r].name:r}).join(' + ')+')':''),desc:'',zone:'Recup.',duration:35,tss:5,done:false,details:rd}}
  if(sport==='bike-fondo') return {sport:'bike-road',name:'Fondo Largo',desc:'Z2 constante + nutrición en ruta. '+bz(prof,0.56,0.70,0.58,0.68)+'.',zone:'Z2',duration:dur,tss:Math.round(dur*0.65),done:false,details:['bike-fondo']}
  if(sport.indexOf('bike')>=0){var bd=getBD(phase,sport==='bike-mtb');var t=(db[sport]&&db[sport][phase])||db[sport].base;return {sport:sport,name:t.n,desc:t.d,zone:t.z,duration:dur,tss:Math.round(dur*0.7),done:false,details:[bd]}}
  if(sport==='run'||sport==='trail'){var rd2=sport==='run'?getRD(phase):null;var t2=(db[sport]&&db[sport][phase])||db[sport].base;return {sport:sport,name:t2.n,desc:t2.d,zone:t2.z,duration:dur,tss:Math.round(dur*0.9),done:false,details:rd2?[rd2]:null}}
  var t3=(db[sport]&&db[sport][phase])||(db[sport]&&db[sport].base)||{n:sport,z:'-',d:''};
  return {sport:sport,name:t3.n,desc:t3.d,zone:t3.z,duration:dur,tss:Math.round(dur*0.6),done:false,details:null};
}
function genPlan(prof,wk,phase,fbH,prevPlan){
  var vm={base:0.85,build:1,peak:0.9,taper:0.5,recovery:0.4}[phase]||1;
  var rc=fbH.slice(-7),af=rc.length>0?rc.reduce(function(s,f){return s+(10-f.energy+f.soreness)/2},0)/rc.length:5;
  var fa=af>7?0.75:af>5.5?0.9:1;
  if(prevPlan&&prevPlan.plan){var ts=0,ds=0;prevPlan.plan.forEach(function(d){d.sessions.forEach(function(s){ts++;if(s.done)ds++})});if(ts>0&&ds/ts<0.5)fa*=0.85;else if(ts>0&&ds/ts<0.75)fa*=0.92}
  var hrs=prof.hoursPerWeek*vm*fa;
  var disc=prof.disciplines.filter(function(d){return d!=='gym'&&d!=='rest'&&d!=='stretch'});
  var hasGym=prof.disciplines.indexOf('gym')>=0;
  var hydroAvail=hasGymPool(prof)||hasGymSauna(prof)||hasGymJacuzzi(prof);
  var endurance=disc.filter(function(d){return ['bike-road','bike-mtb','run','trail','swim'].indexOf(d)>=0});
  var isCyclist=disc.some(function(d){return d.indexOf('bike')>=0});
  var isRunner=disc.indexOf('run')>=0||disc.indexOf('trail')>=0;
  var other=disc.filter(function(d){return endurance.indexOf(d)<0});
  // ═══════════════════════════════════════════════════════
  // DSS ENGINE: Rule-based, works for ANY sport combination
  // Rules: 1) No 2 hard days in a row  2) Rest after fondo
  //        3) Gym legs not with hard endurance  4) >=1 rest day
  //        5) Fondo on weekend  6) Pool after hard + pre-fondo
  //        7) Distribute sports evenly  8) Polarized ~80/20
  // ═══════════════════════════════════════════════════════
  var loadPattern;
  if(phase==='taper'||phase==='recovery') loadPattern=[1,1,0,1,0,1,0];
  else if(phase==='peak') loadPattern=[1,3,1,2,0,3,0];
  else loadPattern=[1,2,3,2,1,3,0]; // base/build
  var gymDays=0,gymTypes=['legs','upper','power'];
  var plan=WD.map(function(day,i){
    var tl=loadPattern[i];
    var sessions=[];
    var dayHrs=hrs/7*(tl===0?0:tl===1?0.6:tl===2?1.0:1.6);
    if(tl===0){
      if(hydroAvail) sessions.push(mkS('hydro',0,phase,prof,null));
      else sessions.push(mkS('rest',0,phase,prof,null));
    } else if(tl===1){
      if(endurance.length>0) sessions.push(mkS(endurance[i%endurance.length],Math.round(dayHrs*60),'base',prof,null));
      else if(other.length>0) sessions.push(mkS(other[i%other.length],Math.round(dayHrs*60),phase,prof,null));
      else if(hasGym) sessions.push(mkS('gym',Math.round(dayHrs*60),'recovery',prof,'recovery_active'));
      else sessions.push(mkS('stretch',30,phase,prof,null));
      if(hydroAvail) sessions.push(mkS('hydro',0,phase,prof,null));
    } else if(tl===2){
      if(hasGym&&gymDays<3){
        var gt=gymTypes[gymDays%gymTypes.length];gymDays++;
        sessions.push(mkS('gym',Math.round(dayHrs*0.5*60),phase,prof,gt));
        if(endurance.length>0) sessions.push(mkS(endurance[(i+1)%endurance.length],Math.round(dayHrs*0.5*60),'base',prof,null));
        else if(other.length>0) sessions.push(mkS(other[i%other.length],Math.round(dayHrs*0.5*60),phase,prof,null));
      } else if(other.length>0){
        sessions.push(mkS(other[i%other.length],Math.round(dayHrs*60),phase,prof,null));
      } else if(endurance.length>0){
        sessions.push(mkS(endurance[i%endurance.length],Math.round(dayHrs*60),'base',prof,null));
      }
    } else if(tl===3){
      if(i>=5&&(isCyclist||isRunner)){
        var fondoS=isCyclist?'bike-fondo':endurance[0]||'run';
        sessions.push(mkS(fondoS,Math.round(dayHrs*60),phase,prof,null));
      } else if(endurance.length>0){
        sessions.push(mkS(endurance[i%endurance.length],Math.round(dayHrs*60),phase,prof,null));
      } else if(other.length>0){
        sessions.push(mkS(other[i%other.length],Math.round(dayHrs*60),phase,prof,null));
      } else if(hasGym){
        sessions.push(mkS('gym',Math.round(dayHrs*60),phase,prof,'legs'));
      }
    }
    return {day:day,idx:i,sessions:sessions,tss:sessions.reduce(function(a,b){return a+b.tss},0),feedback:null,adaptations:[],load:tl};
  });
  plan=validatePlan(plan,prof,phase,hydroAvail);
  return {week:wk,phase:phase,plan:plan,targetHrs:hrs,fatigue:af};
}
function validatePlan(plan,prof,phase,hydroAvail){
  function isHard(d){return d.sessions.some(function(s){return s.zone&&(s.zone.indexOf('Z4')>=0||s.zone.indexOf('Z5')>=0)})}
  function isFondo(d){return d.sessions.some(function(s){return s.duration>=150})}
  function isGymLegs(d){return d.sessions.some(function(s){return s.sport==='gym'&&s.name&&s.name.indexOf('Pierna')>=0})}
  function isGym(d){return d.sessions.some(function(s){return s.sport==='gym'})}
  for(var i=0;i<7;i++){
    var d=plan[i],prev=i>0?plan[i-1]:plan[6];
    if(isHard(d)&&isHard(prev)){
      d.sessions=d.sessions.map(function(s){
        if(s.zone&&(s.zone.indexOf('Z4')>=0||s.zone.indexOf('Z5')>=0))
          return Object.assign({},s,{zone:'Z2',name:s.name.replace(/Intervalos|Sweet Spot|VO2max|Fartlek/,'Rodaje Suave'),duration:Math.round(s.duration*0.7),tss:Math.round(s.tss*0.5)});
        return s;
      });
      d.adaptations=[{icon:'⚠️',reason:'2 días intensos seguidos',action:'Reducido a Z2.'}];
    }
    if(isFondo(prev)){
      if(isGym(d)) d.sessions=d.sessions.map(function(s){
        if(s.sport==='gym') return Object.assign({},s,{name:'Gym: Recuperación Activa',details:['foamroll','mobility','hipthrust','deadbug'],duration:Math.min(s.duration,40),desc:'Post-fondo: solo movilidad.'});
        return Object.assign({},s,{zone:'Z1',duration:Math.min(s.duration,30)});
      });
      if(hydroAvail&&!d.sessions.some(function(s){return s.sport==='hydro'})) d.sessions.push(mkS('hydro',0,phase,prof,null));
    }
    if(isGymLegs(d)&&isHard(d)){
      d.sessions=d.sessions.map(function(s){
        if(s.sport!=='gym'&&s.zone&&s.zone.indexOf('Z4')>=0) return Object.assign({},s,{zone:'Z2',name:'Rodaje Suave',duration:Math.round(s.duration*0.7)});
        return s;
      });
    }
  }
  return plan;
}
function adaptD(day,fb,prof){
  var ad=[],ss=day.sessions.map(function(s){return Object.assign({},s)});
  var hasHydro=ss.some(function(s){return s.sport==='hydro'});
  var bigEffort=fb.prevActivity&&fb.prevActivityHours>=3;
  var feelGood=fb.energy>=7&&fb.sleep>=6&&fb.soreness<=4;
  if(bigEffort){
    if(feelGood){
      ad.push({icon:'🚴',reason:'Ayer: '+fb.prevActivity+' ('+fb.prevActivityHours+'h) — Te sientes bien',action:'Gym recuperación activa + hidro + rodaje suave.'});
      var newSS=[];
      newSS.push(mkS('gym',40,null,prof,'recovery_active'));
      if(!hasHydro){var rd=[];if(hasGymPool(prof))rd.push('hydro');if(hasGymSauna(prof))rd.push('sauna');if(hasGymJacuzzi(prof))rd.push('jacuzzi');if(rd.length){rd.push('mobility');newSS.push({sport:'hydro',name:'Recuperación ('+rd.map(function(r){return EX[r]?EX[r].name:r}).join(' + ')+')',desc:'',zone:'Recup.',duration:35,tss:5,done:false,details:rd})}}
      ss.forEach(function(s){if(s.sport&&(s.sport.indexOf('bike')>=0||s.sport==='run'||s.sport==='trail'))newSS.push(Object.assign({},s,{name:'Rodaje suave (vuelta a casa)',zone:'Z1',duration:Math.min(s.duration,30),tss:5,desc:'Solo moverse.'}))});
      ss=newSS;
    } else {
      ad.push({icon:'🚴',reason:'Ayer: '+fb.prevActivity+' ('+fb.prevActivityHours+'h) + fatiga',action:'Recuperación total.'});
      var recSS=[mkS('gym',30,null,prof,'recovery_active')];
      if(hasGymPool(prof)||hasGymSauna(prof)){var rd2=[];if(hasGymPool(prof))rd2.push('hydro');if(hasGymSauna(prof))rd2.push('sauna');if(hasGymJacuzzi(prof))rd2.push('jacuzzi');rd2.push('mobility');recSS.push({sport:'hydro',name:'Recuperación',desc:'',zone:'Recup.',duration:40,tss:5,done:false,details:rd2})}
      ss=recSS;
    }
  }
  if(fb.illness||(fb.energy<=2&&fb.sleep<=3)){ad.push({icon:'🛑',reason:fb.illness?'Enfermedad':'Fatiga extrema',action:'Descanso total.'});return{sessions:[{sport:'rest',name:'Descanso Obligado',desc:'No entrenes.',zone:'-',duration:0,tss:0,done:false,details:null}],ad:ad}}
  if(!bigEffort&&fb.energy<=4){var r=fb.energy<=3?0.6:0.8;ad.push({icon:'⚡',reason:'Energía '+fb.energy+'/10',action:'Sesión al '+Math.round(r*100)+'%.'});ss=ss.map(function(s){return Object.assign({},s,{duration:Math.round(s.duration*r),tss:Math.round(s.tss*r*0.8)})})}
  if(!bigEffort&&fb.soreness>=7&&!hasHydro){ad.push({icon:'💪',reason:'Dolor muscular '+fb.soreness+'/10',action:'+ Recuperación.'});var rd3=[];if(hasGymPool(prof))rd3.push('hydro');if(hasGymSauna(prof))rd3.push('sauna');if(!rd3.length)rd3.push('foamroll');rd3.push('mobility');ss.push({sport:'hydro',name:'Recuperación',desc:'',zone:'Recup.',duration:30,tss:5,done:false,details:rd3})}
  if(!bigEffort&&fb.energy>=8&&fb.sleep>=7&&fb.motivation>=8&&fb.soreness<=3&&fb.stress<=3){ad.push({icon:'🚀',reason:'Estado óptimo',action:'+10% volumen 🔥'});ss=ss.map(function(s){return s.sport!=='rest'?Object.assign({},s,{duration:Math.round(s.duration*1.1),tss:Math.round(s.tss*1.15)}):s})}
  return{sessions:ss,ad:ad};
}
// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════
function ExCard({exId,prof,gymLog,setGymLog,exDone,onToggleEx}){
  var ex=EX[exId];if(!ex) return null;
  const [open,setOpen]=useState(false);
  var steps=ex.stepsGen?ex.stepsGen(prof||{ftp:200,maxHR:185}):ex.steps;
  var log=gymLog&&gymLog[exId];
  var prog=log?calcProgression(log.weight,log.rpe):null;
  return (<div style={{background:exDone?'#f0fdf4':'#f8fafc',borderRadius:8,border:'1px solid '+(exDone?'#bbf7d0':'#e2e8f0'),marginBottom:6,opacity:exDone?0.6:1}}>
    <div style={{display:'flex',alignItems:'center',gap:0}}>
      {onToggleEx&&<button onClick={function(e){e.stopPropagation();onToggleEx(exId)}} style={{width:20,height:20,borderRadius:4,border:'2px solid '+(exDone?'#22c55e':'#cbd5e1'),background:exDone?'#22c55e':'#fff',color:'#fff',cursor:'pointer',fontSize:'0.55rem',flexShrink:0,marginLeft:10,display:'flex',alignItems:'center',justifyContent:'center'}}>{exDone&&'\u2713'}</button>}
      <button onClick={function(){setOpen(!open)}} style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:'none',background:'none',cursor:'pointer',textAlign:'left'}}>
        <span style={{fontSize:'1.3rem'}}>{ex.img}</span>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:'0.82rem',textDecoration:exDone?'line-through':'none'}}>{ex.name}</div><div style={{fontSize:'0.7rem',color:'#64748b'}}>{ex.muscle}</div></div>
        {ex.sets&&<span style={{fontSize:'0.72rem',fontWeight:600,color:'#3b82f6',background:'#eff6ff',padding:'2px 8px',borderRadius:4}}>{ex.sets}</span>}
        <span style={{color:'#94a3b8',fontSize:'0.8rem'}}>{open?'▲':'▼'}</span>
      </button>
    </div>
    {open&&<div style={{padding:'0 10px 10px'}}>
      <div style={{background:'#fff',borderRadius:6,padding:10,border:'1px solid #e2e8f0',marginBottom:6}}>
        <div style={{fontWeight:600,fontSize:'0.75rem',color:'#1e40af',marginBottom:6}}>📋 Paso a paso:</div>
        {steps.map(function(s,i){return (<div key={i} style={{display:'flex',gap:6,marginBottom:4,fontSize:'0.78rem'}}><span style={{background:'#1e40af',color:'#fff',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem',flexShrink:0,marginTop:1}}>{i+1}</span><span>{s}</span></div>)})}
      </div>
      {ex.errors&&ex.errors.length>0&&<div style={{background:'#fef2f2',borderRadius:6,padding:8,border:'1px solid #fecaca',marginBottom:6,fontSize:'0.72rem',color:'#dc2626'}}><strong>❌ Errores comunes:</strong>{ex.errors.map(function(e,i){return (<div key={i} style={{paddingLeft:8}}>{'• '+e}</div>)})}</div>}
      {ex.rest&&ex.rest!=='-'&&<span style={{fontSize:'0.72rem',background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:4}}>{'⏱ Descanso: '+ex.rest}</span>}
      <div style={{fontSize:'0.75rem',color:'#059669',background:'#ecfdf5',padding:'6px 8px',borderRadius:4,marginTop:6}}>{'💡 '+ex.tips}</div>
      {/* RPE/Weight tracking for gym exercises */}
      {EX_MUSCLES[exId]&&setGymLog&&<div style={{background:'#f0f9ff',borderRadius:6,padding:8,marginTop:6,border:'1px solid #bae6fd'}}>
        <div style={{fontWeight:600,fontSize:'0.72rem',color:'#0369a1',marginBottom:6}}>📊 Tracking (RPE/Peso)</div>
        {prog&&prog.suggestion&&<div style={{fontSize:'0.72rem',color:'#0369a1',marginBottom:4,background:'#e0f2fe',padding:'3px 6px',borderRadius:4}}>{prog.action+' → '+prog.suggestion+'kg'}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
          <label style={{fontSize:'0.65rem',color:'#64748b'}}>Peso (kg)<input type="number" style={Object.assign({},ST.inp,{padding:'4px 6px',fontSize:'0.78rem'})} value={log?log.weight:''} onChange={function(e){var nl=Object.assign({},gymLog||{});nl[exId]=Object.assign({},nl[exId]||{},{weight:+e.target.value});setGymLog(nl)}}/></label>
          <label style={{fontSize:'0.65rem',color:'#64748b'}}>Reps<input type="number" style={Object.assign({},ST.inp,{padding:'4px 6px',fontSize:'0.78rem'})} value={log?log.reps:''} onChange={function(e){var nl=Object.assign({},gymLog||{});nl[exId]=Object.assign({},nl[exId]||{},{reps:+e.target.value});setGymLog(nl)}}/></label>
          <label style={{fontSize:'0.65rem',color:'#64748b'}}>RPE (1-10)<input type="number" min="1" max="10" style={Object.assign({},ST.inp,{padding:'4px 6px',fontSize:'0.78rem'})} value={log?log.rpe:''} onChange={function(e){var nl=Object.assign({},gymLog||{});nl[exId]=Object.assign({},nl[exId]||{},{rpe:+e.target.value});setGymLog(nl)}}/></label>
        </div>
      </div>}
    </div>}
  </div>);
}

function EvidenceModal({sess,prof,onClose}){
  var cards=getEvidenceForSession(sess,prof);
  return (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:100}} onClick={onClose}><div style={{background:'#fff',borderRadius:'14px 14px 0 0',maxWidth:480,width:'100%',maxHeight:'70vh',overflow:'auto',padding:18}} onClick={function(e){e.stopPropagation()}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3 style={{fontSize:'1rem',fontWeight:700,margin:0}}>🔬 Evidencia Científica</h3><button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer'}}>✕</button></div>
    <div style={{fontSize:'0.75rem',color:'#64748b',marginBottom:12}}>¿Por qué esta sesión? Justificación basada en evidencia.</div>
    {cards.map(function(card,i){var gc=card.grade==='Alta'?'#16a34a':card.grade==='Media'?'#ca8a04':'#94a3b8';return (<div key={i} style={{background:'#f8fafc',borderRadius:8,padding:12,border:'1px solid #e2e8f0',marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}><span style={{padding:'2px 6px',borderRadius:4,fontSize:'0.65rem',fontWeight:700,background:gc+'20',color:gc}}>{'Evidencia: '+card.grade}</span></div>
      <div style={{fontSize:'0.8rem',color:'#1e293b',fontWeight:600,marginBottom:4}}>{card.claim}</div>
      <div style={{fontSize:'0.7rem',color:'#64748b'}}>{card.refs.map(function(r,j){return (<div key={j} style={{padding:'1px 0'}}>{'📄 '+r}</div>)})}</div>
      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:6}}>{card.tags.map(function(tag,j){return (<span key={j} style={{fontSize:'0.6rem',padding:'1px 6px',borderRadius:10,background:'#eff6ff',color:'#1e40af'}}>{'#'+tag}</span>)})}</div>
    </div>)})}
  </div></div>);
}

function FatigueMap({weekPlan}){
  var fatigue=calcMuscleFatigue(weekPlan);
  var fc=function(id){var v=fatigue[id]||0;if(v<3)return '#22c55e';if(v<6)return '#facc15';if(v<9)return '#f97316';return '#ef4444'};
  var fo=function(id){var v=fatigue[id]||0;return Math.max(0.25,Math.min(1,v/10))};
  // SVG body silhouette with colored muscle zones
  return (<div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #e2e8f0'}}>
    <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:4}}>🔥 Monitor de Fatiga Muscular</h3>
    <div style={{fontSize:'0.72rem',color:'#64748b',marginBottom:8}}>Basado en volumen × intensidad × recencia. Marca ✓ en sesiones para actualizar.</div>
    <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
      {/* BODY SVG */}
      <svg viewBox="0 0 200 420" style={{width:160,flexShrink:0}}>
        {/* Head */}
        <circle cx="100" cy="30" r="22" fill="#d1d5db" stroke="#94a3b8" strokeWidth="1"/>
        {/* Neck */}
        <rect x="90" y="52" width="20" height="12" rx="4" fill="#d1d5db"/>
        {/* Shoulders */}
        <ellipse cx="60" cy="78" rx="20" ry="12" fill={fc('shoulders')} opacity={fo('shoulders')} stroke="#64748b" strokeWidth="0.5"/>
        <ellipse cx="140" cy="78" rx="20" ry="12" fill={fc('shoulders')} opacity={fo('shoulders')} stroke="#64748b" strokeWidth="0.5"/>
        {/* Chest */}
        <ellipse cx="100" cy="105" rx="38" ry="28" fill={fc('chest')} opacity={fo('chest')} stroke="#64748b" strokeWidth="0.5"/>
        {/* Core */}
        <rect x="72" y="130" width="56" height="50" rx="8" fill={fc('core')} opacity={fo('core')} stroke="#64748b" strokeWidth="0.5"/>
        {/* Back (shown as overlay lines) */}
        <line x1="75" y1="85" x2="75" y2="130" stroke={fc('back')} strokeWidth="6" opacity={fo('back')} strokeLinecap="round"/>
        <line x1="125" y1="85" x2="125" y2="130" stroke={fc('back')} strokeWidth="6" opacity={fo('back')} strokeLinecap="round"/>
        {/* Arms */}
        <rect x="30" y="82" width="14" height="55" rx="7" fill={fc('arms')} opacity={fo('arms')} stroke="#64748b" strokeWidth="0.5"/>
        <rect x="156" y="82" width="14" height="55" rx="7" fill={fc('arms')} opacity={fo('arms')} stroke="#64748b" strokeWidth="0.5"/>
        {/* Forearms */}
        <rect x="28" y="137" width="12" height="45" rx="6" fill={fc('arms')} opacity={fo('arms')*0.7} stroke="#64748b" strokeWidth="0.5"/>
        <rect x="160" y="137" width="12" height="45" rx="6" fill={fc('arms')} opacity={fo('arms')*0.7} stroke="#64748b" strokeWidth="0.5"/>
        {/* Glutes */}
        <ellipse cx="85" cy="190" rx="18" ry="14" fill={fc('glutes')} opacity={fo('glutes')} stroke="#64748b" strokeWidth="0.5"/>
        <ellipse cx="115" cy="190" rx="18" ry="14" fill={fc('glutes')} opacity={fo('glutes')} stroke="#64748b" strokeWidth="0.5"/>
        {/* Thighs (Legs) */}
        <rect x="68" y="200" width="24" height="80" rx="10" fill={fc('legs')} opacity={fo('legs')} stroke="#64748b" strokeWidth="0.5"/>
        <rect x="108" y="200" width="24" height="80" rx="10" fill={fc('legs')} opacity={fo('legs')} stroke="#64748b" strokeWidth="0.5"/>
        {/* Calves */}
        <rect x="70" y="285" width="20" height="65" rx="8" fill={fc('legs')} opacity={fo('legs')*0.8} stroke="#64748b" strokeWidth="0.5"/>
        <rect x="110" y="285" width="20" height="65" rx="8" fill={fc('legs')} opacity={fo('legs')*0.8} stroke="#64748b" strokeWidth="0.5"/>
        {/* Feet */}
        <ellipse cx="80" cy="360" rx="14" ry="6" fill="#d1d5db" stroke="#94a3b8" strokeWidth="0.5"/>
        <ellipse cx="120" cy="360" rx="14" ry="6" fill="#d1d5db" stroke="#94a3b8" strokeWidth="0.5"/>
      </svg>
      {/* LEGEND + BARS */}
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
        {MUSCLE_ZONES.map(function(zone){var val=fatigue[zone.id]||0;var fl=fatigueLevel(val);return (<div key={zone.id} style={{background:fl.bg,borderRadius:6,padding:'5px 8px',border:'1px solid '+fl.color+'30'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontWeight:600,fontSize:'0.72rem'}}>{zone.emoji+' '+zone.name}</span><span style={{fontSize:'0.62rem',fontWeight:700,color:fl.color}}>{fl.label}</span></div>
          <div style={{background:'#e2e8f0',borderRadius:3,height:5,marginTop:3,overflow:'hidden'}}><div style={{background:fl.color,height:'100%',borderRadius:3,width:Math.min(val/12*100,100)+'%',transition:'width 0.3s'}}/></div>
        </div>)})}
        <div style={{display:'flex',gap:6,marginTop:6,justifyContent:'center'}}>
          {[{c:'#22c55e',l:'Fresco'},{c:'#facc15',l:'Moderado'},{c:'#f97316',l:'Cargado'},{c:'#ef4444',l:'Sobrecargado'}].map(function(x,i){
            return (<div key={i} style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:8,height:8,borderRadius:'50%',background:x.c}}/><span style={{fontSize:'0.58rem',color:'#64748b'}}>{x.l}</span></div>);
          })}
        </div>
      </div>
    </div>
  </div>);
}

function NutriModal({day,prof,phase,onClose}){
  var nut=getNutrition(prof,day.sessions,phase);
  return (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:100}}><div style={{background:'#fff',borderRadius:'14px 14px 0 0',maxWidth:480,width:'100%',maxHeight:'85vh',overflow:'auto',padding:18}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h3 style={{fontSize:'1rem',fontWeight:700,margin:0}}>{'🥗 Nutrición — '+day.day}</h3><button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer'}}>✕</button></div>
    <div style={{background:'#f0fdf4',borderRadius:8,padding:10,marginBottom:12,border:'1px solid #bbf7d0'}}><div style={{fontWeight:600,fontSize:'0.82rem',color:'#16a34a',marginBottom:4}}>{'📊 '+nut.summary}</div><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>{[{l:'Kcal',v:nut.kcal,c:'#f97316'},{l:'Prot',v:Math.round(nut.protein*prof.weight)+'g',c:'#dc2626'},{l:'Carbs',v:Math.round(nut.carbs*prof.weight)+'g',c:'#2563eb'},{l:'Grasa',v:Math.round(nut.fat*prof.weight)+'g',c:'#ca8a04'}].map(function(m,i){return (<div key={i} style={{textAlign:'center',background:'#fff',borderRadius:6,padding:5,border:'1px solid #e2e8f0'}}><div style={{fontSize:'0.55rem',color:'#64748b'}}>{m.l}</div><div style={{fontSize:'0.85rem',fontWeight:800,color:m.c}}>{m.v}</div></div>)})}</div></div>
    {nut.meals.map(function(meal,i){return (<div key={i} style={{marginBottom:8,background:'#f8fafc',borderRadius:8,padding:10,border:'1px solid #e2e8f0'}}><div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:4}}>{meal.time}</div>{meal.items.filter(Boolean).map(function(item,j){return (<div key={j} style={{fontSize:'0.75rem',color:'#374151',padding:'1px 0 1px 8px',borderLeft:'2px solid #3b82f6'}}>{'• '+item}</div>)})}<div style={{fontSize:'0.68rem',color:'#059669',background:'#ecfdf5',padding:'3px 6px',borderRadius:4,marginTop:4}}>{'💡 '+meal.tip}</div></div>)})}
  </div></div>);
}

function FbModal({day,onSubmit,onClose}){
  const [fb,setFb]=useState({energy:5,sleep:5,soreness:3,motivation:7,stress:3,weather:'good',illness:false,injury:'none',prevActivity:'',prevActivityHours:0});
  var u=function(k,v){setFb(function(p){var n=Object.assign({},p);n[k]=v;return n})};
  var Sl=function(p){var c=p.inv?(p.val<=3?'#22c55e':p.val<=6?'#eab308':'#ef4444'):(p.val>=7?'#22c55e':p.val>=4?'#eab308':'#ef4444');return (<div style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:'0.83rem'}}>{p.icon+' '+p.label}</span><span style={{fontWeight:700,color:c}}>{p.val}</span></div><input type="range" min={1} max={10} value={p.val} onChange={function(e){p.set(+e.target.value)}} style={{width:'100%',accentColor:c}}/><div style={{display:'flex',justifyContent:'space-between',fontSize:'0.6rem',color:'#94a3b8'}}><span>{p.lo}</span><span>{p.hi}</span></div></div>)};
  return (<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:100}}><div style={{background:'#fff',borderRadius:'14px 14px 0 0',maxWidth:480,width:'100%',maxHeight:'85vh',overflow:'auto',paddingBottom:90}}><div style={{padding:'18px 18px 0'}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}><h3 style={{fontSize:'1rem',fontWeight:700,margin:0}}>{'📝 Feedback '+day.day}</h3><button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer'}}>✕</button></div>
    <div style={{background:'#fff7ed',borderRadius:8,padding:10,border:'1px solid #fed7aa',marginBottom:14}}><div style={{fontWeight:600,fontSize:'0.82rem',color:'#c2410c',marginBottom:6}}>{'🏋️ ¿Actividad extra ayer?'}</div><div style={{display:'grid',gridTemplateColumns:fb.prevActivity?'2fr 1fr':'1fr',gap:8}}><select style={ST.inp} value={fb.prevActivity} onChange={function(e){u('prevActivity',e.target.value)}}><option value="">No</option><option value="Bici larga">Bici larga</option><option value="Running largo">Running largo</option><option value="Trail largo">Trail largo</option><option value="Partido">Partido</option><option value="Competencia">Competencia</option><option value="Otro">Otro</option></select>{fb.prevActivity&&<input type="number" style={ST.inp} placeholder="h" value={fb.prevActivityHours||''} onChange={function(e){u('prevActivityHours',+e.target.value)}} step="0.5"/>}</div></div>
    <Sl label="Energía" icon="⚡" val={fb.energy} set={function(v){u('energy',v)}} lo="Agotado" hi="Full"/>
    <Sl label="Sueño" icon="😴" val={fb.sleep} set={function(v){u('sleep',v)}} lo="Pésimo" hi="Perfecto"/>
    <Sl label="Dolor" icon="💪" val={fb.soreness} set={function(v){u('soreness',v)}} lo="Sin dolor" hi="Dolorido" inv={true}/>
    <Sl label="Motivación" icon="🔥" val={fb.motivation} set={function(v){u('motivation',v)}} lo="Sin ganas" hi="¡A tope!"/>
    <Sl label="Estrés" icon="🧠" val={fb.stress} set={function(v){u('stress',v)}} lo="Relajado" hi="Estresado" inv={true}/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}><label style={ST.lb}><span style={{fontSize:'0.78rem'}}>{'🌤️ Clima'}</span><select style={ST.inp} value={fb.weather} onChange={function(e){u('weather',e.target.value)}}><option value="good">Bueno</option><option value="heat">Calor</option><option value="rain">Lluvia</option></select></label><label style={ST.lb}><span style={{fontSize:'0.78rem'}}>{'🩹 Molestia'}</span><select style={ST.inp} value={fb.injury} onChange={function(e){u('injury',e.target.value)}}><option value="none">Ninguna</option><option value="knee">Rodilla</option><option value="ankle">Tobillo</option><option value="back">Espalda</option></select></label></div>
    <div onClick={function(){u('illness',!fb.illness)}} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'7px 10px',background:fb.illness?'#fef2f2':'#f8fafc',borderRadius:6,border:'1px solid '+(fb.illness?'#fecaca':'#e2e8f0'),cursor:'pointer'}}><div style={{width:16,height:16,borderRadius:3,border:'2px solid '+(fb.illness?'#ef4444':'#cbd5e1'),background:fb.illness?'#ef4444':'#fff',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.55rem'}}>{fb.illness&&'\u2713'}</div><span style={{fontSize:'0.82rem'}}>{'🤒 Enfermedad'}</span></div>
  </div><div style={{position:'fixed',bottom:0,left:0,right:0,padding:'12px 18px',background:'#fff',borderTop:'2px solid #e2e8f0',display:'flex',gap:8,zIndex:101,maxWidth:480,margin:'0 auto',boxShadow:'0 -4px 12px rgba(0,0,0,0.1)'}}><button onClick={function(){onSubmit(fb)}} style={Object.assign({},ST.bp,{flex:1,padding:'14px',fontSize:'1rem'})}>{'✅ Guardar y Adaptar'}</button><button onClick={onClose} style={Object.assign({},ST.bs,{padding:'14px'})}>✕</button></div></div></div>);
}
// ═══════════════════════════════════════════════════════════════
// ONBOARDING — Enhanced with height, IMC, restrictions
// ═══════════════════════════════════════════════════════════════
function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [p,setP]=useState({name:'',age:30,height:170,weight:70,sex:'male',goal:'fitness',experience:'intermediate',hoursPerWeek:10,ftp:200,maxHR:190,restHR:55,disciplines:[],competitions:[],integrations:{strava:false,googleFit:false,zeppLife:false},devices:[],gymAmenities:[],restrictions:[]});
  const [nc,setNc]=useState({name:'',date:'',priority:'A'});
  var u=function(k,v){setP(function(prev){var n=Object.assign({},prev);n[k]=v;return n})};
  var td=function(d){var c=p.disciplines;u('disciplines',c.includes(d)?c.filter(function(x){return x!==d}):c.concat([d]))};
  var tga=function(a){var c=p.gymAmenities;u('gymAmenities',c.includes(a)?c.filter(function(x){return x!==a}):c.concat([a]))};
  var tr=function(r){var c=p.restrictions;if(r==='Ninguna') u('restrictions',['Ninguna']);
  else u('restrictions',c.includes(r)?c.filter(function(x){return x!==r}):c.filter(function(x){return x!=='Ninguna'}).concat([r]))};
  var nb=p.disciplines.some(function(d){return d.indexOf('bike')>=0});
  var nr=p.disciplines.indexOf('run')>=0||p.disciplines.indexOf('trail')>=0;
  var nm=nb||nr||p.disciplines.indexOf('swim')>=0;
  var hg=p.disciplines.indexOf('gym')>=0;
  var steps2=['sports','basics','goal'];if(nm)steps2.push('metrics');if(hg)steps2.push('gym');steps2.push('objectives','integrations');
  var T=steps2.length,cur=steps2[step]||'sports';
  var imc=p.height>0?p.weight/((p.height/100)*(p.height/100)):0;
  var allD=[{id:'bike-road',l:'Ciclismo Ruta',i:'🚴'},{id:'bike-mtb',l:'MTB',i:'🚵'},{id:'run',l:'Running',i:'🏃'},{id:'trail',l:'Trail',i:'⛰️'},{id:'swim',l:'Natación',i:'🏊'},{id:'gym',l:'Gimnasio',i:'🏋️'},{id:'crossfit',l:'CrossFit',i:'🏆'},{id:'yoga',l:'Yoga',i:'🧘'},{id:'spinning',l:'Spinning',i:'🔄'},{id:'padel',l:'Pádel',i:'🏓'},{id:'tennis',l:'Tenis',i:'🎾'},{id:'climbing',l:'Escalada',i:'🧗'},{id:'boxing',l:'Boxeo',i:'🥊'},{id:'martial',l:'Artes Marciales',i:'🥋'},{id:'rowing',l:'Remo',i:'🚣'},{id:'hiking',l:'Senderismo',i:'🥾'},{id:'soccer',l:'Fútbol',i:'⚽'},{id:'basketball',l:'Basquet',i:'🏀'},{id:'dance',l:'Baile',i:'💃'}];
  var nav=(<div style={{display:'flex',justifyContent:step===0?'flex-end':'space-between',marginTop:20,gap:10}}>{step>0&&<button onClick={function(){setStep(function(s){return s-1})}} style={ST.bs}>{'← Atrás'}</button>}<button onClick={function(){if(step===0&&!p.disciplines.length)return;step<T-1?setStep(function(s){return s+1}):onDone(p)}} style={Object.assign({},ST.bp,{opacity:step===0&&!p.disciplines.length?0.5:1})}>{step<T-1?'Siguiente →':'🚀 Crear Plan'}</button></div>);

  var renderStep = function(){
    if(cur==='sports') return (<div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:8}}>💪</div><h2 style={{fontSize:'1.4rem',fontWeight:800,marginBottom:4}}>Fit Bro</h2><p style={{color:'#64748b',fontSize:'0.82rem',marginBottom:14}}>Evidence-Based Adaptive Coach</p><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,maxWidth:440,margin:'0 auto'}}>{allD.map(function(d){var sel=p.disciplines.includes(d.id);return (<button key={d.id} onClick={function(){td(d.id)}} style={{padding:'10px 4px',borderRadius:8,border:'2px solid '+(sel?'#1e40af':'#e2e8f0'),background:sel?'#eff6ff':'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}><span style={{fontSize:'1.4rem'}}>{d.i}</span><span style={{fontSize:'0.63rem',fontWeight:600,color:sel?'#1e40af':'#64748b'}}>{d.l}</span></button>)})}</div></div>);

    if(cur==='basics') return (<div><h3 style={{fontWeight:700,marginBottom:14}}>📋 Datos Básicos</h3><div style={{display:'grid',gap:10}}>
      <label style={ST.lb}><span>Nombre</span><input style={ST.inp} value={p.name} onChange={function(e){u('name',e.target.value)}} placeholder="Tu nombre"/></label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
        <label style={ST.lb}><span>Edad</span><input type="number" style={ST.inp} value={p.age} onChange={function(e){u('age',+e.target.value)}}/></label>
        <label style={ST.lb}><span>Altura cm</span><input type="number" style={ST.inp} value={p.height} onChange={function(e){u('height',+e.target.value)}}/></label>
        <label style={ST.lb}><span>Peso kg</span><input type="number" style={ST.inp} value={p.weight} onChange={function(e){u('weight',+e.target.value)}}/></label>
        <label style={ST.lb}><span>Sexo</span><select style={ST.inp} value={p.sex} onChange={function(e){u('sex',e.target.value)}}><option value="male">M</option><option value="female">F</option></select></label>
      </div>
      {imc>0&&<div style={{background:imc<18.5?'#fef3c7':imc<25?'#f0fdf4':imc<30?'#fef3c7':'#fef2f2',borderRadius:6,padding:'6px 10px',fontSize:'0.75rem',border:'1px solid #e2e8f0'}}>{'IMC: '+imc.toFixed(1)+' — '+(imc<18.5?'Bajo peso':imc<25?'Normal':imc<30?'Sobrepeso':'Consulta médico')}<div style={{fontSize:'0.65rem',color:'#64748b',marginTop:2}}>Referencia general. Tu progreso se mide con rendimiento y bienestar.</div></div>}
      <label style={ST.lb}><span>Nivel</span><select style={ST.inp} value={p.experience} onChange={function(e){u('experience',e.target.value)}}><option value="beginner">Principiante</option><option value="intermediate">Intermedio</option><option value="advanced">Avanzado</option></select></label>
      <div><div style={{fontSize:'0.82rem',fontWeight:600,marginBottom:6}}>🩹 Restricciones</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{['Rodilla','Espalda baja','Hombro','Tobillo','Cadera','Ninguna'].map(function(r){var on=p.restrictions.includes(r);return (<button key={r} onClick={function(){tr(r)}} style={{padding:'4px 10px',borderRadius:14,border:'1px solid '+(on?'#dc2626':'#cbd5e1'),background:on?'#fef2f2':'#fff',color:on?'#dc2626':'#475569',cursor:'pointer',fontSize:'0.75rem'}}>{r}</button>)})}</div></div>
    </div></div>);

    if(cur==='goal') return (<div><h3 style={{fontWeight:700,marginBottom:14}}>🎯 Objetivo</h3><div style={{display:'grid',gap:6}}>{[{v:'fitness',l:'Fitness / En forma',i:'💪'},{v:'weight',l:'Bajar de peso',i:'⚖️'},{v:'improve',l:'Mejorar rendimiento',i:'📈'},{v:'compete',l:'Competir',i:'🏆'},{v:'health',l:'Salud general',i:'❤️'}].map(function(g){var sel=p.goal===g.v;return (<button key={g.v} onClick={function(){u('goal',g.v)}} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 14px',borderRadius:10,border:'2px solid '+(sel?'#1e40af':'#e2e8f0'),background:sel?'#1e40af':'#fff',color:sel?'#fff':'#0f172a',cursor:'pointer'}}><span style={{fontSize:'1.4rem'}}>{g.i}</span><span style={{fontWeight:600}}>{g.l}</span></button>)})}</div><label style={Object.assign({},ST.lb,{marginTop:12})}><span>{'Horas/semana: '+p.hoursPerWeek+'h'}</span><input type="range" min={3} max={25} value={p.hoursPerWeek} onChange={function(e){u('hoursPerWeek',+e.target.value)}} style={{width:'100%',accentColor:'#1e40af'}}/></label></div>);

    if(cur==='metrics') return (<div><h3 style={{fontWeight:700,marginBottom:12}}>📊 Métricas</h3><div style={{display:'grid',gap:10}}>{nb&&<div style={{background:'#eff6ff',borderRadius:10,padding:10,border:'1px solid #bfdbfe'}}><span style={{fontWeight:600,color:'#1e40af'}}>{'🚴 FTP: '+p.ftp+'W'}</span><input type="range" min={100} max={400} value={p.ftp} onChange={function(e){u('ftp',+e.target.value)}} style={{width:'100%',accentColor:'#1e40af',marginTop:4}}/></div>}{(nr||nb)&&<div style={{background:'#f0fdf4',borderRadius:10,padding:10,border:'1px solid #bbf7d0'}}><span style={{fontWeight:600,color:'#16a34a'}}>{'❤️ FC'}</span><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:6}}><label style={ST.lb}><span>Máx</span><input type="number" style={ST.inp} value={p.maxHR} onChange={function(e){u('maxHR',+e.target.value)}}/></label><label style={ST.lb}><span>Reposo</span><input type="number" style={ST.inp} value={p.restHR} onChange={function(e){u('restHR',+e.target.value)}}/></label></div></div>}</div></div>);

    if(cur==='gym') return (<div><h3 style={{fontWeight:700,marginBottom:10}}>{'🏋️ Tu Gimnasio'}</h3><div style={{display:'grid',gap:8}}>{[{k:'piscina',l:'Piscina',i:'🏊'},{k:'turco',l:'Turco / Sauna',i:'🧖'},{k:'hidromasaje',l:'Hidromasaje',i:'♨️'}].map(function(a){var on=p.gymAmenities.includes(a.k);return (<button key={a.k} onClick={function(){tga(a.k)}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,border:'2px solid '+(on?'#1e40af':'#e2e8f0'),background:on?'#eff6ff':'#fff',cursor:'pointer'}}><span style={{fontSize:'1.6rem'}}>{a.i}</span><span style={{flex:1,fontWeight:700,textAlign:'left'}}>{a.l}</span><div style={{width:20,height:20,borderRadius:4,border:'2px solid '+(on?'#1e40af':'#cbd5e1'),background:on?'#1e40af':'#fff',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem'}}>{on&&'\u2713'}</div></button>)})}</div></div>);

    if(cur==='objectives') return (<div><h3 style={{fontWeight:700,marginBottom:6}}>{'🎯 Objetivos'}</h3><div style={{display:'grid',gap:8,marginBottom:12}}>
      <input style={ST.inp} placeholder="Ej: Correr 10K, Perder 5kg..." value={nc.name} onChange={function(e){setNc(Object.assign({},nc,{name:e.target.value}))}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><input type="date" style={ST.inp} value={nc.date} onChange={function(e){setNc(Object.assign({},nc,{date:e.target.value}))}}/><select style={ST.inp} value={nc.priority} onChange={function(e){setNc(Object.assign({},nc,{priority:e.target.value}))}}><option value="A">Principal</option><option value="B">Importante</option><option value="C">Secundario</option></select></div>
      <button onClick={function(){if(nc.name){u('competitions',p.competitions.concat([Object.assign({},nc,{id:Date.now()})]));setNc({name:'',date:'',priority:'A'})}}} style={Object.assign({},ST.bp,{width:'100%'})}>+ Agregar</button>
    </div>{p.competitions.map(function(c,i){return (<div key={c.id} style={{display:'flex',alignItems:'center',gap:8,background:'#f8fafc',padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0',marginBottom:6}}><span>🎯</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:'0.85rem'}}>{c.name}</div>{c.date&&<div style={{fontSize:'0.72rem',color:'#64748b'}}>{c.date}</div>}</div><button onClick={function(){u('competitions',p.competitions.filter(function(_,j){return j!==i}))}} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8'}}>✕</button></div>)})}</div>);

    if(cur==='integrations') return (<div><h3 style={{fontWeight:700,marginBottom:10}}>{'🔗 Integraciones'}</h3><div style={{display:'grid',gap:8}}>{[{k:'strava',n:'Strava',i:'🟠',c:'#fc4c02'},{k:'googleFit',n:'Google Fit',i:'💚',c:'#4285f4'},{k:'zeppLife',n:'Zepp Life',i:'⌚',c:'#00c853'}].map(function(int){var on=p.integrations[int.k];return (<button key={int.k} onClick={function(){var ni=Object.assign({},p.integrations);ni[int.k]=!ni[int.k];u('integrations',ni)}} style={{display:'flex',alignItems:'center',gap:12,padding:'12px',borderRadius:10,border:'2px solid '+(on?int.c:'#e2e8f0'),cursor:'pointer'}}><span style={{fontSize:'1.4rem'}}>{int.i}</span><span style={{flex:1,fontWeight:700}}>{int.n}</span><div style={{width:40,height:22,borderRadius:11,background:on?int.c:'#cbd5e1',position:'relative'}}><div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:on?20:2}}/></div></button>)})}</div><div style={{marginTop:10,background:'#f8fafc',borderRadius:8,padding:10,border:'1px solid #e2e8f0'}}><div style={{fontWeight:600,marginBottom:6}}>{'📱 Dispositivos'}</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{['Amazfit','iGPSport','Potenciómetro','Banda FC','Rodillo'].map(function(dev){var on=p.devices.includes(dev);return (<button key={dev} onClick={function(){u('devices',on?p.devices.filter(function(d){return d!==dev}):p.devices.concat([dev]))}} style={{padding:'4px 10px',borderRadius:14,border:'1px solid '+(on?'#1e40af':'#cbd5e1'),background:on?'#1e40af':'#fff',color:on?'#fff':'#475569',cursor:'pointer',fontSize:'0.78rem'}}>{dev}</button>)})}</div></div></div>);
    return null;
  };

  return (<div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a,#1e293b)',display:'flex',alignItems:'center',justifyContent:'center',padding:12}}><div style={{maxWidth:520,width:'100%'}}><div style={{display:'flex',gap:3,marginBottom:16}}>{Array.from({length:T},function(_,i){return (<div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?'#3b82f6':'#334155'}}/>)})}</div><div style={{background:'#fff',borderRadius:14,padding:24,boxShadow:'0 16px 32px rgba(0,0,0,0.25)',maxHeight:'85vh',overflow:'auto'}}>{renderStep()}{nav}</div></div></div>);
}
// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App(){
  const [view,setView]=useState('onboarding');
  const [prof,setProf]=useState(null);
  const [plan,setPlan]=useState(null);
  const [fbH,setFbH]=useState([]);
  const [fbD,setFbD]=useState(null);
  const [nutriD,setNutriD]=useState(null);
  const [eviSess,setEviSess]=useState(null);
  const [phase,setPhase]=useState('build');
  const [week,setWeek]=useState(1);
  const [tab,setTab]=useState('plan');
  const [gymLog,setGymLog]=useState({});
  const [exDone,setExDone]=useState({});
  const [swapMode,setSwapMode]=useState(null); // {di, si} when picking swap target

  var start=function(p2){setProf(p2);setPlan(genPlan(p2,1,'build',[],null));setView('app')};
  var doFb=function(fb){var d=plan.plan[fbD];var r=adaptD(d,fb,prof);setPlan(Object.assign({},plan,{plan:plan.plan.map(function(x,i){return i===fbD?Object.assign({},x,{sessions:r.sessions,adaptations:r.ad,feedback:fb}):x})}));setFbH(fbH.concat([Object.assign({},fb,{day:d.day})]));setFbD(null)};
  var tog=function(di,si){setPlan(Object.assign({},plan,{plan:plan.plan.map(function(d,i){return i===di?Object.assign({},d,{sessions:d.sessions.map(function(s,j){return j===si?Object.assign({},s,{done:!s.done}):s})}):d})}))};
  var toggleEx=function(di,si,exId){var key=di+'-'+si+'-'+exId;setExDone(function(prev){var n=Object.assign({},prev);n[key]=!n[key];return n})};
  var swapSessions=function(di1,si1,di2,si2){
    var hydroAvail=hasGymPool(prof)||hasGymSauna(prof)||hasGymJacuzzi(prof);
    var newPlan=plan.plan.map(function(d,di){
      var ss=d.sessions.slice();
      if(di===di1){ss[si1]=plan.plan[di2].sessions[si2]}
      if(di===di2){ss[si2]=plan.plan[di1].sessions[si1]}
      return Object.assign({},d,{sessions:ss,adaptations:[]});
    });
    // Re-validate after swap
    newPlan=validatePlan(newPlan,prof,phase,hydroAvail);
    setPlan(Object.assign({},plan,{plan:newPlan}));setSwapMode(null);
  };
  var nw=function(ph){var p2=ph||phase;setPhase(p2);setWeek(function(w){var w2=w+1;setPlan(genPlan(prof,w2,p2,fbH,plan));return w2});setExDone({})};

  if(view==='onboarding') return (<Onboarding onDone={start}/>);
  if(!plan) return null;

  var totTSS=plan.plan.reduce(function(s,d){return s+d.tss},0);
  var dn=plan.plan.reduce(function(s,d){return s+d.sessions.filter(function(x){return x.done}).length},0);
  var tt=plan.plan.reduce(function(s,d){return s+d.sessions.length},0);
  var ph=PH[phase];
  var readiness=calcReadiness(fbH);
  var zc=function(z){if(!z||z==='-') return {bg:'#f1f5f9',c:'#64748b'};if(z==='Recup.') return {bg:'#ecfeff',c:'#0891b2'};if(z.indexOf('Z4')>=0||z.indexOf('Z5')>=0||z==='Gym') return {bg:'#fef2f2',c:'#dc2626'};if(z.indexOf('Z3')>=0) return {bg:'#fefce8',c:'#ca8a04'};return {bg:'#f0fdf4',c:'#16a34a'}};

  var renderSession=function(sess,si,di,dayLen){
    var zz=zc(sess.zone);
    var isSwapTarget=swapMode&&(swapMode.di!==di||swapMode.si!==si);
    var isSwapSource=swapMode&&swapMode.di===di&&swapMode.si===si;
    return (<div key={si} style={{padding:'6px 0',borderBottom:si<dayLen-1?'1px solid #f1f5f9':'none',background:isSwapSource?'#fef3c7':isSwapTarget?'#eff6ff':'transparent',borderRadius:isSwapTarget||isSwapSource?6:0,margin:isSwapTarget?'2px 0':'0'}}>
      <div style={{display:'flex',gap:8,alignItems:'start'}}>
        <button onClick={function(){tog(di,si)}} style={{width:20,height:20,borderRadius:4,border:'2px solid '+(sess.done?'#22c55e':'#cbd5e1'),background:sess.done?'#22c55e':'#fff',color:'#fff',cursor:'pointer',fontSize:'0.6rem',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center'}}>{sess.done&&'\u2713'}</button>
        <div style={{flex:1,opacity:sess.done?0.5:1}}>
          <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:'0.85rem',textDecoration:sess.done?'line-through':'none'}}>{sess.name}</span>
            <span style={{padding:'1px 6px',borderRadius:3,fontSize:'0.65rem',fontWeight:600,background:zz.bg,color:zz.c}}>{sess.zone}</span>
            <button onClick={function(){setEviSess(sess)}} style={{padding:'1px 5px',borderRadius:3,fontSize:'0.6rem',fontWeight:600,background:'#faf5ff',color:'#7c3aed',border:'1px solid #c4b5fd',cursor:'pointer'}}>🔬</button>
            {!swapMode&&<button onClick={function(){setSwapMode({di:di,si:si})}} style={{padding:'1px 5px',borderRadius:3,fontSize:'0.58rem',fontWeight:600,background:'#fff7ed',color:'#c2410c',border:'1px solid #fed7aa',cursor:'pointer'}}>↔️</button>}
            {isSwapTarget&&<button onClick={function(){swapSessions(swapMode.di,swapMode.si,di,si)}} style={{padding:'2px 8px',borderRadius:4,fontSize:'0.68rem',fontWeight:700,background:'#1e40af',color:'#fff',border:'none',cursor:'pointer',animation:'pulse 1s infinite'}}>📥 Mover aquí</button>}
            {isSwapSource&&<button onClick={function(){setSwapMode(null)}} style={{padding:'1px 5px',borderRadius:3,fontSize:'0.6rem',background:'#fef2f2',color:'#dc2626',border:'1px solid #fecaca',cursor:'pointer'}}>✕ Cancelar</button>}
          </div>
          {sess.desc&&<div style={{fontSize:'0.75rem',color:'#64748b',marginTop:2}}>{sess.desc}</div>}
          <div style={{fontSize:'0.7rem',color:'#94a3b8',marginTop:2}}>{'\u23F1 '+sess.duration+'min'}</div>
        </div>
      </div>
      {sess.details&&sess.details.length>0&&<div style={{marginTop:4,marginLeft:28}}>{sess.details.map(function(exId){var edKey=di+'-'+si+'-'+exId;return (<ExCard key={exId} exId={exId} prof={prof} gymLog={gymLog} setGymLog={sess.sport==='gym'?setGymLog:null} exDone={!!exDone[edKey]} onToggleEx={sess.sport==='gym'?function(){toggleEx(di,si,exId)}:null}/>)})}</div>}
    </div>);
  };

  var renderDay=function(day,di){
    return (<div key={di} style={{background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',marginBottom:8,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderBottom:'1px solid #f1f5f9'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontWeight:800,fontSize:'0.95rem',width:32}}>{day.day}</span>{day.sessions.map(function(s,i){return (<span key={i} style={{fontSize:'1rem'}}>{SI[s.sport]||'\uD83C\uDFCB\uFE0F'}</span>)})}</div>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <span style={{fontSize:'0.7rem',color:'#94a3b8'}}>{day.sessions.reduce(function(a,x){return a+x.duration},0)+'m'}</span>
          <button onClick={function(){setNutriD(di)}} style={{padding:'3px 6px',borderRadius:5,border:'1px solid #16a34a',background:'#f0fdf4',color:'#16a34a',cursor:'pointer',fontSize:'0.72rem',fontWeight:600}}>🥗</button>
          <button onClick={function(){setFbD(di)}} style={{padding:'3px 6px',borderRadius:5,border:'1px solid #3b82f6',background:day.feedback?'#eff6ff':'#fff',color:'#3b82f6',cursor:'pointer',fontSize:'0.72rem',fontWeight:600}}>{day.feedback?'\u2713':'📝'}</button>
        </div>
      </div>
      {day.adaptations.length>0&&<div style={{padding:'5px 12px',background:'#fefce8'}}>{day.adaptations.map(function(a,i){return (<div key={i} style={{fontSize:'0.73rem',padding:'2px 0'}}>{a.icon+' '}<strong style={{color:'#92400e'}}>{a.reason}</strong>{' — '+a.action}</div>)})}</div>}
      <div style={{padding:'6px 12px 8px'}}>{day.sessions.map(function(sess,si){return renderSession(sess,si,di,day.sessions.length)})}</div>
    </div>);
  };

  return (<div style={{minHeight:'100vh',background:'#f1f5f9',fontFamily:'-apple-system,sans-serif'}}>
    {/* HEADER */}
    <div style={{background:'linear-gradient(135deg,#0f172a,#1e3a5f)',padding:'12px 14px',color:'#fff'}}>
      <div style={{maxWidth:800,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{fontSize:'1.1rem',fontWeight:800}}>FIT BRO</div><div style={{fontSize:'0.72rem',color:'#94a3b8'}}>{(prof.name||'Atleta')+' · S'+week+' · '+ph.icon+' '+ph.name}</div></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{textAlign:'center',padding:'4px 10px',borderRadius:8,background:readiness.level==='green'?'#16a34a22':readiness.level==='yellow'?'#eab30822':'#ef444422'}}>
            <div style={{fontSize:'1.1rem'}}>{readiness.icon}</div>
            <div style={{fontSize:'0.55rem',color:'#fff',fontWeight:600}}>{readiness.score+'/10'}</div>
          </div>
        </div>
      </div>
    </div>

    {/* TABS */}
    <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',position:'sticky',top:0,zIndex:50}}>
      <div style={{maxWidth:800,margin:'0 auto',display:'flex'}}>
        {[['plan','📅 Plan'],['fatigue','🔥 Fatiga'],['insights','📊 Ciencia'],['goals','🎯'],['settings','⚙️']].map(function(t2){
          return (<button key={t2[0]} onClick={function(){setTab(t2[0])}} style={{padding:'9px 12px',border:'none',background:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,color:tab===t2[0]?'#1e40af':'#64748b',borderBottom:'3px solid '+(tab===t2[0]?'#1e40af':'transparent')}}>{t2[1]}</button>);
        })}
      </div>
    </div>

    <div style={{maxWidth:800,margin:'0 auto',padding:12}}>
      {/* PLAN TAB */}
      {tab==='plan'&&(<div>
        {/* Readiness bar */}
        <div style={{background:readiness.level==='green'?'#f0fdf4':readiness.level==='yellow'?'#fefce8':'#fef2f2',borderRadius:8,padding:'8px 12px',marginBottom:8,border:'1px solid '+(readiness.level==='green'?'#bbf7d0':readiness.level==='yellow'?'#fde68a':'#fecaca'),display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:'1.2rem'}}>{readiness.icon}</span>
          <div><div style={{fontWeight:700,fontSize:'0.82rem'}}>{'Readiness: '+readiness.score+'/10 — '+readiness.label}</div><div style={{fontSize:'0.68rem',color:'#64748b'}}>{fbH.length?'Basado en tus últimos '+Math.min(fbH.length,3)+' feedbacks':'Completa feedback para personalizar'}</div></div>
        </div>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:8}}>
          {[{l:'Horas',v:plan.targetHrs.toFixed(1)+'h',c:'#1e40af'},{l:'TSS',v:totTSS,c:'#f97316'},{l:'Hecho',v:Math.round(dn/Math.max(tt,1)*100)+'%',c:'#22c55e'},{l:'Fase',v:ph.icon,c:ph.color}].map(function(s,i){
            return (<div key={i} style={{background:'#fff',borderRadius:8,padding:'6px',border:'1px solid #e2e8f0',textAlign:'center'}}><div style={{fontSize:'0.6rem',color:'#64748b'}}>{s.l}</div><div style={{fontSize:'0.95rem',fontWeight:800,color:s.c}}>{s.v}</div></div>);
          })}
        </div>
        {/* Phase buttons */}
        <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
          {Object.keys(PH).map(function(k){var info=PH[k];return (<button key={k} onClick={function(){nw(k)}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid '+(phase===k?info.color:'#cbd5e1'),background:phase===k?info.color:'#fff',color:phase===k?'#fff':'#475569',cursor:'pointer',fontSize:'0.7rem',fontWeight:600}}>{info.icon+' '+info.name}</button>)})}
        </div>
        {/* Days */}
        {plan.plan.map(function(day,di){return renderDay(day,di)})}
        <div style={{textAlign:'center',marginTop:12}}><button onClick={function(){nw()}} style={ST.bp}>{'Semana '+(week+1)+' →'}</button></div>
      </div>)}

      {/* FATIGUE TAB */}
      {tab==='fatigue'&&<FatigueMap weekPlan={plan.plan}/>}

      {/* INSIGHTS TAB */}
      {tab==='insights'&&(<div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #e2e8f0'}}>
        <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:12}}>🔬 Evidence Engine</h3>
        <div style={{fontSize:'0.75rem',color:'#64748b',marginBottom:12}}>Base científica curada. No depende de internet. Se actualiza periódicamente.</div>
        {Object.keys(EVIDENCE).map(function(key){var ev=EVIDENCE[key];var gc=ev.grade==='Alta'?'#16a34a':ev.grade==='Media'?'#ca8a04':'#94a3b8';
          return (<div key={key} style={{padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><span style={{padding:'2px 6px',borderRadius:4,fontSize:'0.62rem',fontWeight:700,background:gc+'20',color:gc}}>{'Evidencia: '+ev.grade}</span><div style={{display:'flex',gap:3}}>{ev.tags.map(function(t,i){return (<span key={i} style={{fontSize:'0.58rem',padding:'1px 5px',borderRadius:10,background:'#eff6ff',color:'#1e40af'}}>{'#'+t}</span>)})}</div></div>
            <div style={{fontSize:'0.78rem',color:'#1e293b',fontWeight:600}}>{ev.claim}</div>
            <div style={{fontSize:'0.68rem',color:'#94a3b8',marginTop:4}}>{ev.refs.map(function(r,i){return (<div key={i}>{'📄 '+r}</div>)})}</div>
          </div>);
        })}
      </div>)}

      {/* GOALS TAB */}
      {tab==='goals'&&(<div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #e2e8f0'}}>
        <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:12}}>🎯 Objetivos</h3>
        {!prof.competitions.length?<p style={{textAlign:'center',color:'#94a3b8',padding:20}}>Sin objetivos definidos.</p>:
        prof.competitions.map(function(c,i){var days=c.date?Math.ceil((new Date(c.date)-new Date())/86400000):null;
          return (<div key={i} style={{display:'flex',gap:12,padding:12,borderRadius:8,border:'2px solid '+(c.priority==='A'?'#f59e0b':'#e2e8f0'),marginBottom:8}}>
            <span style={{fontSize:'1.5rem'}}>🎯</span>
            <div style={{flex:1}}><div style={{fontWeight:700}}>{c.name}</div>{c.date&&<div style={{fontSize:'0.78rem',color:'#64748b'}}>{c.date}{days!==null&&<span style={{marginLeft:8,padding:'2px 6px',borderRadius:4,fontSize:'0.72rem',fontWeight:600,background:days>56?'#dcfce7':days>21?'#fef9c3':'#fee2e2',color:days>56?'#16a34a':days>21?'#ca8a04':'#dc2626'}}>{days>0?days+'d':'¡Ya!'}</span>}</div>}</div>
          </div>);
        })}
      </div>)}

      {/* SETTINGS TAB */}
      {tab==='settings'&&(<div style={{display:'grid',gap:12}}>
        <div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #e2e8f0'}}>
          <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:12}}>⚙️ Perfil</h3>
          {[['Nombre',prof.name||'Atleta'],['Edad/Sexo',prof.age+'a / '+(prof.sex==='male'?'M':'F')],['Altura/Peso',prof.height+'cm / '+prof.weight+'kg'],['IMC',(prof.height>0?(prof.weight/((prof.height/100)*(prof.height/100))).toFixed(1):'—')],['Horas/sem',prof.hoursPerWeek+'h'],['Deportes',prof.disciplines.map(function(d){return SI[d]||d}).join(' ')],['Gym',prof.gymAmenities.length?prof.gymAmenities.join(', '):'Básico'],['Restricciones',prof.restrictions.length?prof.restrictions.join(', '):'Ninguna']].map(function(r,i){
            return (<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f1f5f9',fontSize:'0.85rem'}}><span style={{color:'#64748b'}}>{r[0]}</span><span style={{fontWeight:600}}>{r[1]}</span></div>);
          })}
        </div>
        {/* Gym log summary */}
        {Object.keys(gymLog).length>0&&<div style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid #e2e8f0'}}>
          <h3 style={{fontSize:'1rem',fontWeight:700,marginBottom:12}}>📊 Historial Gym (RPE)</h3>
          {Object.keys(gymLog).map(function(exId){var l=gymLog[exId];var ex=EX[exId];if(!ex||!l.weight) return null;var prog=calcProgression(l.weight,l.rpe);
            return (<div key={exId} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f1f5f9',fontSize:'0.8rem',alignItems:'center'}}>
              <span style={{fontWeight:600}}>{ex.name}</span>
              <div style={{textAlign:'right'}}><div>{l.weight+'kg × '+(l.reps||'?')+' reps — RPE '+(l.rpe||'?')}</div>{prog&&<div style={{fontSize:'0.68rem',color:'#3b82f6'}}>{prog.action}</div>}</div>
            </div>);
          })}
        </div>}
        <button onClick={function(){setView('onboarding');setProf(null);setPlan(null);setFbH([]);setWeek(1);setGymLog({});setExDone({})}} style={Object.assign({},ST.bs,{width:'100%'})}>{'🔄 Reconfigurar'}</button>
      </div>)}
    </div>

    {/* MODALS */}
    {fbD!==null&&plan.plan[fbD]&&<FbModal day={plan.plan[fbD]} onSubmit={doFb} onClose={function(){setFbD(null)}}/>}
    {nutriD!==null&&plan.plan[nutriD]&&<NutriModal day={plan.plan[nutriD]} prof={prof} phase={phase} onClose={function(){setNutriD(null)}}/>}
    {eviSess&&<EvidenceModal sess={eviSess} prof={prof} onClose={function(){setEviSess(null)}}/>}
  </div>);
}
