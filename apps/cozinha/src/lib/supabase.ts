// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseMock } from "@pizzaorder/supabase-mock/flag";
import { createMockAdminClient } from "@pizzaorder/supabase-mock/server";

function criarClientServiceRole(): SupabaseClient {
    // Modo mock (NEXT_PUBLIC_SUPABASE_MOCK=1): banco local em .mock-db/, sem env do Supabase.
    if (isSupabaseMock()) return createMockAdminClient() as unknown as SupabaseClient;

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if(!url || !key){
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in the environment variables.");
    }

    return createClient(url, key);
}

export const supabase = criarClientServiceRole();
