// Supabase Edge Function: create-employee-user
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { employeeId, email, fullName, role, branchId, sendInvitation = true } = await req.json()

        if (!employeeId || !email || !fullName || !role) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: employeeId, email, fullName, role' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const tempPassword = generatePassword()

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: !sendInvitation,
            user_metadata: {
                full_name: fullName,
                employee_id: employeeId,
                role: role
            }
        })

        if (authError) throw new Error(`Auth error: ${authError.message}`)

        await supabaseAdmin
            .from('employees')
            .update({ user_id: authUser.user.id, portal_access: true })
            .eq('id', employeeId)

        await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authUser.user.id,
                email: email,
                full_name: fullName,
                role: role,
                employee_id: employeeId,
                branch_id: branchId
            })

        if (sendInvitation) {
            await supabaseAdmin.auth.admin.inviteUserByEmail(email)
        }

        return new Response(
            JSON.stringify({
                success: true,
                userId: authUser.user.id,
                email: email,
                role: role,
                tempPassword: sendInvitation ? null : tempPassword
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})



function generatePassword(): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
}
