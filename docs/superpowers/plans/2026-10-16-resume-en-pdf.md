# English Resume and PDF Build Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить английскую версию резюме и собирать PDF из разметки, не меняя существующий `Arkelov.pdf` без отдельного одобрения.

**Architecture:** Markdown преобразуется в HTML чистой функцией, оборачивается в шаблон с печатным CSS и печатается в PDF через Chrome в headless-режиме. Телефон хранится вне git и подставляется в разметку перед преобразованием, поэтому публичные README остаются без номера. Логика разделена на чистую часть (`html.js`, тестируется без запуска браузера) и побочную (`chrome.js`).

**Tech Stack:** Node 24 (ESM), `marked` для markdown→HTML, Chrome headless для печати, `pdf-lib` в dev-зависимостях для подсчёта страниц в тестах, встроенный `node:test` как раннер.

## Global Constraints

- Каждый собранный PDF укладывается **ровно в одну страницу**; размеры подбираются по английской версии как по худшему случаю (английский текст на 5-10% длиннее русского).
- Телефон присутствует только в PDF и **никогда** в `README.md` и `README.en.md`.
- `build/contacts.local.json` не попадает в индекс git.
- Существующий `Arkelov.pdf` не изменяется ни одной задачей этого плана; русский PDF собирается во временный файл `Arkelov.tmp.pdf`.
- Структура `README.en.md` построчно соответствует по смыслу `README.md`: тот же порядок и состав разделов.
- Словарь терминов перевода применяется дословно: судоходный дивизион → shipping division; витрины → data marts; self-service аналитика → self-service analytics; дерево метрик → KPI framework; фрахтовые ставки → freight rates; Русал → RUSAL.
- Пути к файлам содержат кириллицу (`C:\Users\Азнаур\...`). Все пути, передаваемые в Chrome, преобразуются через `pathToFileURL()` из `node:url` — передача сырой строки ломается.
- Коммиты не содержат строку `Co-Authored-By`.

---

## File Structure

| Файл | Ответственность |
|---|---|
| `package.json` | ESM-режим, зависимости, команды `build:pdf` и `test` |
| `.gitignore` | скрывает `node_modules/`, контакты и временные файлы |
| `build/html.js` | чистые функции: подстановка телефона, сборка HTML из разметки, шаблона и CSS |
| `build/chrome.js` | поиск исполняемого Chrome и печать HTML в PDF |
| `build/render.js` | CLI-склейка: читает файлы, зовёт первые два модуля, пишет результат |
| `build/template.html` | каркас страницы с токенами `__CSS__` и `__CONTENT__` |
| `build/resume.css` | печатные стили, размер страницы и поля |
| `build/contacts.local.json` | телефон; создаётся вручную, вне git |
| `test/html.test.js` | тесты чистых функций |
| `test/pdf.test.js` | сквозной тест конвейера на фикстуре |
| `test/parity.test.js` | проверка структурного соответствия двух README |
| `README.en.md` | английская версия резюме |

---

### Task 1: Каркас проекта и сборка HTML

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `build/html.js`
- Create: `build/template.html`
- Create: `build/resume.css`
- Test: `test/html.test.js`

**Interfaces:**
- Consumes: ничего, это первая задача.
- Produces: `injectPhone(markdown: string, phone: string|null) => string` и `buildHtml({markdown: string, css: string, template: string}) => string` из `build/html.js`.

- [ ] **Step 1: Создать `package.json`**

```json
{
  "name": "resume",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build:pdf": "node build/render.js README.en.md Arkelov_en.pdf && node build/render.js README.md Arkelov.tmp.pdf",
    "test": "node --test test/"
  },
  "dependencies": {
    "marked": "^12.0.0"
  },
  "devDependencies": {
    "pdf-lib": "^1.17.1"
  }
}
```

- [ ] **Step 2: Создать `.gitignore`**

```gitignore
node_modules/
build/contacts.local.json
*.tmp.pdf
*.tmp.html
.superpowers/
```

- [ ] **Step 3: Установить зависимости**

