'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '@/lib/firebase/auth';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthChange((u) => {
            setUser(u);
            setLoading(false);
        });
        return unsub;
    }, []);

    return React.createElement(
        AuthContext.Provider,
        { value: { user, loading } },
        children
    );
}

export const useAuth = () => useContext(AuthContext);
