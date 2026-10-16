import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

export function findChrome() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(`Не найден Chrome или Edge. Проверенные пути:\n${CANDIDATES.join('\n')}`);
  }
  return found;
}

/**
 * Печатает HTML-файл в PDF.
 * Путь оборачивается в pathToFileURL: в путях есть кириллица, сырая строка ломается.
 */
export async function htmlToPdf(htmlPath, pdfPath) {
  const browser = findChrome();
  execFileSync(
    browser,
    [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'pipe' },
  );
}