Run: `npm install`
Expected: создаётся `node_modules/` и `package-lock.json`, ошибок нет.

- [ ] **Step 4: Написать падающий тест**

Создать `test/html.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectPhone, buildHtml } from '../build/html.js';

const MD = [
  '# Азнаур Аркелов',
  '',
  '**Data Analyst** · Москва, Россия',
  '',
  '[aznayr.arkelov@mail.ru](mailto:aznayr.arkelov@mail.ru) · Telegram: [@joi1111](https://t.me/joi1111)',
  '',
  '## Навыки',
  '',
  '- SQL',
].join('\n');

test('injectPhone добавляет телефон в строку контактов', () => {
  const out = injectPhone(MD, '+7 000 000-00-00');
  const line = out.split('\n').find((l) => l.includes('mailto:'));
  assert.ok(line.includes('+7 000 000-00-00'), 'телефон должен быть в строке с mailto');
});

test('injectPhone без телефона возвращает разметку без изменений', () => {
  assert.equal(injectPhone(MD, null), MD);
});

test('injectPhone не трогает остальные строки', () => {
  const out = injectPhone(MD, '+7 000 000-00-00');
  assert.ok(out.includes('# Азнаур Аркелов'));
  assert.ok(out.includes('## Навыки'));
  assert.equal(out.split('\n').length, MD.split('\n').length);
});

test('buildHtml подставляет содержимое и стили в шаблон', () => {
  const html = buildHtml({
    markdown: MD,
    css: 'body { color: red; }',
    template: '<html><style>__CSS__</style><body>__CONTENT__</body></html>',
  });
  assert.ok(html.includes('body { color: red; }'), 'CSS должен попасть в вывод');
  assert.ok(html.includes('<h1>Азнаур Аркелов</h1>'), 'заголовок должен стать h1');
  assert.ok(html.includes('<h2>Навыки</h2>'), 'раздел должен стать h2');
  assert.ok(!html.includes('__CSS__') && !html.includes('__CONTENT__'), 'токены должны быть заменены');
});
```

- [ ] **Step 5: Запустить тест и убедиться, что он падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../build/html.js'`.

- [ ] **Step 6: Написать `build/html.js`**

```javascript
import { marked } from 'marked';

/**
 * Дописывает телефон в строку контактов (ту, где есть mailto:).
 * Публичные README остаются без номера — подстановка делается только при сборке PDF.
 */
export function injectPhone(markdown, phone) {
  if (!phone) return markdown;
  return markdown
    .split('\n')
    .map((line) => (line.includes('mailto:') ? `${line} · ${phone}` : line))
    .join('\n');
}

export function buildHtml({ markdown, css, template }) {
  const content = marked.parse(markdown);
  return template.replace('__CSS__', css).replace('__CONTENT__', content);
}
```

- [ ] **Step 7: Создать `build/template.html`**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>__CSS__</style>
</head>
<body>
<main class="resume">__CONTENT__</main>
</body>
</html>
```

- [ ] **Step 8: Создать `build/resume.css`**

Стартовые значения; подгонка под одну страницу делается в задаче 4.

```css
@page {
  size: A4;
  margin: 12mm 14mm;
}

body {
  margin: 0;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 9.2pt;
  line-height: 1.34;
  color: #1a1a1a;
}

.resume h1 {
  font-size: 17pt;
  margin: 0 0 2pt;
}

.resume h2 {
  font-size: 10.5pt;
  text-transform: uppercase;
  letter-spacing: 0.4pt;
  border-bottom: 0.6pt solid #c8c8c8;
  margin: 9pt 0 4pt;
  padding-bottom: 1.5pt;
}

.resume h3 {
  font-size: 10pt;
  margin: 7pt 0 1pt;
}

.resume p {
  margin: 0 0 4pt;
}

.resume ul {
  margin: 0 0 5pt;
  padding-left: 12pt;
}

.resume li {
  margin-bottom: 1.6pt;
}

.resume a {
  color: #1a1a1a;
  text-decoration: none;
}

