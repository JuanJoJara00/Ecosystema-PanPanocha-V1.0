'use server'

import { ProductService } from '@/services/product.service';
import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Helper to get authenticated service and user context
async function getAuthenticatedService() {
    const supabase = await createClient();

    // 1. Verify Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('Unauthorized');
    }

    // 2. Resolve Tenant Identity (SaaS Injection)
    // Note: In production, this might be in metadata, but querying profile is safer/standard
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.organization_id) {
        throw new Error('User has no organization assigned');
    }

    const service = new ProductService(supabase);
    return { service, user, organization_id: profile.organization_id };
}

export async function fetchProductsAction() {
    try {
        // Authenticated Service with RLS
        const { service } = await getAuthenticatedService();
        return { success: true, data: await service.getAll() };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createProductAction(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());

    try {
        const { service, organization_id } = await getAuthenticatedService();

        await service.createWithRecipe(
            organization_id, // Injected Identity
            {
                name: rawData.name as string,
                price: Number(rawData.price),
                category_id: rawData.category_id as string,
                active: rawData.active === 'on' || rawData.active === 'true',
                image_url: rawData.image_url as string
            },
            [] // No ingredients in typical simple form
        );

        revalidatePath('/dashboard/products');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
