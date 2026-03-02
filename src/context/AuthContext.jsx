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
          if (typeof val === 'string') return val;
          if (typeof val === 'number') return String(val);
          if (typeof val === 'object') return String(val.id || val.parishId || val.dioceseId || val.value || '');
          return String(val);
      };

      const pId = extractId(u.parishId || u.parish_id || u.parroquiaId || u.parroquia_id || (u.parish && u.parish.id));
      const dId = extractId(u.dioceseId || u.diocese_id || u.diocesisId || u.diocesis_id || (u.diocese && u.diocese.id));

      return {
          ...u,
          id: extractId(u.id || u.uid),
          username: safeStr(u.username || u.user || u.name),
          role: safeStr(u.role?.name || u.role),
          parishId: pId,
          dioceseId: dId,
          parishName: safeStr(u.parishName || u.parroquia),
          dioceseName: safeStr(u.dioceseName || u.diocesis),
          chancelleryName: safeStr(u.chancelleryName || u.chancilleria)
      };
  }, []);

  useEffect(() => {
    initializeAdminUser();
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser) {
            setUser(sanitizeUser(parsedUser));
        }
      } catch (e) {
        console.error("Auth session restoration failed", e);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, [sanitizeUser]);

  const login = (username, password) => {
    try {
      const rawUser = validateUserCredentials(username, password);
      if (!rawUser) {
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }
      const sanitizedUser = sanitizeUser(rawUser);
      setUser(sanitizedUser);
      localStorage.setItem('currentUser', JSON.stringify(sanitizedUser));
      logAuthEvent(sanitizedUser, 'LOGIN_SUCCESS');

      window.dispatchEvent(new Event('storage'));

      return {
        success: true,
        user: sanitizedUser
      };
    } catch (err) {
      return { success: false, error: err?.message || 'Error durante el inicio de sesión' };
    }
  };

  const logout = () => {
    if (user) logAuthEvent(user, 'LOGOUT');
    setUser(null);
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('storage'));
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    const userRole = String(user.role || '');
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return rolesArray.includes(userRole);
  };

  return (
    <AuthContext.Provider value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        hasRole
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