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
