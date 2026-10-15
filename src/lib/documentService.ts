import Database from 'better-sqlite3';
import { getDatabase } from './db';
import { stripHtmlToPlainText } from './utils';
import {
  User,
  Document,
  DocumentShare,
  DocumentSummary,
  DashboardDocuments,
  UserRole,
} from './types';

export class PermissionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = 'PermissionError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  constructor(message: string = 'Document not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class DocumentService {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
  }

  getUsers(): User[] {
    return this.db.prepare('SELECT id, name, email, avatar_color, created_at FROM users ORDER BY id ASC').all() as User[];
  }

  getUserById(userId: string): User | null {
    const user = this.db.prepare('SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ?').get(userId) as User | undefined;
    return user || null;
  }

  getUserPermission(docId: string, userId: string): UserRole | null {
    const doc = this.db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(docId) as { owner_id: string } | undefined;
    if (!doc) return null;

    if (doc.owner_id === userId) {
      return 'owner';
    }

    const share = this.db
      .prepare('SELECT role FROM document_shares WHERE document_id = ? AND user_id = ?')
      .get(docId, userId) as { role: 'editor' | 'viewer' } | undefined;

    return share ? share.role : null;
  }

  getDocumentsForUser(userId: string): DashboardDocuments {
    // 1. My Documents (owner_id === userId)
    const myDocsQuery = this.db.prepare(`
      SELECT 
        d.id,
        d.title,
        d.owner_id,
        d.content,
        d.created_at,
        d.updated_at,
        u.name as owner_name,
        u.email as owner_email,
        u.avatar_color as owner_avatar_color,
        'owner' as user_role
      FROM documents d
      JOIN users u ON d.owner_id = u.id
      WHERE d.owner_id = ?
      ORDER BY d.updated_at DESC
    `);
    const rawMyDocs = myDocsQuery.all(userId) as (DocumentSummary & { content: string })[];
    const myDocuments: DocumentSummary[] = rawMyDocs.map(({ content, ...doc }) => ({
      ...doc,
      preview_text: stripHtmlToPlainText(content, 140),
    }));

    // 2. Shared with Me (via document_shares)
    const sharedDocsQuery = this.db.prepare(`
      SELECT 
        d.id,
        d.title,
        d.owner_id,
        d.content,
        d.created_at,
        d.updated_at,
        u.name as owner_name,
        u.email as owner_email,
        u.avatar_color as owner_avatar_color,
        s.role as user_role
      FROM document_shares s
      JOIN documents d ON s.document_id = d.id
      JOIN users u ON d.owner_id = u.id
      WHERE s.user_id = ?
      ORDER BY d.updated_at DESC
    `);
    const rawSharedDocs = sharedDocsQuery.all(userId) as (DocumentSummary & { content: string })[];
    const sharedDocuments: DocumentSummary[] = rawSharedDocs.map(({ content, ...doc }) => ({
      ...doc,
      preview_text: stripHtmlToPlainText(content, 140),
    }));

    return {
      myDocuments,
      sharedDocuments,
    };
  }

  getDocumentById(docId: string, userId: string): { document: Document; userRole: UserRole } {
    const role = this.getUserPermission(docId, userId);
    if (!role) {
      const docExists = this.db.prepare('SELECT 1 FROM documents WHERE id = ?').get(docId);
      if (!docExists) {
        throw new NotFoundError('Document not found');
      }
      throw new PermissionError('You do not have permission to view this document', 403);
    }

    const doc = this.db.prepare(`
      SELECT 
        d.id,
        d.title,
        d.content,
        d.owner_id,
        d.created_at,
        d.updated_at,
        u.name as owner_name,
        u.email as owner_email,
        u.avatar_color as owner_avatar_color
      FROM documents d
      JOIN users u ON d.owner_id = u.id
      WHERE d.id = ?
    `).get(docId) as Document | undefined;

    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    // Fetch shares list (with collaborator names and avatars)
    const shares = this.db.prepare(`
      SELECT 
        s.id,
        s.document_id,
        s.user_id,
        s.role,
        s.created_at,
        u.name as user_name,
        u.email as user_email,
        u.avatar_color
      FROM document_shares s
      JOIN users u ON s.user_id = u.id
      WHERE s.document_id = ?
      ORDER BY s.created_at ASC
    `).all(docId) as DocumentShare[];

    return {
      document: {
        ...doc,
        user_role: role,
        shares,
      },
      userRole: role,
    };
  }

  createDocument(params: {
    id?: string;
    title: string;
    content?: string;
    ownerId: string;
  }): Document {
    const id = params.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = params.title.trim() || 'Untitled Document';
    const content = params.content !== undefined ? params.content : '<p></p>';

    const insertStmt = this.db.prepare(`
      INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    insertStmt.run(id, title, content, params.ownerId);

    return this.getDocumentById(id, params.ownerId).document;
  }

  updateDocument(
    docId: string,
    userId: string,
    updates: { title?: string; content?: string }
  ): Document {
    const role = this.getUserPermission(docId, userId);
    if (!role) {
      const docExists = this.db.prepare('SELECT 1 FROM documents WHERE id = ?').get(docId);
      if (!docExists) throw new NotFoundError();
      throw new PermissionError('You do not have access to update this document', 403);
    }

    if (role === 'viewer') {
      throw new PermissionError('Viewers have read-only access and cannot edit this document', 403);
    }

    // Role is 'owner' or 'editor'
    const setClauses: string[] = ["updated_at = datetime('now')"];
    const values: (string | number)[] = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      values.push(updates.title.trim() || 'Untitled Document');
    }

    if (updates.content !== undefined) {
      setClauses.push('content = ?');
      values.push(updates.content);
    }

    values.push(docId);

    const updateSql = `UPDATE documents SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(updateSql).run(...values);

    return this.getDocumentById(docId, userId).document;
  }

  deleteDocument(docId: string, userId: string): boolean {
    const role = this.getUserPermission(docId, userId);
    if (!role) {
      const docExists = this.db.prepare('SELECT 1 FROM documents WHERE id = ?').get(docId);
      if (!docExists) throw new NotFoundError();
      throw new PermissionError('You do not have permission to delete this document', 403);
    }

    if (role !== 'owner') {
      throw new PermissionError('Only the document owner can delete this document', 403);
    }

    const deleteStmt = this.db.prepare('DELETE FROM documents WHERE id = ?');
    const result = deleteStmt.run(docId);
    return result.changes > 0;
  }

  shareDocument(
    docId: string,
    userId: string,
    targetUserId: string,
    role: 'editor' | 'viewer'
  ): DocumentShare {
    const userRole = this.getUserPermission(docId, userId);
    if (userRole !== 'owner') {
      throw new PermissionError('Only the document owner can modify sharing permissions', 403);
    }

    const doc = this.db.prepare('SELECT owner_id FROM documents WHERE id = ?').get(docId) as { owner_id: string } | undefined;
    if (!doc) throw new NotFoundError();

    if (doc.owner_id === targetUserId) {
      throw new PermissionError('Cannot share document with the owner', 400);
    }

    const targetUser = this.getUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    const shareId = `share_${docId}_${targetUserId}`;

    // Upsert share
    const upsertStmt = this.db.prepare(`
      INSERT INTO document_shares (id, document_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(document_id, user_id) DO UPDATE SET
        role = excluded.role,
        created_at = datetime('now')
    `);

    upsertStmt.run(shareId, docId, targetUserId, role);

    const share = this.db.prepare(`
      SELECT 
        s.id,
        s.document_id,
        s.user_id,
        s.role,
        s.created_at,
        u.name as user_name,
        u.email as user_email,
        u.avatar_color
      FROM document_shares s
      JOIN users u ON s.user_id = u.id
      WHERE s.document_id = ? AND s.user_id = ?
    `).get(docId, targetUserId) as DocumentShare;

    return share;
  }

  revokeShare(docId: string, userId: string, targetUserId: string): boolean {
    const userRole = this.getUserPermission(docId, userId);
    if (userRole !== 'owner') {
      throw new PermissionError('Only the document owner can revoke access', 403);
    }

    const deleteStmt = this.db.prepare(`
      DELETE FROM document_shares 
      WHERE document_id = ? AND user_id = ?
    `);

    const result = deleteStmt.run(docId, targetUserId);
    return result.changes > 0;
  }
}

export const documentService = new DocumentService();
