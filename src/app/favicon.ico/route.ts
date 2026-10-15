import { NextResponse } from 'next/server';

export async function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="8" fill="#4f46e5"/>
  <path d="M10 8h8l6 6v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#ffffff" fill-opacity="0.9"/>
  <path d="M18 8v6h6" fill="#c7d2fe"/>
  <line x1="12" y1="18" x2="20" y2="18" stroke="#4f46e5" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="12" y1="21" x2="17" y2="21" stroke="#4f46e5" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
