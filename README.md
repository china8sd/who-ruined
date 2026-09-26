# Who Ruined V2.9

Match ID → OpenDota → role-aware match analysis → verdict.

## Что изменено в V2.9
- Исправлено определение POS 1–5.
- OpenDota `lane_role` трактуется корректно: 1=safe, 2=mid, 3=offlane, 4=jungle/other.
- Safe lane разделяется на Pos 1/5, offlane — на Pos 3/4.
- Если OpenDota отдаёт неполные lane-данные, используется fallback по net worth/GPM/last hits/XPM, поэтому вместо `Role unclear` интерфейс показывает POS 1–5.
- В карточках игроков роль отображается как `Pos N · ...`.
- Остальной анализ V2.8 сохранён.


V3.2 visual update: the supplied Dota background is used across the site with a light blur and dark/cool overlay; Telegram button links to https://t.me/chinasd787.
