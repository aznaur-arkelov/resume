# Сборка PDF

`npm run build:pdf` собирает PDF из markdown: `html.js` (markdown в HTML), `chrome.js` (Chrome headless печатает PDF), `render.js` (командная строка). `npm test` проверяет сборку и сверяет `Arkelov_en.pdf` с `README.en.md`.

## Что собирается, а что нет

- `Arkelov_en.pdf` собирается из `README.en.md`. Поправили английский текст — запустите `npm run build:pdf` и закоммитьте PDF. Иначе тест на устаревший PDF упадёт.
- `Arkelov.pdf` (русский) сверстан вручную и **намеренно не генерируется**. Поэтому `build:pdf` рендерит русскую версию не в него, а во временный `Arkelov.tmp.pdf` (он в `.gitignore`). Этот файл нужен только для сравнения с ручным PDF; генератор не должен перезаписать `Arkelov.pdf`, и не перезапишет.

## Телефон

Телефон есть только в PDF, в публичных README его нет. Номер берётся из `build/contacts.local.json` (в `.gitignore`). На свежем клоне файла нет: скопируйте `build/contacts.example.json` в `build/contacts.local.json` и впишите настоящий номер. Без файла, с пустым номером или с заглушкой `+7 000 000-00-00` сборка падает с ошибкой и PDF не создаёт.
