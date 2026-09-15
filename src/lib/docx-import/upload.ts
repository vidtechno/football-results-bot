export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const BROWSER_DOCX_MIME_TYPES = new Set([
  '',
  DOCX_MIME,
  'application/octet-stream',
  'application/zip',
]);

export function isPlausibleDocxUpload(file: { name: string; type?: string | null }) {
  return (
    file.name.trim().toLocaleLowerCase('uz-UZ').endsWith('.docx') &&
    BROWSER_DOCX_MIME_TYPES.has((file.type || '').trim().toLowerCase())
  );
}
