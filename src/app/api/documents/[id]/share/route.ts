import { NextRequest, NextResponse } from 'next/server';
import { documentService, PermissionError, NotFoundError } from '@/lib/documentService';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const docId = params.id;
    const body = await req.json();

    const { targetUserId, role } = body;
    if (!targetUserId || !role || !['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid targetUserId and role ("editor" or "viewer") are required' },
        { status: 400 }
      );
    }

    const share = documentService.shareDocument(docId, userId, targetUserId, role);
    return NextResponse.json({ share }, { status: 200 });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to update share permission' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const docId = params.id;
    
    // Check search params or json body for targetUserId
    const searchParams = req.nextUrl.searchParams;
    let targetUserId = searchParams.get('targetUserId');

    if (!targetUserId) {
      const body = await req.json().catch(() => ({}));
      targetUserId = body.targetUserId;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    documentService.revokeShare(docId, userId, targetUserId);
    return NextResponse.json({ success: true, message: 'Share revoked successfully' });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke share' },
      { status: 500 }
    );
  }
}
