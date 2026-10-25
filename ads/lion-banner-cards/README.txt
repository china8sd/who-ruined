ЛИОН С КАРТОЧКАМИ — БАННЕР ДЛЯ ПАРТНЁРА
Skin Space & Collectors Cache · 360 × 490 px · версия 23.10.2026

БЫСТРОЕ НАЧАЛО
1. Распакуйте skinspace-collectors-banners.zip.
2. Загрузите папку lion-banner-cards целиком на статический HTTPS-хостинг.
3. Вставьте iframe по одному из двух вариантов ниже.
4. Проверьте танец, вращение мышью, увеличение карточек и кнопку маркета.

Нужен только обычный веб-сервер для статических файлов. PHP, Node.js, база
данных, доступ к админке, ключи и установка пакетов для показа не нужны.
Не вставляйте JavaScript баннера прямо в код основного сайта: используйте iframe.
Адрес /admin/ads/ на collectorscache.ru предназначен для согласования и требует
входа администратора. Он НЕ подходит для публичной рекламы.

ВАРИАНТ 1. РЕКЛАМА НА ОТДЕЛЬНОМ ДОМЕНЕ / ПОДДОМЕНЕ
Подходит, если баннер и страница партнёра имеют РАЗНЫЕ origin (схема + домен + порт).
Например: сайт www.partner.example, реклама ads.partner.example.
Замените https://ads.example.net на реальный адрес размещённой папки.
Выберите хост для статической рекламы без пользовательских сессий и API.

<iframe
  src="https://ads.example.net/lion-banner-cards/index.html"
  width="360" height="490"
  title="Skin Space и Collectors Cache — собери свой сет"
  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  referrerpolicy="no-referrer"
  allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'"
  loading="lazy"
  style="display:block;border:0;width:360px;height:490px"
></iframe>

Здесь allow-same-origin нужен для загрузки моделей с собственного хоста рекламы.
Не используйте эту комбинацию allow-scripts + allow-same-origin, если адрес
баннера имеет тот же origin, что и основная страница. Для этого — вариант 2.
Поддомен должен быть действительно отдельным origin; не объединяйте их через
document.domain. Родительская страница не должна специально открывать рекламе
доступ к своим данным через сообщения или другие интерфейсы.

ВАРИАНТ 2. РЕКЛАМА В ПАПКЕ НА ТОМ ЖЕ САЙТЕ
Изоляция без allow-same-origin. Для моделей, текстур и шрифта настройте CORS
только на публичную папку рекламы: Access-Control-Allow-Origin: *.
Не включайте Access-Control-Allow-Credentials. Не распространяйте эти правила
на API, личный кабинет или другие приватные ресурсы.

<iframe
  src="/ads/lion-banner-cards/index.html"
  width="360" height="490"
  title="Skin Space и Collectors Cache — собери свой сет"
  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
  referrerpolicy="no-referrer"
  allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'"
  loading="lazy"
  style="display:block;border:0;width:360px;height:490px"
></iframe>

Пример nginx, когда папка находится в действующем document root:

location ^~ /ads/lion-banner-cards/ {
    add_header Access-Control-Allow-Origin "*" always;
    add_header Cross-Origin-Resource-Policy "cross-origin" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    try_files $uri =404;
}

Этот пример адаптируется к конфигурации хостинга. Не копируйте его поверх
существующих правил всего сайта. add_header на уровне location может изменить
наследование других заголовков nginx: сохраните необходимые правила хостинга.
В lion-iframe-example.html находится рабочий пример варианта 2 с относительным src.

НАСТРОЙКИ ХОСТИНГА
— Открывайте по HTTP/HTTPS, не двойным щелчком через file://: модели используют fetch.
— Сохраняйте имена файлов и структуру папок, включая assets, brand и items.
— .js: text/javascript или application/javascript; .css: text/css;
  .json: application/json; .webp: image/webp; .woff2: font/woff2.
— .glb/.glb.gz можно отдавать как application/octet-stream. Загрузчик сам
  распаковывает .glb.gz. Не добавляйте gzip повторно без проверки настроек.
— Для варианта 1 не отдавайте X-Frame-Options: SAMEORIGIN/DENY или
  frame-ancestors 'self': они заблокируют вставку на сайт партнёра.
  При необходимости ограничьте frame-ancestors реальным доменом партнёра.
— Если на странице партнёра есть CSP, разрешите реальный хост рекламы в frame-src.
— Не добавляйте рекламные скрипты, счётчики или внешние CDN в папку баннера.

ЧТО ВНУТРИ И КАК ИЗМЕНИТЬ
index.html: надпись, цены карточек, ссылка кнопки.
Ссылка кнопки: https://collectorscache.ru/; открывается по нажатию в новой вкладке.
Карточки не ведут на другие сайты; цены зафиксированы на 23.10.2026.
style.css / cards.css: оформление.
banner.js / bootstrap.js / cards.js: готовый код для браузера.
assets/: модели, текстуры, анимация, постер; brand/: логотипы и шрифт.
source/: читаемые исходники и зафиксированные зависимости для проверки.
Исходники и документы не нужны браузеру, но приложены для прозрачности.

Пересборка разработчиком, только если изменяли source:
  cd source
  npm ci --ignore-scripts
  npm run build
После изменений заново проверьте работу и контрольные суммы. Сборщик требует Node.js.
При обычной установке эти команды НЕ выполняются.

ПОВЕДЕНИЕ
Героя можно вращать мышью, танец продолжается. Справа внизу — пауза.
Наведение увеличивает карточки предметов. Звука нет.
Вне экрана и в скрытой вкладке рендер приостанавливается; ограничение — 30 кадров/с.
При prefers-reduced-motion анимация начинает с паузы.
Если WebGL/JavaScript недоступен, остаётся постер и ссылка на маркет.
Это версия для ПК 360 × 490 px; мобильный баннер находится в соседней папке skin-space-mobile.

ЕСЛИ ВИДЕН ТОЛЬКО ПОСТЕР
Проверьте Network/Console: доступны ли assets/manifest.json, .glb.gz и текстуры;
нет ли ошибок CORS, CSP, неверного MIME или 404. Не снимайте sandbox целиком
для решения ошибки: используйте соответствующий вариант размещения выше.

КОНТРОЛЬ ЦЕЛОСТНОСТИ
В архиве — SHA256SUMS.txt для всех файлов комплекта, кроме самого списка.
Рядом с архивом — SHA256-архива.txt. Хеш сверяйте с исходной копией отправителя,
а не только с файлом, полученным от неизвестного посредника.
В Windows: Get-FileHash .\skinspace-collectors-banners.zip -Algorithm SHA256
В Linux/macOS: shasum -a 256 skinspace-collectors-banners.zip

Ограничения iframe и CSP сверены с документацией:
https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox
https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