.resume hr {
  border: none;
  border-top: 0.6pt solid #d8d8d8;
  margin: 7pt 0;
}

.resume code {
  font-family: inherit;
  background: #f0f0f0;
  padding: 0 2.5pt;
  border-radius: 2pt;
  font-size: 8.6pt;
}
```

- [ ] **Step 9: Запустить тесты и убедиться, что они проходят**

Run: `npm test`
Expected: PASS, четыре теста.

- [ ] **Step 10: Коммит**

```bash
git add package.json package-lock.json .gitignore build/html.js build/template.html build/resume.css test/html.test.js
git commit -m "Add HTML builder for resume PDF pipeline"
```

---

### Task 2: Печать PDF через Chrome

**Files:**
- Create: `build/chrome.js`
- Create: `build/render.js`
- Test: `test/pdf.test.js`

**Interfaces:**
- Consumes: `injectPhone`, `buildHtml` из `build/html.js` (задача 1).
- Produces: `findChrome() => string` и `htmlToPdf(htmlPath: string, pdfPath: string) => Promise<void>` из `build/chrome.js`; CLI `node build/render.js <input.md> <output.pdf>`.

- [ ] **Step 1: Написать падающий тест**

Создать `test/pdf.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PDFDocument } from 'pdf-lib';

test('render.js собирает PDF в одну страницу', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-test-'));
  const mdPath = join(dir, 'fixture.md');
  const pdfPath = join(dir, 'fixture.pdf');

  writeFileSync(
    mdPath,
    ['# Тест Тестов', '', '[a@b.com](mailto:a@b.com)', '', '## Навыки', '', '- SQL'].join('\n'),
    'utf8',
  );

  execFileSync('node', ['build/render.js', mdPath, pdfPath], { stdio: 'inherit' });

  assert.ok(existsSync(pdfPath), 'PDF должен быть создан');
  const doc = await PDFDocument.load(readFileSync(pdfPath));
  assert.equal(doc.getPageCount(), 1, 'фикстура должна уместиться в одну страницу');

  rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test test/pdf.test.js`
Expected: FAIL — `Cannot find module 'build/render.js'`.

- [ ] **Step 3: Написать `build/chrome.js`**

```javascript
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

export function findChrome() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(`Не найден Chrome или Edge. Проверенные пути:\n${CANDIDATES.join('\n')}`);
  }
  return found;
}

/**
 * Печатает HTML-файл в PDF.
 * Путь оборачивается в pathToFileURL: в путях есть кириллица, сырая строка ломается.
 */
export async function htmlToPdf(htmlPath, pdfPath) {
  const browser = findChrome();
  execFileSync(
    browser,
    [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'pipe' },
  );
}
```

- [ ] **Step 4: Написать `build/render.js`**

```javascript
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectPhone, buildHtml } from './html.js';
import { htmlToPdf } from './chrome.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadPhone() {
  const file = join(here, 'contacts.local.json');
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')).phone ?? null;
}

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Использование: node build/render.js <input.md> <output.pdf>');
  process.exit(1);
}

const markdown = injectPhone(readFileSync(resolve(input), 'utf8'), loadPhone());
const html = buildHtml({
  markdown,
  css: readFileSync(join(here, 'resume.css'), 'utf8'),
  template: readFileSync(join(here, 'template.html'), 'utf8'),
});

const tmpHtml = resolve(output).replace(/\.pdf$/i, '.tmp.html');
writeFileSync(tmpHtml, html, 'utf8');
await htmlToPdf(tmpHtml, resolve(output));
rmSync(tmpHtml, { force: true });

