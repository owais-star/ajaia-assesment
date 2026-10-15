import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;

export function getDatabase(customPath?: string): Database.Database {
  if (customPath) {
    const db = new Database(customPath);
    initSchemaAndSeeds(db);
    return db;
  }

  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'ajaia.db');
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initSchemaAndSeeds(dbInstance);

  return dbInstance;
}

export function initSchemaAndSeeds(db: Database.Database): void {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar_color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('viewer', 'editor')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_id, user_id)
    );
  `);

  // Seed users if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, avatar_color)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('user_1', 'Owais Iqbal', 'owais@ajaia.io', 'indigo');
    insertUser.run('user_2', 'Sarah Chen', 'sarah@ajaia.io', 'emerald');
    insertUser.run('user_3', 'Alex Rivera', 'alex@ajaia.io', 'amber');
  }

  // Seed documents if empty
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
  if (docCount.count === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO documents (id, title, content, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
    `);

    const insertShare = db.prepare(`
      INSERT INTO document_shares (id, document_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `);

    // Doc 1: Owned by Owais, shared with Sarah (editor) and Alex (viewer)
    insertDoc.run(
      'doc_roadmap_2026',
      'Ajaia Docs Product Roadmap 2026',
      `<h1>Ajaia Docs Product Roadmap 2026</h1>
<p>Welcome to the core strategic vision for <strong>Ajaia Docs</strong>. Our objective is to build a collaborative, high-performance workspace that blends intuitive rich-text editing with enterprise-grade access control.</p>
<h2>Key Strategic Pillars</h2>
<ul>
<li><strong>Real-time Presence &amp; Cursors:</strong> Sub-50ms latency peer synchronization built on conflict-free replicated data structures.</li>
<li><strong>Granular Role-Based Access Control:</strong> Seamless transition between <em>Owner</em>, <em>Editor</em>, and <em>Viewer</em> modes with instant permission enforcement.</li>
<li><strong>Smart File Ingestion:</strong> Ingest existing Markdown and text files with zero layout degradation.</li>
</ul>
<h2>Quarterly Milestones</h2>
<ol>
<li><strong>Q1:</strong> Core Tiptap rich-text persistence and simulated multi-persona switching.</li>
<li><strong>Q2:</strong> SQLite WAL mode optimization and edge caching layer.</li>
<li><strong>Q3:</strong> Automated PDF / Docx export workflows and version timeline diffing.</li>
</ol>
<p><em>Notice: This document is actively edited by Owais Iqbal and Sarah Chen. Alex Rivera has viewer access for design review.</em></p>`,
      'user_1',
      '-2 days',
      '-10 minutes'
    );
    insertShare.run('share_1_sarah', 'doc_roadmap_2026', 'user_2', 'editor');
    insertShare.run('share_1_alex', 'doc_roadmap_2026', 'user_3', 'viewer');

    // Doc 2: Owned by Sarah (user_2), shared with Owais (editor)
    insertDoc.run(
      'doc_arch_rfc',
      'Engineering Architecture RFC: High-Throughput Sync',
      `<h1>Engineering Architecture RFC: High-Throughput Sync</h1>
<p>Author: <strong>Sarah Chen</strong> (Staff Infrastructure Engineer)</p>
<p>Status: <strong>In Review</strong></p>
<h2>1. Abstract</h2>
<p>This RFC outlines the transition of our document storage engine to an embedded SQLite architecture utilizing Write-Ahead Logging (WAL) and memory-mapped I/O to achieve sub-millisecond document persistence under high concurrency.</p>
<h2>2. Technical Architecture</h2>
<ul>
<li><strong>Storage Layer:</strong> SQLite 3 via <code>better-sqlite3</code> with foreign key enforcement and transactional cascading deletes.</li>
<li><strong>Editor Engine:</strong> Tiptap (ProseMirror core) with headless state reconciliation and HTML serialization.</li>
<li><strong>Debounce Strategy:</strong> 800ms client-side debounced mutations paired with explicit manual checkpoint saves.</li>
</ul>
<h2>3. Security &amp; Access Boundaries</h2>
<p>All mutative endpoints (<code>PUT</code>, <code>DELETE</code>, <code>POST /share</code>) strictly validate permissions in the database query layer:</p>
<ol>
<li>Owners have full administrative control including document deletion and share revocation.</li>
<li>Editors can mutate document title and body content.</li>
<li>Viewers are restricted to read-only queries; mutations are rejected with HTTP 403 Forbidden.</li>
</ol>`,
      'user_2',
      '-1 day',
      '-1 hour'
    );
    insertShare.run('share_2_owais', 'doc_arch_rfc', 'user_1', 'editor');

    // Doc 3: Owned by Alex (user_3), shared with Owais (viewer)
    insertDoc.run(
      'doc_user_research',
      'Customer Research & Usability Interviews',
      `<h1>Customer Research &amp; Usability Interviews</h1>
<p>Lead Researcher: <strong>Alex Rivera</strong></p>
<h2>Executive Summary</h2>
<p>We conducted 14 in-depth usability sessions across engineering managers, product leads, and technical writers. Key takeaways show overwhelming demand for distraction-free editing with instant persona verification.</p>
<h2>Key Insights</h2>
<ul>
<li><strong>Persona Switching:</strong> Reviewers loved the ability to switch between active users in a single click to verify access states without re-logging in.</li>
<li><strong>File Import Flexibility:</strong> Both dashboard-level "Upload as New Doc" and in-editor "Import into Document" options were rated 4.9/5 in workflow tests.</li>
<li><strong>Clear Status Indicators:</strong> Visible feedback for <em>Saving...</em> and <em>Saved at HH:MM:SS</em> eliminated anxiety around lost work.</li>
</ul>
<h2>Action Items</h2>
<ol>
<li>Polish markdown header conversion for imported documents.</li>
<li>Ensure share modal lists all seeded personas for quick permission delegation.</li>
</ol>`,
      'user_3',
      '-3 hours',
      '-25 minutes'
    );
    insertShare.run('share_3_owais', 'doc_user_research', 'user_1', 'viewer');
  }
}

export default getDatabase();
