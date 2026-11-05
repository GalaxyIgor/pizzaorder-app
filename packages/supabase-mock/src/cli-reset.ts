// packages/supabase-mock/src/cli-reset.ts
//
// `npm run mock:reset` — apaga .mock-db/ e recria a partir do seed.

import { dbPath, lerEstado, resetar } from './store';

resetar();
const { tables, auth_users } = lerEstado();
console.log(`mock-db recriado em ${dbPath()}`);
console.log(
  `  ${tables.pizzarias.length} pizzarias, ${tables.produtos.length} produtos, ` +
    `${tables.pedidos.length} pedidos, ${auth_users.length} usuários`
);
console.log('  Credenciais de teste: packages/supabase-mock/README.md');
