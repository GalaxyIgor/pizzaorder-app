// Rota do modo mock do Supabase (NEXT_PUBLIC_SUPABASE_MOCK=1): queries/auth do
// client de browser, realtime por polling e arquivos do storage. 404 sem a flag.
export { GET, POST } from '@pizzaorder/supabase-mock/route';