console.log(`Собрано: ${output}`);
```

- [ ] **Step 5: Запустить тест и убедиться, что он проходит**

Run: `node --test test/pdf.test.js`
Expected: PASS.

- [ ] **Step 6: Проверить, что телефон попадает в PDF только при наличии файла контактов**

Создать `build/contacts.local.json` вручную:

```json
{ "phone": "+7 000 000-00-00" }
```

Run: `node build/render.js README.md Arkelov.tmp.pdf`
Expected: файл собран; `git status --porcelain` не показывает `build/contacts.local.json` и `Arkelov.tmp.pdf`.

- [ ] **Step 7: Коммит**

```bash
git add build/chrome.js build/render.js test/pdf.test.js
git commit -m "Add Chrome headless PDF rendering"
```

---

### Task 3: Английская версия и переключатели языков

**Files:**
- Create: `README.en.md`
- Modify: `README.md` (строка-переключатель вверху, разбивка сводного абзаца)
- Test: `test/parity.test.js`

**Interfaces:**
- Consumes: ничего из кода; задача содержательная.
- Produces: `README.en.md` с тем же набором и порядком разделов второго уровня, что и `README.md`.

- [ ] **Step 1: Написать падающий тест структурного соответствия**

Создать `test/parity.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const headings = (file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => l.replace('## ', '').trim());

test('у обеих версий одинаковое число разделов', () => {
  assert.equal(headings('README.md').length, headings('README.en.md').length);
});

test('в обеих версиях есть переключатель языка', () => {
  assert.ok(readFileSync('README.md', 'utf8').includes('README.en.md'), 'в русской нужна ссылка на английскую');
  assert.ok(readFileSync('README.en.md', 'utf8').includes('README.md'), 'в английской нужна ссылка на русскую');
});

