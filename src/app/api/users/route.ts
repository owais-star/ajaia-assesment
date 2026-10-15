import { NextResponse } from 'next/server';
import { documentService } from '@/lib/documentService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = documentService.getUsers();
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
