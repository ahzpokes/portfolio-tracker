'use client';

import { usePrivacy } from '@/lib/privacy-context';

interface PrivateAmountProps {
    children: React.ReactNode;
    className?: string;
}

export function PrivateAmount({ children, className }: PrivateAmountProps) {
    const { isPrivate } = usePrivacy();

    if (!isPrivate) {
        return <span className={className}>{children}</span>;
    }

    return (
        <span
            className={`${className} relative inline-block`}
            style={{ filter: 'blur(8px)', userSelect: 'none' }}
        >
            {children}
        </span>
    );
}
