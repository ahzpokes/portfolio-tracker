'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PrivacyContextType {
    isPrivate: boolean;
    togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
    const [isPrivate, setIsPrivate] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load from localStorage on mount
        const stored = localStorage.getItem('privacy-mode');
        if (stored === 'true') {
            setIsPrivate(true);
        }
        setMounted(true);
    }, []);

    const togglePrivacy = () => {
        setIsPrivate(prev => {
            const newValue = !prev;
            localStorage.setItem('privacy-mode', String(newValue));
            return newValue;
        });
    };

    // Prevent hydration mismatch by initializing with false (server/initial client)
    // and updating after mount if needed.
    // We always render the provider to avoid "must be used within a PrivacyProvider" errors.

    return (
        <PrivacyContext.Provider value={{ isPrivate, togglePrivacy }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
}
