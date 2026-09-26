const API="https://api.opendota.com/api";
const CDN="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";
const $=id=>document.getElementById(id);
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const fmt=n=>(n||0).toLocaleString("ru-RU");
const time=s=>`${Math.floor((s||0)/60)}:${String(Math.floor((s||0)%60)).padStart(2,"0")}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let HEROES={},ITEMS={};

$("form").addEventListener("submit",async e=>{
 e.preventDefault(); const id=$("matchId").value.trim(); if(!/^\d+$/.test(id))return;
 $("status").textContent="Загружаем матч, героев и предметы…"; $("result").classList.add("hidden");
 try{
  const [mr,hr,ir]=await Promise.all([fetch(`${API}/matches/${id}`),fetch(`${API}/constants/heroes`),fetch(`${API}/constants/items`)]);
  if(!mr.ok)throw Error("Матч не найден");
  const m=await mr.json(); HEROES=hr.ok?await hr.json():{}; ITEMS=ir.ok?await ir.json():{};
  await await analyze(m); $("status").textContent=`Матч ${id} обработан`;
 }catch(err){$("status").textContent="Ошибка: "+err.message}
});

function heroData(p){return HEROES[String(p.hero_id)]||HEROES[p.hero_id]||{};}
function heroName(p){return heroData(p).localized_name||`Hero #${p.hero_id}`;}
function heroImg(p){const h=heroData(p); if(h.img)return `https://cdn.cloudflare.steamstatic.com${h.img}`; return `${CDN}/heroes/${String(h.localized_name||'').toLowerCase().replace(/[^a-z0-9]/g,'')}.png`;}
function itemData(id){return ITEMS[String(id)]||ITEMS[id]||{};}
function itemImg(id){const it=itemData(id); if(it.img)return `https://cdn.cloudflare.steamstatic.com${it.img}`; return "";}
function itemName(id){return itemData(id).dname||itemData(id).localized_name||"Item";}
function rankName(t){const n=Number(t||0),m=Math.floor(n/10),stars=n%10; const name=({1:"Herald",2:"Guardian",3:"Crusader",4:"Archon",5:"Legend",6:"Ancient",7:"Divine",8:"Immortal"})[m]||"Unranked"; return stars?`${name} ${stars}`:name;}
function rankImg(t){const m=Math.floor(Number(t||0)/10);return m?`https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${m}.png`:"";}
function itemsOf(p){return [0,1,2,3,4,5].map(k=>p[`item_${k}`]).concat([0,1,2].map(k=>p[`backpack_${k}`])).concat([p.item_neutral]).filter(Boolean);}

