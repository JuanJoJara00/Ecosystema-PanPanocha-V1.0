import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { Product } from '@panpanocha/types';

export class ProductService {
    constructor(private supabase: SupabaseClient<Database>) { }

    /**
     * Obtiene todos los productos con sus recetas e información de inventario.
     * WHY: Centraliza la consulta compleja para usarla en UI y Sync.
     */
    async getAll() {
        const { data, error } = await this.supabase
            .from('products')
            .select(`
                *,
                recipes:product_recipes(
                    id,
                    quantity_required,
                    ingredient:inventory_items(id, name, unit)
                )
            `)
            .order('name');

        if (error) throw new Error(`Error fetching products: ${error.message}`);
        return data;
    }

    /**
     * Obtiene productos activos formateados para sincronización con POS.
     * WHY: El POS necesita una estructura plana y optimizada.
     */
    async getForPosSync(branchId: string | null) {
        // En teoría podríamos filtrar por branchId si hay productos por sede,
        // pero por ahora es catálogo global activo.
        const { data, error } = await this.supabase
            .from('products')
            .select('id, name, price, category, active, image_url, updated_at')
            .eq('active', true);

        if (error) throw error;

        // Mapeo a la interfaz exacta que espera el POS (Anti-Corruption Layer)
        // Aseguramos que los tipos coincidan con lo que SQLite espera
        return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            category: p.category,
            active: p.active ? 1 : 0, // SQLite boolean as integer mapping if needed, or keeping bool if Drizzle handles it. 
            // Drizzle schema says: active: integer('active', { mode: 'boolean' })
            // PowerSync sends what Supabase sends. Supabase sends bool. Drizzle/PowerSync handles conversion usually.
            // Let's pass boolean to be safe if that's what was working, or casting if needed.
            // Existing sync route sent `*` from Supabase (bool).
            // Let's keep it mostly raw but sanitized.
            image_url: p.image_url,
            // last_synced_at injected by client usually, or we send updated_at
            updated_at: p.updated_at
        }));
    }

    /**
     * Crea un producto y su receta de forma transaccional.
     * NOTA: Idealmente esto usaría un RPC, pero aquí simulamos transacción en cliente si RPC no existe.
     */
    async createWithRecipe(productData: Partial<Product>, ingredients: { id: string; qty: number }[]) {
        // 1. Crear Producto
        const { data: product, error: prodError } = await this.supabase
            .from('products')
            .insert({
                name: productData.name,
                price: productData.price || 0,
                category: productData.category,
                active: productData.active ?? true,
                description: productData.description
            })
            .select()
            .single();

        if (prodError) throw prodError;

        if (ingredients && ingredients.length > 0) {
            // 2. Preparar Receta
            const recipeItems = ingredients.map(ing => ({
                product_id: product.id,
                ingredient_id: ing.id, // Assuming 'inventory_items' id
                quantity_required: ing.qty
            }));

            // 3. Insertar Receta
            const { error: recipeError } = await this.supabase
                .from('product_recipes')
                .insert(recipeItems);

            if (recipeError) {
                console.error('Recipe failed, rolling back product...');
                await this.supabase.from('products').delete().eq('id', product.id);
                throw recipeError;
            }
        }

        return product;
    }
}
