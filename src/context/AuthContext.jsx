import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { logAuthEvent } from '@/utils/authLogger';
import { ROLE_TYPES } from '@/config/supabaseConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { validateUserCredentials, setCurrentUser: setAppContextUser } = useAppData();

  const sanitizeUser = useCallback((u) => {
      if (!u) return null;

      const safeStr = (v) => (v === null || v === undefined) ? '' : String(v);

      // Deep extraction of Parish/Diocese IDs
      const extractId = (obj) => {
          if (!obj) return '';
          if (typeof obj === 'string') return obj;
          if (typeof obj === 'number') return String(obj);
          if (typeof obj === 'object') return obj.id || obj.parishId || obj.dioceseId || obj.value || '';
          return '';
      };

      const parishId = extractId(u.parishId) || extractId(u.parish_id) || extractId(u.parroquiaId) || extractId(u.parroquia_id) || (u.parish ? extractId(u.parish) : '');
      const dioceseId = extractId(u.dioceseId) || extractId(u.diocese_id) || extractId(u.diocesisId) || extractId(u.diocesis_id) || (u.diocese ? extractId(u.diocese) : '');

      const sanitized = {
          ...u,
          id: safeStr(u.id || u.uid),
          username: safeStr(u.username || u.user || u.name),
          role: safeStr(u.role?.name || u.role),
          parishId: parishId,
          dioceseId: dioceseId,
          parishName: safeStr(u.parishName || u.parroquia),
          dioceseName: safeStr(u.dioceseName || u.diocesis),
          chancelleryName: safeStr(u.chancelleryName || u.chancilleria)
      };

      console.log("AUTH DEBUG - Sanitized User:", sanitized);
      return sanitized;
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeUser(parsed);
        setUser(sanitized);
        if (setAppContextUser) setAppContextUser(sanitized);
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, [sanitizeUser, setAppContextUser]);

  const login = (username, password) => {
    const raw = validateUserCredentials(username, password);
    if (!raw) return { success: false, error: 'Credenciales inválidas' };

    const sanitized = sanitizeUser(raw);
    setUser(sanitized);
    if (setAppContextUser) setAppContextUser(sanitized);
    localStorage.setItem('currentUser', JSON.stringify(sanitized));
    window.dispatchEvent(new Event('storage'));
    return { success: true, user: sanitized, redirectPath: sanitized.role === ROLE_TYPES.PARISH ? '/parish/dashboard' : '/' };
  };

  const logout = () => {
    setUser(null);
    if (setAppContextUser) setAppContextUser(null);
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: () => !!user, hasRole: (r) => user?.role === r }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth error');
  return context;
};