function inferRoles(team,duration){
  // OpenDota lane_role is a lane category, not POS 1-5:
  // 1=safe, 2=mid, 3=offlane, 4=jungle/other. We first use lane evidence,
  // then fill missing positions with resource/impact signals so the UI always
  // presents the same five POS labels as OpenDota.
  const value=x=>(x.net_worth||0)*.55+(x.gold_per_min||0)*.25+(x.last_hits||0)*.12+(x.xp_per_min||0)*.08;
  const lane=x=>Number(x.lane_role||0);
  const assigned=new Map();

  const mid=team.filter(x=>lane(x)===2).sort((a,b)=>value(b)-value(a));
  if(mid.length) assigned.set(mid[0].player_slot,{position:2,role:'Pos 2 · Mid',confidence:99,source:'OpenDota lane_role'});

  const safe=team.filter(x=>lane(x)===1).sort((a,b)=>value(b)-value(a));
  if(safe.length>=2){
    assigned.set(safe[0].player_slot,{position:1,role:'Pos 1 · Carry',confidence:96,source:'OpenDota safe lane + resource split'});
    assigned.set(safe[1].player_slot,{position:5,role:'Pos 5 · Hard Support',confidence:96,source:'OpenDota safe lane + resource split'});
  }else if(safe.length===1){
    // If only one safe-lane player was parsed, use their resource profile to
    // decide whether they are the carry or support, then fill the counterpart later.
    const p=safe[0], rank=team.filter(x=>lane(x)!==2).sort((a,b)=>value(b)-value(a));
    const isCore=value(p)>=value(rank[Math.min(2,rank.length-1)]||p);
    assigned.set(p.player_slot,{position:isCore?1:5,role:isCore?'Pos 1 · Carry':'Pos 5 · Hard Support',confidence:78,source:'OpenDota safe lane + fallback'});
  }

  const off=team.filter(x=>lane(x)===3).sort((a,b)=>value(b)-value(a));
  if(off.length>=2){
    assigned.set(off[0].player_slot,{position:3,role:'Pos 3 · Offlane',confidence:96,source:'OpenDota offlane + resource split'});
    assigned.set(off[1].player_slot,{position:4,role:'Pos 4 · Soft Support',confidence:96,source:'OpenDota offlane + resource split'});
  }else if(off.length===1){
    const p=off[0];
    const nonMid=team.filter(x=>lane(x)!==2).sort((a,b)=>value(b)-value(a));
    const isCore=value(p)>=value(nonMid[Math.min(1,nonMid.length-1)]||p);
    assigned.set(p.player_slot,{position:isCore?3:4,role:isCore?'Pos 3 · Offlane':'Pos 4 · Soft Support',confidence:78,source:'OpenDota offlane + fallback'});
  }

  // Fill any missing POS using the remaining players ordered by resource/impact.
  // This avoids showing "Role unclear" when OpenDota has incomplete lane parsing.
  const positions=[1,2,3,4,5];
  const used=new Set([...assigned.values()].map(x=>x.position));
  const missing=positions.filter(x=>!used.has(x));
  const remaining=team.filter(p=>!assigned.has(p.player_slot)).sort((a,b)=>value(b)-value(a));
  for(const pos of missing){
    const p=remaining.shift(); if(!p)break;
    const data={
      1:['Pos 1 · Carry',62],2:['Pos 2 · Mid',70],3:['Pos 3 · Offlane',62],4:['Pos 4 · Soft Support',58],5:['Pos 5 · Hard Support',58]
    }[pos];
    assigned.set(p.player_slot,{position:pos,role:data[0],confidence:data[1],source:'fallback from match stats'});
  }

  // Return a role for every player. In a standard 5v5 match this is always 1-5.
  return Object.fromEntries(team.map(p=>[p.player_slot,assigned.get(p.player_slot)||{position:5,role:'Pos 5 · Hard Support',confidence:40,source:'fallback'}]));
}

function inferRole(p,team,duration){
  return inferRoles(team,duration)[p.player_slot] || {position:5,role:'Pos 5 · Hard Support',confidence:40,source:'fallback'};
}
function roleWeights(role){
 const pos=Number(String(role||'').match(/Pos (\d)/)?.[1]||0);
 return ({
  1:{farm:.26,fight:.23,error:.30,obj:.14,utility:.07},
  2:{farm:.16,fight:.30,error:.29,obj:.18,utility:.07},
  3:{farm:.11,fight:.30,error:.25,obj:.23,utility:.11},
  4:{farm:.06,fight:.30,error:.23,obj:.20,utility:.21},
  5:{farm:.04,fight:.27,error:.20,obj:.17,utility:.32}
 })[pos]||{farm:.15,fight:.27,error:.27,obj:.20,utility:.11};
}

async function analyze(m){
 if(!m||!Array.isArray(m.players))throw Error("В ответе OpenDota нет данных игроков");
 const players=m.players.map((p,i)=>({...p,idx:i,team:p.player_slot<128?"Radiant":"Dire"}));
 const losing=m.radiant_win?"Dire":"Radiant";
 const team=players.filter(p=>p.team===losing), win=players.filter(p=>p.team!==losing);
 const teamKills=team.reduce((a,p)=>a+(p.kills||0),0), teamDamage=team.reduce((a,p)=>a+(p.hero_damage||0),0)||1;
 const duration=m.duration||1;
 const enriched=team.map(p=>({...p,roleInfo:inferRole(p,team,duration)}));
 const scored=enriched.map(p=>scorePlayer(p,{team:enriched,win,m,teamKills,teamDamage,duration})).sort((a,b)=>b.score-a.score);
 const culprit=scored[0];
  const closeRuiner=scored[1]||null;
 if(culprit?.account_id){
   try{
     const rr=await fetch(`${API}/players/${culprit.account_id}`);
     if(rr.ok){
       const pp=await rr.json();
       culprit.rank_tier=culprit.rank_tier||pp.rank_tier;
       culprit.avatar=culprit.avatar||pp.profile?.avatarfull;
     }
   }catch(e){}
 }
 render(m,players,scored,culprit,closeRuiner);
}

