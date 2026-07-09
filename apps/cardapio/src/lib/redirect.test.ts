// src/lib/redirect.test.ts
//
// Testes de segurança para destinoSeguro (proteção contra open redirect).
// Roda com o test runner nativo do Node (type stripping): `node --test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoSeguro } from './redirect.ts';

const FALLBACK = '/fallback';

test('aceita caminho interno simples', () => {
  assert.equal(destinoSeguro('/pizzaria/checkout', FALLBACK), '/pizzaria/checkout');
});

test('preserva query e hash de caminho interno', () => {
  assert.equal(destinoSeguro('/pizzaria/checkout?x=1#topo', FALLBACK), '/pizzaria/checkout?x=1#topo');
});

test('null / undefined / vazio caem no fallback', () => {
  assert.equal(destinoSeguro(null, FALLBACK), FALLBACK);
  assert.equal(destinoSeguro(undefined, FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('', FALLBACK), FALLBACK);
});

test('rejeita URL absoluta externa', () => {
  assert.equal(destinoSeguro('https://evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('http://evil.com/x', FALLBACK), FALLBACK);
});

test('rejeita protocol-relative //host', () => {
  assert.equal(destinoSeguro('//evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('//evil.com/path', FALLBACK), FALLBACK);
});

test('rejeita bypass por backslash (\\ vira / no navegador)', () => {
  // Estes eram aceitos pelo guard antigo e resolviam para https://evil.com/.
  assert.equal(destinoSeguro('/\\evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('/\\/evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('\\/evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('\\\\evil.com', FALLBACK), FALLBACK);
});

test('rejeita bypass por whitespace embutido (\\t \\n \\r que o navegador remove)', () => {
  assert.equal(destinoSeguro('/\t//evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('/\n//evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('/\r//evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('/ //evil.com', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('  https://evil.com', FALLBACK), FALLBACK);
});

test('rejeita esquemas perigosos', () => {
  assert.equal(destinoSeguro('javascript:alert(1)', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('data:text/html,x', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('mailto:a@b.com', FALLBACK), FALLBACK);
});

test('rejeita caminho relativo (sem barra inicial)', () => {
  assert.equal(destinoSeguro('pizzaria/checkout', FALLBACK), FALLBACK);
  assert.equal(destinoSeguro('../admin', FALLBACK), FALLBACK);
});

test('%2f%2f permanece literal e continua interno', () => {
  // %2f não é decodificado para "/" na resolução, então segue same-origin.
  assert.equal(destinoSeguro('/%2f%2fevil.com', FALLBACK), '/%2f%2fevil.com');
});
