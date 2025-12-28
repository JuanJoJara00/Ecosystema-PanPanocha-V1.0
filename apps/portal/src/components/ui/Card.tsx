import React, { forwardRef } from 'react';
import { Card as SharedCard } from '@panpanocha/ui';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    noPadding?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className, hover = false, noPadding = false, children, ...props }, ref) => {
    return (
        <SharedCard
            ref={ref}
            hover={hover}
            noPadding={noPadding}
            className={cn("bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm dark:border-white/5", className)}
            {...props}
        >
            {children}
        </SharedCard>
    );
});

Card.displayName = 'Card';

export default Card;