function scorePlayer(p,c){
 const deaths=p.deaths||0,kills=p.kills||0,assists=p.assists||0;
 const kp=c.teamKills?100*(kills+assists)/c.teamKills:0, dmgShare=100*(p.hero_damage||0)/c.teamDamage;
 const farm=p.gold_per_min||0, duration=c.duration||1, role=p.roleInfo?.role||'Unknown', w=roleWeights(role);
 const fights=(c.m.teamfights||[]).filter(f=>f.players&&f.players[p.player_slot]);
 let fightEvents=0, lowFightEvents=0;
 for(const f of fights){const x=f.players[p.player_slot]; if((x.kills+x.assists+x.deaths)>0)fightEvents++; if(x.deaths>0&&x.damage<500)lowFightEvents++;}
 // Role-aware expectations: supports are not judged by core farm, cores are not rescued by high KDA alone.
 const expectedGpm={"Pos 1 · Carry":520,"Pos 2 · Mid":480,"Pos 3 · Offlane":420,"Pos 4 · Soft Support":330,"Pos 5 · Hard Support":270}[role]||400;
 const expectedDamage={"Pos 1 · Carry":.23,"Pos 2 · Mid":.22,"Pos 3 · Offlane":.18,"Pos 4 · Soft Support":.11,"Pos 5 · Hard Support":.09}[role]||.17;
 const expectedKP={"Pos 1 · Carry":58,"Pos 2 · Mid":62,"Pos 3 · Offlane":62,"Pos 4 · Soft Support":66,"Pos 5 · Hard Support":68}[role]||60;
 const farmGap=clamp((expectedGpm-farm)/8,0,18);
 const damageGap=clamp((expectedDamage*100-dmgShare)*.65,0,15);
 const kpGap=clamp((expectedKP-kp)*.20,0,12);
 const fightPenalty=damageGap+kpGap+Math.min(6,lowFightEvents*1.5);
 const lateFactor=duration>45*60?1.8:duration>35*60?1.45:duration>25*60?1.15:.85;
 let errorPenalty=Math.min(24,deaths*1.9*lateFactor);
 if(duration>35*60 && deaths>=2 && !(p.buyback_log||[]).length) errorPenalty+=3;
 const objectiveTarget={"Pos 1 · Carry":1100,"Pos 2 · Mid":900,"Pos 3 · Offlane":1200,"Pos 4 · Soft Support":700,"Pos 5 · Hard Support":500}[role]||900;
 const objectivePenalty=clamp((objectiveTarget-(p.tower_damage||0))/110,0,11);
 const utility=((p.hero_healing||0)/500)+(p.obs_placed||0)*1.5+(p.sentry_placed||0)*.8;
 const utilityCredit=clamp(utility,0,10);
 // Resource-to-impact waste: high economy with weak fight/objective conversion increases blame.
 const resourceWaste=(farm>expectedGpm+80 && (dmgShare<expectedDamage*100*.72) && (p.tower_damage||0)<objectiveTarget*.7)?7:0;
 const raw=100*(w.farm*(farmGap/18)+w.fight*(fightPenalty/33)+w.error*(errorPenalty/27)+w.obj*(objectivePenalty/11)+w.utility*Math.max(0,(6-utilityCredit)/6));
 const score=clamp(raw+resourceWaste,0,100);
 const confidence=clamp(55+(c.m.teamfights?12:0)+(c.m.objectives?8:0)+(p.gold_t?7:0)+(p.xp_t?5:0)+(p.roleInfo?.confidence||0)*.12,45,94);
 const reasons=[];
 if(farmGap>5) reasons.push([`Фарм ниже ожидания для ${role}`,`GPM ${farm}; ориентир модели ≈ ${expectedGpm}.`]);
 if(damageGap>5) reasons.push([`Низкий Fight Impact для ${role}`,`${fmt(p.hero_damage)} hero damage — ${dmgShare.toFixed(1)}% командного урона.`]);
 if(kpGap>5) reasons.push([`Низкое участие в убийствах`,`Kill Participation ${kp.toFixed(0)}%; ориентир модели ≈ ${expectedKP}%.`]);
 if(errorPenalty>7) reasons.push([`Цена смертей слишком высока`,`${deaths} смертей с повышенным весом поздней игры.`]);
 if(resourceWaste) reasons.push([`Ресурсы не конвертированы в результат`,`Высокий GPM сочетался с низким уроном и слабым давлением на строения.`]);
 if(objectivePenalty>5) reasons.push([`Слабое давление на объекты`,`${fmt(p.tower_damage)} урона по строениям для ${role}.`]);
 if(utilityCredit>4) reasons.push([`Положительный вклад поддержки`,`Вклад в вижен/лечение снижает итоговый blame.`]);
 if(!reasons.length) reasons.push([`Нет одного доминирующего провала`,`Score собран из нескольких сигналов с учётом предполагаемой роли.`]);
 return {...p,score:Math.round(score),confidence:Math.round(confidence),reasons,kp,dmgShare,role,roleConfidence:p.roleInfo?.confidence||0};
}

