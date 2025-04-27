
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
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

  // Implement a timeout to prevent infinite loading
  useEffect(() => {
    console.log('Setting up auth timeout safety');
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('AUTH TIMEOUT TRIGGERED: Force exiting loading state after 5 seconds');
        setLoading(false);
      }
    }, 5000); // Force exit loading state after 5 seconds

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    console.log('AuthProvider effect running');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession?.user?.id);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Immediately fetch profile if we have a user
        if (currentSession?.user) {
          // Use setTimeout to prevent potential deadlocks
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          // Make sure we exit loading state if there's no user
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    const fetchInitialSession = async () => {
      console.log('Fetching initial session');
      try {
        const { data } = await supabase.auth.getSession();
        const initialSession = data.session;
        
        console.log('Initial session fetch complete:', initialSession?.user?.id || 'no session');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user.id);
        } else {
          // No user, so we're done loading
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
      } finally {
        setAuthInitialized(true);
      }
    };

    fetchInitialSession();

    return () => {
      console.log('Cleaning up auth effect');
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load user profile');
      } else {
        console.log('Profile loaded successfully:', profile);
        setProfile(profile);
      }
    } catch (error) {
      console.error('Exception in profile fetch:', error);
      toast.error('An error occurred while loading your profile');
    } finally {
      // Always ensure loading is set to false after profile fetch
      console.log('Setting loading to false after profile fetch');
      setLoading(false);
    }
  };

  // For debugging - log state changes
  useEffect(() => {
    console.log('Auth state updated:', { 
      loading, 
      authInitialized,
      user: user ? `${user.id.substring(0, 8)}...` : 'null', 
      profile: profile ? `${profile.username} (${profile.credits} credits)` : 'null' 
    });
  }, [loading, authInitialized, user, profile]);

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

  // Use our reusable Loading component for consistent loading UI
  if (loading && !authInitialized) {
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
