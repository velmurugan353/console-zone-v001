import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser,
  GoogleAuthProvider, OAuthProvider, signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import app, { db } from '../lib/firebase';
import { getKYCStatus } from '../services/kyc';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  kyc_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  kyc_address?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string, role?: 'user' | 'admin') => Promise<void>;
  register: (email: string, password?: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshUser: () => void;
  loading: boolean;
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded Array of recognized Admin Emails to explicitly wall off the Customer Modals
const ADMIN_EMAILS = [
  'admin@consolezone.com',
  'Cheersediting@gmail.com'
  // Add future admins here
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          // Recover our extended properties from localStorage if possible (roles, avatars)
          const savedStr = localStorage.getItem('consolezone_auth_user');
          let savedMeta: any = {};
          if (savedStr && savedStr !== 'undefined') {
            try {
              savedMeta = JSON.parse(savedStr);
            } catch (e) {
              console.error("Failed to parse auth meta:", e);
            }
          }
          let kycData = null;
          try {
            kycData = getKYCStatus(firebaseUser.uid);
          } catch (e) {
            console.error("Failed to load KYC status:", e);
          }

          // Auto-assign Admin Object mapping based on hardcoded emails on state changes
          const isTrueAdmin = firebaseUser.email && ADMIN_EMAILS.some(e => e.toLowerCase() === firebaseUser.email?.toLowerCase());
          const resolvedRole = isTrueAdmin ? 'admin' : (savedMeta.role || 'user');

          console.log(`[AUTH] User: ${firebaseUser.email} | Resolved Role: ${resolvedRole} | IsHardcoded: ${isTrueAdmin}`);

          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            role: resolvedRole,
            avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
            kyc_status: kycData?.status,
            kyc_address: kycData?.address
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = () => {
    if (user) {
      const kycData = getKYCStatus(user.id);
      setUser(prev => prev ? { ...prev, kyc_status: kycData?.status, kyc_address: kycData?.address } : null);
    }
  };

  useEffect(() => {
    const handleKYCUpdate = () => {
      refreshUser();
    };

    window.addEventListener('kyc-updated', handleKYCUpdate);
    return () => window.removeEventListener('kyc-updated', handleKYCUpdate);
  }, [user?.id]);

  // Persist role metadata for the mock structure
  useEffect(() => {
    if (user) {
      localStorage.setItem('consolezone_auth_user', JSON.stringify({ role: user.role }));
    }
  }, [user?.role]);

  const login = async (email: string, password?: string, role: 'user' | 'admin' = 'user') => {
    const isHardcodedAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());

    // Throw hard boundaries blocking cross-pollination
    if (role === 'admin' && !isHardcodedAdmin) {
      throw new Error('Unauthorized. This portal is strictly for administrators.');
    }
    if (role === 'user' && isHardcodedAdmin) {
      throw new Error('Administrators must log in through the secure admin portal (/login).');
    }

    if (!password) {
      // Mock login path (fallback for older code calling without a password)
      const id = Math.random().toString(36).substr(2, 9);
      setUser({
        id,
        name: email.split('@')[0],
        email,
        role: role,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      });
      return;
    }

    if ((password === 'admin123' || password === 'test') && isHardcodedAdmin) {
      // Development bypass for hardcoded admins
      setUser({
        id: 'dev-admin-id',
        name: email.split('@')[0],
        email,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      });
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password?: string, name?: string) => {
    if (ADMIN_EMAILS.includes(email)) {
      throw new Error('This email is reserved for administrators and cannot be dynamically registered here.');
    }
    if (password) {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Immediately reflect custom users onto our DB grid so admins see live data.
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        name: name || result.user.email?.split('@')[0] || 'New User',
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
        created_at: serverTimestamp()
      });
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email && ADMIN_EMAILS.includes(result.user.email)) {
        await firebaseSignOut(auth);
        throw new Error('Administrators should bypass OAuth popups and use the secure portal.');
      }

      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email,
          name: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
          role: 'user',
          avatar: result.user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
          created_at: serverTimestamp()
        });
      }
    } catch (e) {
      throw e;
    }
  };

  const loginWithApple = async () => {
    try {
      const result = await signInWithPopup(auth, appleProvider);
      if (result.user.email && ADMIN_EMAILS.includes(result.user.email)) {
        await firebaseSignOut(auth);
        throw new Error('Administrators should bypass OAuth popups and use the secure portal.');
      }

      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: result.user.email,
          name: result.user.displayName || result.user.email?.split('@')[0] || 'Apple User',
          role: 'user',
          avatar: result.user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
          created_at: serverTimestamp()
        });
      }
    } catch (e) {
      throw e;
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    localStorage.removeItem('consolezone_auth_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      refreshUser,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
}

