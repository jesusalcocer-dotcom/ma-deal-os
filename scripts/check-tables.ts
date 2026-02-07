import { createClient } from '@supabase/supabase-js';
import { ProxyAgent, request } from 'undici';

const url = 'https://iuiasttwnukfudcestgc.supabase.co';
const key = 'sb_secret_tl-88kqeyyMTKpsrWLbbPA_WlK8hWyn';

async function main() {
  const proxy = process.env.HTTPS_PROXY;
  let customFetch: any = undefined;

  if (proxy) {
    const agent = new ProxyAgent({ uri: proxy, connect: { rejectUnauthorized: false } });
    customFetch = async (input: any, init?: any) => {
      const u = typeof input === 'string' ? input : input.toString();
      const resp = await request(u, {
        method: init?.method || 'GET',
        headers: init?.headers as any,
        body: init?.body as any,
        dispatcher: agent,
      });
      const body = await resp.body.text();
      const isNull = resp.statusCode === 204 || resp.statusCode === 304;
      return new Response(isNull ? null : body, { status: resp.statusCode, headers: resp.headers as any });
    };
  }

  const c = createClient(url, key, customFetch ? { global: { fetch: customFetch } } : {});

  const tables = ['provision_types', 'provision_variants', 'provision_formulations', 'document_versions'];
  for (const t of tables) {
    const { data, error } = await c.from(t).select('*').limit(1);
    console.log(`${t}: ${error ? 'ERROR: ' + error.message : 'OK (rows: ' + (data || []).length + ')'}`);
  }
}

main().catch(console.error);
