// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";

type User = {
  id: number;
  name?: string;
  email?: string;
  avatar?: string;
  [k: string]: any;
};

type AuthContextShape = {
  user: User | null;
  loading: boolean;
  loginLocal: (userObj: User) => void; // legacy compatibility
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("sv_user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // On mount: prefer session-based server /me. If that fails, fall back to localStorage.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get("/me");
        if (!mounted) return;
        if (res.ok && res.data) {
          const u = (res.data.user ?? res.data) as User;
          setUser(u);
          try { localStorage.setItem("sv_user", JSON.stringify(u)); } catch {}
        } else {
          // fallback: localStorage (legacy)
          const raw = localStorage.getItem("sv_user");
          if (raw) {
            try {
              const u = JSON.parse(raw) as User;
              setUser(u);
            } catch {
              setUser(null);
              localStorage.removeItem("sv_user");
            }
          } else {
            setUser(null);
          }
        }
      } catch (e) {
        console.error("Auth rehydrate error", e);
        const raw = localStorage.getItem("sv_user");
        if (raw) {
          try {
            const u = JSON.parse(raw) as User;
            setUser(u);
          } catch {
            setUser(null);
            localStorage.removeItem("sv_user");
          }
        } else {
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Keep local login helper for backward compatibility
  const loginLocal = (userObj: User) => {
    setUser(userObj);
    try { localStorage.setItem("sv_user", JSON.stringify(userObj)); } catch {}
  };

  const logout = async () => {
    try {
      // server logout (should clear cookie)
      await apiClient.post("/logout");
    } catch (e) {
      console.warn("logout request failed", e);
    }
    setUser(null);
    try { 
      localStorage.removeItem("sv_user"); 
      localStorage.removeItem("sv_user_id"); // Clear fallback user ID
    } catch {}
  };

  const refreshUser = async (): Promise<User | null> => {
    const res = await apiClient.get("/me");
    if (res.ok && res.data) {
      const u = (res.data.user ?? res.data) as User;
      setUser(u);
      try { localStorage.setItem("sv_user", JSON.stringify(u)); } catch {}
      return u;
    }
    setUser(null);
    try { localStorage.removeItem("sv_user"); } catch {}
    return null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginLocal, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextShape {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
