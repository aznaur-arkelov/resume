import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

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

// Российский номер в любой записи: +7 900 000-00-00, +79000000000, 8 900 000-00-00, 8(900) 000-00-00.
const PHONE = /(?:\+7|\b8)\D{0,2}\d{3}\D{0,2}\d{3}\D?\d{2}/;

test('регулярка телефона ловит все привычные записи и не трогает годы и проценты', () => {
  for (const phone of ['+7 900 000-00-00', '+79000000000', '8 900 000-00-00', '8(900) 000-00-00', '89000000000']) {
    assert.ok(PHONE.test(phone), `должна ловить: ${phone}`);
  }
  for (const text of ['2023', '20+', '15+', '70%', 'B2', 'С 2019 по 2023 г.']) {
    assert.ok(!PHONE.test(text), `не должна ловить: ${text}`);
  }
});

test('телефона нет ни в одной публичной версии', () => {
  for (const file of ['README.md', 'README.en.md']) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!PHONE.test(text), `в ${file} не должно быть телефона`);
  }
});

test('build/contacts.local.json в .gitignore', () => {
  // git check-ignore: код 0 — путь игнорируется, 1 — нет.
  const res = spawnSync('git', ['check-ignore', '-q', 'build/contacts.local.json']);
  assert.equal(res.status, 0, 'файл с настоящим номером не должен попасть в git');
});
