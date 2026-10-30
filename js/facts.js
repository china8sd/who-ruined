/* Who Ruined v6.11 — match ability/item usage */
(() => {
  const CDN_FACTS = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images';
  let abilityConstants = null;

  const factName = (key, data, kind) => {
    if (kind === 'item') return data?.dname || data?.name || key.replace(/_/g,' ');
    return data?.dname || data?.localized_name || data?.name || key.replace(/_/g,' ');
  };
  const factIcon = (key, data, kind) => {
    if (data?.img) return data.img.startsWith('http') ? data.img : `https://cdn.cloudflare.steamstatic.com${data.img}`;
    return kind === 'item'
      ? `${CDN_FACTS}/items/${key}_lg.png`
      : `${CDN_FACTS}/abilities/${key}_hp1.png`;
  };
  const usageRows = (obj, constants, kind) => Object.entries(obj || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([key, count]) => {
      const data = constants?.[key] || {};
      return {key, count:Number(count), name:factName(key,data,kind), icon:factIcon(key,data,kind)};
    })
    .sort((a,b) => b.count-a.count || a.name.localeCompare(b.name,'ru'));

  function usageHtml(rows, empty) {
    if (!rows.length) return `<p class="factsEmpty">${empty}</p>`;
    return `<div class="factsItems">${rows.map(x => `<div class="factItem">
      <img src="${esc(x.icon)}" alt="" loading="lazy" onerror="this.style.display='none'">
      <span title="${esc(x.name)}">${esc(x.name)}</span><b>${fmt(x.count)}×</b>
    </div>`).join('')}</div>`;
  }

  async function renderFacts() {
    if (!CUR?.m || !Array.isArray(CUR.all)) return;
    const box = $('factsBox');
    box.innerHTML = '<p class="factsLoading">Загружаем способности и предметы…</p>';
    try {
      if (!abilityConstants) abilityConstants = await cachedJson('abilities');
      const all = CUR.all;
      const cards = all.map(p => {
        const hero = heroData(p);
        const abilities = usageRows(p.ability_uses, abilityConstants, 'ability');
        const items = usageRows(p.item_uses, ITEMS, 'item');
        return `<article class="factsPlayer">
          <div class="factsPlayerHead">
            <img class="factsHero" src="${esc(heroImg(p))}" alt="" loading="lazy">
            <div><b>${esc(p.personaname || heroName(p))}</b><span>${esc(heroName(p))} · ${p.team === 'Radiant' ? 'Radiant' : 'Dire'}</span></div>
            <small>${abilities.reduce((s,x)=>s+x.count,0)+items.reduce((s,x)=>s+x.count,0)} действий</small>
          </div>
          <div class="factsColumns">
            <section><h3>Способности <span>${abilities.length}</span></h3>${usageHtml(abilities,'Нет данных об использовании способностей')}</section>
            <section><h3>Предметы <span>${items.length}</span></h3>${usageHtml(items,'Нет данных об использовании предметов')}</section>
          </div>
        </article>`;
      }).join('');
      box.innerHTML = `<div class="factsSummary"><span>Игроков <b>${all.length}</b></span><span>Матч <b>${fmt(CUR.m.match_id)}</b></span><span>Длительность <b>${time(CUR.m.duration)}</b></span></div>${cards}
      <p class="factsFoot">Показываются только действия, которые OpenDota сохранила в ability_uses и item_uses. Если матч не распарсен или событие не попало в запись, статистика может быть неполной. Количество — число использований, а не покупок.</p>`;
    } catch (e) {
      box.innerHTML = '<p class="factsEmpty">Не удалось загрузить справочник способностей. Попробуй закрыть и открыть окно ещё раз.</p>';
    }
  }

  $('factsBtn').addEventListener('click', async () => {
    if (!CUR) return;
    if (typeof track === 'function') track('click/facts');
    $('factsModal').classList.remove('hidden');
    await renderFacts();
  });
  $('factsModal').addEventListener('click', e => {
    if (e.target.dataset.closeFacts) $('factsModal').classList.add('hidden');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $('factsModal').classList.add('hidden');
  });
})();
