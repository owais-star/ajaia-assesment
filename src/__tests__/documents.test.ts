import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchemaAndSeeds } from '@/lib/db';
import { DocumentService, PermissionError, NotFoundError } from '@/lib/documentService';
import { 
  processUploadedFile, 
  extractTitleFromFilename, 
  htmlToMarkdown,
  MAX_FILE_SIZE_BYTES 
} from '@/lib/markdown';
import { stripHtmlToPlainText } from '@/lib/utils';

describe('Document Service & RBAC Layer', () => {
  let db: Database.Database;
  let service: DocumentService;

  beforeEach(() => {
    // Isolated in-memory database for each test
    db = new Database(':memory:');
    initSchemaAndSeeds(db);
    service = new DocumentService(db);
  });

  describe('Document Creation & User Filtering', () => {
    it('should create a new document with an owner', () => {
      const doc = service.createDocument({
        title: 'Sprint Planning Notes',
        content: '<p>Discussing Q2 deliverables.</p>',
        ownerId: 'user_1',
      });

      expect(doc.id).toBeDefined();
      expect(doc.title).toBe('Sprint Planning Notes');
      expect(doc.content).toBe('<p>Discussing Q2 deliverables.</p>');
      expect(doc.owner_id).toBe('user_1');
      expect(doc.user_role).toBe('owner');
    });

    it('should categorize documents correctly into My Documents and Shared with Me', () => {
      // Create doc owned by user_1
      const doc = service.createDocument({
        title: 'User 1 Confidential Notes',
        ownerId: 'user_1',
      });

      // Initially user_1 sees it in myDocuments
      const user1Docs = service.getDocumentsForUser('user_1');
      expect(user1Docs.myDocuments.some((d) => d.id === doc.id)).toBe(true);

      // user_2 does not see it anywhere
      const user2DocsBefore = service.getDocumentsForUser('user_2');
      expect(user2DocsBefore.myDocuments.some((d) => d.id === doc.id)).toBe(false);
      expect(user2DocsBefore.sharedDocuments.some((d) => d.id === doc.id)).toBe(false);

      // Share with user_2 as editor
      service.shareDocument(doc.id, 'user_1', 'user_2', 'editor');

      // Now user_2 sees it in sharedDocuments with role editor
      const user2DocsAfter = service.getDocumentsForUser('user_2');
      const sharedDoc = user2DocsAfter.sharedDocuments.find((d) => d.id === doc.id);
      expect(sharedDoc).toBeDefined();
      expect(sharedDoc?.user_role).toBe('editor');
      expect(sharedDoc?.owner_name).toBe('Owais Iqbal');
    });
  });

  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('should allow the owner to update document title and content', () => {
      const doc = service.createDocument({
        title: 'Initial Title',
        content: '<p>Initial content</p>',
        ownerId: 'user_1',
      });

      const updated = service.updateDocument(doc.id, 'user_1', {
        title: 'Updated by Owner',
        content: '<p>Updated content by Owner</p>',
      });

      expect(updated.title).toBe('Updated by Owner');
      expect(updated.content).toBe('<p>Updated content by Owner</p>');
    });

    it('should allow an editor to update content and title', () => {
      const doc = service.createDocument({
        title: 'Collaborative Spec',
        content: '<p>Draft</p>',
        ownerId: 'user_1',
      });

      // Grant editor role to user_2 (Sarah)
      service.shareDocument(doc.id, 'user_1', 'user_2', 'editor');

      const updated = service.updateDocument(doc.id, 'user_2', {
        title: 'Collaborative Spec (Edited by Sarah)',
        content: '<p>Draft with Sarah\'s additions</p>',
      });

      expect(updated.title).toBe('Collaborative Spec (Edited by Sarah)');
      expect(updated.content).toBe('<p>Draft with Sarah\'s additions</p>');
    });

    it('should reject updates from a viewer with HTTP 403 PermissionError', () => {
      const doc = service.createDocument({
        title: 'Engineering Policy',
        content: '<p>Locked policy</p>',
        ownerId: 'user_1',
      });

      // Grant viewer role to user_3 (Alex)
      service.shareDocument(doc.id, 'user_1', 'user_3', 'viewer');

      // Viewer can read document
      const readResult = service.getDocumentById(doc.id, 'user_3');
      expect(readResult.userRole).toBe('viewer');
      expect(readResult.document.title).toBe('Engineering Policy');

      // Viewer trying to edit MUST throw PermissionError with status 403
      expect(() => {
        service.updateDocument(doc.id, 'user_3', {
          title: 'Hacked Title',
          content: '<p>Tampered content</p>',
        });
      }).toThrowError(PermissionError);

      try {
        service.updateDocument(doc.id, 'user_3', { content: '<p>New</p>' });
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toMatch(/viewers.*read-only/i);
      }

      // Verify content was not modified
      const currentDoc = service.getDocumentById(doc.id, 'user_1').document;
      expect(currentDoc.title).toBe('Engineering Policy');
      expect(currentDoc.content).toBe('<p>Locked policy</p>');
    });

    it('should reject access from an unauthorized third party', () => {
      const doc = service.createDocument({
        title: 'Private Draft',
        ownerId: 'user_1',
      });

      // user_3 has not been shared this doc
      expect(() => {
        service.getDocumentById(doc.id, 'user_3');
      }).toThrowError(PermissionError);

      expect(() => {
        service.updateDocument(doc.id, 'user_3', { content: 'test' });
      }).toThrowError(PermissionError);
    });

    it('should allow only the owner to delete a document', () => {
      const doc = service.createDocument({
        title: 'Doc to Delete',
        ownerId: 'user_1',
      });

      // Grant editor role to user_2
      service.shareDocument(doc.id, 'user_1', 'user_2', 'editor');

      // Editor cannot delete
      expect(() => {
        service.deleteDocument(doc.id, 'user_2');
      }).toThrowError(PermissionError);

      try {
        service.deleteDocument(doc.id, 'user_2');
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toMatch(/only the.*owner.*delete/i);
      }

      // Owner can delete
      const deleted = service.deleteDocument(doc.id, 'user_1');
      expect(deleted).toBe(true);

      // Verify document no longer exists
      expect(() => {
        service.getDocumentById(doc.id, 'user_1');
      }).toThrowError(NotFoundError);
    });

    it('should allow only the owner to manage shares and revoke access', () => {
      const doc = service.createDocument({
        title: 'Shared Resource',
        ownerId: 'user_1',
      });

      // Non-owner cannot share
      expect(() => {
        service.shareDocument(doc.id, 'user_2', 'user_3', 'editor');
      }).toThrowError(PermissionError);

      // Owner can share
      const share = service.shareDocument(doc.id, 'user_1', 'user_2', 'editor');
      expect(share.user_id).toBe('user_2');
      expect(share.role).toBe('editor');

      // Non-owner cannot revoke
      expect(() => {
        service.revokeShare(doc.id, 'user_2', 'user_2');
      }).toThrowError(PermissionError);

      // Owner can revoke
      const revoked = service.revokeShare(doc.id, 'user_1', 'user_2');
      expect(revoked).toBe(true);

      // user_2 now has no access
      expect(() => {
        service.getDocumentById(doc.id, 'user_2');
      }).toThrowError(PermissionError);
    });
  });

  describe('File Upload Processing & Validation', () => {
    it('should parse valid plain text (.txt) into clean HTML paragraphs', () => {
      const textContent = 'First paragraph of notes.\n\nSecond paragraph with more information.';
      const result = processUploadedFile('team_sync.txt', textContent.length, textContent);

      expect(result.isValid).toBe(true);
      expect(result.title).toBe('Team Sync');
      expect(result.contentHtml).toContain('<p>First paragraph of notes.</p>');
      expect(result.contentHtml).toContain('<p>Second paragraph with more information.</p>');
    });

    it('should parse valid markdown (.md) into headings and bullet lists', () => {
      const mdContent = `# Engineering RFC
## Architectural Overview
This is **bold** text and *italic* text.

- First item
- Second item

1. Step one
2. Step two`;

      const result = processUploadedFile('engineering-rfc.md', mdContent.length, mdContent);

      expect(result.isValid).toBe(true);
      expect(result.title).toBe('Engineering Rfc');
      expect(result.contentHtml).toContain('<h1');
      expect(result.contentHtml).toContain('Engineering RFC');
      expect(result.contentHtml).toContain('<h2');
      expect(result.contentHtml).toContain('<strong>bold</strong>');
      expect(result.contentHtml).toContain('<em>italic</em>');
      expect(result.contentHtml).toContain('<ul>');
      expect(result.contentHtml).toContain('<ol>');
    });

    it('should extract clean human-readable titles from filenames', () => {
      expect(extractTitleFromFilename('quarterly_product_roadmap_2026.md')).toBe(
        'Quarterly Product Roadmap 2026'
      );
      expect(extractTitleFromFilename('api-design-spec.txt')).toBe('Api Design Spec');
      expect(extractTitleFromFilename('.txt')).toBe('Untitled Document');
    });

    it('should reject unsupported file extensions with clear error message', () => {
      const result = processUploadedFile('malicious.exe', 100, 'binary-data');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file format ".exe"');
      expect(result.error).toContain('Supported formats: .txt, .md (Max 2MB)');
    });

    it('should reject files exceeding 2MB size limit', () => {
      const oversizedBytes = MAX_FILE_SIZE_BYTES + 1024;
      const result = processUploadedFile('huge_file.md', oversizedBytes, '# Title');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed limit of 2MB');
    });

    it('should reject empty files', () => {
      const result = processUploadedFile('empty.txt', 0, '   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should convert HTML back to Markdown for export', () => {
      const html = '<h1>Heading</h1><p>Some <strong>bold</strong> text.</p><ul><li>Item 1</li><li>Item 2</li></ul>';
      const md = htmlToMarkdown(html);

      expect(md).toContain('# Heading');
      expect(md).toContain('**bold**');
      expect(md).toContain('Item 1');
      expect(md).toContain('Item 2');
    });

    it('should strip raw HTML tags and unescape entities for clean card previews', () => {
      const richHtml = '<hr/><h1>📄 Master Resume — Owais</h1><blockquote>Synced from: <code>profile.md</code></blockquote><p>Senior Engineer &amp; Architect</p>';
      const plain = stripHtmlToPlainText(richHtml, 140);

      expect(plain).not.toContain('<h1>');
      expect(plain).not.toContain('</h1>');
      expect(plain).not.toContain('<hr');
      expect(plain).not.toContain('<blockquote>');
      expect(plain).not.toContain('<code>');
      expect(plain).toContain('📄 Master Resume — Owais');
      expect(plain).toContain('Synced from: profile.md');
      expect(plain).toContain('Senior Engineer & Architect'); // unescaped &amp; to &
    });
  });

  describe('Multi-Persona Switching & Access Isolation Matrix', () => {
    it('should enforce seeded persona view and permission matrix for Owais (user_1)', () => {
      const user1Dashboard = service.getDocumentsForUser('user_1');
      expect(user1Dashboard.myDocuments.length).toBe(1);
      expect(user1Dashboard.myDocuments[0].id).toBe('doc_roadmap_2026');
      expect(user1Dashboard.myDocuments[0].user_role).toBe('owner');

      expect(user1Dashboard.sharedDocuments.length).toBe(2);
      const rfcDoc = user1Dashboard.sharedDocuments.find((d) => d.id === 'doc_arch_rfc');
      const researchDoc = user1Dashboard.sharedDocuments.find((d) => d.id === 'doc_user_research');

      expect(rfcDoc?.user_role).toBe('editor');
      expect(researchDoc?.user_role).toBe('viewer');

      // Owais can edit owned doc
      expect(() => {
        service.updateDocument('doc_roadmap_2026', 'user_1', { title: 'Updated Roadmap' });
      }).not.toThrow();

      // Owais can edit shared RFC as editor
      expect(() => {
        service.updateDocument('doc_arch_rfc', 'user_1', { content: '<p>Owais comments</p>' });
      }).not.toThrow();

      // Owais CANNOT edit research doc because he is a viewer (throws 403)
      expect(() => {
        service.updateDocument('doc_user_research', 'user_1', { title: 'Hacked' });
      }).toThrowError(PermissionError);

      // Owais CANNOT delete shared RFC (only owner Sarah can delete)
      expect(() => {
        service.deleteDocument('doc_arch_rfc', 'user_1');
      }).toThrowError(PermissionError);
    });

    it('should enforce seeded persona view and permission matrix for Sarah (user_2)', () => {
      const user2Dashboard = service.getDocumentsForUser('user_2');
      expect(user2Dashboard.myDocuments.length).toBe(1);
      expect(user2Dashboard.myDocuments[0].id).toBe('doc_arch_rfc');
      expect(user2Dashboard.myDocuments[0].user_role).toBe('owner');

      expect(user2Dashboard.sharedDocuments.length).toBe(1);
      expect(user2Dashboard.sharedDocuments[0].id).toBe('doc_roadmap_2026');
      expect(user2Dashboard.sharedDocuments[0].user_role).toBe('editor');

      // Sarah CANNOT see or access Alex\'s research doc (throws 403)
      expect(() => {
        service.getDocumentById('doc_user_research', 'user_2');
      }).toThrowError(PermissionError);

      // Sarah CANNOT delete Owais\'s roadmap
      expect(() => {
        service.deleteDocument('doc_roadmap_2026', 'user_2');
      }).toThrowError(PermissionError);

      // Sarah CANNOT share Owais\'s roadmap
      expect(() => {
        service.shareDocument('doc_roadmap_2026', 'user_2', 'user_3', 'editor');
      }).toThrowError(PermissionError);
    });

    it('should enforce seeded persona view and permission matrix for Alex (user_3)', () => {
      const user3Dashboard = service.getDocumentsForUser('user_3');
      expect(user3Dashboard.myDocuments.length).toBe(1);
      expect(user3Dashboard.myDocuments[0].id).toBe('doc_user_research');
      expect(user3Dashboard.myDocuments[0].user_role).toBe('owner');

      expect(user3Dashboard.sharedDocuments.length).toBe(1);
      expect(user3Dashboard.sharedDocuments[0].id).toBe('doc_roadmap_2026');
      expect(user3Dashboard.sharedDocuments[0].user_role).toBe('viewer');

      // Alex CANNOT see or access Sarah\'s RFC (throws 403)
      expect(() => {
        service.getDocumentById('doc_arch_rfc', 'user_3');
      }).toThrowError(PermissionError);

      // Alex CANNOT edit Owais\'s roadmap (viewer only -> throws 403)
      expect(() => {
        service.updateDocument('doc_roadmap_2026', 'user_3', { title: 'Alex Title' });
      }).toThrowError(PermissionError);

      // Alex CANNOT delete Owais\'s roadmap (throws 403)
      expect(() => {
        service.deleteDocument('doc_roadmap_2026', 'user_3');
      }).toThrowError(PermissionError);
    });
  });
});
