import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            setProfile(profile);
          } catch (error) {
            console.error('Error fetching profile:', error);
          } finally {
            setLoading(false);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    const fetchSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            setProfile(profile);
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        // Always set loading to false even if errors occur
        setLoading(false);
      }
    };

    fetchSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  // Only show loading spinner if we're still loading
  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="w-16 h-16 border-4 border-maiRed border-t-transparent rounded-full animate-spin"></div>
    </div>;
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
