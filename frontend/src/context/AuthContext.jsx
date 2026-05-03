import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import {
  ALLOWED_CHARACTER_MODEL_CODES,
  DEFAULT_CHARACTER_MODEL,
} from "../lib/avatarModels";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(getSupabaseConfigError());

  const sanitizePreferredModel = (value) =>
    ALLOWED_CHARACTER_MODEL_CODES.has(value) ? value : DEFAULT_CHARACTER_MODEL;

  const loadProfile = async (nextUser) => {
    if (!nextUser || !supabase) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, preferred_model")
      .eq("id", nextUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const normalized = {
      id: nextUser.id,
      email: data?.email || nextUser.email || "",
      preferredModel: sanitizePreferredModel(data?.preferred_model),
    };

    setProfile(normalized);
    return normalized;
  };

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        setConfigError(error.message);
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        try {
          await loadProfile(data.session.user);
        } catch (profileError) {
          setConfigError(profileError.message);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        void loadProfile(nextSession.user).catch((profileError) => {
          setConfigError(profileError.message);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const requireClient = () => {
    if (supabase) return;
    throw new Error(getSupabaseConfigError());
  };

  const signIn = async (email, password) => {
    requireClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    setSession(data.session ?? null);
    setUser(data.session?.user ?? null);
    await loadProfile(data.session?.user ?? null);
    return data;
  };

  const signUp = async (email, password) => {
    requireClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    setSession(data.session ?? null);
    setUser(data.session?.user ?? null);

    if (data.session?.user) {
      await loadProfile(data.session.user);
    }

    return data;
  };

  const signOut = async () => {
    requireClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updatePreferredModel = async (preferredModel) => {
    requireClient();

    if (!user?.id) {
      throw new Error("No authenticated user.");
    }

    const sanitizedModel = sanitizePreferredModel(preferredModel);
    const upsertRow = {
      id: user.id,
      email: profile?.email || user.email || "",
      preferred_model: sanitizedModel,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(upsertRow, { onConflict: "id" })
      .select("id, email, preferred_model")
      .single();

    if (error) {
      throw error;
    }

    const updated = {
      id: data.id,
      email: data.email || user.email || "",
      preferredModel: sanitizePreferredModel(data.preferred_model),
    };

    setProfile(updated);
    return updated;
  };

  const value = {
    session,
    user,
    profile,
    loading,
    isAuthenticated: Boolean(session?.user),
    configError,
    signIn,
    signUp,
    signOut,
    updatePreferredModel,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
