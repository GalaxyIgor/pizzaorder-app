// scripts/dev-mock.mjs
//
// `npm run dev:mock` — sobe cardapio (3000), cozinha (3001) e gestao (3002)
// em modo mock (NEXT_PUBLIC_SUPABASE_MOCK=1), sem Supabase. Os três
// compartilham o banco em .mock-db/db.json. Ctrl+C derruba todos.
//
//   npm run dev:mock               os três apps
//   npm run dev:mock -- cozinha    só os apps listados

import { spawn } from 'node:child_process';

const APPS = { cardapio: 36, cozinha: 33, gestao: 35 }; // cor ANSI do prefixo
const pedidos = process.argv.slice(2).filter((a) => a in APPS);
const apps = pedidos.length > 0 ? pedidos : Object.keys(APPS);

const env = { ...process.env, NEXT_PUBLIC_SUPABASE_MOCK: '1' };
const filhos = [];

for (const app of apps) {
  const prefixo = `\x1b[${APPS[app]}m[${app}]\x1b[0m `;
  // comando como string única: com shell: true, args separados geram DEP0190
  const filho = spawn(`npm run dev --workspace apps/${app}`, {
    env,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const repassar = (stream, destino) => {
    let resto = '';
    stream.on('data', (chunk) => {
      const linhas = (resto + chunk.toString()).split(/\r?\n/);
      resto = linhas.pop() ?? '';
      for (const l of linhas) destino.write(prefixo + l + '\n');
    });
  };
  repassar(filho.stdout, process.stdout);
  repassar(filho.stderr, process.stderr);
  filho.on('exit', (code) => console.log(`${prefixo}saiu (código ${code})`));
  filhos.push(filho);
}

console.log(`Modo mock: ${apps.join(', ')} — banco em .mock-db/ (npm run mock:reset recria)`);

const encerrar = () => {
  for (const f of filhos) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(f.pid), '/T', '/F']);
    else f.kill('SIGTERM');
  }
  process.exit(0);
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
