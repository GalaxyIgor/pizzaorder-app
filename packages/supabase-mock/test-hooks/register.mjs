// Permite rodar os .ts do pacote direto no Node (type stripping) mesmo com
// imports sem extensão — que é o estilo exigido pelo tsconfig dos apps.
// Uso: node --import ./test-hooks/register.mjs ...
import { register } from 'node:module';

register('./resolve-ts.mjs', import.meta.url);
