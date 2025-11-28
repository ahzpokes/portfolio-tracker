import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'default' | 'circle' | 'text';
}

export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse bg-slate-800 rounded',
                variant === 'circle' && 'rounded-full',
                variant === 'text' && 'h-4 rounded',
                className
            )}
        />
    );
}
