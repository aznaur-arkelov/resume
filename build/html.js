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
  return template.replace('__CSS__', () => css).replace('__CONTENT__', () => content);
}
