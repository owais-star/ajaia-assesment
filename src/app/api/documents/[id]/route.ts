import { NextRequest, NextResponse } from 'next/server';
import { documentService, PermissionError, NotFoundError } from '@/lib/documentService';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const docId = params.id;

    const result = documentService.getDocumentById(docId, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const docId = params.id;
    const body = await req.json();

    const updatedDoc = documentService.updateDocument(docId, userId, {
      title: body.title,
      content: body.content,
    });

    return NextResponse.json({ document: updatedDoc });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const docId = params.id;

    documentService.deleteDocument(docId, userId);
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
