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

const tmpHtml = `${resolve(output)}.tmp.html`;
writeFileSync(tmpHtml, html, 'utf8');
try {
  await htmlToPdf(tmpHtml, resolve(output));
} finally {
  rmSync(tmpHtml, { force: true });
}

console.log(`Собрано: ${output}`);
