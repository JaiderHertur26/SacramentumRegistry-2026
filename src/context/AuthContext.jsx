
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { validateUserCredentials, initializeAdminUser } from '@/utils/authUtils';
import { logAuthEvent } from '@/utils/authLogger';
import { ROLE_TYPES } from '@/config/supabaseConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Standardizes user object structure across the app.
   * Ensures parishId and dioceseId are always strings and correctly named.
   */
  const sanitizeUser = useCallback((u) => {
      if (!u) return null;

      const safeStr = (v) => (v === null || v === undefined) ? '' : String(v);

      const extractId = (val) => {
          if (!val) return '';
          if (typeof val === 'string' || typeof val === 'number') return String(val);
          if (typeof val === 'object') return String(val.id || val.parishId || val.dioceseId || '');
          return '';
      };

      const parishId = extractId(u.parishId || u.parish_id || u.parroquiaId || (u.parish && u.parish.id));
      const dioceseId = extractId(u.dioceseId || u.diocese_id || u.diocesisId || (u.diocese && u.diocese.id));

      const sanitized = {
          ...u,
          id: extractId(u.id || u.uid),
          username: safeStr(u.username || u.user || u.name),
          role: safeStr(u.role?.name || u.role),
          parishId: parishId,
          dioceseId: dioceseId,
          parishName: safeStr(u.parishName || u.parroquia),
          dioceseName: safeStr(u.dioceseName || u.diocesis),
          chancelleryName: safeStr(u.chancelleryName || u.chancilleria)
      };

      return sanitized;
  }, []);

  // Load session on startup
  useEffect(() => {
    initializeAdminUser();
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed) {
            setUser(sanitizeUser(parsed));
        }
      } catch (e) {
        console.error("Auth: Session restoration failed", e);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, [sanitizeUser]);

  /**
   * Log in a user with username and password.
   * Uses authUtils for validation to avoid circular context dependency.
   */
  const login = (username, password) => {
    try {
      const rawUser = validateUserCredentials(username, password);
      if (!rawUser) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }

      const sanitized = sanitizeUser(rawUser);
      setUser(sanitized);
      localStorage.setItem('currentUser', JSON.stringify(sanitized));
      logAuthEvent(sanitized, 'LOGIN_SUCCESS');

      // Sync other parts of the app
      window.dispatchEvent(new Event('storage'));

      let path = '/';
      if (sanitized.role === ROLE_TYPES.ADMIN_GENERAL) path = '/admin/dashboard';
      else if (sanitized.role === ROLE_TYPES.PARISH) path = '/parish/dashboard';
      else if (sanitized.role === ROLE_TYPES.DIOCESE) path = '/diocese/dashboard';
      else if (sanitized.role === ROLE_TYPES.CHANCERY) path = '/chancery/dashboard';

      return { success: true, user: sanitized, redirectPath: path };
    } catch (err) {
      return { success: false, error: err?.message || 'Error durante el inicio de sesión' };
    }
  };

  /**
   * Log out the current user and clear session.
   */
  const logout = () => {
    if (user) logAuthEvent(user, 'LOGOUT');
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
