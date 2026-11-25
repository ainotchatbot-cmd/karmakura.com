import { CloudflareKvDriver, ReadingAccessManager, type CloudflareKVLike } from '../src/lib/reading-access.ts';
import { resolveTenantSlot } from '../src/lib/tenant.ts';

export interface Env {
  PILGRIM_KV: CloudflareKVLike;
  GEMINI_API_KEY: string;
  IP_HASH_SALT: string;
  TOKEN_SIGNING_SECRET: string;
  PROMPTPAY_WEBHOOK_SECRET: string;
  DOMAIN_HOROSCOPE?: string;
  DOMAIN_TAROT?: string;
  DOMAIN_DREAM?: string;
}

/**
 * Native Cloudflare Worker entry template using free Cloudflare KV persistence
 * (zero external paid database APIs). Wire static Vite `dist/` assets via Cloudflare Pages/Assets.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const slot = resolveTenantSlot({
      host: request.headers.get('host'),
      queryDomain: url.searchParams.get('domain'),
      headerDomain: request.headers.get('x-tenant-domain'),
    });

    const accessManager = new ReadingAccessManager(new CloudflareKvDriver(env.PILGRIM_KV));

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, slot, runtime: 'cloudflare-worker' });
    }

    if (url.pathname.startsWith('/api/orders/') && url.pathname.endsWith('/status')) {
      const orderId = url.pathname.split('/')[3] ?? '';
      const order = await accessManager.getOrder(orderId);
      if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
      return Response.json({
        orderId: order.orderId,
        status: order.status,
        readingToken: order.status === 'paid' ? order.readingToken : undefined,
      });
    }

    return Response.json({ slot, message: 'Mount static Vite dist/ via Cloudflare Assets.' });
  },
};
