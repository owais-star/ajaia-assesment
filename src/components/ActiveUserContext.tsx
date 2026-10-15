'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/lib/types';

interface ActiveUserContextType {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User) => void;
  switchUserById: (userId: string) => void;
  isLoading: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const ActiveUserContext = createContext<ActiveUserContextType | undefined>(undefined);

const DEFAULT_USERS: User[] = [
  { id: 'user_1', name: 'Owais Iqbal', email: 'owais@ajaia.io', avatar_color: 'indigo' },
  { id: 'user_2', name: 'Sarah Chen', email: 'sarah@ajaia.io', avatar_color: 'emerald' },
  { id: 'user_3', name: 'Alex Rivera', email: 'alex@ajaia.io', avatar_color: 'amber' },
];

export function ActiveUserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUserState] = useState<User | null>(DEFAULT_USERS[0]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserRef = useRef<User | null>(DEFAULT_USERS[0]);

  // Fetch users from API
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users.length > 0) {
            setUsers(data.users);
            
            // Restore from localStorage or default to user_1
            const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('ajaia_active_user_id') : null;
            const matchedUser = data.users.find((u: User) => u.id === savedUserId);
            const userToSet = matchedUser || data.users[0];
            currentUserRef.current = userToSet;
            setCurrentUserState(userToSet);
          }
        }
      } catch (e) {
        console.error('Failed to load users from API:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadUsers();
  }, []);

  const setCurrentUser = useCallback((user: User) => {
    currentUserRef.current = user; // Synchronously update ref immediately
    setCurrentUserState(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ajaia_active_user_id', user.id);
    }
  }, []);

  const switchUserById = useCallback((userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  }, [users, setCurrentUser]);

  // Synchronize ref on any state change as fallback
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Auth fetch wrapper that automatically appends x-user-id header
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const activeId = currentUserRef.current?.id || currentUser?.id || 'user_1';
      const headers = new Headers(options.headers || {});
      if (!headers.has('x-user-id')) {
        headers.set('x-user-id', activeId);
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [currentUser?.id]
  );

  return (
    <ActiveUserContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser,
        switchUserById,
        isLoading,
        authFetch,
      }}
    >
      {children}
    </ActiveUserContext.Provider>
  );
}

export function useActiveUser() {
  const context = useContext(ActiveUserContext);
  if (!context) {
    throw new Error('useActiveUser must be used within an ActiveUserProvider');
  }
  return context;
}