function render(m,all,players,culprit,closeRuiner){
 $("result").classList.remove("hidden");
 $("culpritHero").src=heroImg(culprit); $("culpritRank").src=rankImg(culprit.rank_tier); $("culpritRankText").textContent=rankName(culprit.rank_tier);
 $("culpritName").textContent=culprit.personaname||`Игрок ${culprit.idx+1}`;
 $("culpritScore").textContent=impactLabel(culprit.score); $("culpritScore").className=`impactValue ${impactClass(culprit.score)}`; $("confidence").textContent=`Уверенность модели: ${culprit.confidence}%`;
 $("summary").innerHTML=verdictText(m,culprit,closeRuiner);
 $("nearRuiner").innerHTML=closeRuiner?nearRuinerHtml(closeRuiner):'<div class="nearEmpty">Второй игрок не набрал достаточно сигналов для отдельного сравнения.</div>';
 $("matchOverview").innerHTML=overview(m,all);
 $("players").innerHTML=players.map((p)=>playerCard(p,p===culprit)).join("");
 const events=buildEvents(m,culprit); $("events").innerHTML=events.length?events.map(e=>`<div class="event ${e.danger?'danger':''}"><div class="eventTop"><span class="eventTime">${e.t}</span><span class="eventTag ${e.danger?'bad':''}">${e.danger?'НЕГАТИВНЫЙ СИГНАЛ':'ПОЛОЖИТЕЛЬНЫЙ СИГНАЛ'}</span></div><div class="eventPlayer"><img src="${e.player?.img||''}" alt="" onerror="this.style.visibility='hidden'"><div><strong>${esc(e.player?.name||'Игрок')}</strong><span>${esc(e.player?.hero||'Герой')}</span></div></div><b>${esc(e.title)}</b><div class="eventWhat"><strong>Что произошло:</strong> ${esc(e.text)}</div><div class="eventWhy"><strong>Почему это важно:</strong> ${esc(e.why)}</div></div>`).join(""):`<div class="empty">Для этого матча parsed event data недостаточно.</div>`;
 $("reasons").innerHTML=culprit.reasons.map(r=>`<div class="reason"><strong>+ ${esc(r[0])}</strong><span>${esc(r[1])}</span></div>`).join("");
}
function metricLine(label,value,detail){return `<div class="vmetric"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(detail)}</small></div>`;}
function impactLabel(score){ if(score>=75)return "Очень высокое"; if(score>=55)return "Высокое"; if(score>=35)return "Умеренное"; if(score>=20)return "Небольшое"; return "Низкое"; }
function impactClass(score){ if(score>=75)return "very-high"; if(score>=55)return "high"; if(score>=35)return "moderate"; if(score>=20)return "low"; return "minimal"; }
function verdictText(m,p,r){
 const gap=r?Math.max(0,p.score-r.score):0;
 const lead= r && gap>=8 ? `Он заметно оторвался от следующего игрока по модели: ${gap} баллов.` : r ? `Разрыв с ближайшим по score игроком небольшой — всего ${gap} баллов, поэтому матч нельзя сводить к одной цифре.` : `Для сравнения доступен только основной результат модели.`;
 const deathText=(p.deaths||0)>=4?`${p.deaths} смертей — заметный источник потерь темпа, особенно с учётом длительности ${time(m.duration)}.`:(p.deaths||0)>=2?`${p.deaths} смертей добавили команде цену ошибок, но сами по себе не являются главным доказательством.`:`Смертей немного (${p.deaths||0}), поэтому итог не строится только на KDA.`;
 const farmText=`${fmt(p.gold_per_min)} GPM, ${fmt(p.net_worth)} net worth и ${fmt(p.last_hits)} last hits`;
 const fightText=`${p.kp.toFixed(0)}% KP и ${p.dmgShare.toFixed(1)}% командного hero damage`;
 const objText=`${fmt(p.tower_damage)} урона по строениям`;
 const reasons=p.reasons.slice(0,3).map(x=>`<li><b>${esc(x[0])}</b><span>${esc(x[1])}</span></li>`).join('');
 return `<div class="verdictCopy"><p><strong>${esc(p.personaname||'Этот игрок')}</strong> сыграл наиболее негативную роль в поражении. Модель сравнивает его показатели с ожидаемыми для <strong>его роли в игре</strong>, а затем проверяет, подтверждается ли провал несколькими независимыми сигналами.</p><p>${esc(lead)} Здесь важен контекст: ${esc(deathText)}</p><div class="vmetrics">${metricLine('Экономика',farmText,`ожидания роли учитываются отдельно`)}${metricLine('Влияние в драках',fightText,`урон + участие в убийствах`)}${metricLine('Объекты',objText,`давление на карту и здания`)}${metricLine('Влияние на поражение',impactLabel(p.score),`оценка модели · уверенность ${p.confidence}%`)}</div><div class="verdictReasons"><h3>Что сильнее всего повлияло</h3><ul>${reasons||'<li><b>Сигналы распределены равномерно</b><span>Нет одного показателя, который объясняет поражение целиком.</span></li>'}</ul></div></div>`;
}
function nearRuinerHtml(p){
 const rs=p.reasons.slice(0,3).map(x=>`<li><b>${esc(x[0])}</b><span>${esc(x[1])}</span></li>`).join('');
 return `<div class="nearHead"><img src="${heroImg(p)}" onerror="this.style.visibility='hidden'"><div><div class="nearLabel">БЛИЗКИЙ К РУИНУ ИГРОК</div><h3>${esc(p.personaname||'Unknown')}</h3><p>${esc(heroName(p))} · ${esc(p.role)}</p></div><strong>${p.score}</strong></div><div class="nearStats"><span>K/D/A <b>${p.kills||0}/${p.deaths||0}/${p.assists||0}</b></span><span>GPM <b>${fmt(p.gold_per_min)}</b></span><span>KP <b>${p.kp.toFixed(0)}%</b></span><span>Hero DMG <b>${fmt(p.hero_damage)}</b></span></div><ul class="nearReasons">${rs}</ul>`;
}

