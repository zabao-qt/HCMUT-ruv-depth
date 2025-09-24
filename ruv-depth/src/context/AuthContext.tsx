import React, { createContext, useContext, useEffect, useState } from 'react';
import { authLogin, authSignup, authMe } from '../services/api';

type UserState = { id: string, email: string } | null;
type AuthCtx = {
  user: UserState;
  loading: boolean;
  signup: (email:string,password:string)=>Promise<void>;
  login: (email:string,password:string)=>Promise<void>;
  logout: ()=>void;
  token: string | null;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{children:React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<UserState>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    const init = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await authMe();
        setUser(data.user);
      } catch (err) {
        console.error(err);
        localStorage.removeItem('token');
        setToken(null);
      } finally { setLoading(false); }
    };
    init();
  }, [token]);

  const signup = async (email:string,password:string) => {
    const { data } = await authSignup(email,password);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };
  const login = async (email:string,password:string) => {
    const { data } = await authLogin(email,password);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, signup, login, logout, token }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
