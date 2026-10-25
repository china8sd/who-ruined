(() => {
  const ad = document.querySelector('.ad');
  const cards = [...document.querySelectorAll('.item-card')];
  let active = null;
  cards.forEach(card => { card.tabIndex = 0; });
  const select = next => {
    if (next === active) return;
    active?.classList.remove('is-expanded');
    active = next;
    active?.classList.add('is-expanded');
  };
  const contains = (card, event) => {
    const box = card.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
  };
  // Keep cards transparent to pointer events: dragging through them still
  // reaches the 3D stage. Inspect their visible bounds only for enlargement.
  const update = event => {
    if (event.pointerType === 'touch' || event.buttons) { select(null); return; }
    if (active && contains(active, event)) return;
    select(cards.find(card => contains(card, event)) || null);
  };
  ad.addEventListener('pointermove', update);
  ad.addEventListener('pointerup', update);
  ad.addEventListener('pointerdown', () => select(null));
  ad.addEventListener('pointerleave', () => select(null));
  ad.addEventListener('pointercancel', () => select(null));
  window.addEventListener('blur', () => select(null));
  document.addEventListener('visibilitychange', () => { if (document.hidden) select(null); });
})();
