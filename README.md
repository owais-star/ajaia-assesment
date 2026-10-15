# Ajaia Docs 📝

A production-quality, tightly-scoped collaborative rich-text document engine built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Tiptap (ProseMirror)**, and an embedded **SQLite (`better-sqlite3`)** database.

Designed for the senior engineering take-home assessment, **Ajaia Docs** features instant simulated persona switching, role-based access control (RBAC), auto-saving with debouncing, Markdown and plain text file ingestion (with 2MB validation), and comprehensive test coverage.

---

### 🔗 Project Links & Documentation
- 🌐 **Live Demo URL**: [https://ajaia-assesment.owaisiqbal.dev](https://ajaia-assesment.owaisiqbal.dev)
- 📦 **GitHub Repository**: [https://github.com/owais-star/ajaia-assesment](https://github.com/owais-star/ajaia-assesment)
- 🏗️ **Architecture Note**: [ARCHITECTURE.md](file:///c:/Users/owais/Desktop/projects/ajaia-assesment/ARCHITECTURE.md)
- 🤖 **AI Workflow Note**: [AI_WORKFLOW.md](file:///c:/Users/owais/Desktop/projects/ajaia-assesment/AI_WORKFLOW.md)

---

## 🚀 Quick Start

### 1. Requirements
- Node.js 18+ (tested on Node 20, 22, and 24 LTS)
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Automated Tests
```bash
npm test
```
All 19 automated Vitest unit & integration tests run against an isolated SQLite test database and execute in <1s.

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 👥 Seeded Personas & Instant Switcher

The application comes pre-seeded with 3 realistic engineering personas:

| ID | Persona Name | Email | Avatar Color | Initial Documents |
| :--- | :--- | :--- | :--- | :--- |
| `user_1` | **Owais Iqbal** | `owais@ajaia.io` | Indigo | **Owner**: *Ajaia Docs Product Roadmap 2026* |
| `user_2` | **Sarah Chen** | `sarah@ajaia.io` | Emerald | **Owner**: *Engineering Architecture RFC: High-Throughput Sync* |
| `user_3` | **Alex Rivera** | `alex@ajaia.io` | Amber | **Owner**: *Customer Research & Usability Interviews* |

### Testing Simulated Auth
In the top-right navigation bar, click the **Active Persona Switcher** dropdown to instantly switch between Owais, Sarah, and Alex.
- All client fetch requests send the selected persona ID via the **`x-user-id`** HTTP header.
- The active persona selection is persisted in `localStorage` so refreshing pages keeps your session intact.
- The dashboard and document views dynamically re-evaluate permissions based on the active persona.

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Capability | Owner | Shared • Editor | Shared • Viewer |
| :--- | :---: | :---: | :---: |
| View Document | ✅ | ✅ | ✅ |
| Edit Document Content & Title | ✅ | ✅ | ❌ *(HTTP 403 Forbidden + Locked UI Banner)* |
| Auto-Save & Manual Save | ✅ | ✅ | ❌ *(Disabled)* |
| Import File into Document | ✅ | ✅ | ❌ *(Disabled)* |
| Export as Markdown / HTML | ✅ | ✅ | ✅ |
| Manage Collaborators / Share | ✅ | ❌ *(Read-only)* | ❌ *(Read-only)* |
| Delete Document | ✅ | ❌ *(HTTP 403 Forbidden)* | ❌ *(HTTP 403 Forbidden)* |

---

## 📂 Core Features & Workflow

### 1. Dashboard Organization
- **"My Documents"**: Shows documents where `owner_id === currentUser.id`. Includes the explicit badge `Owner`.
- **"Shared with Me"**: Shows documents shared with the active user via `document_shares`. Displays explicit badges: `Shared • Editor` or `Shared • Viewer`.
- **Search & Filter Tabs**: Instantly search across titles, owners, and document preview snippets.

### 2. Rich-Text Editor (Tiptap)
- Supported formatting:
  - **Headings**: H1, H2, H3, Paragraph
  - **Inline**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`)
  - **Lists**: Bulleted List, Numbered (Ordered) List
  - **Blocks**: Blockquotes, Code Blocks, Horizontal Dividers
  - **History**: Full Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`)
- **Auto-Save**: 800ms client debounce with visible status indicator (`Saving...`, `Saved at HH:MM:SS`, or `Unsaved changes`).
- **Exporting**: One-click download as clean Markdown (`.md`) or standalone HTML (`.html`).

### 3. File Upload & Ingestion
Supports `.txt` and `.md` files up to **2MB**:
1. **"Upload File as New Doc"** (Dashboard):
   - Reads the uploaded file, converts Markdown (headings, lists, bold/italic) or formatted plain text into sanitized HTML.
   - Automatically names the document after the sanitized filename.
2. **"Import File into Document"** (Editor Toolbar):
   - Appends the parsed file content directly into the currently active document.
3. **Error Handling**:
   - Both client and server validate file extensions and reject oversized (>2MB) or empty files with dismissible error banners.

### 4. Sharing Workflow
- Open any document owned by the active persona and click **"Share"** in the header.
- Choose any seeded team member (Sarah, Alex, Owais), pick their role (`Editor` or `Viewer`), and grant access with one click.
- Revoke access anytime by clicking the trash icon next to a collaborator.

---

## 🧪 Automated Testing Suite

The project includes an automated test suite written with **Vitest** located in [`src/__tests__/documents.test.ts`](file:///c:/Users/owais/Desktop/projects/ajaia-assesment/src/__tests__/documents.test.ts):

```bash
npm test
```

### Covered Test Cases:
1. **Document Creation**: Verifies document ID generation, initial HTML content, and ownership assignment.
2. **Dashboard Categorization**: Validates that documents appear strictly under "My Documents" for owners and "Shared with Me" for shared users.
3. **Owner Mutations**: Verifies owner can update document title and rich content.
4. **Editor Mutations**: Verifies shared editors can modify title and content.
5. **Viewer Enforcement**: Verifies viewers attempting mutations receive HTTP 403 `PermissionError`, and content remains unmodified.
6. **Unauthorized Isolation**: Verifies uninvited users cannot read or modify documents.
7. **Deletion Privileges**: Verifies only the document owner can delete; editors/viewers receive 403 Forbidden.
8. **Sharing Privileges**: Verifies only owners can grant or revoke shares.
9. **File Parsing**: Verifies `.txt` to `<p>` parsing and `.md` to semantic HTML headings/lists.
10. **File Validation**: Validates rejection of unsupported extensions (`.exe`, `.pdf`), oversized files (>2MB), and empty uploads.

---

## 🏗️ Architecture & Database Schema

Data is stored in `./data/ajaia.db` using SQLite with Write-Ahead Logging (`WAL`) mode:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_shares (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('viewer', 'editor')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id)
);
```

---

## 🌐 Production Deployment & Reverse Proxy

The application is deployed on a Linux VM behind **Caddy** at **[https://ajaia-assesment.owaisiqbal.dev](https://ajaia-assesment.owaisiqbal.dev)**.

### Caddy Reverse Proxy Configuration
```caddy
ajaia-assesment.owaisiqbal.dev {
    reverse_proxy 127.0.0.1:3000
    encode gzip zstd
}
```

### Production Service Management (PM2 / Systemd)
```bash
# Install dependencies & build
npm install
npm run build

# Start daemon via PM2
pm2 start npm --name "ajaia-docs" -- start
pm2 save
```
