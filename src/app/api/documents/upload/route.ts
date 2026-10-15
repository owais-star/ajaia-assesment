import { NextRequest, NextResponse } from 'next/server';
import { documentService, PermissionError, NotFoundError } from '@/lib/documentService';
import { processUploadedFile } from '@/lib/markdown';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'user_1';
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const action = formData.get('action') as string | null; // 'create' | 'append' | 'parse'
    const targetDocumentId = formData.get('documentId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Supported formats: .txt, .md (Max 2MB)' },
        { status: 400 }
      );
    }

    const filename = file.name || 'document.txt';
    const fileSize = file.size;
    const rawContent = await file.text();

    // Validate extension and size
    const validation = processUploadedFile(filename, fileSize, rawContent);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // If action is to append/import into an existing document
    if (action === 'append' && targetDocumentId) {
      const existing = documentService.getDocumentById(targetDocumentId, userId);
      const updatedContent = `${existing.document.content || ''}<hr/>${validation.contentHtml || ''}`;
      
      const updatedDoc = documentService.updateDocument(targetDocumentId, userId, {
        content: updatedContent,
      });

      return NextResponse.json({
        success: true,
        action: 'append',
        document: updatedDoc,
        importedContentHtml: validation.contentHtml,
        message: `Successfully imported "${filename}" into document.`,
      });
    }

    // Default action: create new document titled after the file
    if (action === 'parse') {
      return NextResponse.json({
        success: true,
        title: validation.title,
        contentHtml: validation.contentHtml,
        filename,
      });
    }

    // Create new document
    const createdDoc = documentService.createDocument({
      title: validation.title,
      content: validation.contentHtml,
      ownerId: userId,
    });

    return NextResponse.json({
      success: true,
      action: 'create',
      document: createdDoc,
      message: `Document "${validation.title}" created successfully from "${filename}".`,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to process file upload' },
      { status: 500 }
    );
  }
}
