/* Who Ruined v4.0 — extras: i18n, cache, errors, history, share card, advocate, deep links, model helpers */
/* ---- stats (GoatCounter, free, no cookies). Впиши свой код сайта, например 'whoruined' → whoruined.goatcounter.com ---- */
const STATS_CODE='whoruined';
function track(path,title){if(!STATS_CODE)return;const go=()=>window.goatcounter&&window.goatcounter.count?window.goatcounter.count({path,title:title||path,event:true}):setTimeout(go,1500);try{go()}catch(e){}}
if(STATS_CODE){const sc=document.createElement('script');sc.async=true;sc.dataset.goatcounter=`https://${STATS_CODE}.goatcounter.com/count`;sc.src='https://gc.zgo.at/count.js';document.head.appendChild(sc)}
let LANG=(()=>{try{return localStorage.getItem('wr_lang')}catch(e){return null}})()||'ru';
let CUR=null;
const EN={'Разбор поражения по Match ID. Не просто KDA — контекст, ключевые ошибки и влияние каждого игрока.':'Defeat breakdown by Match ID. Not just KDA — context, key mistakes and every player\'s impact.','Введи Match ID':'Enter Match ID','АНАЛИЗИРОВАТЬ':'ANALYZE','Открыть Telegram':'Open Telegram','автор проекта · Telegram':'project author · Telegram','РУИНЕР':'RUINER','ПОЧЕМУ ИМЕННО ОН?':'WHY HIM?','АДВОКАТ':'ADVOCATE','Адвокат руинера':'Ruiner\'s advocate','Влияние на поражение':'Impact on the defeat','Итоги матча':'Match report','Ключевые игроки и переломные моменты':'Key players and turning points','КОПИРОВАТЬ ИТОГ':'COPY SUMMARY','СКАЧАТЬ КАРТОЧКУ':'DOWNLOAD CARD','СКОПИРОВАНО':'COPIED','Матч в цифрах':'Match in numbers','Как менялось преимущество по золоту':'Gold advantage over time','Смерти руинера':'Ruiner deaths','Сравнение с ожиданиями':'Compared to expectations','GPM и XPM сопоставляются с контекстным ориентиром модели. Это не абсолютный рейтинг игрока.':'GPM and XPM are compared to the model\'s contextual benchmark. This is not an absolute player rating.','Ориентиры скорректированы под ранг матча':'Benchmarks adjusted for match rank','Победившая команда ·':'Winning team ·','Как развивалась игра':'How the game unfolded','Игроки проигравшей команды':'Losing team players','Ключевые эпизоды':'Key moments','Почему именно он?':'Why him?','Разбор основан на показателях матча и доступных игровых событиях. Это оценка модели, а не утверждение, что один игрок единолично проиграл матч.':'The analysis is based on match stats and available events. It is a model estimate, not a claim that one player lost the game alone.','MVP МАТЧА':'MATCH MVP','ЛУЧШИЙ В ПОРАЖЕНИИ':'BEST IN THE LOSS','САМЫЙ РИСКОВЫЙ ИГРОК':'MOST RISKY PLAYER','Лучший вклад в победившей команде':'Best contribution on the winning team','Сильнейший профиль среди проигравших':'Strongest profile among the losers','Наибольшее число негативных сигналов':'Most negative signals','Длительность':'Duration','Победитель':'Winner','ПОРАЖЕНИЕ':'DEFEAT','ПОБЕДА':'VICTORY','Сборка':'Build','нет данных':'no data','НЕГАТИВНЫЙ СИГНАЛ':'NEGATIVE SIGNAL','ПОЛОЖИТЕЛЬНЫЙ СИГНАЛ':'POSITIVE SIGNAL','Что произошло:':'What happened:','Почему это важно:':'Why it matters:','Radiant впереди':'Radiant ahead','Dire впереди':'Dire ahead','Недавние':'Recent','Телеграм автора':'Author\'s Telegram','ЛИВЕР/АФК':'LEAVER/AFK','Загружаем матч, героев и предметы…':'Loading match, heroes and items…','Матч не найден. Проверь Match ID — свежие матчи появляются не сразу.':'Match not found. Check the Match ID — fresh matches may take a while to appear.','OpenDota просит подождать (лимит запросов). Попробуй через минуту.':'OpenDota asks to slow down (rate limit). Try again in a minute.','OpenDota сейчас недоступен. Попробуй позже.':'OpenDota is unavailable right now. Try again later.','Ошибка OpenDota':'OpenDota error','Нет соединения с OpenDota. Проверь интернет.':'Can\'t reach OpenDota. Check your connection.','Матч не распарсен OpenDota — разбор будет менее точным.':'This match is not parsed by OpenDota — the analysis will be less precise.','Запросить парсинг':'Request parsing','Парсинг поставлен в очередь. Попробуй снова через 2–5 минут.':'Parsing queued. Try again in 2–5 minutes.','Не удалось отправить запрос на парсинг.':'Could not send the parse request.','В проигравшей команде был ливер/АФК — он исключён из выбора руинера:':'The losing team had a leaver/AFK — excluded from the ruiner pick:'};
const RX=[[/^Уверенность модели: (\d+)%$/,'Model confidence: $1%'],[/^Уверенность модели —$/,'Model confidence —'],[/^Матч (\d+) обработан$/,'Match $1 processed']];
const T0=new WeakMap();
function t(s){return LANG==='en'&&EN[s]||s}
function applyLang(root){
 const w=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){
  if(n.parentElement&&n.parentElement.closest('script,style'))continue;
  const cur=n.nodeValue,k=cur.trim();if(!k)continue;
  if(LANG==='en'){let en=EN[k];if(!en)for(const[r,v]of RX)if(r.test(k)){en=k.replace(r,v);break}if(en){T0.set(n,cur);n.nodeValue=cur.replace(k,en)}}
  else if(T0.has(n)){n.nodeValue=T0.get(n);T0.delete(n)}
 }
 $('matchId').placeholder=t('Введи Match ID');$('langBtn').textContent=LANG==='en'?'RU':'EN';document.documentElement.lang=LANG;
}
$('langBtn').onclick=()=>{track('lang/'+(LANG==='en'?'ru':'en'));LANG=LANG==='en'?'ru':'en';try{localStorage.setItem('wr_lang',LANG)}catch(e){}applyLang()};

