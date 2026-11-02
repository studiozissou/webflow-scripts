// Shared synthetic fixtures and a routed fake fetch for the Business Profile tool tests.
export const FAKE_ACCESS = ['ya', '29.', 'syntheticAccessValue'].join('');
export const FAKE_REFRESH = ['1/', '/0', 'syntheticRefreshValue'].join('');
export const FAKE_SECRET = ['GOC', 'SPX-', 'syntheticSecretValue'].join('');
export const FAKE_CLIENT_ID = 'synthetic-client-id';

export const json = (body, status = 200) =>
  new Response(body === undefined ? '' : JSON.stringify(body), { status });

export function routedFetch(routes) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    const parsed = new URL(url);
    const call = {
      url: String(url),
      host: parsed.host,
      path: parsed.pathname,
      params: parsed.searchParams,
      method: init.method ?? 'GET',
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    for (const [matcher, handler] of routes) {
      if (matcher(call)) return handler(call, calls);
    }
    throw new Error(`Unrouted request: ${call.method} ${call.url}`);
  };
  fetchFn.calls = calls;
  return fetchFn;
}

export const on = (method, pathPart, handler) => [
  (call) => call.method === method && call.path.includes(pathPart),
  typeof handler === 'function' ? handler : () => json(handler),
];

export const makeCtx = (fetchFn) => ({
  fetch: fetchFn,
  getToken: async () => FAKE_ACCESS,
  sleep: async () => {},
});
