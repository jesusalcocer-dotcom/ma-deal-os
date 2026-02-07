import { createClient } from '@supabase/supabase-js';

let client: any = null;

function createProxiedFetch() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return undefined;

  const { ProxyAgent } = require('undici');
  const agent = new ProxyAgent({
    uri: proxy,
    connect: { rejectUnauthorized: false },
  });

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as any).url;
    const method = init?.method || 'GET';
    const headers = init?.headers || {};
    const body = init?.body;

    const { request } = require('undici');
    const response = await request(url, {
      method,
      headers: headers as any,
      body: body as any,
      dispatcher: agent,
    });

    const responseBody = await response.body.text();
    // Status 204 (No Content) cannot have a body per HTTP spec
    const isNullBody = response.statusCode === 204 || response.statusCode === 304;
    return new Response(isNullBody ? null : responseBody, {
      status: response.statusCode,
      headers: response.headers as any,
    });
  };
}

export function getSupabaseClient(): any {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    const proxiedFetch = createProxiedFetch();

    if (proxiedFetch) {
      client = createClient(url, key, {
        global: { fetch: proxiedFetch as any },
      });
    } else {
      client = createClient(url, key);
    }
  }
  return client;
}