/* ---- helpers used by app.js ---- */
function setStatus(s,c){$('status').textContent=s;$('status').className='status '+(c||'');applyLang($('status'))}
function httpErr(c){const e=Error(c===404?t('Матч не найден. Проверь Match ID — свежие матчи появляются не сразу.'):c===429?t('OpenDota просит подождать (лимит запросов). Попробуй через минуту.'):c>=500?t('OpenDota сейчас недоступен. Попробуй позже.')+` (${c})`:t('Ошибка OpenDota')+` (${c})`);e.code=c;return e}
async function cachedJson(n){
 const k='wr_c_'+n;try{const c=JSON.parse(localStorage.getItem(k)||'null');if(c&&Date.now()-c.t<864e5)return c.d}catch(e){}
 const r=await fetch(`${API}/constants/${n}`);if(!r.ok)return{};const d=await r.json();
 try{localStorage.setItem(k,JSON.stringify({t:Date.now(),d}))}catch(e){}return d}
function shareUrl(id){return location.protocol.startsWith('http')?`${location.origin}${location.pathname}?match=${id}`:`https://china8sd.github.io/who-ruined/?match=${id}`}

/* ---- model: rank calibration, hero tags, items ---- */
function rankFactor(m){const a=m.players.map(p=>Math.floor((p.rank_tier||0)/10)).filter(Boolean);if(!a.length)return 1;return clamp(.65+.07*a.reduce((x,y)=>x+y,0)/a.length,.72,1.15)}
function posOf(role){return+((String(role).match(/Pos (\d)/)||[])[1])||0}
function heroAdj(p,role){const r=heroData(p).roles||[],pos=posOf(role);let g=1,d=1;
 if(pos&&pos<=3&&r.includes('Support')&&!r.includes('Carry')){g=.88;d=.82}
 if(pos>=4&&r.includes('Carry')){g=1.12;d=1.3}
 return{g,d}}
