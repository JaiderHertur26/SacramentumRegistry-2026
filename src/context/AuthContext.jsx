
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { validateUserCredentials, initializeAdminUser } from '@/utils/authUtils';
import { logAuthEvent } from '@/utils/authLogger';
import { ROLE_TYPES } from '@/config/supabaseConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const sanitizeUser = useCallback((u) => {
      if (!u) return null;

      const safeStr = (v) => (v === null || v === undefined) ? '' : String(v);

      const extractId = (val) => {
          if (!val) return '';
          if (typeof val === 'string' || typeof val === 'number') return String(val);
          if (typeof val === 'object') return String(val.id || val.parishId || val.dioceseId || '');
          return '';
      };

      return {
          ...u,
          id: extractId(u.id || u.uid),
          username: safeStr(u.username || u.user || u.name),
          role: safeStr(u.role?.name || u.role),
          parishId: extractId(u.parishId || u.parish_id || u.parroquiaId || (u.parish && u.parish.id)),
          dioceseId: extractId(u.dioceseId || u.diocese_id || u.diocesisId || (u.diocese && u.diocese.id)),
          parishName: safeStr(u.parishName || u.parroquia),
          dioceseName: safeStr(u.dioceseName || u.diocesis),
          chancelleryName: safeStr(u.chancelleryName || u.chancilleria)
      };
  }, []);

  useEffect(() => {
    initializeAdminUser();
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(sanitizeUser(parsed));
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, [sanitizeUser]);

  const login = (username, password) => {
    const rawUser = validateUserCredentials(username, password);
    if (!rawUser) return { success: false, error: 'Usuario o contraseña incorrectos' };

    const sanitized = sanitizeUser(rawUser);
    setUser(sanitized);
    localStorage.setItem('currentUser', JSON.stringify(sanitized));
    window.dispatchEvent(new Event('storage'));

    return {
        success: true,
        user: sanitized,
        redirectPath: getRedirectPath(sanitized.role)
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('storage'));
  };

  const getRedirectPath = (role) => {
    const r = String(role || '');
    switch (r) {
      case ROLE_TYPES.ADMIN_GENERAL: return '/admin/dashboard';
      case ROLE_TYPES.DIOCESE: return '/diocese/dashboard';
      case ROLE_TYPES.PARISH: return '/parish/dashboard';
      case ROLE_TYPES.CHANCERY: return '/chancery/dashboard';
      default: return '/';
    }
  };

  return (
    <AuthContext.Provider value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        getRedirectPath,
        hasRole: (allowed) => {
            if (!user) return false;
            const current = String(user.role || '');
            return Array.isArray(allowed) ? allowed.includes(current) : current === allowed;
        }
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth error');
  return context;
};
