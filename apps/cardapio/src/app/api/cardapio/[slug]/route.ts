// src/app/api/cardapio/[slug]/route.ts
//
// Rota pública: usa o client anon (RLS de catálogo público), não o
// service-role — dados aqui são exatamente os que as policies liberam.
// A busca em si vive em lib/cardapio-server.ts (o layout do [slug] usa a mesma).
import { NextRequest, NextResponse } from 'next/server';
import { buscarCardapio } from '@/lib/cardapio-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const resultado = await buscarCardapio(slug);

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }
  return NextResponse.json(resultado.dados);
}
