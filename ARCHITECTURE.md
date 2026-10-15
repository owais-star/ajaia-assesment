# Architecture Note: Ajaia Docs 🏗️

A comprehensive technical architecture document for **Ajaia Docs** — a production-grade, collaborative rich-text document engine with role-based access control (RBAC), embedded persistence, and smart file ingestion.

---

## 1. System Topology & Core Tenets

```
                        ┌────────────────────────────────────────────────────────┐
                        │             Client Browser (Edge / Desktop)           │
                        │                                                        │
                        │   ┌─────────────────┐       ┌──────────────────────┐   │
                        │   │ Persona Switcher│       │   Tiptap Editor      │   │
                        │   │ (Owais / Sarah /│       │ (ProseMirror Core +  │   │
                        │   │  Alex River)    │       │  800ms Debounce Save)│   │
                        │   └────────┬────────┘       └──────────┬───────────┘   │
                        └────────────┼───────────────────────────┼───────────────┘
                                     │ x-user-id: user_1/2/3     │ JSON / FormData
                                     ▼                           ▼
                        ┌────────────────────────────────────────────────────────┐
                        │             Next.js 14 App Router Server               │
                        │                                                        │
                        │   ┌────────────────────────────────────────────────┐   │
                        │   │           Auth & RBAC Middleware Layer          │   │
                        │   │       (Resolves user & validates document       │   │
                        │   │         permissions: Owner / Editor / Viewer)   │   │
                        │   └───────────────────────┬────────────────────────┘   │
                        │                           │                            │
                        │   ┌───────────────────────┴────────────────────────┐   │
                        │   │               API Route Handlers               │   │
                        │   │  /api/documents       /api/documents/[id]      │   │
                        │   │  /api/documents/upload /api/documents/[id]/share│   │
                        │   └───────────────────────┬────────────────────────┘   │
                        └───────────────────────────┼────────────────────────────┘
                                                    │
                                                    ▼
                        ┌────────────────────────────────────────────────────────┐
                        │              Embedded Persistence Engine               │
                        │                                                        │
                        │          SQLite (`better-sqlite3`) + WAL Mode          │
                        │          - Zero external service dependencies          │
                        │          - Microsecond local queries                   │
                        │          - Automatic schema migration & seed data      │
                        └────────────────────────────────────────────────────────┘
```

### Key Architectural Tenets
1. **Self-Contained & Deterministic**: Zero required external microservices, cloud accounts, or Docker containers. Runs out-of-the-box on any Node.js environment with SQLite.
2. **Instant Persona Simulation**: Authenticated identity is managed via simulated sessions, transmitting an explicit `x-user-id` header on all mutations and reads, persisted across page loads via `localStorage`.
3. **Strict Defense-in-Depth RBAC**: Permissions are evaluated at both the client UI layer (hiding/disabling unauthorized actions) and unconditionally enforced at the server API layer (returning strict `HTTP 403 Forbidden` errors).
4. **Resilient Editor State**: An 800ms debounced auto-save mechanism prevents write storms while providing visual feedback (`Saving...`, `Saved at HH:MM:SS`, or `Unsaved changes`).

---

## 2. Technology Stack & Rationale

| Component | Choice | Rationale & Tradeoffs |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router)** | Full-stack unified TypeScript application, clean route handlers (`src/app/api/...`), and React Server Components for initial shell rendering. |
| **Rich-Text Engine** | **Tiptap (ProseMirror)** | Headless, highly extensible rich text framework. Generates clean HTML and structured JSON AST. Avoids legacy `contenteditable` pitfalls. |
| **Database** | **SQLite (`better-sqlite3`)** | Synchronous, zero-network-latency embedded database. Configured with Write-Ahead Logging (`WAL`) mode for concurrent reads during writes. |
| **Styling** | **Tailwind CSS** | Utility-first responsive design system tailored with custom colors, subtle transitions, glassmorphic dropdowns, and accessible contrast. |
| **Testing** | **Vitest** | Blazing-fast test runner with native TypeScript and ESM support. Fully exercises database operations in an isolated test database in <1s. |
| **Reverse Proxy** | **Caddy** | Production reverse proxy with automatic Let's Encrypt TLS/SSL certificates, HTTP/2 & HTTP/3 support, and dead-simple configuration. |

---

## 3. Data Model & Schema Design

The SQLite database is initialized with Foreign Key enforcement (`PRAGMA foreign_keys = ON`) and Write-Ahead Logging (`PRAGMA journal_mode = WAL`):

```sql
-- Seeded & Dynamic Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents Repository
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Granular Collaborator Access
CREATE TABLE document_shares (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('viewer', 'editor')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, user_id)
);
```

### Schema Guarantees
- **Cascading Deletions**: When a document is deleted by its owner, all associated `document_shares` entries are automatically purged by SQLite.
- **Unique Share Constraints**: A user cannot have multiple conflicting roles on the same document (`UNIQUE(document_id, user_id)`).
- **Auto-Initialization**: On startup, `src/lib/db.ts` automatically runs `CREATE TABLE IF NOT EXISTS` and seeds 3 initial personas and 2 realistic documents if the tables are empty.

---

## 4. Role-Based Access Control (RBAC) Matrix

A document's access level is derived using the resolution algorithm:
1. If `currentUser.id === document.owner_id` $\rightarrow$ **Role: Owner**
2. Else if `document_shares` has an entry for `(document_id, currentUser.id)` $\rightarrow$ **Role: Editor** or **Viewer**
3. Else $\rightarrow$ **Role: None (403 Unauthorized)**

