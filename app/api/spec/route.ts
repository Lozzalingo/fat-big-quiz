import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Fat Big Quiz',
    version: '1.0',
    description:
      'Fat Big Quiz — a live pub quiz platform with downloadable quiz packs, ' +
      'team-based scoring, and real-time leaderboards.',
    contact: { url: 'https://fatbigquiz.com' },
  },
  servers: [{ url: 'https://fatbigquiz.com', description: 'Production' }],
  tags: [
    { name: 'Health', description: 'Service health check' },
    { name: 'Cache', description: 'Cache revalidation' },
    { name: 'Webhooks', description: 'Payment callbacks' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/revalidate': {
      post: {
        tags: ['Cache'],
        summary: 'Revalidate Next.js cache',
        description:
          'Triggers on-demand revalidation of cached pages. Called by the blog ' +
          'service after new content is published.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  secret: { type: 'string', description: 'Revalidation secret token' },
                  path: { type: 'string', description: 'Path to revalidate (optional)' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Cache revalidated' },
          '401': { description: 'Invalid secret' },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
