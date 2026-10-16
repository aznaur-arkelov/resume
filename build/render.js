import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectPhone, assertRealPhone, buildHtml } from './html.js';
import { htmlToPdf } from './chrome.js';

const here = dirname(fileURLToPath(import.meta.url));

// RESUME_CONTACTS подменяет путь к файлу контактов (для тестов); по умолчанию — contacts.local.json
function loadPhone() {
  const file = process.env.RESUME_CONTACTS || join(here, 'contacts.local.json');
  if (!existsSync(file)) return null;
  const phone = JSON.parse(readFileSync(file, 'utf8')).phone ?? null;
  // Репозиторий публичный: PDF с заглушкой вместо номера собирать нельзя.
  if (phone) assertRealPhone(phone);
  return phone;
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
