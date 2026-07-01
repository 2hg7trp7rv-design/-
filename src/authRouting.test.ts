import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Firebase Auth hosting guardrails', () => {
  it('keeps the Vercel auth helper rewrite before the SPA fallback', () => {
    const vercelConfig = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf-8'),
    ) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(vercelConfig.rewrites[0]).toEqual({
      source: '/__/auth/:path*',
      destination: 'https://mogumogu-699f5.firebaseapp.com/__/auth/:path*',
    });
    expect(vercelConfig.rewrites.at(-1)).toEqual({
      source: '/(.*)',
      destination: '/index.html',
    });
  });
});
