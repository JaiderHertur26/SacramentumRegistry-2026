import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { logAuthEvent } from '@/utils/authLogger';
import { ROLE_TYPES } from '@/config/supabaseConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { validateUserCredentials } = useAppData();

  // Helper to sanitize user object
  const sanitizeUser = (u) => {
      if (!u) return null;
      const safeString = (val) => {
          if (typeof val === 'string') return val;
          if (typeof val === 'object' && val !== null) {
              return val.name || val.username || val.label || val.role || '';
          }
          return String(val || '');
      };

      return {
          ...u,
          username: safeString(u.username),
          role: safeString(u.role),
          parishName: safeString(u.parishName),
          dioceseName: safeString(u.dioceseName),
          chancelleryName: safeString(u.chancelleryName)
      };
  };

  /* =========================
     LOAD SESSION
  ========================= */
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser) {
            const sanitizedUser = sanitizeUser(parsedUser);
            setUser(sanitizedUser);
            // Log successful session restoration
            logAuthEvent(sanitizedUser, 'SESSION_RESTORED');
        }
      } catch {
        localStorage.removeItem('currentUser');
      }
    }

    setLoading(false);
  }, []);

  /* =========================
     LOGIN
  ========================= */
  const login = (username, password) => {
    try {
      console.log('🔐 Intento de login:', username);

      const validUser = validateUserCredentials(username, password);

      if (!validUser) {
        console.warn('❌ Credenciales inválidas');
        return { success: false, error: 'Usuario o contraseña incorrectos' };
      }

      const sanitizedUser = sanitizeUser(validUser);
      setUser(sanitizedUser);
      localStorage.setItem('currentUser', JSON.stringify(sanitizedUser));
      
      // Log successful login
      logAuthEvent(sanitizedUser, 'LOGIN_SUCCESS');

      return {
        success: true,
        user: sanitizedUser,
        redirectPath: getRedirectPath(sanitizedUser.role)
      };

    } catch (err) {
      console.error('🔥 Error en login:', err);
      return {
        success: false,
        error: err?.message || 'Error durante el inicio de sesión'
      };
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logout = () => {
    if (user) {
      logAuthEvent(user, 'LOGOUT');
    }
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const isAuthenticated = () => !!user;

  /* =========================
     ROUTING BY ROLE
  ========================= */
  const getRedirectPath = (role) => {
    const roleStr = String(role || '');
    
    switch (roleStr) {
      case ROLE_TYPES.ADMIN_GENERAL: return '/admin/dashboard';
      case ROLE_TYPES.DIOCESE: return '/diocese/dashboard';
      case ROLE_TYPES.PARISH: return '/parish/dashboard';
      case ROLE_TYPES.CHANCERY: return '/chancery/dashboard';
      default: return '/';
    }
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    const userRole = String(user.role || '');
    
    // Normalize allowedRoles to array
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return rolesArray.includes(userRole);
  };

  /* =========================
     PROVIDER
  ========================= */
  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated,
      getRedirectPath,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};