function hasItem(p,key){if((p.purchase_log||[]).some(x=>x.key===key))return true;const id=ITEMS[key]&&ITEMS[key].id;return!!id&&itemsOf(p).includes(id)}
function itemSignals(p,c,role){
 const out=[],pos=posOf(role),long=c.duration>30*60;
 if(pos&&pos<=3&&long&&!hasItem(p,'black_king_bar')&&!hasItem(p,'aeon_disk'))
  out.push({pen:4,reason:['Нет BKB к лейту','В затянувшейся игре не найдено ни BKB, ни Aeon Disk — герой уязвим для контроля.']});
 if(pos>=4&&long&&c.team.some(x=>x.purchase_log)){
  const inv=c.win.some(x=>hasItem(x,'shadow_blade')||hasItem(x,'silver_edge')||/riki|clinkz|bounty_hunter|weaver|nyx_assassin/.test(heroData(x).name||''));
  const det=c.team.some(x=>['sentry','dust','gem','ward_dispenser'].some(k=>hasItem(x,k))||(x.sentry_placed||0)>0);
  if(inv&&!det)out.push({pen:4,reason:['Нет детекции против невидимости','У соперника есть невидимые герои или предметы, а в вашей команде не нашлось сентри, дастов или gem.']});
 }
 return out}

/* ---- gold graph: ruiner deaths ---- */
function deathMarks(m,all,p,n,W,H,pad,max,series){
 if(!p||n<2)return'';const nm=heroData(p).name,ts=[];
 all.filter(x=>x.team!==p.team).forEach(x=>(x.kills_log||[]).forEach(k=>{if(k.key===nm)ts.push(k.time)}));
 return ts.map(s=>{const i=clamp(s/60,0,n-1),i0=Math.floor(i),i1=Math.min(n-1,i0+1),f=i-i0;
  const d=(series[i0].r-series[i0].d)*(1-f)+(series[i1].r-series[i1].d)*f;
  return`<circle class="deathMark" cx="${pad+i*(W-2*pad)/(n-1)}" cy="${H/2-d/max*(H/2-pad)}" r="5"><title>${esc(p.personaname||'')} · ${time(s)}</title></circle>`}).join('')}

/* ---- advocate ---- */
function advocateHtml(m,p,all,pl){
 const rk=f=>[...pl].sort((a,b)=>f(b)-f(a)).indexOf(p)+1,pts=[],avgD=pl.reduce((a,x)=>a+(x.deaths||0),0)/pl.length;
 const dr=rk(x=>x.hero_damage||0),tr=rk(x=>x.tower_damage||0);
 if(p.kp>=60)pts.push([`Участие в ${p.kp.toFixed(0)}% убийств команды`,'Он был в гуще событий, а не пассивно фармил.']);
 if(dr<=2)pts.push([`№${dr} по урону героям в команде`,`${fmt(p.hero_damage)} урона — ${p.dmgShare.toFixed(1)}% командного.`]);
 if((p.tower_damage||0)>0&&tr<=2)pts.push([`№${tr} по урону строениям`,`${fmt(p.tower_damage)} урона по зданиям.`]);
 if((p.deaths||0)<=avgD-1)pts.push(['Умирал реже среднего',`${p.deaths||0} смертей при среднем ${avgD.toFixed(1)} по команде.`]);
 if(rk(x=>x.gold_per_min||0)===1)pts.push(['Лучший фарм в команде',`${fmt(p.gold_per_min)} GPM.`]);
 if((p.hero_healing||0)>3000||(p.obs_placed||0)>=5)pts.push(['Вклад поддержки','Лечение и вижен помогали команде, даже если это не видно в KDA.']);
 const wt=m.radiant_win?'Radiant':'Dire',nw=tm=>all.filter(x=>x.team===tm).reduce((a,x)=>a+(x.net_worth||0),0),gap=nw(wt)-nw(p.team);
 if(gap>8000)pts.push(['Команда в целом проигрывала по экономике',`Соперник опережал на ${fmt(gap)} net worth — это не вина одного игрока.`]);
 if(pl.some(x=>x.leaver))pts.push(['В команде был ливер/АФК','Игра 4 на 5 почти не оставляет шансов независимо от одного игрока.']);
 if(!pts.length)pts.push(['Сильных сторон по статистике немного','Но поражение всё равно остаётся командным: оценка модели — не приговор.']);
 return`<h3>${t('Адвокат руинера')}</h3><ul>${pts.map(x=>`<li><b>${esc(x[0])}</b><span>${esc(x[1])}</span></li>`).join('')}</ul>`}
