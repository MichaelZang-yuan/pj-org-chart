"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/deviceId";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enterGuestMode: () => void;
  touchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/* ── helpers ── */

async function checkWhitelist(email: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("allowed_emails")
    .select("email")
    .eq("email", email.toLowerCase().trim())
    .single();
  return !!data;
}

async function registerDevice(userId: string): Promise<boolean> {
  const deviceId = getDeviceId();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Upsert current device
  await getSupabase().from("active_sessions").upsert(
    {
      user_id: userId,
      device_id: deviceId,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" }
  );

  // Get all active sessions (within 30 min)
  const { data: sessions } = await getSupabase()
    .from("active_sessions")
    .select("*")
    .eq("user_id", userId)
    .gte("last_active_at", thirtyMinAgo)
    .order("last_active_at", { ascending: false });

  if (!sessions || sessions.length <= 2) return true;

  // Check if current device is in top 2
  const top2 = sessions.slice(0, 2);
  const isInTop2 = top2.some(
    (s: { device_id: string }) => s.device_id === deviceId
  );

  if (isInTop2) {
    // Delete excess sessions
    const excessIds = sessions.slice(2).map((s: { id: string }) => s.id);
    if (excessIds.length > 0) {
      await getSupabase().from("active_sessions").delete().in("id", excessIds);
    }
    return true;
  } else {
    // Current device is not in top 2 — remove it and reject
    await getSupabase()
      .from("active_sessions")
      .delete()
      .eq("user_id", userId)
      .eq("device_id", deviceId);
    return false;
  }
}

/* ── provider ── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    try {
      const sb = getSupabase();
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          registerDevice(session.user.id);
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = sb.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } catch {
      // Supabase not configured — fall through to login page
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const allowed = await checkWhitelist(email);
      if (!allowed) {
        setError(
          "当前为内测阶段，仅限受邀用户登录。请联系管理员获取邀请。"
        );
        return;
      }

      const { data, error: authError } =
        await getSupabase().auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        const deviceOk = await registerDevice(data.user.id);
        if (!deviceOk) {
          await getSupabase().auth.signOut();
          setError(
            "该账号已在2台设备上登录，请先在其他设备上退出登录。"
          );
          return;
        }
        setUser(data.user);
        setIsGuest(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const allowed = await checkWhitelist(email);
      if (!allowed) {
        setError(
          "当前为内测阶段，仅限受邀用户登录。请联系管理员获取邀请。"
        );
        return;
      }

      const { data, error: authError } = await getSupabase().auth.signUp({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user && data.session) {
        const deviceOk = await registerDevice(data.user.id);
        if (!deviceOk) {
          await getSupabase().auth.signOut();
          setError(
            "该账号已在2台设备上登录，请先在其他设备上退出登录。"
          );
          return;
        }
        setUser(data.user);
        setIsGuest(false);
      } else if (data.user && !data.session) {
        setError("注册成功！请查看邮箱确认链接后再登录。");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      const deviceId = getDeviceId();
      await getSupabase()
        .from("active_sessions")
        .delete()
        .eq("user_id", user.id)
        .eq("device_id", deviceId);
    }
    await getSupabase().auth.signOut();
    setUser(null);
    setIsGuest(false);
  }, [user]);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    setError(null);
  }, []);

  const touchSession = useCallback(async () => {
    if (!user) return;
    const deviceId = getDeviceId();
    await getSupabase().from("active_sessions").upsert(
      {
        user_id: user.id,
        device_id: deviceId,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" }
    );
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        loading,
        error,
        login,
        signup,
        logout,
        enterGuestMode,
        touchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
