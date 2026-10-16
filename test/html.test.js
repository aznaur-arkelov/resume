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

test('buildHtml сохраняет знак $ в тексте как есть', () => {
  const html = buildHtml({
    markdown: 'Зарплата $& и $\' в тексте',
    css: 'a { color: $1; }',
    template: '<style>__CSS__</style><main>__CONTENT__</main>',
  });
  assert.ok(html.includes('Зарплата $'), 'текст с $ должен сохраниться');
  assert.ok(!html.includes('__CONTENT__'), 'шаблон-токен не должен протечь из-за $& в тексте');
  assert.ok(html.includes('a { color: $1; }'), 'CSS с $ должен попасть в вывод без изменений');
});
