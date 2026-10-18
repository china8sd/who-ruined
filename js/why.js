/* Who Ruined v6.2 — подробный разбор в окне «Почему именно он?».
   Грузится после builds.js. Использует CUR, scorePlayer-поля parts/exp, inferRoles, heroData и т.д. */
(function(){
'use strict';
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const pl=(n,a,b,c)=>{const m=n%100,d=n%10;return(m>10&&m<20)?c:d===1?a:(d>=2&&d<=4)?b:c};
const hn=p=>(heroName(p)||'').trim();
const nick=p=>p.personaname||('Игрок '+((p.idx||0)+1));
const pct=(a,b)=>b?a/b:0;
const rankIn=(arr,p,f,asc)=>{const s=arr.slice().sort((a,b)=>asc?f(a)-f(b):f(b)-f(a));return s.findIndex(x=>x.player_slot===p.player_slot)+1};
const st=r=>r>=.95?'ok':r>=.8?'warn':'bad';

const PARTS=[
 ['farm','Фарм ниже ожиданий','GPM ниже ориентира для его роли и ранга матча'],
 ['fight','Слабая отдача в драках','мало урона и участия в убийствах относительно роли'],
 ['error','Цена смертей','смерти, взвешенные по стадии игры'],
 ['obj','Давление на объекты','мало урона по строениям'],
 ['util','Нет пользы от поддержки','мало вижена и лечения'],
 ['waste','Ресурсы не конвертированы','высокий фарм без урона и давления на здания'],
 ['items','Предметы','BKB, детекция и т.п.']
];

function sectionScore(C){
 const{players,culprit:p}=C,second=players.find(x=>x!==p&&!x.leaver);
 const gap=second?p.score-second.score:null;
 const pts=PARTS.map(([k,l,d])=>({k,l,d,v:Math.max(0,(p.parts||{})[k]||0)})).filter(x=>x.v>=.5);
 const sum=pts.reduce((a,x)=>a+x.v,0)||1;
 const cols=['#ff5d66','#ff8f5e','#ffc766','#7bb7ff','#a98bff','#6ad3c4','#c4cbd8'];
 const bar=pts.map((x,i)=>`<i style="width:${x.v/sum*100}%;background:${cols[PARTS.findIndex(q=>q[0]===x.k)]}" title="${esc(x.l)}"></i>`).join('');
 const leg=pts.sort((a,b)=>b.v-a.v).map(x=>`<li><span class="dot" style="background:${cols[PARTS.findIndex(q=>q[0]===x.k)]}"></span><b>${esc(x.l)}</b><em>${Math.round(x.v/sum*100)}%</em><small>${esc(x.d)}</small></li>`).join('');
 return`<div class="wySec"><h3>Из чего сложился балл</h3>
 <div class="wyTop"><div class="wyBig ${impactClass(p.score)}"><b>${p.score}</b><small>/100</small></div><div><b>${esc(impactLabel(p.score))} влияние на поражение</b><p>${second?`№1 из ${players.length} в проигравшей команде. Ближайший — ${esc(nick(second))} (${esc(hn(second))}), отрыв ${gap} ${pl(gap,'балл','балла','баллов')}.${gap<=5?' Разрыв небольшой — «руинер» здесь условный.':''}`:'Сравнивать не с кем.'} Уверенность модели ${p.confidence}%.</p></div></div>
 <div class="wyStack">${bar}</div><ul class="wyLeg">${leg||'<li><b>Ни один штраф не выделяется</b></li>'}</ul></div>`;
}

function sectionMetrics(C){
 const{players,culprit:p}=C,e=p.exp||{},n=players.length;
 const avgD=players.reduce((a,x)=>a+(x.deaths||0),0)/n;
 const row=(label,val,exp,unit,rk,ratio,hint)=>`<div class="wyRow ${st(ratio)}"><div class="wyRowTop"><b>${label}</b><span>${val}${exp?` <small>/ ориентир ${exp}</small>`:''}</span></div><div class="wyBar"><i style="width:${cl(ratio*100,3,100)}%"></i></div><small>${hint}${rk?` · ${rk}-й из ${n} в команде`:''}</small></div>`;
 const gR=pct(p.gold_per_min||0,e.gpm),dR=pct(p.dmgShare,e.dmg),kR=pct(p.kp,e.kp),oR=pct(p.tower_damage||0,e.obj);
 const dRatio=(p.deaths||0)<=avgD?1:(p.deaths||0)<=avgD+1.5?.85:.5;
 return`<div class="wySec"><h3>Показатели против ориентира</h3><p class="wyHint">Ориентир зависит от роли героя, ранга матча и типа героя. Это не «норма для всех».</p><div class="wyRows">`
 +row('Фарм (GPM)',fmt(p.gold_per_min),Math.round(e.gpm),'',rankIn(players,p,x=>x.gold_per_min||0),gR,gR>=.95?'на уровне ожиданий':`${Math.round((1-gR)*100)}% ниже ориентира`)
 +row('Доля урона героям',p.dmgShare.toFixed(1)+'%',e.dmg.toFixed(0)+'%',' ',rankIn(players,p,x=>x.hero_damage||0),dR,`${fmt(p.hero_damage)} урона`)
 +row('Участие в убийствах',p.kp.toFixed(0)+'%',Math.round(e.kp)+'%','',rankIn(players,p,x=>x.kp),kR,`K/A ${p.kills||0}/${p.assists||0}`)
 +row('Урон по строениям',fmt(p.tower_damage),fmt(Math.round(e.obj)),'',rankIn(players,p,x=>x.tower_damage||0),oR,oR>=.95?'давление на карту было':'давление на объекты слабое')
 +row('Смерти',String(p.deaths||0),null,'',0,dRatio,`среднее по команде ${avgD.toFixed(1)} · ${(p.deaths||0)<=avgD?'не больше среднего':'больше среднего'}`)
 +`</div></div>`;
}

function goldDiffAt(C,t,team){
 const{all}=C,i=Math.floor(t/60);
 const sum=tm=>all.filter(x=>x.team===tm).reduce((a,x)=>a+(Array.isArray(x.gold_t)?Number(x.gold_t[i]||0):0),0);
 const has=all.some(x=>Array.isArray(x.gold_t)&&x.gold_t.length>i);
 if(!has)return null;
 return sum(team)-sum(team==='Radiant'?'Dire':'Radiant');
}
function sectionDeaths(C){
 const{m,all,culprit:p}=C,nm=heroData(p).name,foes=all.filter(x=>x.team!==p.team),dur=m.duration||1;
 const ds=[];
 foes.forEach(x=>(x.kills_log||[]).forEach(k=>{if(k.key===nm)ds.push({t:k.time,by:x})}));
 ds.sort((a,b)=>a.t-b.t);
 if(!ds.length){
  const d=p.deaths||0;
  return`<div class="wySec"><h3>Смерти</h3><p class="wyHint">${d?`${d} ${pl(d,'смерть','смерти','смертей')} за матч. `:'Смертей не было. '}Поминутного лога смертей OpenDota не вернул (матч не распарсен), поэтому конкретные эпизоды назвать нельзя.</p></div>`;
 }
 const side=p.team==='Radiant'?'goodguys':'badguys';
 const fights=m.teamfights||[],objs=(m.objectives||[]).filter(o=>o.type==='building_kill'&&String(o.key||'').includes(side));
 const bb=(p.buyback_log||[]).map(b=>b.time);
 const phase=t=>t<720?0:t<1500?1:2;
 const cnt=[0,0,0];let solo=0;
 const rows=ds.map(d=>{
  cnt[phase(d.t)]++;
  const f=fights.find(f=>d.t>=(f.start||0)-5&&d.t<=(f.end||0)+10);
  if(!f)solo++;
  const gd=goldDiffAt(C,d.t,p.team);
  const lost=objs.find(o=>o.time>=d.t&&o.time<=d.t+75);
  const lostTxt=lost?(String(lost.key).includes('tower')?'вышка':String(lost.key).includes('rax')?'бараки':String(lost.key).includes('fort')?'крепость':'строение'):null;
  const tags=[];
  tags.push(f?'в командной драке':'вне драки (пик, ловля, одиночная смерть)');
  if(gd!=null)tags.push(gd<-1500?`команда отставала по золоту на ${fmt(Math.abs(gd))}`:gd>1500?`команда вела по золоту (+${fmt(gd)})`:'золото примерно поровну');
  if(bb.some(b=>Math.abs(b-d.t)<30))tags.push('выкуплен баибэк');
  if(lostTxt)tags.push(`через ≤75 с потеряна ${lostTxt}`);
  const bad=!f||lostTxt;
  return`<li class="${bad?'bad':''}"><span class="t">${time(d.t)}</span><img src="${esc(heroImg(d.by))}" alt="" onerror="this.style.visibility='hidden'"><div><b>Убит: ${esc(hn(d.by))}</b><small>${esc(tags.join(' · '))}</small></div></li>`;
 }).join('');
 const sum=`${ds.length} ${pl(ds.length,'смерть','смерти','смертей')}: ${cnt[0]} на лайнинге, ${cnt[1]} в мидгейме, ${cnt[2]} в лейте; ${solo} из них вне командных драк.`;
 return`<div class="wySec"><h3>Смерти по времени</h3><p class="wyHint">${esc(sum)}${dur>35*60&&cnt[2]>=3?' В затянувшейся игре каждая смерть дороже — лейт-смерти весят больше.':''}</p><ul class="wyDeaths">${rows}</ul></div>`;
}

function sectionOpponent(C){
 const{m,all,culprit:p}=C;
 const wt=all.filter(x=>x.team!==p.team),rl=inferRoles(wt,m.duration||1),pos=(inferRoles(all.filter(x=>x.team===p.team),m.duration||1)[p.player_slot]||{}).position;
 const o=wt.find(x=>(rl[x.player_slot]||{}).position===pos);
 if(!o)return'';
 const line=(label,a,b,hiBetter=true)=>{const A=Number(a)||0,B=Number(b)||0,d=A-B;const good=hiBetter?d>=0:d<=0;return`<tr><td>${label}</td><td>${fmt(a)}</td><td>${fmt(b)}</td><td class="${Math.abs(d)<1e-9?'':good?'g':'r'}">${d>0?'+':''}${fmt(Math.round(d))}</td></tr>`};
 const at=(x,arr,i)=>Array.isArray(x[arr])&&x[arr].length>i?x[arr][i]:null;
 const early=at(p,'gold_t',10)!=null&&at(o,'gold_t',10)!=null?line('Золото на 10-й минуте',at(p,'gold_t',10),at(o,'gold_t',10))+(at(p,'lh_t',10)!=null&&at(o,'lh_t',10)!=null?line('Last hits на 10-й минуте',at(p,'lh_t',10),at(o,'lh_t',10)):''):'';
 return`<div class="wySec"><h3>Против оппонента на той же позиции</h3><p class="wyHint">${esc(nick(p))} (${esc(hn(p))}) против ${esc(nick(o))} (${esc(hn(o))}). Позиция определена по лайну и ресурсам, поэтому в редких матчах пара может быть не точной.</p>
 <div class="wyTblWrap"><table class="wyTbl"><tr><th></th><th>${esc(hn(p))}</th><th>${esc(hn(o))}</th><th>Разница</th></tr>${early}${line('GPM',p.gold_per_min,o.gold_per_min)}${line('XPM',p.xp_per_min,o.xp_per_min)}${line('Net worth',p.net_worth,o.net_worth)}${line('Last hits',p.last_hits,o.last_hits)}${line('Урон героям',p.hero_damage,o.hero_damage)}${line('Урон по строениям',p.tower_damage,o.tower_damage)}${line('Смерти',p.deaths,o.deaths,false)}</table></div></div>`;
}

function sectionBuild(C){
 try{
  const E=window.WRBuilds.evaluate(C),p=C.culprit;
  const row=E[p.team].rows.find(x=>x.I.p.player_slot===p.player_slot);
  if(!row||row.r.na)return'';
  const r=row.r;
  return`<div class="wySec"><h3>Билд</h3><p class="wyHint">Оценка билда: <b>${r.score}/10</b>.${r.cons.length?' Что в нём не так:':' Серьёзных претензий к билду нет.'}</p>${r.cons.length?`<ul class="wyList">${r.cons.slice(0,4).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}${r.need.map(n=>`<p class="wyHint">Чего не хватило: <b>${esc(n.i)}</b>${n.w?` — ${esc(n.w)}`:''}</p>`).join('')}<p class="wyHint">Полный разбор — в кнопке «Оценка билдов».</p></div>`;
 }catch(e){return''}
}

function sectionMitigating(C){
 const{m,all,players,culprit:p}=C,out=[];
 const wt=m.radiant_win?'Radiant':'Dire',nw=t=>all.filter(x=>x.team===t).reduce((a,x)=>a+(x.net_worth||0),0),gap=nw(wt)-nw(p.team);
 if(gap>8000)out.push(`Вся команда отставала по экономике на ${fmt(gap)} net worth — это не вина одного игрока.`);
 if(players.some(x=>x.leaver))out.push('В команде был ливер/АФК — игра 4 на 5 почти не оставляет шансов.');
 const second=players.find(x=>x!==p&&!x.leaver);
 if(second&&p.score-second.score<=5)out.push(`${nick(second)} набрал почти столько же (${second.score} против ${p.score}) — вина распределена.`);
 if(p.kp>=60)out.push(`Участие в ${p.kp.toFixed(0)}% убийств команды — он был в центре событий.`);
 if(C.draft&&C.draft.aw-C.draft.al>1.5)out.push('Драфт был не в пользу команды — часть поражения заложена на пике.');
 if(!out.length)return`<div class="wySec"><h3>Что смягчает вину</h3><p class="wyHint">По статистике смягчающих обстоятельств почти нет.</p></div>`;
 return`<div class="wySec"><h3>Что смягчает вину</h3><ul class="wyList good">${out.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`;
}

function sectionFix(C){
 const p=C.culprit;
 return`<div class="wySec"><h3>Что делать иначе</h3><p class="wyHint">${esc(lessonAction(p))}</p></div>`;
}

function reasonsHtml(p){
 const rs=(p.reasons||[]).map(cleanReason);
 return`<div class="wySec"><h3>Ключевые причины</h3><div class="reasons">${rs.map(r=>`<div class="reason"><strong>${esc(r[0])}</strong><span>${esc(r[1])}</span></div>`).join('')||'<div class="empty">Недостаточно отдельных сигналов.</div>'}</div></div>`;
}

function build(C){
 const parts=[];
 const add=f=>{try{const h=f(C);if(h)parts.push(h)}catch(e){console.error(e)}};
 parts.push(reasonsHtml(C.culprit));
 [sectionScore,sectionMetrics,sectionDeaths,sectionOpponent,sectionBuild,sectionMitigating,sectionFix].forEach(add);
 return parts.join('');
}

Object.assign(EN,{'Из чего сложился балл':'What the score is made of','Показатели против ориентира':'Stats vs benchmark','Смерти по времени':'Deaths timeline','Против оппонента на той же позиции':'Versus the same-position opponent','Билд':'Build','Что смягчает вину':'Mitigating factors','Что делать иначе':'What to do differently','Ключевые причины':'Key reasons'});
$('whyRuinerBtn').addEventListener('click',()=>{
 if(!CUR)return;
 const box=$('whyRuinerContent');
 box.className='wyBody';box.innerHTML=build(CUR);applyLang(box);
 const c=box.closest('.whyModalCard');if(c)c.scrollTop=0;
});
})();
