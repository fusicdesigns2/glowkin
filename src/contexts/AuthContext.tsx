
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loading } from '@/components/ui/loading';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateCredits: (newCreditsAmount: number) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthProvider effect running');
    let isMounted = true; // Flag to prevent state updates after unmount

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        // If session exists, fetch user profile, but don't await here
        if (session?.user) {
          // Use setTimeout to prevent potential deadlocks
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    const fetchSession = async () => {
      console.log('Fetching existing session');
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        const session = data.session;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          // Even if there's no session, we should exit loading state
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (isMounted) setLoading(false);
      }
    };

    const fetchUserProfile = async (userId: string) => {
      try {
        console.log('Fetching profile for user:', userId);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error fetching profile:', error);
          setLoading(false);
          return;
        }
        
        console.log('Profile loaded:', profile);
        setProfile(profile);
      } catch (error) {
        console.error('Error in profile fetch try/catch:', error);
      } finally {
        // Always ensure loading is set to false after profile fetch attempt
        if (isMounted) {
          console.log('Setting loading to false in fetchUserProfile finally block');
          setLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      console.log('Cleaning up auth effect');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // For debugging - log state changes
  useEffect(() => {
    console.log('Auth state:', { loading, user: !!user, profile: !!profile });
  }, [loading, user, profile]);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Successfully signed up! Please check your email for verification.');
    navigate('/login');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Successfully logged in!');
    navigate('/');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      throw error;
    }
    navigate('/login');
  };

  const updateCredits = async (newCreditsAmount: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        credits: newCreditsAmount, 
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update credits: ' + error.message);
      throw error;
    }

    setProfile(prev => prev ? { ...prev, credits: newCreditsAmount } : null);
  };

  // Use our reusable Loading component
  if (loading) {
    return <Loading size="lg" text="Loading user data..." className="h-screen" />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        signUp,
        signIn,
        signOut,
        updateCredits,
        isLoading: loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
