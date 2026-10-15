import type { Metadata } from 'next';
import './globals.css';
import { ActiveUserProvider } from '@/components/ActiveUserContext';

export const metadata: Metadata = {
  title: 'Ajaia Docs | Collaborative Rich-Text Document Engine',
  description:
    'A high-performance full-stack collaborative document editor with role-based access control, instant persona switching, and markdown file ingestion.',
  keywords: ['collaborative editor', 'tiptap', 'nextjs', 'sqlite', 'rbac', 'ajaia docs'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <ActiveUserProvider>{children}</ActiveUserProvider>
      </body>
    </html>
  );
}