$('advocateBtn').onclick=()=>track('click/advocate')||$('advocate').classList.toggle('hidden');

/* ---- history ---- */
function histGet(){try{return JSON.parse(localStorage.getItem('wr_hist')||'[]')}catch(e){return[]}}
function histAdd(e){const h=histGet().filter(x=>x.id!==e.id);h.unshift(e);try{localStorage.setItem('wr_hist',JSON.stringify(h.slice(0,8)))}catch(_){}histRender()}
function histRender(){const h=histGet();$('history').innerHTML=h.length?`<span>${t('Недавние')}:</span>`+h.map(x=>`<button type="button" class="chip" data-id="${esc(x.id)}" title="${esc(x.name+' · '+x.hero)}">${esc(x.id)} <b>${esc(x.score)}</b></button>`).join('')+'<button type="button" class="chip clr" data-clr="1" aria-label="Clear">✕</button>':''}
$('history').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.clr){try{localStorage.removeItem('wr_hist')}catch(_){}histRender()}else run(b.dataset.id)});

/* ---- parse request ---- */
$('parseNotice').addEventListener('click',async e=>{
 if(e.target.id!=='reqParse'||!CUR)return;track('click/request-parse');const b=e.target;b.disabled=true;
 try{const r=await fetch(`${API}/request/${CUR.m.match_id}`,{method:'POST'});setStatus(r.ok?t('Парсинг поставлен в очередь. Попробуй снова через 2–5 минут.'):t('Не удалось отправить запрос на парсинг.'),r.ok?'':'err')}
 catch(err){setStatus(t('Не удалось отправить запрос на парсинг.'),'err');b.disabled=false}});

