import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatExactTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function getAvatarColorClasses(color: string): {
  bg: string;
  text: string;
  border: string;
  ring: string;
} {
  switch (color?.toLowerCase()) {
    case 'indigo':
      return {
        bg: 'bg-indigo-600',
        text: 'text-white',
        border: 'border-indigo-500',
        ring: 'ring-indigo-400',
      };
    case 'emerald':
      return {
        bg: 'bg-emerald-600',
        text: 'text-white',
        border: 'border-emerald-500',
        ring: 'ring-emerald-400',
      };
    case 'amber':
      return {
        bg: 'bg-amber-600',
        text: 'text-white',
        border: 'border-amber-500',
        ring: 'ring-amber-400',
      };
    case 'rose':
      return {
        bg: 'bg-rose-600',
        text: 'text-white',
        border: 'border-rose-500',
        ring: 'ring-rose-400',
      };
    default:
      return {
        bg: 'bg-slate-700',
        text: 'text-white',
        border: 'border-slate-600',
        ring: 'ring-slate-400',
      };
  }
}

export function stripHtmlToPlainText(html: string, maxLength: number = 140): string {
  if (!html) return '';

  const plain = html
    // Replace block and line-break tags with space
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|li|blockquote|div|tr)>/gi, ' ')
    .replace(/<(br|hr)\s*\/?>/gi, ' ')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Unescape common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }
  return plain.slice(0, maxLength).trim() + '...';
}