function teamPhaseStats(m,all,start,end,teamName){
 const team=all.filter(p=>p.team===teamName);
 const kills=team.reduce((a,p)=>a+(p.kills||0),0);
 const net=team.reduce((a,p)=>a+(p.net_worth||0),0);
 const dmg=team.reduce((a,p)=>a+(p.hero_damage||0),0);
 const events=(m.teamfights||[]).filter(f=>Number(f.start||0)>=start&&Number(f.start||0)<end);
 const objectives=(m.objectives||[]).filter(o=>Number(o.time||0)>=start&&Number(o.time||0)<end);
 return {kills,net,dmg,events:events.length,objectives:objectives.length};
}
function matchStory(m,all,players,culprit){
 const dur=m.duration||1, winTeam=m.radiant_win?'Radiant':'Dire', loseTeam=winTeam==='Radiant'?'Dire':'Radiant';
 const phases=[{name:'Лайнинг',start:0,end:Math.min(dur,12*60)},{name:'Мидгейм',start:12*60,end:Math.min(dur,25*60)},{name:'Лейт',start:25*60,end:dur}];
 const rows=phases.filter(x=>x.end>x.start).map(ph=>{
   const l=teamPhaseStats(m,all,ph.start,ph.end,loseTeam), w=teamPhaseStats(m,all,ph.start,ph.end,winTeam);
   const netGap=l.net-w.net, killGap=l.kills-w.kills;
   let tone='neutral', text='Команды были близки по доступным данным.';
   if(netGap<=-1800||killGap<=-3){tone='bad';text=`Соперник получил заметное преимущество: ${netGap<0?`${fmt(Math.abs(netGap))} net worth в пользу врага`:''}${netGap<0&&killGap<0?' и ':''}${killGap<0?`${Math.abs(killGap)} убийств разницы`:''}.`}
   else if(netGap>=1800||killGap>=3){tone='good';text=`У вашей команды был заметный перевес: ${netGap>0?`${fmt(netGap)} net worth`:''}${netGap>0&&killGap>0?' и ':''}${killGap>0?`${killGap} убийств`:''}.`}
   return `<div class="phase ${tone}"><div class="phaseHead"><b>${ph.name}</b><span>${time(ph.start)}–${time(ph.end)}</span></div><p>${text}</p><small>${l.events} teamfight · ${l.objectives} objective · net worth ${netGap>=0?'+':''}${fmt(netGap)}</small></div>`;
 }).join('');
 const turning=findTurningPoint(m,all,culprit,loseTeam,winTeam);
 const lesson=mainLesson(culprit,turning,m);
 const innocence=notTheirFault(culprit,m,all,loseTeam);
 return `<div class="storyGrid"><div class="phases">${rows}</div><div class="turning"><div class="storyLabel">⚡ МОМЕНТ ПЕРЕЛОМА</div><h3>${esc(turning.title)}</h3><div class="turnTime">${turning.t}</div><p>${esc(turning.text)}</p><b>${esc(turning.why)}</b></div><div class="lesson"><div class="storyLabel">🎯 ГЛАВНЫЙ УРОК</div><h3>${esc(lesson.title)}</h3><p>${esc(lesson.text)}</p><div class="nextGame"><span>В следующей игре</span><b>${esc(lesson.action)}</b></div></div><div class="innocence"><div class="storyLabel goodLabel">🟢 ЧТО НЕ БЫЛО ТВОЕЙ ОШИБКОЙ</div><h3>${esc(innocence.title)}</h3><p>${esc(innocence.text)}</p></div></div>`;
}
function findTurningPoint(m,all,p,loseTeam,winTeam){
 const fights=(m.teamfights||[]).map(f=>{
   const lp=all.filter(x=>x.team===loseTeam).reduce((a,x)=>{const z=f.players&&f.players[x.player_slot];return a+(z?(z.kills||0)*120+(z.assists||0)*45-(z.deaths||0)*150+(z.damage||0)*.08:0)},0);
   const wp=all.filter(x=>x.team===winTeam).reduce((a,x)=>{const z=f.players&&f.players[x.player_slot];return a+(z?(z.kills||0)*120+(z.assists||0)*45-(z.deaths||0)*150+(z.damage||0)*.08:0)},0);
   const cp=f.players&&f.players[p.player_slot];
   return {f,score:wp-lp,cp};
 }).sort((a,b)=>b.score-a.score);
 const best=fights.find(x=>x.cp&&(x.cp.deaths||0)>0)||fights[0];
 if(best){
   const x=best.cp||{}; return {t:time(best.f.start||0),title:(x.deaths||0)>0?`${p.personaname||'Игрок'} погиб в важной драке`:'Команда потеряла преимущество в драке',text:`${fmt(x.damage||0)} hero damage, ${x.kills||0} kills, ${x.assists||0} assists и ${x.deaths||0} death.`,why:(x.deaths||0)>0?'После этого эпизода соперник получил наиболее заметный перевес по результату этой драки.':'Это один из самых сильных переломных teamfight-эпизодов в доступных данных.'};
 }
 const late=p.deaths>=2?`${p.personaname||'Игрок'} потерял темп из-за нескольких смертей в поздней игре`:'Преимущество постепенно перешло к сопернику';
 return {t:'—',title:late,text:'В данных OpenDota нет достаточного количества событий, чтобы уверенно привязать перелом к одному моменту.',why:'Поэтому сервис не придумывает конкретную причину.'};
}
function mainLesson(p,turning,m){
 const r=p.reasons[0];
 if(r) return {title:r[0],text:r[1],action: lessonAction(p)};
 return {title:'Не один показатель решал исход',text:'Вклад игрока сформирован несколькими сигналами, поэтому исправлять нужно не одну цифру.',action:'Смотри на связку фарм → драка → объект, а не только на KDA.'};
}
function lessonAction(p){
 const role=p.role||'';
 if(/Pos 1/.test(role)) return 'После ключевого предмета искать окно для драки или объекта, а не продолжать фарм автоматически.';
 if(/Pos 2/.test(role)) return 'После получения преимущества превращать его в драки и объекты, а не только в дополнительный farm.';
 if(/Pos 3/.test(role)) return 'Инициировать игру вокруг своей команды и объектов, а не отдавать темп пассивным фармом.';
 return 'Искать активное влияние на карту: драки, объекты, вижен и помощь core в правильный момент.';
}
function notTheirFault(p,m,all,loseTeam){
 const death=(p.deaths||0), dmg=p.dmgShare||0, kp=p.kp||0;
 if(kp>=55 && dmg>=12) return {title:'Ты реально участвовал в драках',text:`${kp.toFixed(0)}% KP и ${dmg.toFixed(1)}% командного hero damage показывают, что низкий KDA сам по себе не описывает твою игру.`};
 if(death<=2) return {title:'Смерти не были главным источником проблем',text:`У тебя ${death} ${death===1?'смерть':'смертей'}. Итоговый вывод не строится только на количестве смертей.`};
 return {title:'Поражение было командным',text:'Даже при высоком негативном score одного игрока нельзя считать единственной причиной поражения: оценка учитывает его вклад относительно роли и контекста матча.'};
}