test('телефона нет ни в одной публичной версии', () => {
  for (const file of ['README.md', 'README.en.md']) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!/\+7[\s(]/.test(text), `в ${file} не должно быть телефона`);
  }
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `node --test test/parity.test.js`
Expected: FAIL — `ENOENT: no such file or directory, open 'README.en.md'`.

- [ ] **Step 3: Добавить переключатель и разбить сводный абзац в `README.md`**

Вставить сразу после строки с контактами (после строки, содержащей `mailto:`):

```markdown
[English version](README.en.md)
```

Заменить сводный абзац (начинается с «Дата-аналитик, 3+ года опыта») на три отдельных абзаца, разделённых пустыми строками: первый — про опыт и направление, второй — про дашборды и пользователей, третий — про self-service и LLM. Текст не переписывать, только расставить разрывы.

- [ ] **Step 4: Создать `README.en.md`**

Перевести `README.md` целиком, сохранив порядок разделов: заголовок с именем, строка роли и города, строка контактов (без телефона), переключатель `[Русская версия](README.md)`, строка с тегами стека, сводные абзацы, `## Skills`, `## Experience`, `## Education`, `## Languages`, ссылка на PDF.

Применить словарь из раздела Global Constraints дословно. Не переводить названия инструментов (ClickHouse, Apache Superset, DataLens, Tableau, DBeaver, pandas, Jupyter). Цифры достижений сохранить без изменений: 20+ dashboards, 15+ maintained, 50+ users, 30 active users, 23 on adjacent projects, 70% reduction.

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `npm test`
Expected: PASS, все тесты включая parity.

- [ ] **Step 6: Отдать перевод на вычитку владельцу**

**Это гейт.** Отправить `README.en.md` владельцу резюме и дождаться подтверждения или правок. Тесты проверяют структуру и отсутствие телефона, но не качество формулировок — а неточная формулировка в резюме стоит собеседования.

Особое внимание к шести терминам из словаря: они выбраны заранее, но владелец вправе их изменить. При правках внести их и повторно прогнать `npm test`.

- [ ] **Step 7: Коммит после одобрения**

```bash
git add README.md README.en.md test/parity.test.js
git commit -m "Add English resume version with language switcher"
```

---

### Task 4: Английский PDF в одну страницу

**Files:**
- Modify: `build/resume.css` (подгонка размеров)
- Create: `Arkelov_en.pdf`

**Interfaces:**
- Consumes: конвейер из задачи 2, содержимое из задачи 3.
- Produces: `Arkelov_en.pdf` — одна страница, телефон в строке контактов.

- [ ] **Step 1: Написать падающий тест на реальный английский PDF**

Дописать в `test/pdf.test.js`:

```javascript
test('английский PDF собран, одна страница, телефон на месте', async (t) => {
  if (!existsSync('Arkelov_en.pdf')) {
    t.skip('Arkelov_en.pdf ещё не собран');
    return;
  }
  const doc = await PDFDocument.load(readFileSync('Arkelov_en.pdf'));
  assert.equal(doc.getPageCount(), 1, 'английское резюме должно уместиться в одну страницу');
});
```

- [ ] **Step 2: Собрать английский PDF**

Run: `node build/render.js README.en.md Arkelov_en.pdf`
Expected: файл создан.

- [ ] **Step 3: Проверить число страниц**

Run: `node --test test/pdf.test.js`
Expected: при превышении одной страницы тест падает с `Expected values to be strictly equal: 2 !== 1`.

- [ ] **Step 4: Подогнать CSS, если страниц больше одной**

Уменьшать в таком порядке, по одному шагу за раз, пересобирая после каждого: `body` font-size с 9.2pt шагом 0.2pt до минимума 8.4pt; затем `line-height` с 1.34 шагом 0.02 до минимума 1.26; затем отступы `h2` с 9pt до 7pt. Ниже 8.4pt не опускаться — текст станет нечитаемым в печати.

После каждого изменения: `node build/render.js README.en.md Arkelov_en.pdf && node --test test/pdf.test.js`

- [ ] **Step 5: Проверить телефон глазами**

Открыть `Arkelov_en.pdf` и убедиться, что телефон присутствует в строке контактов, а вёрстка не разъехалась.

- [ ] **Step 6: Коммит**

```bash
git add build/resume.css Arkelov_en.pdf test/pdf.test.js
git commit -m "Build single-page English resume PDF"
```

---

### Task 5: Русский PDF на сравнение, без замены

**Files:**
- Create: `Arkelov.tmp.pdf` (не коммитится, в `.gitignore`)

**Interfaces:**
- Consumes: конвейер из задачи 2.
- Produces: временный файл для визуального сравнения. Существующий `Arkelov.pdf` остаётся нетронутым.

- [ ] **Step 1: Собрать русский PDF во временный файл**

Run: `node build/render.js README.md Arkelov.tmp.pdf`
Expected: файл создан.

- [ ] **Step 2: Убедиться, что оригинал не затронут**

Run: `git status --porcelain Arkelov.pdf`
Expected: пустой вывод — файл не изменён.

- [ ] **Step 3: Проверить, что временный файл не попал в индекс**

Run: `git status --porcelain`
Expected: `Arkelov.tmp.pdf` отсутствует в выводе, он скрыт `.gitignore`.

- [ ] **Step 4: Показать оба файла владельцу для сравнения**

Отправить `Arkelov.pdf` и `Arkelov.tmp.pdf` и дождаться решения.

**Это гейт.** Замена существующего PDF выполняется только при явном одобрении. Отказ от замены — допустимый исход: английский остаётся единственным собранным конвейером, русский сохраняется как есть. В этом случае задача закрывается без изменений в репозитории.

- [ ] **Step 5: При одобрении — заменить и закоммитить**

```bash
node build/render.js README.md Arkelov.pdf
git add Arkelov.pdf
git commit -m "Regenerate Russian resume PDF from markdown"
```

---

## Проверка плана относительно спецификации

| Требование спецификации | Задача |
|---|---|
| `README.en.md` | 3 |
| переключатель языков | 3 |
| скрипт сборки PDF | 1, 2 |
| английский PDF | 4 |
| разбивка сводного абзаца | 3 |
| телефон вне README, в PDF | 1 (подстановка), 2 (проверка), 3 (тест отсутствия) |
| `contacts.local.json` вне git | 1 (`.gitignore`), 2 (проверка) |
| одна страница | 4 |
| словарь терминов | Global Constraints, применяется в 3 |
| `npm run build:pdf` без ручных действий | 1 |
| `Arkelov.pdf` не меняется без одобрения | 5 (гейт) |
