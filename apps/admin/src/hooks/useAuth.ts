import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
type AppRole = 'coordinator' | 'leader' | 'read_only';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true });

  useEffect(() => {
    // Get initial session and validate it
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // User exists, set the session
        const role = (session.user.app_metadata?.app_role as AppRole) || null;
        setState({ user: session.user, role, loading: false });
      } else {
        // No valid session
        setState({ user: null, role: null, loading: false });
      }
    }).catch((err) => {
      console.error('Session check failed:', err);
      // On error, assume no session to prevent lockout
      setState({ user: null, role: null, loading: false });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = (session.user.app_metadata?.app_role as AppRole) || null;
        setState({ user: session.user, role, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, role: null, loading: false });
  };

  return { ...state, signOut };
}