function overview(m,all){
 const rad=all.filter(p=>p.team==='Radiant'),dire=all.filter(p=>p.team==='Dire');
 const net=rad.reduce((a,p)=>a+(p.net_worth||0),0)-dire.reduce((a,p)=>a+(p.net_worth||0),0);
 return `<div class="ov"><div><span>Длительность</span><b>${time(m.duration)}</b></div><div><span>Победитель</span><b>${m.radiant_win?'Radiant':'Dire'}</b></div><div><span>Net Worth diff</span><b>${net>=0?'+':''}${fmt(net)}</b></div><div><span>Teamfights</span><b>${(m.teamfights||[]).length}</b></div><div><span>Objectives</span><b>${(m.objectives||[]).length}</b></div><div><span>Roshan</span><b>${(m.objectives||[]).filter(o=>String(o.type).toLowerCase().includes('roshan')).length}</b></div></div>`;
}
function playerCard(p,isCulprit){
 const kd=`${p.kills||0}/${p.deaths||0}/${p.assists||0}`, items=itemsOf(p);
 return `<div class="playerCard ${isCulprit?'culprit':''}">
  <div class="playerHead"><img class="heroIcon" src="${heroImg(p)}" onerror="this.style.visibility='hidden'"><div><div class="pname">${esc(p.personaname||'Unknown')}</div><div class="heroName">${esc(heroName(p))} · <b>${esc(p.role||"Unknown")}</b> <small>(${p.roleConfidence}%)</small></div></div><div class="pScore">${p.score}</div></div>
  <div class="statgrid"><span>K/D/A <b>${kd}</b></span><span>GPM <b>${fmt(p.gold_per_min)}</b></span><span>XPM <b>${fmt(p.xp_per_min)}</b></span><span>Last Hits <b>${fmt(p.last_hits)}</b></span><span>Hero DMG <b>${fmt(p.hero_damage)}</b></span><span>DMG Share <b>${p.dmgShare.toFixed(1)}%</b></span><span>KP <b>${p.kp.toFixed(0)}%</b></span><span>Tower DMG <b>${fmt(p.tower_damage)}</b></span><span>Net Worth <b>${fmt(p.net_worth)}</b></span><span>Healing <b>${fmt(p.hero_healing)}</b></span><span>Wards <b>${fmt((p.obs_placed||0)+(p.sentry_placed||0))}</b></span><span>Denies <b>${fmt(p.denies)}</b></span></div>
  <div class="build"><span>Сборка</span>${items.length?items.map(id=>`<img title="${esc(itemName(id))}" src="${itemImg(id)}" onerror="this.style.visibility='hidden'">`).join(''):'<em>нет данных</em>'}</div>
 </div>`;
}
function buildEvents(m,p){
 const out=[],slot=p.player_slot;
 const playerLabel=`${p.personaname||'Игрок'} · ${heroName(p)}`;
 const eventPlayer={name:p.personaname||'Игрок',hero:heroName(p),img:heroImg(p)};

 // 1) Реальные teamfight events, если OpenDota их вернул.
 for(const f of (m.teamfights||[])){
   const x=f.players&&f.players[slot]; if(!x)continue;
   const dmg=x.damage||0, k=x.kills||0, a=x.assists||0, d=x.deaths||0;
   if(d>0){
     out.push({t:time(f.start||0),player:eventPlayer,title:`Смерть в командной драке`,text:`${fmt(dmg)} hero damage • ${k} kills • ${a} assists • ${d} death`,danger:dmg<500,why:dmg<500?"Смерть произошла при небольшом личном вкладе в драку.":"Смерть есть, но у игрока был заметный вклад уроном — поэтому эпизод не считается автоматической ошибкой."});
   } else if(dmg>1000 || k+a>=2){
     out.push({t:time(f.start||0),player:eventPlayer,title:`Заметный вклад в teamfight`,text:`${fmt(dmg)} hero damage • ${k} kills • ${a} assists`,danger:false,why:"Игрок конвертировал присутствие в драке в урон или убийства — это положительный сигнал."});
   }
 }

 // 2) Objective events, если они привязаны к player_slot.
 for(const o of (m.objectives||[])){
   if(o.player_slot!==slot||!o.type)continue;
   const type=String(o.type), subtype=o.subtype||"";
   out.push({t:time(o.time||0),player:eventPlayer,title:`Объект: ${type}`,text:subtype||"Событие найдено в данных матча.",danger:false,why:"Участие в objective учитывается как вклад в продвижение команды."});
 }

 const real=out.sort((a,b)=>a.t.localeCompare(b.t)).slice(0,10);
 if(real.length) return real;

 // 3) В некоторых матчах OpenDota не возвращает teamfights/objectives.
 // Не оставляем пользователя с пустым блоком: строим честные derived-сигналы
 // из тех данных, которые точно есть в player stats. Не придумываем время.
 const deaths=p.deaths||0, kp=p.kp||0, dmgShare=p.dmgShare||0, tower=p.tower_damage||0;
 const gpm=p.gold_per_min||0;
 const derived=[];
 if(deaths>=3){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Высокая цена смертей`,text:`${deaths} смертей за матч`,danger:true,why:"Без таймлайна нельзя утверждать, какая именно смерть стала переломной, но количество смертей заметно увеличивает цену ошибок."});
 }
 if(kp<45){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Низкое участие в убийствах`,text:`Kill Participation ${kp.toFixed(0)}%`,danger:true,why:"Игрок редко участвовал в результативных действиях команды; для оценки важно учитывать его роль и ожидания от неё."});
 } else if(kp>=65){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Активное участие в убийствах`,text:`Kill Participation ${kp.toFixed(0)}%`,danger:false,why:"Высокое участие в убийствах снижает вероятность того, что игрок полностью выпал из командной игры."});
 }
 if(dmgShare<10){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Небольшой вклад в hero damage`,text:`${dmgShare.toFixed(1)}% командного hero damage`,danger:true,why:"Доля урона низкая. Это не самостоятельное доказательство ошибки — показатель оценивается вместе с ролью, фармом и участием в игре."});
 } else if(dmgShare>=20){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Высокий вклад в hero damage`,text:`${dmgShare.toFixed(1)}% командного hero damage`,danger:false,why:"Игрок внёс заметную долю командного урона, поэтому его нельзя оценивать только по KDA или смертям."});
 }
 if(tower<500){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Ограниченное давление на объекты`,text:`${fmt(tower)} урона по строениям`,danger:true,why:"Урон по зданиям небольшой. Значимость этого сигнала зависит от роли и от того, насколько команда вообще имела окна для пуша."});
 }
 if(gpm>0 && derived.length<2){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Экономика матча`,text:`${fmt(gpm)} GPM • ${fmt(p.net_worth)} net worth • ${fmt(p.last_hits)} last hits`,danger:false,why:"Экономика используется как контекст: высокий или низкий фарм сам по себе не доказывает руин."});
 }
 if(!derived.length){
   derived.push({t:'По итогам матча',player:eventPlayer,title:`Недостаточно событий для точной временной привязки`,text:`OpenDota не передал подробный teamfight/objective timeline`,danger:false,why:"Сервис показывает только проверяемые сигналы из статистики и не придумывает конкретные минуты или события."});
 }
 return derived.slice(0,5);
}
