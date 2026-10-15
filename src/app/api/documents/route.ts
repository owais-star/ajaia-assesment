import { NextRequest, NextResponse } from 'next/server';
import { documentService, PermissionError, NotFoundError } from '@/lib/documentService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const documents = documentService.getDocumentsForUser(userId);
    return NextResponse.json(documents);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const body = await req.json().catch(() => ({}));
    const title = body.title || 'Untitled Document';
    const content = body.content || '<p></p>';

    const document = documentService.createDocument({
      title,
      content,
      ownerId: userId,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to create document' },
      { status: 500 }
    );
  }
}
