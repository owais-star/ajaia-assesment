import { marked } from 'marked';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_EXTENSIONS = ['.txt', '.md'];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  filename: string;
  title: string;
  contentHtml?: string;
}

/**
 * Validates file properties and converts content to sanitized HTML
 */
export function processUploadedFile(
  filename: string,
  fileSizeBytes: number,
  rawContent: string
): FileValidationResult {
  const extensionMatch = filename.toLowerCase().match(/\.[0-9a-z]+$/i);
  const ext = extensionMatch ? extensionMatch[0] : '';

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: `Unsupported file format "${ext || 'unknown'}". Supported formats: .txt, .md (Max 2MB)`,
      filename,
      title: extractTitleFromFilename(filename),
    };
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 2MB.`,
      filename,
      title: extractTitleFromFilename(filename),
    };
  }

  if (!rawContent || rawContent.trim().length === 0) {
    return {
      isValid: false,
      error: 'The uploaded file is empty.',
      filename,
      title: extractTitleFromFilename(filename),
    };
  }

  const title = extractTitleFromFilename(filename);
  let contentHtml = '';

  if (ext === '.md') {
    const parsed = marked.parse(rawContent);
    contentHtml = typeof parsed === 'string' ? parsed : '';
  } else {
    // Plain text: convert double newlines to paragraphs, single newlines to <br/>
    const paragraphs = rawContent
      .split(/\r?\n\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length > 0) {
      contentHtml = paragraphs
        .map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, '<br/>')}</p>`)
        .join('');
    } else {
      contentHtml = `<p>${escapeHtml(rawContent)}</p>`;
    }
  }

  return {
    isValid: true,
    filename,
    title,
    contentHtml,
  };
}

export function extractTitleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  // Replace hyphens and underscores with spaces, capitalize words
  const clean = withoutExt.replace(/[-_]+/g, ' ').trim();
  if (!clean) return 'Untitled Document';
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return turndown.turndown(html);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
