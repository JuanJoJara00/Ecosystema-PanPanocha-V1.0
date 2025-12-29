import { createServerClient } from '@/lib/supabase-server';
import { DeviceApprovalForm } from './DeviceApprovalForm';
import { notFound } from 'next/navigation';

interface PageProps {
    searchParams: Promise<{ session?: string }>;
}

export default async function ApprovalPage({ searchParams }: PageProps) {
    const { session: sessionId } = await searchParams;

    if (!sessionId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Sesión inválida.</p>
            </div>
        );
    }

    const supabase = await createServerClient();

    // Fetch Session
    const { data: sessionData, error } = await supabase
        .from('provisioning_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (error || !sessionData) {
        console.error("Session fetch error:", error);
        return notFound();
    }

    // Fetch Branches (for selection)
    const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <DeviceApprovalForm
                session={sessionData}
                branches={branches || []}
            />
        </div>
    );
}
