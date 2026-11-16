// Parses robots.txt into agent groups and answers allow, disallow and Crawl-delay questions for one user agent using longest-match rules.

const IGNORED_FIELDS = new Set(['host', 'clean-param', 'request-rate', 'visit-time', 'noindex', 'nofollow', 'content-signal']);

export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  const errors = [];
  let current = null;
  let collectingAgents = false;
  const lines = String(text ?? '').replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
  lines.forEach((rawLine, i) => {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) return;
    const colon = line.indexOf(':');
    if (colon === -1) {
      errors.push({ line: i + 1, message: `No colon in "${line.slice(0, 80)}"` });
      return;
    }
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === 'sitemap') {
      if (value) sitemaps.push(value);
      else errors.push({ line: i + 1, message: 'Empty Sitemap value' });
      return;
    }
    if (field === 'user-agent') {
      if (!value) {
        errors.push({ line: i + 1, message: 'Empty User-agent value' });
        return;
      }
      if (!collectingAgents || !current) {
        current = { agents: [], rules: [], crawlDelay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
      return;
    }
    if (field === 'allow' || field === 'disallow' || field === 'crawl-delay') {
      collectingAgents = false;
      if (!current) {
        errors.push({ line: i + 1, message: `${field} before any User-agent` });
        return;
      }
      if (field === 'crawl-delay') {
        const seconds = Number(value);
        if (!value || !Number.isFinite(seconds) || seconds < 0) errors.push({ line: i + 1, message: `Invalid Crawl-delay "${value}"` });
        else current.crawlDelay = seconds;
        return;
      }
      current.rules.push({ allow: field === 'allow', path: value });
      return;
    }
    if (!IGNORED_FIELDS.has(field)) errors.push({ line: i + 1, message: `Unknown directive "${field}"` });
  });
  return { groups, sitemaps, errors };
}

function patternToRegExp(path) {
  const anchored = path.endsWith('$');
  const body = (anchored ? path.slice(0, -1) : path)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function selectGroups(groups, userAgent) {
  const ua = String(userAgent ?? '').toLowerCase();
  let best = '';
  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent !== '*' && ua.includes(agent) && agent.length > best.length) best = agent;
    }
  }
  const token = best || '*';
  return groups.filter((group) => group.agents.includes(token));
}

export function robotsFor(parsed, userAgent) {
  const groups = selectGroups(parsed?.groups ?? [], userAgent);
  const rules = groups
    .flatMap((group) => group.rules)
    .filter((rule) => rule.path)
    .map((rule) => ({ ...rule, length: rule.path.length, re: patternToRegExp(safeDecode(rule.path)) }));
  const delays = groups.map((group) => group.crawlDelay).filter((delay) => delay != null);
  return {
    crawlDelay: delays.length ? Math.max(...delays) : null,
    isAllowed(pathWithQuery) {
      const path = safeDecode(String(pathWithQuery || '/'));
      if (path === '/robots.txt') return true;
      let winner = null;
      for (const rule of rules) {
        if (!rule.re.test(path)) continue;
        if (!winner || rule.length > winner.length || (rule.length === winner.length && rule.allow && !winner.allow)) winner = rule;
      }
      return winner ? winner.allow : true;
    },
  };
}
