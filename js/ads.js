/* Who Ruined v6.6 — рекламные баннеры Skin Space × Collectors Cache.
   ПК (≥1180px): интерактивный Лион 360×490 в iframe справа от шапки.
   Остальные экраны: статичный мобильный баннер 360×105 (WebP) под кнопками.
   Файлы лежат в /ads/ (вариант «папка на том же сайте» из инструкции партнёра):
   iframe без allow-same-origin, поэтому для папки /ads/ нужен заголовок
   Access-Control-Allow-Origin: * (см. файл _headers, serve.py и README). */
(function(){
'use strict';
const BASE='ads/';
/* ссылка с UTM-меткой для обоих баннеров (на ПК она прописана в ads/lion-banner-cards/index.html, на кнопке «Открыть маркет») */
const MARKET_URL='https://collectorscache.ru/?utm_source=who_ruined&utm_medium=banner&utm_campaign=who_ruined&utm_content=skinspace_collectors';
const mq=window.matchMedia('(min-width:1180px)');
const NOTE='Реклама';
function label(){const s=document.createElement('span');s.className='adLabel adNote';s.textContent=NOTE;return s}
function mountLion(el){
 if(!el||el.dataset.ready)return;el.dataset.ready='1';
 const f=document.createElement('iframe');
 f.src=BASE+'lion-banner-cards/index.html?v=6.8';
 f.width='360';f.height='490';f.title='Skin Space и Collectors Cache — собери свой сет';
 f.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox');
 f.setAttribute('referrerpolicy','no-referrer');
 f.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'");
 f.loading='lazy';
 el.append(f,label());
}
function mountMobile(el){
 if(!el||el.dataset.ready)return;el.dataset.ready='1';
 const a=document.createElement('a');
 a.href=MARKET_URL;a.target='_blank';a.rel='noopener noreferrer';
 const i=document.createElement('img');
 i.src=BASE+'skin-space-mobile/banner-360x105.webp';i.width=360;i.height=105;i.loading='lazy';i.decoding='async';
 i.alt='Skin Space и Collectors Cache. Купи скины по выгодным ценам';
 a.append(i);el.append(a,label());
}
function mount(){
 if(mq.matches)mountLion(document.getElementById('adLion'));
 else mountMobile(document.getElementById('adMobile'));
}
if(mq.addEventListener)mq.addEventListener('change',mount);else if(mq.addListener)mq.addListener(mount);
mount();
})();
