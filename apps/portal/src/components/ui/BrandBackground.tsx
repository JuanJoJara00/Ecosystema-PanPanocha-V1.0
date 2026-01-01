import React from 'react';
import styles from './BrandBackground.module.css';

const ASSETS = [
    '/images/brand-assets/asset-1.png',
    '/images/brand-assets/asset-2.png',
    '/images/brand-assets/asset-3.png',
    '/images/brand-assets/asset-4.png',
    '/images/brand-assets/asset-5.png',
    '/images/brand-assets/asset-6.png',
    '/images/brand-assets/asset-7.png',
];

export function BrandBackground({ opacity = 0.15, className = '' }: { opacity?: number; className?: string }) {
    // 20x20 grid = 400 items
    const COLS = 20;
    const ROWS = 20;
    const items = Array.from({ length: COLS * ROWS });

    return (
        <div
            className={`absolute inset-0 z-0 pointer-events-none overflow-hidden select-none ${className}`}
            style={{ opacity }}
        >
            {/* Background tint (Matched to POS) */}
            <div className="absolute inset-0 bg-brand-accent/5 mix-blend-multiply dark:bg-transparent" />

            {/* Container covers 200% to allow rotation and full coverage */}
            <div className="absolute inset-0 w-[200%] h-[200%] -ml-[50%] -mt-[25%] rotate-12 bg-transparent">
                {items.map((_, i) => {
                    // Grid position
                    const row = Math.floor(i / COLS);
                    const col = i % COLS;

                    // Deterministic Pseudo-random values
                    const randX = ((i * 137) % 100) / 100;
                    const randRot = ((i * 9301 + 49297) % 120) - 60;
                    const randScale = 0.9 + ((i % 5) * 0.05);

                    // Staggered Grid Logic (Honeycomb / Brick)
                    const isOddRow = row % 2 === 1;
                    const staggerOffset = isOddRow ? 2.5 : 0;

                    // Position: Base Grid + Stagger + Micro-Jitter (+/- 0.5%)
                    const top = (row * 5) + (randX * 1 - 0.5);
                    const left = (col * 5) + staggerOffset + (randX * 1 - 0.5);
                    const imgOpacity = 0.6 + (((i * 17) % 5) / 10);

                    return (
                        <div
                            key={i}
                            className={`absolute flex items-center justify-center transform ${styles.backgroundItem}`}
                            style={{
                                '--bg-top': `${top}%`,
                                '--bg-left': `${left}%`,
                            } as React.CSSProperties}
                        >
                            <div className="w-24 h-24 md:w-36 md:h-36 p-4 flex items-center justify-center">
                                <img
                                    src={ASSETS[((i * 137) + (i % 3) * 5) % ASSETS.length]}
                                    alt=""
                                    className={`w-full h-full object-contain filter grayscale brightness-50 contrast-125 transition-opacity duration-300 dark:brightness-[0.2] dark:invert-0 ${styles.backgroundImage}`}
                                    style={{
                                        '--bg-rot': `${randRot}deg`,
                                        '--bg-scale': randScale,
                                        '--bg-opacity': imgOpacity
                                    } as React.CSSProperties}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
