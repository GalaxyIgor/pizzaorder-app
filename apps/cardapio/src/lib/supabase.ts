// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if(!url || !key){
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in the environment variables.");
}

export const supabase = createClient(url, key);