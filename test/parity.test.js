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
