import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase, isSupabaseConfigured } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

const missingSupabaseError = {
  message: 'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const handleSession = useCallback(async (sessionData) => {
    setSession(sessionData);
    setUser(sessionData?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return undefined;
    }

    const getSession = async () => {      
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      handleSession(currentSession);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(      
      async (_event, sessionData) => {
        handleSession(sessionData);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    if (!supabase) return { error: missingSupabaseError };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
        variant: 'destructive',
        title: 'Sign up Failed',
        description: error.message || 'Something went wrong',
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: missingSupabaseError };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({        
        variant: 'destructive',
        title: 'Sign in Failed',
        description: error.message || 'Something went wrong',
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    if (!supabase) return { error: missingSupabaseError };

    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({        
        variant: 'destructive',
        title: 'Sign out Failed',
        description: error.message || 'Something went wrong',
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    supabaseEnabled: isSupabaseConfigured(),
  }), [user, session, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};