/* ---- share card (PNG) ---- */
const loadImg=u=>new Promise(r=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>r(i);i.onerror=()=>r(null);i.src=u;setTimeout(()=>r(null),5000)});
async function shareCard(){
 if(!CUR)return;const{m,culprit:p}=CUR,c=document.createElement('canvas');c.width=c.height=1080;const x=c.getContext('2d');
 let g=x.createLinearGradient(0,0,1080,1080);g.addColorStop(0,'#0a1020');g.addColorStop(1,'#220a12');x.fillStyle=g;x.fillRect(0,0,1080,1080);
 g=x.createRadialGradient(540,330,30,540,330,520);g.addColorStop(0,'rgba(255,60,70,.30)');g.addColorStop(1,'rgba(255,60,70,0)');x.fillStyle=g;x.fillRect(0,0,1080,1080);
 const img=await loadImg(heroImg(p));if(img)x.drawImage(img,260,150,560,315);
 x.textAlign='center';x.fillStyle='#fff';x.font='900 46px Inter,Arial,sans-serif';x.textAlign='left';x.fillText('WHO ',70,100);const w1=x.measureText('WHO ').width;x.fillStyle='#ff4545';x.fillText('RUINED?',70+w1,100);
 x.textAlign='right';x.fillStyle='#8791a3';x.font='700 26px Inter,Arial,sans-serif';x.fillText('MATCH '+(m.match_id||''),1010,98);
 x.textAlign='center';x.fillStyle='#ff6a72';x.font='800 28px Inter,Arial,sans-serif';x.fillText(t('РУИНЕР').split('').join(' '),540,525);
 const name=p.personaname||'Unknown';let fs=88;x.fillStyle='#fff';do{x.font=`900 ${fs}px Inter,Arial,sans-serif`;fs-=4}while(x.measureText(name).width>940&&fs>28);x.fillText(name,540,625);
 x.fillStyle='#9aa4b6';x.font='600 34px Inter,Arial,sans-serif';x.fillText(heroName(p),540,682);
 x.fillStyle=({'very-high':'#ff3b47',high:'#ff6a3d',moderate:'#ffb02e',low:'#7bb7ff',minimal:'#6ad39a'})[impactClass(p.score)];x.font='900 64px Inter,Arial,sans-serif';x.fillText(impactLabel(p.score),540,790);
 x.fillStyle='rgba(255,255,255,.1)';x.fillRect(190,820,700,14);x.fillStyle=x.fillStyle;g=x.createLinearGradient(190,0,890,0);g.addColorStop(0,'#ffb02e');g.addColorStop(1,'#ff3b47');x.fillStyle=g;x.fillRect(190,820,7*p.score,14);
 x.fillStyle='#c9d1df';x.font='700 32px Inter,Arial,sans-serif';x.fillText(`K/D/A ${p.kills||0}/${p.deaths||0}/${p.assists||0}  ·  GPM ${fmt(p.gold_per_min)}  ·  KP ${p.kp.toFixed(0)}%`,540,910);
 x.fillStyle='#5f6a7d';x.font='600 24px Inter,Arial,sans-serif';x.fillText(shareUrl(m.match_id||'').replace(/^https?:\/\//,''),540,1030);
 c.toBlob(async b=>{if(!b)return;const f=new File([b],`who-ruined-${m.match_id}.png`,{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f]});return}catch(e){}}
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4e3)},'image/png')}
document.querySelectorAll('.telegram').forEach(a=>a.addEventListener('click',()=>track('click/telegram')));
$('betboomBtn').addEventListener('click',()=>track('click/betboom'));
$('shareCard').onclick=()=>{track('click/share-card');shareCard()};$('shareResult').addEventListener('click',()=>track('click/share-text'));$('whyRuinerBtn').addEventListener('click',()=>track('click/why-him'));

/* ---- post-render hook ---- */
const _render=render;
render=function(m,all,players,culprit,closeRuiner){
 _render(m,all,players,culprit,closeRuiner);CUR={m,all,players,culprit};
 const id=String(m.match_id||$('matchId').value);
 try{history.replaceState(null,'','?match='+id)}catch(e){}
 track('analyze');track('ruiner/'+heroName(culprit).toLowerCase().replace(/\s+/g,'-'),'Руинер: '+heroName(culprit));
 histAdd({id,name:culprit.personaname||'?',hero:heroName(culprit),score:culprit.score});
 const ad=$('advocate');ad.classList.add('hidden');ad.innerHTML=advocateHtml(m,culprit,all,players);
 const hint=$('roleCompare').parentElement.querySelector('.panelHint');
 if(hint){hint.dataset.base=hint.dataset.base||hint.textContent;hint.innerHTML=esc(hint.dataset.base)+(CAL!==1?`<br><span class="calNote">${esc(t('Ориентиры скорректированы под ранг матча'))} ×${CAL.toFixed(2)}</span>`:'')}
 const unparsed=!(m.teamfights&&m.teamfights.length)&&!m.players.some(p=>p.gold_t),lv=players.filter(x=>x.leaver);
 $('parseNotice').innerHTML=(unparsed?`<div class="notice">${esc(t('Матч не распарсен OpenDota — разбор будет менее точным.'))} <button type="button" id="reqParse">${esc(t('Запросить парсинг'))}</button></div>`:'')
  +(lv.length?`<div class="notice">${esc(t('В проигравшей команде был ливер/АФК — он исключён из выбора руинера:'))} ${esc(lv.map(x=>x.personaname||heroName(x)).join(', '))}</div>`:'');
 applyLang();
};

histRender();applyLang();
{const q=new URLSearchParams(location.search).get('match');if(q)run(q)}
