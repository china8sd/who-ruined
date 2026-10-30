/* Who Ruined v6.13 — eight additional match insights */
(() => {
  const $a = id => document.getElementById(id);
  const escA = s => esc(s ?? '');
  const pName = p => p?.personaname || `Игрок ${Number(p?.idx ?? 0) + 1}`;
  const teamClass = t => t === 'Radiant' ? 'advRadiant' : 'advDire';
  const noData = msg => `<div class="advEmpty">${escA(msg || 'Для этого матча недостаточно данных OpenDota.')}</div>`;
  const playerLine = (p, extra='') => `<div class="advPlayer"><img src="${escA(heroImg(p))}" alt="" loading="lazy" onerror="this.style.display='none'"><div><b>${escA(pName(p))}</b><span>${escA(heroName(p))} · ${escA(p.team)}</span></div>${extra ? `<strong>${extra}</strong>` : ''}</div>`;
  const at = (arr, minute) => Array.isArray(arr) && arr.length ? Number(arr[Math.min(minute, arr.length - 1)] || 0) : null;
  const groupSum = (players, field, minute) => {
    const vals = players.map(p => at(p[field], minute)).filter(v => v !== null);
    return vals.length ? vals.reduce((a,b)=>a+b,0) : null;
  };
  const laneRows = (all) => {
    const rad = all.filter(p=>p.team==='Radiant'), dire=all.filter(p=>p.team==='Dire');
    const rSafe=rad.filter(p=>Number(p.lane_role)===1), rMid=rad.filter(p=>Number(p.lane_role)===2), rOff=rad.filter(p=>Number(p.lane_role)===3);
    const dSafe=dire.filter(p=>Number(p.lane_role)===1), dMid=dire.filter(p=>Number(p.lane_role)===2), dOff=dire.filter(p=>Number(p.lane_role)===3);
    return [
      {name:'Верхняя линия',a:rSafe,b:dOff,an:'Radiant safe lane',bn:'Dire offlane'},
      {name:'Центр',a:rMid,b:dMid,an:'Radiant mid',bn:'Dire mid'},
      {name:'Нижняя линия',a:rOff,b:dSafe,an:'Radiant offlane',bn:'Dire safe lane'}
    ].filter(x=>x.a.length&&x.b.length);
  };
  function laneAnalysis(all) {
    const rows=laneRows(all), minute=10;
    if(!rows.length) return noData('OpenDota не вернула lane_role. Победителя линий определить нельзя.');
    const cards=rows.map(l=>{
      const ag=groupSum(l.a,'gold_t',minute), bg=groupSum(l.b,'gold_t',minute);
      const ax=groupSum(l.a,'xp_t',minute), bx=groupSum(l.b,'xp_t',minute);
      const ah=groupSum(l.a,'lh_t',minute), bh=groupSum(l.b,'lh_t',minute);
      if(ag===null||bg===null) return `<div class="advLane"><h4>${l.name}</h4>${noData('Нет временных данных золота на 10-й минуте.')}</div>`;
      const delta=ag-bg, winner=delta===0&&ax===bx?'Равная линия':delta>0?'Radiant':'Dire';
      const winnerPlayers=winner==='Radiant'?l.a:winner==='Dire'?l.b:[];
      const secondary=ax!==null&&bx!==null?` · XP ${fmt(ax)} : ${fmt(bx)}`:'';
      const lh=ah!==null&&bh!==null?` · LH ${fmt(ah)} : ${fmt(bh)}`:'';
      return `<div class="advLane"><div class="advLaneHead"><h4>${escA(l.name)}</h4><b class="${winner==='Radiant'?'advRadiant':winner==='Dire'?'advDire':''}">${escA(winner)}</b></div><div class="advLaneScore"><span>Золото на 10:00</span><strong>${fmt(ag)} : ${fmt(bg)}</strong></div><p>Разница ${delta>0?'+':''}${fmt(delta)} в пользу ${escA(delta>=0?'Radiant':'Dire')}${secondary}${lh}</p><div class="advLanePlayers">${l.a.concat(l.b).map(p=>playerLine(p)).join('')}</div></div>`;
    }).join('');
    return `<div class="advGrid">${cards}</div><p class="advFoot">Сравнение составов линий по суммарному золоту, опыту и добиваниям на 10-й минуте. Lane role OpenDota может быть определён неточно; это оценка линии, а не гарантированная расстановка игроков.</p>`;
  }
  function turningPoint(m, all) {
    const n=Math.max(0,...all.map(p=>Array.isArray(p.gold_t)?p.gold_t.length:0));
    if(n<7) return noData('Нет достаточного временного ряда золота.');
    const rad=all.filter(p=>p.team==='Radiant'),dire=all.filter(p=>p.team==='Dire');
    const win=m.radiant_win?'Radiant':'Dire', lose=win==='Radiant'?'Dire':'Radiant';
    const series=Array.from({length:n},(_,i)=>{
      const r=groupSum(rad,'gold_t',i)||0,d=groupSum(dire,'gold_t',i)||0;
      return win==='Radiant'?r-d:d-r;
    });
    let best=null;
    for(let i=5;i<n;i++){
      const delta=series[i]-series[i-5];
      if(!best||delta>best.delta)best={start:i-5,end:i,delta,before:series[i-5],after:series[i]};
    }
    if(!best||best.delta<=0) return noData('Временной ряд есть, но выраженного 5-минутного рывка победившей команды не обнаружено.');
    return `<div class="advHeroMetric"><span>Самый сильный 5-минутный рывок ${escA(win)}</span><strong>+${fmt(best.delta)} золота</strong><small>${time(best.start*60)} — ${time(best.end*60)}</small></div><p>Преимущество победителей изменилось с ${best.before>=0?'+':''}${fmt(best.before)} до ${best.after>=0?'+':''}${fmt(best.after)} золота относительно соперника.</p><p class="advFoot">Это крупнейший положительный сдвиг преимущества за пятиминутное окно, а не доказательство единственного момента, когда матч был проигран.</p>`;
  }
  function itemTiming(all) {
    const rows=[];
    all.forEach(p=>{
      const log=Array.isArray(p.purchase_log)?p.purchase_log:[];
      const picks=log.map(x=>({key:x.key,time:Number(x.time||0),data:ITEMS?.[x.key]||{}}))
        .filter(x=>x.time>=0 && Number(x.data.cost||0)>=2000)
        .sort((a,b)=>a.time-b.time).slice(0,3);
      if(picks.length) rows.push({p,picks});
    });
    if(!rows.length) return noData('Нет purchase_log. Матч должен быть распарсен OpenDota.');
    return `<div class="advTimingList">${rows.map(({p,picks})=>`<div class="advTimingRow">${playerLine(p)}<div class="advTimingItems">${picks.map(x=>`<span>${itemData(ITEMS?.[x.key]?.id)?.img?`<img src="${escA(itemImg(ITEMS[x.key].id))}" alt="" onerror="this.style.display='none'">`:''}<b>${escA(ITEMS?.[x.key]?.dname||x.key.replace(/_/g,' '))}</b><small>${time(x.time)}</small></span>`).join('')}</div></div>`).join('')}</div><p class="advFoot">Показаны первые три покупки предметов стоимостью от 2000 золота по журналу покупок. Время — минута матча, не оценка «опоздал/не опоздал»: для этого нужен корректный контекст героя, роли и игры.</p>`;
  }
  function teamfights(m, all) {
    const fights=Array.isArray(m.teamfights)?m.teamfights:[];
    if(!fights.length) return noData('OpenDota не вернула teamfights для этого матча.');
    const stats=all.map(p=>({p,fights:0,k:0,d:0,a:0,damage:0,gold:0}));
    fights.forEach(f=>stats.forEach(s=>{
      const x=tfp(f,s.p); if(!x)return;
      const k=Number(x.kills||0),d=Number(x.deaths||0),a=Number(x.assists||0),damage=Number(x.damage||0);
      if(k+d+a+damage>0){s.fights++;s.k+=k;s.d+=d;s.a+=a;s.damage+=damage;s.gold+=Number(x.gold_delta||0)}
    }));
    const valid=stats.filter(x=>x.fights).sort((a,b)=>(b.damage+b.k*1800+b.a*700-b.d*1200)-(a.damage+a.k*1800+a.a*700-a.d*1200));
    if(!valid.length) return noData('События драк есть, но персональные данные участников отсутствуют.');
    return `<div class="advFightList">${valid.map((x,i)=>`<div class="advFightRow"><em>${i+1}</em>${playerLine(x.p)}<div class="advFightStats"><b>${x.fights}</b><small>драк</small><b>${fmt(x.damage)}</b><small>урон в драках</small><b>${x.k}/${x.d}/${x.a}</b><small>K/D/A в драках</small></div></div>`).join('')}</div><p class="advFoot">Рейтинг учитывает зафиксированные OpenDota участие, урон, убийства, смерти и ассисты. Он не измеряет точность применения способностей или качество решений.</p>`;
  }
  function matchupKills(all) {
    const edges=[];
    all.forEach(killer=>{
      (killer.kills_log||[]).forEach(ev=>{
        const victimName=String(ev.key||'');
        const victims=all.filter(v=>v.team!==killer.team && String(heroData(v).name||'').toLowerCase()===victimName.toLowerCase());
        if(victims.length===1){let e=edges.find(x=>x.k.player_slot===killer.player_slot&&x.v.player_slot===victims[0].player_slot);if(!e)edges.push(e={k:killer,v:victims[0],count:0,last:0});e.count++;e.last=Math.max(e.last,Number(ev.time||0));}
      });
    });
    edges.sort((a,b)=>b.count-a.count);
    if(!edges.length) return noData('В kills_log нет достаточно точных данных, чтобы связать убийцу с конкретным игроком.');
    return `<div class="advDuels">${edges.slice(0,12).map(e=>`<div class="advDuel">${playerLine(e.k)}<span class="advArrow">убил ${e.count}×</span>${playerLine(e.v,`последний раз ${time(e.last)}`)}</div>`).join('')}</div><p class="advFoot">Связь строится по kills_log и имени героя-жертвы. Неоднозначные случаи (например, одинаковые герои у обеих команд) исключаются. Это список зафиксированных убийств, а не доказательство намеренного руина.</p>`;
  }
  const ACTIVE_ITEMS=new Set(['blink','black_king_bar','manta','force_staff','glimmer_cape','lotus_orb','orchid','bloodthorn','scythe_of_vyse','sheepstick','cyclone','wind_waker','atos','gleipnir','shivas_guard','refresher','nullifier','silver_edge','shadow_blade','dagon','urn_of_shadows','spirit_vessel','diffusal_blade','satanic','mekansm','guardian_greaves','pipe','crimson_guard','heavens_halberd','armlet','witch_blade','revenants_brooch','ethereal_blade','hurricane_pike','harpoon','disperser']);
  function worstItem(all) {
    const candidates=[];
    all.forEach(p=>{
      const purchased=new Set((p.purchase_log||[]).map(x=>x.key));
      Object.keys(p.item_uses||{}).forEach(k=>purchased.add(k));
      purchased.forEach(key=>{
        if(!ACTIVE_ITEMS.has(key))return;
        const uses=Number(p.item_uses?.[key]||0);
        candidates.push({p,key,uses,owned:itemsOf(p).includes(Number(ITEMS?.[key]?.id||-1)),name:ITEMS?.[key]?.dname||key.replace(/_/g,' ')});
      });
    });
    if(!candidates.length) return noData('Не найдено активных предметов из списка, для которых можно проверить число применений.');
    candidates.sort((a,b)=>a.uses-b.uses || Number(b.owned)-Number(a.owned));
    const x=candidates[0],icon=ITEMS?.[x.key]?.img?`https://cdn.cloudflare.steamstatic.com${ITEMS[x.key].img}`:'';
    return `<div class="advWorst">${icon?`<img src="${escA(icon)}" alt="" onerror="this.style.display='none'">`:''}<div><span>Минимум зарегистрированных активаций</span><h4>${escA(x.name)}</h4><b>${x.uses} использований</b><small>${escA(pName(x.p))} · ${escA(heroName(x.p))}</small></div></div><p class="advFoot">Это только предмет с наименьшим числом зарегистрированных активаций среди ограниченного списка активных предметов. Ноль использований не означает автоматически плохую покупку: предмет мог быть ситуационным, пассивно полезным или данные могли быть неполными.</p>`;
  }
  function dreamTeam(all) {
    const byPos=new Map();
    all.forEach(p=>{
      const team=all.filter(x=>x.team===p.team), role=inferRole(p,team, CUR?.m?.duration||1), pos=Number(role.position||String(role.role||'').match(/Pos (\d)/)?.[1]||0);
      if(!pos)return;
      const candidate={...p,roleInfo:role,roleLabel:role.role};
      const old=byPos.get(pos);
      if(!old||awardScore(candidate)>awardScore(old))byPos.set(pos,candidate);
    });
    if(!byPos.size)return noData('Не удалось определить позиции игроков.');
    return `<div class="advDreamTeam">${[1,2,3,4,5].map(pos=>{const p=byPos.get(pos);return p?`<div class="advDreamSlot"><span>POS ${pos}</span>${playerLine(p)}<small>${escA(p.team)} · K/D/A ${p.kills||0}/${p.deaths||0}/${p.assists||0} · GPM ${fmt(p.gold_per_min)}</small></div>`:`<div class="advDreamSlot">POS ${pos}${noData('Нет данных')}</div>`}).join('')}</div><p class="advFoot">По одному лучшему игроку на каждой предполагаемой позиции среди обеих команд. Выбор основан на общей формуле вклада матча; это условная сборная, а не независимый профессиональный рейтинг.</p>`;
  }
  function downloadTikTok(m, all) {
    const winner=m.radiant_win?'Radiant':'Dire';
    const winPlayers=all.filter(p=>p.team===winner).map(p=>({...p,roleInfo:inferRole(p,all.filter(x=>x.team===winner),m.duration||1)})).sort((a,b)=>awardScore(b)-awardScore(a));
    const mvp=winPlayers[0];
    const loser=all.filter(p=>p.team!==winner).map(p=>({...p,roleInfo:inferRole(p,all.filter(x=>x.team!==winner),m.duration||1)})).sort((a,b)=>awardScore(a)-awardScore(b))[0];
    const c=document.createElement('canvas');c.width=1080;c.height=1920;const ctx=c.getContext('2d');
    const g=ctx.createLinearGradient(0,0,1080,1920);g.addColorStop(0,'#171b25');g.addColorStop(.55,'#0b0e14');g.addColorStop(1,'#211710');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1920);
    ctx.strokeStyle='rgba(202,161,92,.35)';ctx.lineWidth=3;ctx.strokeRect(42,42,996,1836);
    ctx.fillStyle='#c9a66a';ctx.font='bold 34px Arial';ctx.fillText('MATCH REPORT',86,140);
    ctx.fillStyle='#f5f0e8';ctx.font='bold 94px Arial';ctx.fillText('WHO RUINED?',82,255);
    ctx.fillStyle='#9ba3b3';ctx.font='32px Arial';ctx.fillText(`MATCH ID  ${m.match_id||$('matchId').value}`,88,320);
    ctx.fillStyle='#c9a66a';ctx.font='bold 28px Arial';ctx.fillText('ПОБЕДИТЕЛЬ',90,445);
    ctx.fillStyle='#f4f4f4';ctx.font='bold 66px Arial';ctx.fillText(winner.toUpperCase(),88,525);
    ctx.fillStyle='#c9a66a';ctx.font='bold 28px Arial';ctx.fillText('MVP МАТЧА',90,675);
    ctx.fillStyle='#f7f4ee';ctx.font='bold 52px Arial';ctx.fillText((pName(mvp)+' · '+heroName(mvp)).slice(0,27),88,755);
    ctx.fillStyle='#b4bdca';ctx.font='30px Arial';ctx.fillText(`K/D/A  ${mvp?.kills||0}/${mvp?.deaths||0}/${mvp?.assists||0}     GPM  ${mvp?.gold_per_min||0}`,90,815);
    ctx.fillStyle='#c56e66';ctx.font='bold 28px Arial';ctx.fillText('САМЫЙ СЛАБЫЙ РЕЗУЛЬТАТ ПО МОДЕЛИ',90,990);
    ctx.fillStyle='#f7f4ee';ctx.font='bold 48px Arial';ctx.fillText((pName(loser)+' · '+heroName(loser)).slice(0,30),88,1065);
    ctx.fillStyle='#b4bdca';ctx.font='30px Arial';ctx.fillText(`K/D/A  ${loser?.kills||0}/${loser?.deaths||0}/${loser?.assists||0}`,90,1120);
    ctx.fillStyle='#c9a66a';ctx.font='bold 30px Arial';ctx.fillText('ЛУЧШИЕ ИГРОКИ МАТЧА',90,1300);
    const top=[...all].map(p=>({...p,roleInfo:inferRole(p,all.filter(x=>x.team===p.team),m.duration||1)})).sort((a,b)=>awardScore(b)-awardScore(a)).slice(0,5);
    top.forEach((p,i)=>{const y=1385+i*75;ctx.fillStyle='#d4d9e2';ctx.font='bold 30px Arial';ctx.fillText(`${i+1}. ${pName(p)} — ${heroName(p)}`,94,y);ctx.fillStyle='#8792a3';ctx.font='24px Arial';ctx.fillText(`${p.team} · ${p.kills||0}/${p.deaths||0}/${p.assists||0}`,760,y);});
    ctx.fillStyle='#818a99';ctx.font='24px Arial';ctx.fillText('Анализ по доступным данным OpenDota · Who Ruined',88,1790);
    c.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`who-ruined-${m.match_id||'match'}-tiktok.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)},'image/png');
  }
  function isParsed(m, all) {
    return !!((Array.isArray(m.teamfights) && m.teamfights.length) || all.some(p => Array.isArray(p.gold_t) && p.gold_t.length));
  }
  function updateParseState(m, all) {
    const box=$a('deepParseState');
    if(!box) return;
    if(isParsed(m,all)) {
      box.innerHTML='<div class="deepParseOk">✓ Матч распарсен OpenDota. Разделы ниже используют доступные игровые данные.</div>';
      return;
    }
    box.innerHTML=`<div class="deepParsePending"><div class="deepParseIcon">⌛</div><div class="deepParseCopy"><strong>Матч ещё не распарсен</strong><p>OpenDota пока не получила полный набор игровых событий. Часть разделов может быть пустой или неполной.</p><p><b>Ориентировочное ожидание:</b> обычно 2–5 минут после запроса парсинга. При высокой нагрузке обработка может занять 10–15 минут или дольше — точное время OpenDota не сообщает.</p><div class="deepParseActions"><button type="button" id="deepRequestParse" class="shareBtn">Запросить парсинг</button><button type="button" id="deepRefreshParse" class="shareBtn alt">Проверить снова</button></div><small id="deepParseFeedback">Если запрос уже отправлялся, подожди несколько минут и нажми «Проверить снова».</small></div></div>`;
    const req=$a('deepRequestParse');
    if(req) req.onclick=async()=>{
      req.disabled=true; req.textContent='ОТПРАВЛЯЕМ…';
      const feedback=$a('deepParseFeedback');
      try {
        const r=await fetch(`${API}/request/${m.match_id}`,{method:'POST'});
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        if(feedback) feedback.textContent='Запрос принят OpenDota. Обычно обработка занимает 2–5 минут, иногда дольше. Затем нажми «Проверить снова».';
        req.textContent='ЗАПРОС ОТПРАВЛЕН';
      } catch(e) {
        if(feedback) feedback.textContent='Не удалось отправить запрос. Возможно, OpenDota временно недоступна. Попробуй позже.';
        req.disabled=false; req.textContent='ПОВТОРИТЬ ЗАПРОС';
      }
    };
    const refresh=$a('deepRefreshParse');
    if(refresh) refresh.onclick=()=>{ if(typeof run==='function') run(m.match_id); };
  }
  function renderAdvanced(m, all) {
    updateParseState(m,all);
    $a('advLanes').innerHTML=laneAnalysis(all);
    $a('advTurning').innerHTML=turningPoint(m,all);
    $a('advItems').innerHTML=itemTiming(all);
    $a('advFights').innerHTML=teamfights(m,all);
    $a('advMatchups').innerHTML=matchupKills(all);
    $a('advWorstItem').innerHTML=worstItem(all);
    $a('advDream').innerHTML=dreamTeam(all);
    $a('downloadTikTok').onclick=()=>downloadTikTok(m,all);
    $a('downloadTikTokInline').onclick=()=>downloadTikTok(m,all);
  }
  const prevRender=render;
  render=function(m,all,players,culprit,closeRuiner){
    prevRender(m,all,players,culprit,closeRuiner);
    try{renderAdvanced(m,all)}catch(e){console.error('Advanced analysis failed',e);$a('deepParseState').innerHTML='<div class="advEmpty">Не удалось построить дополнительные разделы. Основной анализ матча доступен.</div>'}
  };
  const modal=$a('deepAnalyticsModal');
  const open=()=>{ if(!CUR)return; modal.classList.remove('hidden'); document.body.classList.add('modalOpen'); };
  const close=()=>{ modal.classList.add('hidden'); document.body.classList.remove('modalOpen'); };
  $a('deepAnalyticsBtn').addEventListener('click',open);
  modal.addEventListener('click',e=>{if(e.target.dataset.closeDeep)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))close()});
})();
