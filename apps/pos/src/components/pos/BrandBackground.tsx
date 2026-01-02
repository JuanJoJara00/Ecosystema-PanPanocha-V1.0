import React from 'react';



const ASSETS = [
    '/images/brand-assets/asset-1.png',
    '/images/brand-assets/asset-2.png',
    '/images/brand-assets/asset-3.png',
    '/images/brand-assets/asset-4.png',
    '/images/brand-assets/asset-5.png',
    '/images/brand-assets/asset-6.png',
    '/images/brand-assets/asset-7.png',
];

// Optimization: Wrapped in React.memo to prevent re-renders on parent updates
export const BrandBackground = React.memo(function BrandBackground({
    opacity = 0.15,
    className = '',
    size = 'w-24 h-24 md:w-36 md:h-36'
}: {
    opacity?: number;
    className?: string;
    size?: string;
}) {
    // Optimization: Reduced grid density from 20x20 (400) to 12x12 (144 items)
    // This significantly reduces DOM nodes while maintaining the visual texture.
    const COLS = 12;
    const ROWS = 12;
    const items = Array.from({ length: COLS * ROWS });

    return (
        <div
            className={`absolute inset-0 z-0 pointer-events-none overflow-hidden select-none ${className}`}
            style={{ opacity }}
        >
            {/* Background tint */}
            <div className="absolute inset-0 bg-brand-accent/5 mix-blend-multiply" />

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
                    const staggerOffset = isOddRow ? 0.5 : 0; // Relative to cell width

                    // Cell Size relative to grid (100% / 12 = ~8.33%)
                    const cellSize = 100 / COLS;

                    // Position: Base Grid + Stagger + Micro-Jitter
                    const top = (row * (100 / ROWS)) + (randX * 2 - 1);
                    const left = (col * cellSize) + (staggerOffset * cellSize) + (randX * 2 - 1);

                    return (
                        <div
                            key={i}
                            className="absolute flex items-center justify-center transform"
                            style={{
                                top: `${top}%`,
                                left: `${left}%`,
                                width: `${cellSize}%`,
                                height: `${100 / ROWS}%`
                            }}
                        >
                            <div className={`${size} p-4 flex items-center justify-center`}>
                                <img
                                    src={ASSETS[((i * 137) + (i % 3) * 5) % ASSETS.length]}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain filter grayscale brightness-50 contrast-125 transition-opacity duration-300"
                                    style={{
                                        transform: `rotate(${randRot}deg) scale(${randScale})`,
                                        opacity: 0.6 + (((i * 17) % 5) / 10)
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
