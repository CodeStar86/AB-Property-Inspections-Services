import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { kvStore } from '../lib/kv-client';

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'clerk' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // Fetch user role if user exists
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string): Promise<'admin' | 'clerk'> => {
    try {
      const userProfile = await kvStore.get(`user:${userId}`);
      return userProfile?.role || 'clerk';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'clerk';
    }
  };

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    console.log('Attempting to sign in with:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('Sign in response:', { data, error });
    if (error) throw error;
    
    // Ensure user profile exists in KV store
    if (data.user) {
      const existingProfile = await kvStore.get(`user:${data.user.id}`);
      if (!existingProfile) {
        // Create default clerk profile for existing users
        await kvStore.set(`user:${data.user.id}`, {
          id: data.user.id,
          email: data.user.email,
          display_name: null,
          role: 'clerk',
          created_at: new Date().toISOString(),
        });
        console.log('Created default clerk profile for existing user');
      }
    }
    
    return data;
  };

  const signUpWithPassword = async (email: string, password: string, role: 'admin' | 'clerk' = 'clerk') => {
    console.log('Attempting to sign up with:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    console.log('Sign up response:', { data, error });
    if (error) throw error;
    
    // Create user profile with role
    if (data.user) {
      await kvStore.set(`user:${data.user.id}`, {
        id: data.user.id,
        email: data.user.email,
        display_name: null,
        role: role,
        created_at: new Date().toISOString(),
      });
    }
    
    // If account was created successfully, user exists in data
    // Just return success - account is created and ready to sign in
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    userRole,
    loading,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}
