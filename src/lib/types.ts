export type UserRole = 'owner' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  created_at?: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  created_at: string;
  user_name?: string;
  user_email?: string;
  avatar_color?: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_email?: string;
  owner_avatar_color?: string;
  user_role?: UserRole; // Role of currently requesting user
  shares?: DocumentShare[];
}

export interface DocumentSummary {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_avatar_color: string;
  user_role: UserRole;
  created_at: string;
  updated_at: string;
  preview_text?: string;
}

export interface DashboardDocuments {
  myDocuments: DocumentSummary[];
  sharedDocuments: DocumentSummary[];
}
