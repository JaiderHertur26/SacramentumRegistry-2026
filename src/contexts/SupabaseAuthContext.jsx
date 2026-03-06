
/**
 * DEPRECATED: This file is no longer in use.
 * The application uses /src/context/AuthContext.jsx for all authentication needs.
 * This file has been neutralized to prevent build errors caused by broken imports.
 */

import React, { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};
