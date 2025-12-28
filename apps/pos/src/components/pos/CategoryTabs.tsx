import clsx from 'clsx';
import { Coffee, Croissant, Utensils, Star, LayoutGrid } from 'lucide-react';
import { Button } from '@panpanocha/ui';

interface CategoryTabsProps {
    categories: string[];
    selectedCategory: string; // 'all' or specific
    onSelect: (cat: string) => void;
}

export function CategoryTabs({ categories, selectedCategory, onSelect }: CategoryTabsProps) {
    // Helper to get icon (Generic)
    const getIcon = (cat: string) => {
        const lower = cat.toLowerCase();
        if (lower.includes('cafe') || lower.includes('bebida')) return <Coffee size={18} />;
        if (lower.includes('pan')) return <Croissant size={18} />;
        if (lower.includes('desayuno')) return <Utensils size={18} />;
        if (cat === 'Todos') return <LayoutGrid size={18} />;
        return <Star size={18} />;
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <Button
                onClick={() => onSelect('all')}
                className={clsx(
                    "px-5 py-2.5 rounded-full flex items-center gap-2 font-bold transition-all shadow-sm border whitespace-nowrap h-auto",
                    selectedCategory === 'all'
                        ? "bg-brand-primary text-brand-secondary border-brand-primary shadow-md hover:bg-brand-primary/90"
                        : "bg-white text-brand-secondary/70 border-brand-secondary/10 hover:border-brand-primary/50 hover:text-brand-primary hover:bg-white"
                )}
            >
                <LayoutGrid size={18} />
                <span>Todos</span>
            </Button>

            {categories.map(cat => (
                <Button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={clsx(
                        "px-5 py-2.5 rounded-full flex items-center gap-2 font-bold transition-all shadow-sm border whitespace-nowrap capitalize h-auto",
                        selectedCategory === cat
                            ? "bg-brand-primary text-brand-secondary border-brand-primary shadow-md hover:bg-brand-primary/90"
                            : "bg-white text-brand-secondary/70 border-brand-secondary/10 hover:border-brand-primary/50 hover:text-brand-primary hover:bg-white"
                    )}
                >
                    {getIcon(cat)}
                    <span>{cat}</span>
                </Button>
            ))}
        </div>
    );
}