### Comprehensive Capability Matrix

| Operation | HTTP Endpoint | Owner | Editor | Viewer | Unauthenticated / No Share |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Read Document List** | `GET /api/documents` | Sees all owned docs | Sees shared docs | Sees shared docs | Empty list |
| **Read Document Detail** | `GET /api/documents/[id]` | ✅ Full Access | ✅ Full Access | ✅ Full Access | ❌ HTTP 403 / 404 |
| **Create New Document** | `POST /api/documents` | ✅ Becomes Owner | ✅ Becomes Owner | ✅ Becomes Owner | ❌ HTTP 401 |
| **Edit Title / Content** | `PUT /api/documents/[id]` | ✅ Allowed | ✅ Allowed | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden |
| **Import / Append File** | `PUT /api/documents/[id]` | ✅ Allowed | ✅ Allowed | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden |
| **Upload as New Doc** | `POST /api/documents/upload` | ✅ Becomes Owner | ✅ Becomes Owner | ✅ Becomes Owner | ❌ HTTP 401 |
| **Add / Update Share** | `POST /api/documents/[id]/share` | ✅ Allowed | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden |
| **Revoke Share** | `DELETE /api/documents/[id]/share`| ✅ Allowed | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden |
| **Delete Document** | `DELETE /api/documents/[id]` | ✅ Allowed | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden | ❌ HTTP 403 Forbidden |
| **Export to MD / HTML** | Client-Side Renderer | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ N/A |

---

## 5. Rich-Text Editor & State Synchronization

```
User Types in Tiptap
        │
        ├──► Local React State Updates Instantly (Zero Typing Lag)
        ├──► Status Indicator: "Unsaved changes"
        │
        └──► Debounced Timer (800ms)
                 │
                 ▼
         Trigger Save Callback (PUT /api/documents/[id])
                 ├──► If Role === 'viewer': Cancelled on client + Server 403 Guard
                 │
                 ├──► In-Flight: Status Indicator shows "Saving..."
                 │
                 └──► Success: Status Indicator shows "Saved at 19:42:15"
```

### Features:
- **Tiptap Core**: Headless ProseMirror wrapper with extensions: StarterKit (Headings 1-3, Paragraphs, Bold, Italic, BulletList, OrderedList, Blockquote, CodeBlock, History), Underline, and Placeholder.
- **Debounced Mutations**: Using an 800ms debounce window prevents hammering the server on every keystroke while ensuring that accidental navigation retains work.
- **Viewer-Locked Mode**: When viewed by a user with `role === 'viewer'`, the Tiptap instance is initialized with `editable: false`. The toolbar is replaced with an informative banner: *"You are viewing this document in Read-Only mode. Contact the owner to request editing rights."*

---

## 6. File Ingestion & Export Engine

### 1. Ingestion (`POST /api/documents/upload` & Editor Toolbar Import)
- **Supported Formats**: `.txt` (Plain text), `.md` (Markdown).
- **Size Validation**: Strict **2MB limit** checked before buffer processing; oversized files return HTTP 413 / bad request with clear toast notifications.
- **Parsing Pipeline**:
  - Markdown headings (`#`, `##`, `###`), bold (`**`), italics (`*`), bullet lists (`- `, `* `), and numbered lists (`1. `) are translated into semantic HTML nodes compatible with Tiptap.
  - Plain text splits on double newlines to generate standard `<p>` elements.

### 2. Export Pipeline
- **Markdown Export**: Recursively parses the DOM / HTML representation of the document into clean, readable Markdown syntax (`.md`).
- **HTML Export**: Bundles the content into a standalone HTML5 document with clean, responsive typography styles (`.html`).

---

## 7. Automated Testing Strategy

Vitest runs isolated unit and integration tests under `src/__tests__/documents.test.ts`.

### Highlights:
- **Zero Test Contamination**: Every test run creates a temporary, isolated SQLite database file (`test-ajaia-*.db`) and destroys it upon completion.
- **19 Test Assertions Covering**:
  - Document initialization and default state.
  - Ownership vs collaborator dashboard partitioning ("My Documents" vs "Shared with Me").
  - Owner and Editor mutation capabilities.
  - Viewer mutation rejection (HTTP 403 + database immutability check).
  - Unshared user access isolation.
  - Sharing and unsharing permissions.
  - File parser formatting verification.
  - File size and unsupported format rejection.

---

## 8. Production Deployment & Security Configuration

- **Target Domain**: `https://ajaia-assesment.owaisiqbal.dev`
- **Reverse Proxy**: Caddy server on a Linux VM listening on ports `80` and `443` with automated ACME TLS/SSL certificate issuance.
- **App Daemon**: Next.js Node.js server managed via `pm2` or `systemd` listening on local port `3000`.
- **Caddy Configuration**:
  ```caddy
  ajaia-assesment.owaisiqbal.dev {
      reverse_proxy 127.0.0.1:3000
      encode gzip zstd
  }
  ```

---

## 9. Future Evolution & Scaling Roadmap

1. **Real-Time Multiplayer Collaboration**: Transition from debounced HTTP PUT to WebSockets and CRDTs via **Yjs** and **Tiptap Collaboration** extension.
2. **Object Storage Ingestion**: Swap local buffers for direct-to-S3/Cloudflare R2 signed uploads for large file attachments and embedded images.
3. **Enterprise SSO / OIDC**: Replace simulated persona header (`x-user-id`) with OAuth2/OIDC JWT tokens (Auth0, Clerk, or NextAuth).
