import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PDFDocument } from 'pdf-lib';

// Тестовый файл контактов: сборка не должна зависеть от локального contacts.local.json
// (его может не быть, а в нём может стоять заглушка, которую render.js отвергает).
function contactsFile(dir, phone) {
  const file = join(dir, 'contacts.json');
  writeFileSync(file, JSON.stringify({ phone }), 'utf8');
  return file;
}

function render(input, output, contacts) {
  execFileSync('node', ['build/render.js', input, output], {
    stdio: 'inherit',
    env: { ...process.env, RESUME_CONTACTS: contacts },
  });
}

function pdfText(pdfPath) {
  return execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdfPath, '-'], { encoding: 'utf8' });
}

test('render.js собирает PDF в одну страницу', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-test-'));
  const mdPath = join(dir, 'fixture.md');
  const pdfPath = join(dir, 'fixture.pdf');

  writeFileSync(
    mdPath,
    ['# Тест Тестов', '', '[a@b.com](mailto:a@b.com)', '', '## Навыки', '', '- SQL'].join('\n'),
    'utf8',
  );

  render(mdPath, pdfPath, contactsFile(dir, '+7 916 123-45-67'));

  assert.ok(existsSync(pdfPath), 'PDF должен быть создан');
  const doc = await PDFDocument.load(readFileSync(pdfPath));
  assert.equal(doc.getPageCount(), 1, 'фикстура должна уместиться в одну страницу');

  rmSync(dir, { recursive: true, force: true });
});

test('render.js не теряет PDF, если имя выхода без расширения .pdf', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-test-'));
  const mdPath = join(dir, 'fixture.md');
  const outPath = join(dir, 'out');

  writeFileSync(mdPath, ['# Тест Тестов', '', '## Навыки', '', '- SQL'].join('\n'), 'utf8');

  render(mdPath, outPath, contactsFile(dir, '+7 916 123-45-67'));

  assert.ok(existsSync(outPath), 'выходной файл должен существовать');
  const bytes = readFileSync(outPath);
  assert.equal(bytes.subarray(0, 5).toString('latin1'), '%PDF-', 'выход должен быть PDF, а не HTML');
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);

  rmSync(dir, { recursive: true, force: true });
});

test('render.js отказывается собирать PDF с заглушкой вместо телефона', () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-test-'));
  const mdPath = join(dir, 'fixture.md');
  const outPath = join(dir, 'out.pdf');

  writeFileSync(mdPath, ['# Тест Тестов', '', '[a@b.com](mailto:a@b.com)'].join('\n'), 'utf8');

  const res = spawnSync('node', ['build/render.js', mdPath, outPath], {
    encoding: 'utf8',
    env: { ...process.env, RESUME_CONTACTS: contactsFile(dir, '+7 000 000-00-00') },
  });

  assert.notEqual(res.status, 0, 'сборка с заглушкой должна завершаться ошибкой');
  assert.match(res.stderr, /заглушка/);
  assert.ok(!existsSync(outPath), 'PDF с заглушкой не должен появиться');

  rmSync(dir, { recursive: true, force: true });
});

test('README.en.md собирается в одностраничный PDF с именем и телефоном, без переключателя языка', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-test-'));
  const pdfPath = join(dir, 'en.pdf');

  render('README.en.md', pdfPath, contactsFile(dir, '+7 916 123-45-67'));

  const doc = await PDFDocument.load(readFileSync(pdfPath));
  assert.equal(doc.getPageCount(), 1, 'английское резюме должно уместиться в одну страницу');

  const text = pdfText(pdfPath);
  assert.match(text, /Aznaur Arkelov/, 'в PDF должно быть имя');
  assert.match(text, /\+7 \d{3} \d{3}-\d{2}-\d{2}/, 'в PDF должен быть телефон');
  assert.ok(!text.includes('Русская версия'), 'переключатель языка не должен попасть в печать');
  assert.ok(!text.includes('English version'), 'переключатель языка не должен попасть в печать');
  assert.match(text, /PDF version/, 'ссылка на PDF-версию должна остаться');

  rmSync(dir, { recursive: true, force: true });
});
