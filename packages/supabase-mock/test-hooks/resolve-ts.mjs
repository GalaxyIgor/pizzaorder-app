// Hook de resolução: `./engine` -> `./engine.ts` quando o specifier relativo
// não tem extensão.
export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[cm]?[jt]s$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // cai no resolve padrão
    }
  }
  return nextResolve(specifier, context);
}
