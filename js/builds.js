/* Who Ruined v6.1 — «Оценка билдов»: финальные сборки всех 10 героев оцениваются от 1 до 10.
   Грузится после extras.js (использует CUR, heroData, itemData, buildRow, inferRoles, esc, fmt и т.д.).
   Оценка — эвристика: роль героя, длительность матча, что играет против команды (магия/физика/контроль/
   саммоны/невидимки/уклонение), чего не хватает команде в целом и кому выгоднее всего это купить. */
(function(){
'use strict';
const S=a=>new Set(a), strip=n=>String(n||'').replace('npc_dota_hero_','');

/* ---------- справочники ---------- */
const MAG_HI=S(['lina','lion','zuus','leshrac','skywrath_mage','storm_spirit','invoker','queenofpain','death_prophet','necrolyte','puck','tinker','pugna','warlock','witch_doctor','jakiro','crystal_maiden','ancient_apparition','lich','grimstroke','ogre_magi','keeper_of_the_light','silencer','disruptor','rubick','techies','void_spirit','dark_willow','snapfire','venomancer','batrider','viper','sand_king','shadow_shaman','enigma','obsidian_destroyer','outworld_destroyer','outworld_devourer','oracle','dazzle','winter_wyvern','bane','furion','earth_spirit','shadow_demon','chen','enchantress']);
const PHYS_HI=S(['sven','juggernaut','phantom_assassin','luna','drow_ranger','faceless_void','ursa','slark','antimage','bloodseeker','riki','terrorblade','medusa','naga_siren','spectre','troll_warlord','lycan','weaver','gyrocopter','clinkz','sniper','huskar','legion_commander','monkey_king','templar_assassin','bounty_hunter','chaos_knight','phantom_lancer','morphling','razor','abaddon','kunkka','axe','mars','dawn_breaker','life_stealer','skeleton_king','alchemist','bristleback','pangolier','arc_warden','meepo','lone_druid','slardar','tiny']);
const SUMMON=S(['naga_siren','terrorblade','phantom_lancer','chaos_knight','arc_warden','lycan','broodmother','visage','beastmaster','enigma','furion','shadow_shaman','undying','warlock','spectre','meepo','lone_druid','dark_seer','invoker','morphling']);
const INVIS_H=S(['riki','clinkz','bounty_hunter','weaver','nyx_assassin','mirana','invoker','treant','broodmother','sand_king']);
const EVADE_H=S(['phantom_assassin','windrunner','brewmaster']);
const NO_BKB=S(['phantom_lancer','spectre','life_stealer','naga_siren']); /* иллюзионисты и Lifestealer: BKB не советуем */
const HS=a=>S(a.flatMap(n=>[n,n.replace(/_/g,'')])); /* имена героев: и с «_», и без */
const NO_MKB=HS(['spectre','drow_ranger','phantom_lancer','axe','bristleback','centaur','chaos_knight','dawnbreaker','dawn_breaker','ember_spirit','doom_bringer','earth_spirit','earthshaker','elder_titan','huskar','kunkka','largo','mars','slardar','abyssal_underlord','underlord','bounty_hunter','hoodwink','lone_druid','meepo','mirana','abaddon']); /* MKB и Bloodthorn не советуем */
const BT_HERO=S(['phantom_lancer']); /* вместо MKB — Bloodthorn */
const SPELL_CARRIES=S(['storm_spirit','invoker','tinker','leshrac','lina','zuus','skywrath_mage','queenofpain','void_spirit','puck','death_prophet','necrolyte','shadow_fiend','nevermore','pugna','ancient_apparition','techies','earth_spirit','tiny','kunkka','ogre_magi','lion','crystal_maiden','witch_doctor','warlock','dark_willow','muerta','hoodwink','snapfire']);
/* Pipe и Crimson советуем только этим героям */
const PIPE_CRIM_H=HS(['axe','centaur','bristleback','rattletrap','dawnbreaker','mars','tusk','treant','undying','visage','ogre_magi','shredder','dark_seer']);
/* Solar Crest — всегда этим героям (Omniknight и Vengeful Spirit — только на роли саппорта) */
const SOLAR_H=HS(['rattletrap','elder_titan','ogre_magi','omniknight','phoenix','treant','tusk','undying','bounty_hunter','hoodwink','mirana','vengeful_spirit','ancient_apparition','chen','crystal_maiden','disruptor','enchantress','grimstroke','lich','oracle','ringmaster','shadow_demon','rubick','silencer','warlock','winter_wyvern','dazzle','venomancer']);
const SOLAR_SUP_ONLY=HS(['omniknight','vengeful_spirit']);
/* Spirit Vessel / Essence Distiller */
const VESSEL_H=HS(['rattletrap','earth_spirit','treant','bounty_hunter','hoodwink','ancient_apparition','grimstroke','dark_willow','witch_doctor','nyx_assassin','venomancer']);
/* Барабаны или Меку (что-то одно) */
const TEAMITEM_H=HS(['rattletrap','ogre_magi','tusk','treant','undying','bounty_hunter','hoodwink','ancient_apparition','chen','crystal_maiden','jakiro','lich','pugna','shadow_demon','warlock','winter_wyvern','witch_doctor','dazzle']);
/* герои, которым нужен Blink Dagger */
const BLINK_H=HS(['axe','centaur','chaos_knight','doom_bringer','dragon_knight','earthshaker','legion_commander','mars','night_stalker','primal_beast','pudge','slardar','sven','tidehunter','tiny','treant','tusk','skeleton_king','templar_assassin','ursa','dark_seer','lion','oracle','obsidian_destroyer','outworld_destroyer','outworld_devourer','puck','rubick','shadow_demon','tinker','batrider','beastmaster','enigma','magnataur','pangolier','sand_king','snapfire']);
const BLINK=['blink','swift_blink','arcane_blink','overwhelming_blink'];
const DRUMS=['ancient_janggo','boots_of_bearing'], MEK=['mekansm','guardian_greaves'], FORCE=['force_staff'], VESSEL=['spirit_vessel','essence_distiller'];
const PR={'Black King Bar':1,'Force Staff':1,'Blink Dagger':2,'Solar Crest':2,'Glimmer Cape':2,'Pipe of Insight':2,'Crimson Guard':2,'Sentry / Dust / Gem':2,'Monkey King Bar / Bloodthorn':2,'Bloodthorn':2,'Mekansm (→ Guardian Greaves)':3,'Ancient Janggo (→ Boots of Bearing)':3,'Spirit Vessel / Essence Distiller':3};
const CONTROL_ITEMS=['basher','abyssal_blade','sheepstick','orchid','bloodthorn','rod_of_atos','gungir','heavens_halberd'];
const INVIS_I=['invis_sword','silver_edge'], EVADE_I=['butterfly','radiance'];

const BOOTS=S(['boots','phase_boots','power_treads','arcane_boots','tranquil_boots','travel_boots','travel_boots_2','boots_of_bearing','guardian_greaves']);
const BASE_BOOTS=S(['boots']);
const UTIL_BOOTS=S(['arcane_boots','tranquil_boots','boots_of_bearing','guardian_greaves']);
const BKB=['black_king_bar'];
const ALT_SAVE=['aeon_disk','sphere','lotus_orb','cyclone','wind_waker','ghost','manta','satanic','blade_mail','ethereal_blade'];
const MAG_DEF=['pipe','eternal_shroud'];
const PHYS_DEF=['crimson_guard','shivas_guard','assault','heavens_halberd'];
const ILLU_DEF=['crimson_guard','shivas_guard','assault','mjollnir','maelstrom','gungir','radiance'];
const DETECT=['dust','gem','ward_sentry','ward_dispenser'];
const MKB=['monkey_king_bar','bloodthorn'];
const UTILITY=['mekansm','guardian_greaves','glimmer_cape','force_staff','hurricane_pike','ghost','rod_of_atos','spirit_vessel','essence_distiller','solar_crest','medallion_of_courage','lotus_orb','pavise','holy_locket','ancient_janggo','veil_of_discord','pipe','cyclone','wind_waker','aether_lens','octarine_core','sheepstick','orchid','bloodthorn','nullifier','blink','swift_blink','arcane_blink','overwhelming_blink','black_king_bar','shivas_guard','crimson_guard','refresher','aeon_disk','sphere'];
const CORE_ONLY=S(['bfury','radiance','maelstrom','mjollnir','desolator','greater_crit','butterfly','skadi','satanic','abyssal_blade','monkey_king_bar','moon_shard','rapier','basher','sange_and_yasha','kaya_and_sange','yasha_and_kaya','manta','diffusal_blade','disperser','heart','assault','gungir','armlet']);
const SUP_ONLY=S(['mekansm','glimmer_cape','ward_dispenser','tranquil_boots','boots_of_bearing','holy_locket','medallion_of_courage','urn_of_shadows','solar_crest','ancient_janggo','pavise','aether_lens','arcane_boots','spirit_vessel']);
const CHEAP_OK=S(['ward_dispenser','dust','ward_sentry','ward_observer','smoke_of_deceit','tpscroll','cheese','refresher_shard','moon_shard','aghanims_shard','gem']);

/* ---------- утилиты ---------- */
const nm=k=>(ITEMS[k]&&(ITEMS[k].dname||ITEMS[k].localized_name))||k;
const cost=k=>(ITEMS[k]&&ITEMS[k].cost)||0;
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const keyOf=id=>{const d=itemData(id);return d&&d.key||null};
function invOf(p){
 const main=[0,1,2,3,4,5].map(k=>p['item_'+k]).filter(Boolean).map(keyOf).filter(Boolean);
 const bp=[0,1,2].map(k=>p['backpack_'+k]).filter(Boolean).map(keyOf).filter(Boolean);
 return{main,bp,all:new Set(main.concat(bp)),neutral:p.item_neutral?keyOf(p.item_neutral):null};
}
const boughtAt=(p,k)=>{const x=(p.purchase_log||[]).find(e=>e.key===k);return x?x.time:null};
const touched=(p,inv,k)=>inv.all.has(k)||(p.purchase_log||[]).some(e=>e.key===k)||!!((p.item_uses||{})[k]);
const anyOf=(inv,arr)=>arr.some(k=>inv.all.has(k));
const firstOf=(inv,arr)=>arr.find(k=>inv.all.has(k));
const names=(arr,inv)=>arr.filter(k=>inv.all.has(k)).map(nm).join(' / ');
const hn=p=>(heroName(p)||'').trim();

/* ---------- что играет ПРОТИВ команды ---------- */
function threatProfile(enemies){
 let mag=0,tot=0,ctl=0,summ=0;const invis=[],evade=[],summoners=[];
 enemies.forEach(p=>{
  const h=heroData(p),n=strip(h.name),roles=h.roles||[],w=Math.max(p.hero_damage||0,2000);
  let ms=MAG_HI.has(n)?.85:PHYS_HI.has(n)?.15:({int:.65,str:.4,agi:.25,all:.45})[h.primary_attr]??.4;
  mag+=ms*w;tot+=w;
  const dis=roles.includes('Disabler'),ini=roles.includes('Initiator');
  ctl+=dis?1:ini?.5:0;
  if(SUMMON.has(n)){summ++;summoners.push(hn(p))}
  const it=invOf(p);
  if(it.all.has('manta'))summ+=.5;
  if(INVIS_H.has(n)||INVIS_I.some(k=>it.all.has(k)))invis.push(hn(p));
  if(EVADE_H.has(n)||EVADE_I.some(k=>it.all.has(k)))evade.push(hn(p));
 });
 const m=tot?mag/tot:.5;
 return{mag:m,phys:1-m,ctl:Math.min(6,ctl),summ:Math.round(summ),summoners,invis:[...new Set(invis)],evade:[...new Set(evade)],
  needBKB:cl(.2+(ctl-1)*.16+(m-.4)*.4,.15,1)};
}

/* ---------- кандидат на командный предмет ---------- */
function pickCandidate(members,tbl,exclude,heroSet){
 let best=null,bs=-1;
 members.forEach(I=>{
  if(I.leaver||(exclude&&exclude.includes(I.p.player_slot)))return;
   if(heroSet&&!heroSet.has(strip(heroData(I.p).name)))return;
  const r=I.p&&heroData(I.p).roles||[];
  let s=tbl[I.pos]??0;if(r.includes('Durable'))s+=.15;if(r.includes('Initiator'))s+=.1;
  if((I.p.net_worth||0)<4500)s*=.6;
   if(s<.1)return;
  if(s>bs){bs=s;best=I}
 });
 return best;
}

/* ---------- оценка одного билда ---------- */
function rateOne(I,TC,G){
 const p=I.p,pos=I.pos,inv=I.inv,pf=TC.prof,min=G.min,D=G.D;
 const pros=[],cons=[],need=[];let s=0;
 const N=(i,w)=>need.push({i,w:w||'',pr:PR[i]??4});
 const P=(d,t)=>{s+=d;pros.push(t)}, C=(d,t)=>{s+=d;cons.push(t)};
 const core=pos<=3, sup=pos>=4, roles=heroData(p).roles||[], hname=strip(heroData(p).name);
 const has=k=>inv.all.has(k);
 if(!inv.main.length&&!inv.bp.length)return{na:true,why:'Нет данных о предметах'};
 if(I.leaver)return{na:true,why:'Ливер/АФК — билд не оценивается'};

 /* 1. завершённость билда */
 const empty=6-inv.main.length;
 if(min>=25&&empty>=2)C(-(sup?.25:.4)*Math.min(3,empty-1),`Пустые слоты (${empty}) к ${min}-й минуте — деньги и слоты не использованы`);
 
 const big=inv.main.concat(inv.bp).filter(k=>cost(k)>=2000).length;
 if(min>=14){
  const exp=Math.min(({1:5,2:5,3:4.5,4:3.2,5:2.6})[pos]||4,Math.max(0,(min-12)/7)*(({1:1,2:1,3:.85,4:.6,5:.45})[pos]||.8));
  const diff=big-exp;
  if(diff<-.8)C(-Math.min(1.3,(-diff-.5)*.45),`Мало завершённых предметов для ${min}-й минуты: ${big} вместо ~${Math.round(exp)}`);
  else if(diff>1)P(.4,`Билд собран с запасом: ${big} крупных предметов к ${min}-й минуте`);
 }
 if(min>=35){
  const cheap=inv.main.filter(k=>cost(k)<1200&&!BOOTS.has(k)&&!CHEAP_OK.has(k)&&!(sup&&k==='magic_wand')).length;
  if(core&&cheap>=2)C(-Math.min(1,.4*(cheap-1)),`${cheap} дешёвых предмета в слотах на ${min}-й минуте — слоты не прокачаны`);
  if(sup&&cheap>=3)C(-.4,`${cheap} дешёвых предмета в слотах на ${min}-й минуте`);
 }

 /* 2. ботинки */
 const boots=inv.main.concat(inv.bp).find(k=>BOOTS.has(k));
 if(min>=15&&!boots)C(-.8,'Нет ботинок');
 else if(boots&&BASE_BOOTS.has(boots)&&min>=25)C(-.5,'Ботинки не улучшены к ' +min+'-й минуте'),N('Улучшение ботинок','Базовые сапоги на такой минуте — потерянная скорость и характеристики.');
 else if(boots&&sup&&UTIL_BOOTS.has(boots))P(.3,`Полезные для саппорта ботинки (${nm(boots)})`);
 else if(boots&&core&&['phase_boots','power_treads','travel_boots','travel_boots_2'].includes(boots)&&min>=20)P(.2,`Подходящие ботинки (${nm(boots)})`);

 /* 3. выживаемость против контроля (BKB и альтернативы) */
 if(core&&min>=24&&NO_BKB.has(hname)){
  if(anyOf(inv,BKB))P(.2,'BKB есть — не обязателен герою, но не лишний');
 }else if(core&&min>=24){
  const sc=1,need0=pf.needBKB,late=cl((min-20)/12,.4,1);
  if(anyOf(inv,BKB)){
   const t=boughtAt(p,'black_king_bar');
   P((.6+.7*need0)*sc,pf.ctl>=3?`Есть BKB — против контроля врага (≈${Math.round(pf.ctl)} героя с дизейблами)`:'Есть BKB — страховка от контроля врага');
   if(t&&t/60>(pos===3?32:36))C(-.3,`BKB куплен поздно — на ${Math.round(t/60)}-й минуте`);
   else if(t&&t/60<=24)P(.2,`BKB собран вовремя (${Math.round(t/60)}-я минута)`);
  }else if(anyOf(inv,ALT_SAVE)){
   P(.2*sc,`Нет BKB, но есть защита: ${names(ALT_SAVE,inv)}`);C(-.25*need0*sc,'Без BKB против контроля всё равно уязвим');
  }else{
   C(-(.5+1.1*need0)*late*sc,`Нет BKB и альтернативы против ${Math.round(pf.ctl)||'нескольких'} героев с контролем`);N('Black King Bar',`Против ≈${Math.round(pf.ctl)||'нескольких'} героев с дизейблами без BKB кор выпадает из драки первым.`);
  }
 }

 /* 4. магия / физика / саммоны — кому выгоднее всего было купить */
 const mySlot=p.player_slot;
 if(TC.pipe&&min>=20){
  if(TC.pipe.slot===mySlot){
   if(TC.pipe.have)P(.5+.5*TC.pipe.str,`${names(MAG_DEF,inv)} — верное решение против ${Math.round(pf.mag*100)}% магического урона врага`);
   else{C(-(.4+.6*TC.pipe.str),`Враг бьёт магией (${Math.round(pf.mag*100)}%), а у команды нет Pipe — по роли ему было выгоднее всех купить`);N('Pipe of Insight',`Враг бьёт магией (${Math.round(pf.mag*100)}%): аура-барьер и сопротивление на всю команду режут урон от спеллов.`);}
  }else if(TC.pipe.have&&anyOf(inv,MAG_DEF))P(.4,`${names(MAG_DEF,inv)} против ${Math.round(pf.mag*100)}% магического урона`);
 }
 if(TC.crim&&min>=20){
  if(TC.crim.slot===mySlot){
   if(TC.crim.have)P(.5+.5*TC.crim.str,`${names(TC.crim.list,inv)} — к месту против ${TC.crim.why}`);
   else{C(-(.4+.6*TC.crim.str),`Против ${TC.crim.why} у команды нет Crimson Guard — ему было выгоднее всех`);N('Crimson Guard',`Против ${TC.crim.why}: броня и блок/замедление на всю команду.`);}
  }else if(TC.crim.have&&anyOf(inv,TC.crim.list))P(.3,`${names(TC.crim.list,inv)} против ${TC.crim.why}`);
 }

 /* 5. детекция против невидимок */
 if(TC.det&&min>=18){
  const isCand=TC.det.slots.includes(mySlot);
  if(TC.det.have){if(touched(p,inv,'dust')||touched(p,inv,'gem')||touched(p,inv,'ward_sentry')||touched(p,inv,'ward_dispenser')||(p.sentry_placed||0)>0)P(.4,`Взял детекцию против невидимых (${pf.invis.slice(0,2).join(', ')})`)}
  else if(isCand){C(mySlot===TC.det.slots[0]?-.7:-.4,`У врага невидимки (${pf.invis.slice(0,2).join(', ')}), а у команды нет ни сентри, ни даста, ни gem`);N('Sentry / Dust / Gem','Без детекции невидимок не поймать, они выбирают момент драки.')}
 }

 /* 6. уклонение врага → MKB/Bloodthorn (только для героев, которые бьют руками) */
 const attackHero=roles.includes('Carry')&&!SPELL_CARRIES.has(hname)&&heroData(p).primary_attr!=='int';
 const plBT=BT_HERO.has(hname);
 if(pf.evade.length&&pos<=2&&min>=25&&attackHero&&(!NO_MKB.has(hname)||plBT)){
  const list=plBT?['bloodthorn']:MKB;
  if(anyOf(inv,list))P(.5,`${names(list,inv)} против уклонения (${pf.evade.slice(0,2).join(', ')})`);
  else{C(-.5,`Враг играет через уклонение (${pf.evade.slice(0,2).join(', ')}), а ${plBT?'в билде нет Bloodthorn':'у кэрри нет MKB/Bloodthorn'}`);
   N(plBT?'Bloodthorn':'Monkey King Bar / Bloodthorn',plBT?'Bloodthorn даёт true strike, крит и сайленс — пробивает уклонение и не конфликтует с иллюзиями.':'True strike пробивает уклонение и Butterfly/Radiance, иначе половина ударов в молоко.')}
 }

 /* 6b. кэрри-милишнику без собственного контроля — Basher */
 if(core&&pos<=2&&min>=22&&heroData(p).attack_type==='Melee'&&attackHero&&!roles.includes('Disabler')){
  if(!anyOf(inv,CONTROL_ITEMS)){C(-.3,'У героя нет своего контроля, и в билде ни одного предмета с контролем');N('Skull Basher (→ Abyssal Blade)','Без своих оглушений Basher даёт проки стана на атаках — кэрри сам фиксирует цель; Abyssal позже закрепит.')}
  else P(.2,`Контроль через предметы: ${names(CONTROL_ITEMS,inv)}`);
 }

 /* 7. соответствие роли */
 if(sup&&!roles.includes('Carry')){
  const co=inv.main.filter(k=>CORE_ONLY.has(k)&&cost(k)>=2000);
  if(co.length)C(-Math.min(1.1,.5*co.length),`Фармовые предметы на саппорте: ${co.map(nm).join(', ')}`);
 }
 if(core){
  const so=inv.main.filter(k=>SUP_ONLY.has(k)&&k!=='tranquil_boots'&&k!=='arcane_boots');
  const lim=pos===3?2:1;
  if(so.length>=lim)C(-Math.min(1,.4*so.length),`Саппортские предметы на кор-герое: ${so.map(nm).join(', ')}`);
 }
 /* 8. Blink Dagger — только героям, которым он нужен */
 if(BLINK_H.has(hname)&&min>=20){
  if(!anyOf(inv,BLINK)){C(-.6,`На ${hn(p)} нет Blink Dagger — без блинка герой хуже входит в драку и достаёт цель`);N('Blink Dagger',`Для ${hn(p)} блинк — стандартный способ дотянуться до цели и вовремя применить ключевые способности.`)}
  else P(.3,`Блинк (${names(BLINK,inv)}) — основа входа в драку для ${hn(p)}`);
 }

 /* 9. Solar Crest — всегда этим героям */
 if(SOLAR_H.has(hname)&&(!SOLAR_SUP_ONLY.has(hname)||sup)&&min>=22){
  const ph=Math.round(pf.phys*100);
  if(has('solar_crest'))P(.4,'Solar Crest — усиливает кора: броня и уклонение союзнику, минус брони врагу');
  else{C(-.3,'Нет Solar Crest — а он нужен кору');N('Solar Crest',`Solar Crest полезен для кора: союзнику броня и уклонение, у врага минус брони — кор убивает быстрее и дольше живёт${ph>=50?` (особенно против ${ph}% физического урона)`:''}.`)}
 }

 /* 10. Spirit Vessel / Essence Distiller */
 if(VESSEL_H.has(hname)&&min>=20){
  if(anyOf(inv,VESSEL))P(.2,`${names(VESSEL,inv)} — режет лечение и сжигает HP цели`);
  else{C(-.25,'Нет Spirit Vessel / Essence Distiller');N('Spirit Vessel / Essence Distiller','Дешёвая и сильная покупка: режет лечение и регенерацию, сжигает HP цели, помогает убивать танков и героев с лечением.')}
 }

 /* 11. саппорты: Force Staff, командный предмет (одно из двух), Glimmer */
 if(sup&&min>=18){
  let sp=false;const gp=(d,t)=>{sp=true;P(d,t)};
  const mg=Math.round(pf.mag*100);
  if(anyOf(inv,FORCE))gp(.3,`${names(FORCE,inv)} — мастхев саппорта: вытаскивает союзников и помогает самому выйти из драки`);
  else{C(-.5,'Нет Force Staff — а это мастхев саппорта почти в каждой игре');N('Force Staff','Мастхев саппорта: вытаскивает союзников из-под фокуса, срывает инициацию и спасает самого; нужен почти в каждой игре.')}
  if(TEAMITEM_H.has(hname)&&min>=22){
   if(anyOf(inv,DRUMS)||anyOf(inv,MEK))gp(.3,`${names(DRUMS.concat(MEK),inv)} — командный предмет с аурой на всю команду`);
   else if(!(TC.teamD&&TC.teamM)){
    const wantMek=TC.teamD?true:TC.teamM?false:TC.atkCores<2;
    if(wantMek){C(-.25,'Нет командного предмета (Mekansm → Guardian Greaves)');N('Mekansm (→ Guardian Greaves)','Хил и броня на всю команду в драке; особенно выручает, когда враг давит бурстом или в команде мало лечения.')}
    else{C(-.25,'Нет командного предмета (Ancient Janggo → Boots of Bearing)');N('Ancient Janggo (→ Boots of Bearing)','Скорость и темп атаки всей команде; лучше всего работает, когда несколько героев бьют руками.')}
   }
  }
  if(!SOLAR_H.has(hname)&&pf.mag>=.55){
   if(has('glimmer_cape'))gp(.4,`Glimmer Cape: против ${mg}% магического урона даёт союзнику магрезист и невидимость`);
   else{C(-.3,`Враг бьёт магией (${mg}%), а Glimmer Cape в билде нет`);N('Glimmer Cape',`Против ${mg}% магического урона Glimmer даёт кору и тебе магрезист плюс невидимость при фокусе — дешёвый способ пережить бурст.`)}
  }
  const u=inv.main.concat(inv.bp).filter(k=>UTILITY.includes(k));
  if(!sp&&u.length)P(Math.min(.5,.2+.15*u.length),`Командная/спасающая польза: ${[...new Set(u)].slice(0,3).map(nm).join(', ')}`);
 }

 /* итог */
 const scale=min<15?.5:min<22?.8:1;
 const raw=6+s*scale,score=cl(Math.round(raw),1,10);
 return{na:false,score,raw,pros,cons,need:need.filter((x,i,a)=>a.findIndex(y=>y.i===x.i)===i).sort((a,b)=>a.pr-b.pr).slice(0,4)};
}

/* ---------- сбор данных по матчу ---------- */
function evaluate(C){
 const{m,all}=C,D=m.duration||0,min=Math.round(D/60),G={D,min};
 const T={Radiant:all.filter(p=>p.team==='Radiant'),Dire:all.filter(p=>p.team==='Dire')};
 const infos={Radiant:[],Dire:[]};
 ['Radiant','Dire'].forEach(t=>{
  const rl=inferRoles(T[t],D||1);
  infos[t]=T[t].map(p=>({p,pos:(rl[p.player_slot]||{}).position||5,inv:invOf(p),leaver:(p.leaver_status||0)>=2}));
 });
 const out={};
 ['Radiant','Dire'].forEach(t=>{
  const me=infos[t],foe=t==='Radiant'?'Dire':'Radiant',prof=threatProfile(T[foe]);
  const teamHas=arr=>me.some(I=>!I.leaver&&anyOf(I.inv,arr));
  const holder=arr=>me.find(I=>!I.leaver&&anyOf(I.inv,arr));
  const recs=[];const TC={prof};
   TC.teamD=teamHas(DRUMS);TC.teamM=teamHas(MEK);
   TC.atkCores=me.filter(I=>!I.leaver&&I.pos<=3&&(heroData(I.p).roles||[]).includes('Carry')&&!SPELL_CARRIES.has(strip(heroData(I.p).name))&&heroData(I.p).primary_attr!=='int').length;

  /* Pipe / Eternal Shroud */
  const mStr=cl((prof.mag-.45)/.3,0,1);
  const cStr=Math.max(cl((prof.phys-.5)/.3,0,1),prof.summ>=3?1:prof.summ===2?.75:prof.summ===1?.35:0);
  const crimWhy=prof.summ>=2?`${prof.summ} саммонеров/иллюзионистов врага (${prof.summoners.slice(0,3).join(', ')})`:`физического урона врага (${Math.round(prof.phys*100)}%)`;
  const crimList=prof.summ>=2?ILLU_DEF:PHYS_DEF,pipeHas=teamHas(MAG_DEF),crimHas=teamHas(crimList);
  const used=[];
  const pipeFirst=mStr>=cStr;
  const doPipe=()=>{
   if(mStr<.25)return;
   if(pipeHas){const h=holder(MAG_DEF);TC.pipe={slot:h.p.player_slot,have:true,str:mStr};recs.push({k:'ok',t:`<b>${esc(hn(h.p))}</b> собрал ${esc(names(MAG_DEF,h.inv))} — против ${Math.round(prof.mag*100)}% магического урона врага это правильно.`})}
   else{const c=pickCandidate(me,{3:1,4:.9,5:.7,2:.4,1:.2},used,PIPE_CRIM_H);if(!c)recs.push({k:'',t:`Враг бьёт магией (${Math.round(prof.mag*100)}%), но в команде нет героя, которому Pipe подходит по роли, — совет по нему не даётся.`});if(c){used.push(c.p.player_slot);TC.pipe={slot:c.p.player_slot,have:false,str:mStr};
    recs.push({k:'warn',t:`Враг бьёт в основном магией (<b>${Math.round(prof.mag*100)}%</b>), а Pipe / Eternal Shroud в команде нет. Выгоднее всех его было купить <b>${esc(hn(c.p))}</b> (${esc(c.p.personaname||'игрок')}): ${c.pos>=4?'аура на всю команду работает там, где он стоит рядом с союзниками':'он в центре драки, и аура накрывает всех'}.`})}}
  };
  const doCrim=()=>{
   if(cStr<.25)return;
   if(crimHas){const h=holder(crimList);TC.crim={slot:h.p.player_slot,have:true,str:cStr,why:crimWhy,list:crimList};recs.push({k:'ok',t:`<b>${esc(hn(h.p))}</b> собрал ${esc(names(crimList,h.inv))} — это к месту против ${esc(crimWhy)}.`})}
   else{const c=pickCandidate(me,{3:1,4:.9,5:.7,2:.4,1:.2},used,PIPE_CRIM_H);if(!c)recs.push({k:'',t:`Против ${esc(crimWhy)} нужна броня, но в команде нет героя, которому Crimson Guard подходит по роли, — совет по нему не даётся.`});if(c){used.push(c.p.player_slot);TC.crim={slot:c.p.player_slot,have:false,str:cStr,why:crimWhy,list:crimList};
    recs.push({k:'warn',t:`Против ${esc(crimWhy)} в команде нет Crimson Guard. Выгоднее всех его было купить <b>${esc(hn(c.p))}</b> (${esc(c.p.personaname||'игрок')}).`})}}
  };
  if(pipeFirst){doPipe();doCrim()}else{doCrim();doPipe()}
  if(mStr<.25&&cStr<.25)recs.push({k:'',t:`Урон врага смешанный (магия ${Math.round(prof.mag*100)}% / физика ${Math.round(prof.phys*100)}%) — срочной нужды в Pipe или Crimson не было.`});

  /* детекция */
  if(prof.invis.length&&min>=18){
   const have=teamHas(DETECT)||me.some(I=>(I.p.sentry_placed||0)>0||touched(I.p,I.inv,'dust')||touched(I.p,I.inv,'gem')||touched(I.p,I.inv,'ward_sentry')||touched(I.p,I.inv,'ward_dispenser'));
   const sups=me.filter(I=>!I.leaver&&I.pos>=4).sort((a,b)=>b.pos-a.pos);
   TC.det={have,slots:sups.map(I=>I.p.player_slot)};
   if(have)recs.push({k:'ok',t:`У врага есть невидимки (${esc(prof.invis.slice(0,3).join(', '))}) — команда взяла детекцию.`});
   else if(sups[0])recs.push({k:'warn',t:`У врага есть невидимки (${esc(prof.invis.slice(0,3).join(', '))}), а детекции нет. Проще всего это было сделать <b>${esc(hn(sups[0].p))}</b>.`});
  }
  const rows=me.map(I=>({I,r:rateOne(I,TC,G)})).sort((a,b)=>a.I.pos-b.I.pos);
  const sc=rows.filter(x=>!x.r.na).map(x=>x.r.score);
  out[t]={rows,recs,prof,avg:sc.length?sc.reduce((a,b)=>a+b,0)/sc.length:null};
 });
 return out;
}

/* ---------- отрисовка ---------- */
const cls=n=>n>=9?'s-top':n>=7?'s-good':n>=5?'s-mid':n>=3?'s-low':'s-bad';
const lbl=n=>n>=9?'Образцовый билд — почти все нужды команды закрыты':n>=7?'Хороший билд, основные потребности закрыты':n>=5?'Рабочий билд, но есть дыры':n>=3?'Слабый билд — не хватает ключевого':'Провальный билд';
function card(x){
 const{I,r}=x,p=I.p;
 const head=`<div class="bvHero"><img src="${esc(heroImg(p))}" alt="" onerror="this.style.visibility='hidden'"><div style="min-width:0"><b>${esc(hn(p))}</b><span>${esc(p.personaname||('Игрок '+(p.idx+1)))}</span></div></div>`;
 if(r.na)return`<div class="bvItem">${head}<div class="bvMain">${buildRow(p,true)}<div class="bvVerdict">${esc(r.why)}</div></div><div class="bvScore s-na"><strong>—</strong><small>из 10</small></div></div>`;
 const li=(a,c)=>a.map(t=>`<li class="${c}">${esc(t)}</li>`).join('');
 return`<div class="bvItem">${head}<div class="bvMain">${buildRow(p,true)}<div class="bvVerdict">${esc(lbl(r.score))}</div><ul class="bvLines">${li(r.pros,'p')}${li(r.cons,'m')}</ul>${r.need.map(n=>`<div class="bvNeed"><b>Чего не хватило: ${esc(n.i)}</b>${n.w?` — ${esc(n.w)}`:''}</div>`).join('')}</div><div class="bvScore ${cls(r.score)}"><strong>${r.score}</strong><small>из 10</small><div class="bar"><i style="width:${r.score*10}%"></i></div></div></div>`;
}
function threatHtml(team,E){
 const pf=E.prof,foe=team==='Radiant'?'Dire':'Radiant';
 const tags=[];
 if(pf.ctl>=1)tags.push(`Контроль: ≈${Math.round(pf.ctl)} героя`);
 if(pf.summ>=1)tags.push(`Саммоны/иллюзии: ${pf.summ}`);
 if(pf.invis.length)tags.push(`Невидимки: ${pf.invis.slice(0,3).join(', ')}`);
 if(pf.evade.length)tags.push(`Уклонение: ${pf.evade.slice(0,2).join(', ')}`);
 return`<div class="bvThreatCol"><h4>Против ${esc(team)} играл ${esc(foe)}</h4><div class="bvDmg"><i class="m" style="width:${Math.round(pf.mag*100)}%"></i><i class="p" style="width:${100-Math.round(pf.mag*100)}%"></i></div><div class="bvDmgTxt"><span>Магия <b>${Math.round(pf.mag*100)}%</b></span><span>Физика <b>${Math.round(pf.phys*100)}%</b></span></div><div class="bvTags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')||'<span>Особых угроз не выявлено</span>'}</div></div>`;
}
function html(C){
 const E=evaluate(C),win=C.m.radiant_win?'Radiant':'Dire',lose=win==='Radiant'?'Dire':'Radiant';
 const flat=[];['Radiant','Dire'].forEach(t=>E[t].rows.forEach(x=>{if(!x.r.na)flat.push({...x,t})}));
 const best=flat.slice().sort((a,b)=>b.r.raw-a.r.raw)[0],worst=flat.slice().sort((a,b)=>a.r.raw-b.r.raw)[0];
 const sm=(lab,x,c)=>x?`<div class="${c}"><span>${lab}</span><b>${esc(hn(x.I.p))} · ${x.r.score}/10</b><small>${esc(x.I.p.personaname||'')}</small></div>`:'';
 const avg=t=>E[t].avg==null?'—':E[t].avg.toFixed(1);
 const head=(t,c)=>`<div class="bvTeamHead"><h3 class="${c}">${c==='w'?'Победители':'Проигравшие'} · ${t}</h3><span>Средний билд <b>${avg(t)}</b>/10</span></div>`;
 const recs=t=>E[t].recs.length?`<div class="bvRecs">${E[t].recs.map(r=>`<div class="bvRec ${r.k}">${r.t}</div>`).join('')}</div>`:'';
 return`<p class="bvIntro">Оцениваются финальные сборки всех 10 героев. Модель смотрит на длительность матча, позицию героя, что играет против его команды (магия/физика, контроль, саммоны, невидимки, уклонение) и чего не хватает команде в целом — например, Pipe, Crimson Guard, BKB, сейв-предмета или детекции. Это эвристика по итоговому инвентарю, а не вердикт про игроков.</p>`
  +`<div class="bvSummary">${sm('Лучший билд',best,'good')}${sm('Самый слабый билд',worst,'bad')}<div><span>Средний балл</span><b>${esc(win)} ${avg(win)} · ${esc(lose)} ${avg(lose)}</b><small>победители · проигравшие</small></div></div>`
  +`<div class="bvThreat">${threatHtml(win,E[win])}${threatHtml(lose,E[lose])}</div>`
  +head(win,'w')+recs(win)+`<div class="bvList">${E[win].rows.map(card).join('')}</div>`
  +head(lose,'l')+recs(lose)+`<div class="bvList">${E[lose].rows.map(card).join('')}</div>`
  +`<p class="bvNote">Модель не видит тайминги покупок (если матч не распарсен), порядок сборки и ситуации в драках. «Чего не хватило» — подсказка, а не приговор: билд всегда зависит от ситуации на карте.</p>`;
}

/* ---------- кнопка и окно ---------- */
Object.assign(EN,{'ОЦЕНКА БИЛДОВ':'BUILD RATINGS','Оценка билдов':'Build ratings','Победители':'Winners','Проигравшие':'Losers'});
const modal=$('buildModal');
$('buildBtn').addEventListener('click',()=>{
 if(!CUR)return;track('click/builds');
 try{$('buildBox').innerHTML=html(CUR)}catch(e){console.error(e);$('buildBox').innerHTML='<div class="empty">Не удалось оценить билды для этого матча.</div>'}
 modal.classList.remove('hidden');modal.querySelector('.whyModalCard').scrollTop=0;applyLang(modal);
});
modal.addEventListener('click',e=>{if(e.target.dataset.close)modal.classList.add('hidden')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.add('hidden')});
window.WRBuilds={evaluate};
applyLang();
})();
