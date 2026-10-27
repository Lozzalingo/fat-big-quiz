import { NextResponse } from 'next/server';

const DOCS_BASE = 'https://docs.laurence.computer/fat-big-quiz';

export async function GET(
  request: Request,
  { params }: { params: { path?: string[] } }
) {
  const path = params.path?.join('/') ?? '';
  if (path === 'playground' || path === 'playground/') {
    return NextResponse.redirect(`${DOCS_BASE}/playground`, 302);
  }
  return NextResponse.redirect(`${DOCS_BASE}/`, 302);
}
