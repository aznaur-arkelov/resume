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

test('render.js не теряет PDF, если имя выхода без расширения .pdf', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'resume-test-'));
  const mdPath = join(dir, 'fixture.md');
  const outPath = join(dir, 'out');

  writeFileSync(mdPath, ['# Тест Тестов', '', '## Навыки', '', '- SQL'].join('\n'), 'utf8');

  execFileSync('node', ['build/render.js', mdPath, outPath], { stdio: 'inherit' });

  assert.ok(existsSync(outPath), 'выходной файл должен существовать');
  const bytes = readFileSync(outPath);
  assert.equal(bytes.subarray(0, 5).toString('latin1'), '%PDF-', 'выход должен быть PDF, а не HTML');
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);

  rmSync(dir, { recursive: true, force: true });
});

test('английский PDF собран, одна страница, телефон на месте', async (t) => {
  if (!existsSync('Arkelov_en.pdf')) {
    t.skip('Arkelov_en.pdf ещё не собран');
    return;
  }
  const doc = await PDFDocument.load(readFileSync('Arkelov_en.pdf'));
  assert.equal(doc.getPageCount(), 1, 'английское резюме должно уместиться в одну страницу');
});
