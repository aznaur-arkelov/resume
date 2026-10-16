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

/**
 * Номер из одних нулей после кода страны (+7 000 000-00-00) — заглушка из шаблона, а не настоящий телефон.
 */
export function assertRealPhone(phone) {
  const national = phone.replace(/^\s*(\+7|8)/, '');
  if (!/[1-9]/.test(national)) {
    throw new Error(
      `В contacts.local.json стоит заглушка вместо телефона (${phone}). Впишите настоящий номер и повторите сборку.`,
    );
  }
}

export function buildHtml({ markdown, css, template }) {
  const content = marked.parse(markdown);
  return template.replace('__CSS__', () => css).replace('__CONTENT__', () => content);
}
