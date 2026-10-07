// The door: one check every web request passes before a page is rendered.
//
// The same file runs on every site (Boşa Gezme, bankaci-web, KrediBul, coffee-dictionary,
// yalinli), next to the generated door-data.json, and is called as the first statement of
// the site's middleware or proxy:
//
//   const verdict = door(request, SITE);
//   if (verdict.action !== 'pass') return doorResponse(verdict);
//
// The middleware's matcher decides what the door sees. It must include DOOR_BEACON
// (/__door/seen), which the refusal page loads so a refused browser shows up in the logs.
//
// It uses nothing but Web-standard APIs, so it runs unchanged on the edge and the Node
// runtime. Copy it byte for byte; a site's differences belong in its DoorSite, never here.
//
// What it does, in order:
//
// E1 Probe paths (.env, .git, wp-admin, *.php and the rest of an explicit list) get a 404
//    without rendering. None of our sites serves any of them; only scanners ask.
// E2 Names: a crawler on the no-reader list gets 403 on every path. The shape rules (an empty
//    user agent, one that is a URL, the truncated scanner-kit string) apply only on content
//    pages, and only to a GET that sends neither Accept-Language nor Sec-Fetch-Mode: a
//    browser behind a proxy that strips the user agent still sends those, the scanner kits
//    do not. They never apply to a security vendor's address (quiet.vendors), on any site:
//    a mail filter checking a link sends no user agent at all. A site with trustVendors also
//    lets the vendors past the crawler names.
// E3 Networks: the proven scanner blocks get 403 everywhere; the Alibaba and Tencent clouds
//    get 403 on content pages, where the scraping happens, or only a would-refuse line on a
//    site that sets networksInShadow. The client address is the LAST X-Forwarded-For entry,
//    which Cloud Run's edge appends; anything before it is whatever the caller chose to send.
//
// robots.txt and /.well-known/* (app links: apple-app-site-association, assetlinks.json)
// always pass, so every crawler can read what it is asked to do and the apps keep opening
// links.
//
// The shadow layers below never refuse anything in this release. They only write a
// would-refuse line, so their thresholds can be judged on real traffic first:
//
// S1 Per-address rate buckets for page documents and Next payloads, per instance.
// S2 Browser header checks: a browser that sends Sec-Fetch headers on every HTTPS request,
//    seen without them.
// S3 A request naming a search or answer crawler from outside that publisher's ranges.
//
// A refusal or a would-refuse writes one JSON line through console.warn: {door, layer,
// reason, site, ip, ua, path, ...}. No cookies, no query strings. The same address (an IPv6
// /64) gets at most one line a minute for the same door, layer and reason; the next line
// written for them says how many were held back in between (suppressed).
//
// A door built on a door-data.json more than 45 days old writes one NOTICE line saying so.
//
// A request carrying x-door-key equal to the DOOR_KEY environment value skips S1 and S2, for
// the owner's own scripts. It never skips E1-E3.
//
// Anything that goes wrong inside the door lets the request through: a bug here must cost
// protection, never a visitor.

import DOOR_DATA_JSON from './door-data.json';

// ---------------------------------------------------------------------------------------
// Public types

export type DoorAction = 'pass' | 'refuse' | 'answer';

// open: robots.txt and /.well-known. beacon: the refusal page's ping. next: /_next/*.
// api: /api/*. metadata: icon, OG image and app-association routes without a dot.
// static: any other path whose last segment has a dot. The rest are pages:
// document (a browser navigation), plain (a page GET without text/html in Accept),
// prefetch (Sec-Purpose / Purpose: prefetch), rsc (a Next payload as middleware sees it:
// navigation or prefetch, which Next has made impossible to tell apart), rsc-nav and
// rsc-prefetch (a Next payload whose RSC header is still there), other (POST and friends:
// forms, server actions).
//
// Next removes RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch
// and the _rsc query before middleware or proxy runs (next/dist/server/web/adapter.js, the
// same in 15.5 and 16), so in a site's middleware every payload is 'rsc'. What survives is
// Next-Url, which only the Next client sends, and the Sec-Fetch-* of a fetch() call.
export type RequestKind =
  | 'open' | 'beacon' | 'next' | 'api' | 'metadata' | 'static'
  | 'document' | 'plain' | 'prefetch' | 'rsc' | 'rsc-nav' | 'rsc-prefetch' | 'other';

export interface DoorLogLine {
  severity: 'WARNING' | 'NOTICE' | 'INFO' | 'ERROR';
  message: string;
  door: 'refused' | 'would-refuse' | 'seen' | 'notice' | 'error';
  layer: string;
  reason: string;
  site: string;
  ip: string;
  ua: string;
  path: string;
  host: string;
  method: string;
  kind: RequestKind;
  [extra: string]: unknown;
}

export interface DoorResult {
  action: DoorAction;
  status?: number;
  body?: string | null;
  headers?: Record<string, string>;
  // The line a refusal or a would-refuse stands for. logged is false when it was held back
  // because the same line had been written for the address in the last minute.
  log?: DoorLogLine;
  logged?: boolean;
  kind: RequestKind;
  ip?: string;
}

export interface BucketLimit {
  // Requests allowed at once, refill per second, and a separate cap per day.
  burst: number;
  perSecond: number;
  perDay: number;
}

export interface DoorRates {
  // Page documents (and page GETs without text/html, counted in their own bucket).
  document: BucketLimit;
  // Next payloads. In middleware a prefetch looks like a navigation, so both are counted
  // here; only a prefetch whose header is still there (rsc-prefetch) goes uncounted. Never
  // the document bucket.
  rsc: BucketLimit;
  // An IPv6 /48 gets this many times an address's limits, on top of its /64's own.
  aggregate48: number;
  // Requests without a usable address share one key with this many times the limits.
  addressless: number;
}

export interface DoorSite {
  // Short name written into every log line: 'bosagezme', 'bankaci-web', 'kredibul', ...
  site: string;
  // Pages the Alibaba and Tencent networks are refused on (E3a). Called with the request
  // path, still percent-encoded, with any .rsc suffix removed.
  content: (path: string) => boolean;
  // Pages no shadow layer counts or judges and E3a never touches: portal sessions, token
  // links, forms, legal and account pages. Same argument as content.
  exempt?: (path: string) => boolean;
  // Extra crawler names for E2, on top of SHARED_UNWELCOME.
  unwelcome?: readonly string[];
  // Shared names this site keeps open, matched case-insensitively. Bankacı keeps CCBot: it
  // lets training crawlers in for GEO, and its robots.txt says so.
  welcome?: readonly string[];
  // Log the Alibaba and Tencent networks (E3a) as would-refuse instead of refusing them.
  // Bankacı sets it: what those networks take there is small, and the one person who could
  // be behind them is a banker on a VPN, which that site never risks.
  networksInShadow?: boolean;
  // Extra CIDRs refused on every path but robots.txt and /.well-known.
  refusedNetworks?: readonly string[];
  // S1 limits; RATES_DEFAULT when left out.
  rates?: DoorRates;
  // Let security vendors' URL checkers past E2's crawler names too; the shape rules never
  // judge them on any site. Bankacı sets it: a categoriser that is refused can get the whole
  // domain blocked by the banks' own proxies.
  trustVendors?: boolean;
  // An address shown on the refusal page.
  contact?: string;
  // Cookie names whose presence S2 records (never their values).
  siteCookies?: readonly string[];
  // Paths only a browser running our JavaScript requests (runtime config, analytics,
  // CSP reports). S2 notes when the same address asked for one in the last two minutes.
  jsEvidence?: (path: string) => boolean;
  // Overrides the DOOR_KEY environment value.
  doorKey?: string;
}

export interface DoorOptions {
  now?: () => number;
  log?: (line: string) => void;
  store?: DoorStore;
  throttle?: LineThrottle;
  data?: DoorData;
}

interface Cidrs {
  v4: readonly string[];
  v6: readonly string[];
}

export interface DoorData {
  generated: string;
  refused: {
    asns: Record<string, Cidrs & {holder?: string}>;
    proven: readonly {cidr: string; label: string}[];
  };
  bots: Record<string, Cidrs>;
  quiet: {own: Cidrs; vendors: Cidrs};
}

// ---------------------------------------------------------------------------------------
// Policy

// Crawlers that bring no readers to any of our sites, refused everywhere by name. Each site
// adds its own list on top (and feeds the union to its robots.txt).
export const SHARED_UNWELCOME: readonly string[] = [
  'ShapBot', 'Reflectionbot', 'Scrapy', 'panscient', 'cold-email-radar', 'Bytespider', 'CCBot',
  'Diffbot', 'omgili', 'Timpibot', 'ImagesiftBot', 'FriendlyCrawler', 'Webzio-Extended',
];

// Thresholds from the request logs of all four sites. The busiest real address made 24 page
// documents in 10 s, 30 in a minute, 59 in an hour and 129 in a day; the defaults leave at
// least five times that at every window. Next payloads, navigations and prefetches alike, are
// counted apart from pages (one glossary page made 191 in 10 s), with a ceiling only a flood
// reaches.
export const RATES_DEFAULT: DoorRates = {
  document: {burst: 120, perSecond: 1, perDay: 2000},
  rsc: {burst: 3000, perSecond: 20, perDay: 20000},
  aggregate48: 4,
  addressless: 4,
};

// Bankacı: a bank head office can put hundreds of bankers behind one address, and they open
// the same link in the same minute.
export const RATES_BANKACI: DoorRates = {
  document: {burst: 300, perSecond: 3, perDay: 6000},
  rsc: {burst: 3000, perSecond: 20, perDay: 30000},
  aggregate48: 4,
  addressless: 4,
};

// The refusal page asks for this path, so a real browser that was refused shows up in the
// logs as a 'seen' line. A scraper fetching HTML never asks for it. The site's matcher must
// let it reach the door.
export const DOOR_BEACON = '/__door/seen';

const TRUNCATED_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// E1. An explicit list, never a rule about dots: /.well-known carries the apps' links.
const PROBE_DOT_SEGMENTS = new Set([
  '.git', '.svn', '.hg', '.aws', '.ssh', '.docker', '.ds_store', '.vscode', '.htpasswd', '.htaccess', '.npmrc',
]);
const PROBE_SEGMENTS = new Set([
  'wp-admin', 'wp-login', 'wp-content', 'wp-includes', 'wp-json', 'xmlrpc.php', 'cgi-bin', 'phpmyadmin',
  'phpinfo', 'server-status', '@fs', 'server.key', 'key.pem',
]);
const PROBE_SEGMENT_PREFIXES = ['id_rsa', 'id_ed25519', 'appsettings'];
const PROBE_EXTENSION = /\.(?:php|asp|aspx|jsp|cgi)$/;

// S3: names whose publisher says where they come from.
const CLAIMS: readonly {token: string; name: string; publisher: string}[] = [
  {token: 'googlebot', name: 'Googlebot', publisher: 'google'},
  {token: 'bingbot', name: 'bingbot', publisher: 'bing'},
  {token: 'applebot', name: 'Applebot', publisher: 'apple'},
  {token: 'oai-searchbot', name: 'OAI-SearchBot', publisher: 'openai'},
  {token: 'chatgpt-user', name: 'ChatGPT-User', publisher: 'openai'},
  {token: 'perplexitybot', name: 'PerplexityBot', publisher: 'perplexity'},
  {token: 'perplexity-user', name: 'Perplexity-User', publisher: 'perplexity'},
  {token: 'duckduckbot', name: 'DuckDuckBot', publisher: 'duckduckgo'},
  {token: 'duckassistbot', name: 'DuckAssistBot', publisher: 'duckduckgo'},
  {token: 'claude-searchbot', name: 'Claude-SearchBot', publisher: 'anthropic'},
  {token: 'claude-user', name: 'Claude-User', publisher: 'anthropic'},
];
const CLAIM_PATTERN = new RegExp(CLAIMS.map((claim) => escapeRegExp(claim.token)).join('|'), 'gi');

// Publishers whose whole published space is trusted by address alone for S1 and S2: their
// fetchers act for people (Play policy checks, Search Console, translate and prefetch
// proxies) under names nobody can list in advance.
const QUIET_PUBLISHERS = ['google', 'bing', 'apple'];

// S2. A user agent with one of these is a crawler or an in-app browser, whose headers are
// not a browser's to judge.
const BOT_TOKEN = /bot|crawl|spider|compatible|preview|fetch/i;
const IN_APP = /; wv\)|Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|LinkedInApp|Line\/|GSA\/|Version\/4\.0 Chrome\//i;

// Addresses that cannot be a visitor: private space and Google's load balancers. A last
// X-Forwarded-For entry in here means something sits between Cloud Run's edge and us.
const NOT_PUBLIC = [
  '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12',
  '192.168.0.0/16', '35.191.0.0/16', '130.211.0.0/22', '::1/128', 'fc00::/7', 'fe80::/10',
];

const JS_WINDOW_MS = 2 * 60 * 1000;
const NOTICE_EVERY_MS = 10 * 60 * 1000;
const SEEN_EVERY_MS = 10 * 60 * 1000;
const SEEN_PER_MINUTE = 60;
const REFUSAL_WINDOW_MS = 60 * 1000;
const MAX_REFUSALS = 2000;
const LINE_EVERY_MS = 60 * 1000;
const MAX_LINE_KEYS = 5000;
const DAY_SECONDS = 24 * 60 * 60;
// door-data.json is refreshed about once a month; past this age a new door says so.
const DATA_STALE_DAYS = 45;
const MAX_FIELD = 256;
// The shadow layers read only this much of a user agent: a browser's fits in it many times
// over, and a 15 KB fake one costs no more than a real one.
const UA_SCAN = 512;

// ---------------------------------------------------------------------------------------
// Addresses. IPv4 is a number; IPv6 is a BigInt (built with BigInt(), not literals, so the
// file compiles for the ES2017 targets the sites use).

const B0 = BigInt(0);
const B1 = BigInt(1);
const B16 = BigInt(16);
const B64 = BigInt(64);
const B80 = BigInt(80);
const MAX128 = (B1 << BigInt(128)) - B1;

export interface Address {
  text: string;
  v4?: number;
  v6?: bigint;
}

export function parseIPv4(text: string): number | undefined {
  const parts = text.split('.');
  if (parts.length !== 4) return undefined;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return undefined;
    const octet = Number(part);
    if (octet > 255) return undefined;
    value = value * 256 + octet;
  }
  return value;
}

export function parseIPv6(text: string): bigint | undefined {
  let source = text;
  const zone = source.indexOf('%');
  if (zone >= 0) source = source.slice(0, zone);
  if (!source.includes(':')) return undefined;
  const lastColon = source.lastIndexOf(':');
  const tail = source.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (v4 === undefined) return undefined;
    source = `${source.slice(0, lastColon + 1)}${Math.floor(v4 / 65536).toString(16)}:${(v4 % 65536).toString(16)}`;
  }
  const halves = source.split('::');
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return undefined;
  const groups = halves.length === 2 ? [...head, ...new Array<string>(missing).fill('0'), ...rest] : head;
  let value = B0;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return undefined;
    value = (value << B16) | BigInt(parseInt(group, 16));
  }
  return value;
}

function formatIPv4(value: number): string {
  return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}

// One address as it may appear in a header: bare, [v6]:port, v4:port, v6%zone, or an IPv4
// address written as IPv6 (::ffff:a.b.c.d), which is treated as the IPv4 address it is.
export function parseAddress(input: string): Address | undefined {
  let text = input.trim();
  if (!text) return undefined;
  if (text.startsWith('[')) {
    const close = text.indexOf(']');
    if (close < 0) return undefined;
    text = text.slice(1, close);
  } else if (text.indexOf(':') > 0 && text.indexOf(':') === text.lastIndexOf(':') && text.includes('.')) {
    text = text.slice(0, text.indexOf(':'));
  }
  const v4 = parseIPv4(text);
  if (v4 !== undefined) return {text: formatIPv4(v4), v4};
  const v6 = parseIPv6(text);
  if (v6 === undefined) return undefined;
  if (v6 >> BigInt(32) === BigInt(0xffff)) {
    const mapped = Number(v6 & BigInt(0xffffffff));
    return {text: formatIPv4(mapped), v4: mapped};
  }
  return {text: text.toLowerCase(), v6};
}

export interface ClientAddress {
  address?: Address;
  raw: string | null;
  problem?: 'missing' | 'unparsable' | 'unspecified' | 'not-public';
}

// The client address is the last X-Forwarded-For entry. Cloud Run's edge appends the
// address it saw; a caller can put anything before it, never after.
export function clientAddress(forwardedFor: string | null): ClientAddress {
  if (!forwardedFor || !forwardedFor.trim()) return {raw: forwardedFor, problem: 'missing'};
  const entries = forwardedFor.split(',');
  const address = parseAddress(entries[entries.length - 1] ?? '');
  if (!address) return {raw: forwardedFor, problem: 'unparsable'};
  // 0.0.0.0 is what the request log shows for some crawlers; it is no address at all.
  if (address.v4 !== undefined ? address.v4 < 16777216 : address.v6 === B0) return {raw: forwardedFor, problem: 'unspecified'};
  if (notPublic().has(address)) return {raw: forwardedFor, problem: 'not-public'};
  return {raw: forwardedFor, address};
}

interface ParsedCidr {
  v4?: [number, number];
  v6?: [bigint, bigint];
}

export function parseCidr(cidr: string): ParsedCidr | undefined {
  const slash = cidr.indexOf('/');
  const base = slash < 0 ? cidr : cidr.slice(0, slash);
  const bitsText = slash < 0 ? undefined : cidr.slice(slash + 1);
  const v4 = parseIPv4(base.trim());
  if (v4 !== undefined) {
    const bits = bitsText === undefined ? 32 : Number(bitsText);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return undefined;
    const block = Math.pow(2, 32 - bits);
    const start = v4 - (v4 % block);
    return {v4: [start, start + block - 1]};
  }
  const v6 = parseIPv6(base.trim());
  if (v6 === undefined) return undefined;
  const bits = bitsText === undefined ? 128 : Number(bitsText);
  if (!Number.isInteger(bits) || bits < 0 || bits > 128) return undefined;
  const host = (B1 << BigInt(128 - bits)) - B1;
  const start = v6 & (MAX128 ^ host);
  return {v6: [start, start | host]};
}

// A set of address ranges, merged and sorted once, looked up by binary search.
export class Ranges {
  private readonly v4Start: number[] = [];
  private readonly v4End: number[] = [];
  private readonly v6Start: bigint[] = [];
  private readonly v6End: bigint[] = [];
  readonly invalid: string[] = [];

  constructor(cidrs: Iterable<string>) {
    const four: [number, number][] = [];
    const six: [bigint, bigint][] = [];
    for (const cidr of cidrs) {
      const parsed = parseCidr(cidr);
      if (parsed?.v4) four.push(parsed.v4);
      else if (parsed?.v6) six.push(parsed.v6);
      else this.invalid.push(cidr);
    }
    four.sort((a, b) => a[0] - b[0]);
    for (const [start, end] of four) {
      const last = this.v4End.length - 1;
      if (last >= 0 && start <= this.v4End[last] + 1) {
        if (end > this.v4End[last]) this.v4End[last] = end;
      } else {
        this.v4Start.push(start);
        this.v4End.push(end);
      }
    }
    six.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    for (const [start, end] of six) {
      const last = this.v6End.length - 1;
      if (last >= 0 && start <= this.v6End[last] + B1) {
        if (end > this.v6End[last]) this.v6End[last] = end;
      } else {
        this.v6Start.push(start);
        this.v6End.push(end);
      }
    }
  }

  get size(): number {
    return this.v4Start.length + this.v6Start.length;
  }

  has(address: Address | undefined): boolean {
    if (!address) return false;
    if (address.v4 !== undefined) {
      const value = address.v4;
      let low = 0;
      let high = this.v4Start.length - 1;
      while (low <= high) {
        const middle = (low + high) >>> 1;
        if (this.v4Start[middle] <= value) low = middle + 1;
        else high = middle - 1;
      }
      return high >= 0 && value <= this.v4End[high];
    }
    if (address.v6 !== undefined) {
      const value = address.v6;
      let low = 0;
      let high = this.v6Start.length - 1;
      while (low <= high) {
        const middle = (low + high) >>> 1;
        if (this.v6Start[middle] <= value) low = middle + 1;
        else high = middle - 1;
      }
      return high >= 0 && value <= this.v6End[high];
    }
    return false;
  }
}

let notPublicRanges: Ranges | undefined;
function notPublic(): Ranges {
  if (!notPublicRanges) notPublicRanges = new Ranges(NOT_PUBLIC);
  return notPublicRanges;
}

// ---------------------------------------------------------------------------------------
// The generated data, compiled once per process.

interface CompiledData {
  generated: string;
  refusedAsns: Ranges;
  asnLabels: [string, Ranges][];
  proven: Ranges;
  provenLabels: [string, Ranges][];
  bots: Map<string, Ranges>;
  quiet: Ranges;
  vendors: Ranges;
  invalid: string[];
}

function all(cidrs: Cidrs): string[] {
  return [...cidrs.v4, ...cidrs.v6];
}

function compileData(data: DoorData): CompiledData {
  const invalid: string[] = [];
  const track = (ranges: Ranges) => {
    invalid.push(...ranges.invalid);
    return ranges;
  };
  const asnLabels: [string, Ranges][] = Object.entries(data.refused.asns).map(([asn, cidrs]) => [asn, track(new Ranges(all(cidrs)))]);
  const provenGroups = new Map<string, string[]>();
  for (const {cidr, label} of data.refused.proven) provenGroups.set(label, [...(provenGroups.get(label) ?? []), cidr]);
  const provenLabels: [string, Ranges][] = [...provenGroups].map(([label, cidrs]) => [label, track(new Ranges(cidrs))]);
  const bots = new Map<string, Ranges>();
  for (const [name, cidrs] of Object.entries(data.bots)) bots.set(name, track(new Ranges(all(cidrs))));
  const quietCidrs = [...all(data.quiet.own), ...all(data.quiet.vendors)];
  for (const name of QUIET_PUBLISHERS) quietCidrs.push(...all(data.bots[name] ?? {v4: [], v6: []}));
  return {
    generated: data.generated,
    refusedAsns: track(new Ranges(Object.values(data.refused.asns).flatMap(all))),
    asnLabels,
    proven: track(new Ranges(data.refused.proven.map((entry) => entry.cidr))),
    provenLabels,
    bots,
    quiet: track(new Ranges(quietCidrs)),
    vendors: track(new Ranges(all(data.quiet.vendors))),
    invalid: [...new Set(invalid)],
  };
}

// What the door works with when its data cannot be read: no network is refused and no
// crawler is believed, so the name and path rules still run and nobody is shut out.
function emptyData(): CompiledData {
  const none = new Ranges([]);
  return {generated: 'unavailable', refusedAsns: none, asnLabels: [], proven: none, provenLabels: [], bots: new Map(), quiet: none, vendors: none, invalid: []};
}

let defaultData: CompiledData | undefined;
function compiledDefault(): CompiledData {
  if (!defaultData) defaultData = compileData(DOOR_DATA_JSON as unknown as DoorData);
  return defaultData;
}

export function doorDataInfo(data?: DoorData): {generated: string; refused: number; quiet: number; invalid: string[]} {
  const compiled = data ? compileData(data) : compiledDefault();
  return {generated: compiled.generated, refused: compiled.refusedAsns.size + compiled.proven.size, quiet: compiled.quiet.size, invalid: compiled.invalid};
}

// ---------------------------------------------------------------------------------------
// Paths

function safeDecode(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isOpenPath(lower: string): boolean {
  return lower === '/robots.txt' || lower === '/.well-known' || lower.startsWith('/.well-known/');
}

function isSitemapPath(lower: string): boolean {
  return /(?:^|\/)sitemaps?(?:[-_.][^/]*)?(?:\/|$)/.test(lower);
}

// E1: the reason a path is a probe, or undefined.
export function probeReason(path: string): string | undefined {
  const lower = safeDecode(path).toLowerCase();
  if (isOpenPath(lower) || lower.startsWith('/_next/') || isSitemapPath(lower)) return undefined;
  if (lower === '/actuator' || lower.startsWith('/actuator/')) return 'actuator';
  if (lower === '/debug/vars' || lower.startsWith('/debug/vars/')) return 'debug-vars';
  for (const segment of lower.split('/')) {
    if (!segment) continue;
    if (segment.startsWith('.env')) return '.env';
    if (PROBE_DOT_SEGMENTS.has(segment)) return segment;
    if (PROBE_SEGMENTS.has(segment)) return segment;
    const stem = segment.split('.')[0] ?? '';
    if (stem && PROBE_SEGMENTS.has(stem)) return stem;
    for (const prefix of PROBE_SEGMENT_PREFIXES) if (segment.startsWith(prefix)) return prefix;
    if (PROBE_EXTENSION.test(segment)) return `*${segment.slice(segment.lastIndexOf('.'))}`;
  }
  return undefined;
}

// Next's image and icon routes: /icon, /apple-icon2, /opengraph-image-1ynb5e, and with
// generateImageMetadata one segment more (/opengraph-image/small).
const METADATA_SEGMENT = /^(?:opengraph-image|twitter-image|apple-icon|icon)\d*(?:-[a-z0-9]{1,6})?$/i;

export interface Classified {
  kind: RequestKind;
  // The path a site's matchers see: percent-encoded, with a Next .rsc suffix removed.
  page: string;
}

// What kind of request this is, from its method, path and headers alone.
export function classify(method: string, path: string, headers: Headers): Classified {
  const lower = path.toLowerCase();
  if (isOpenPath(lower)) return {kind: 'open', page: path};
  if (lower === DOOR_BEACON) return {kind: 'beacon', page: path};
  if (lower === '/_next' || lower.startsWith('/_next/')) return {kind: 'next', page: path};
  if (lower === '/api' || lower.startsWith('/api/')) return {kind: 'api', page: path};

  let page = path;
  let rscFromPath: 'nav' | 'prefetch' | undefined;
  const segmentsAt = lower.indexOf('.segments/');
  if (segmentsAt >= 0) {
    page = path.slice(0, segmentsAt);
    rscFromPath = 'prefetch';
  } else if (lower.endsWith('.prefetch.rsc')) {
    page = path.slice(0, -'.prefetch.rsc'.length);
    rscFromPath = 'prefetch';
  } else if (lower.endsWith('.rsc')) {
    page = path.slice(0, -'.rsc'.length);
    rscFromPath = 'nav';
  }
  if (rscFromPath && (page === '/index' || page === '')) page = '/';

  const accept = (headers.get('accept') ?? '').toLowerCase();
  const segments = page.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  if (!rscFromPath) {
    if (last.includes('.')) return {kind: 'static', page};
    if (lower === '/apple-app-site-association') return {kind: 'metadata', page};
    // A page whose slug happens to look like a metadata route ('/stores/icon-home') is
    // still a page when a browser asks for it as one.
    const previous = segments[segments.length - 2] ?? '';
    if ((METADATA_SEGMENT.test(last) || METADATA_SEGMENT.test(previous)) && !accept.includes('text/html')) {
      return {kind: 'metadata', page};
    }
  }

  // The RSC header and the .rsc path forms reach the door only from a caller that hands it the
  // request as the browser sent it; Next's own middleware never shows them (see RequestKind).
  const upper = method.toUpperCase();
  const rscHeader = headers.get('rsc') === '1';
  const prefetchHeader = headers.has('next-router-prefetch') || headers.has('next-router-segment-prefetch');
  if (rscHeader || rscFromPath) {
    return {kind: prefetchHeader || rscFromPath === 'prefetch' ? 'rsc-prefetch' : 'rsc-nav', page};
  }
  if (upper !== 'GET' && upper !== 'HEAD') return {kind: 'other', page};
  const purpose = `${headers.get('sec-purpose') ?? ''} ${headers.get('purpose') ?? ''}`.toLowerCase();
  if (purpose.includes('prefetch')) return {kind: 'prefetch', page};
  if (accept.includes('text/html')) return {kind: 'document', page};
  return {kind: nextPayload(headers) ? 'rsc' : 'plain', page};
}

// A page GET made by our own pages' JavaScript, as the Next client makes every navigation and
// prefetch payload: it carries Next-Url (whenever the router has one), and every browser that
// sends Sec-Fetch-* marks it as a fetch() with an empty destination. The caller has already
// made sure it does not ask for text/html.
function nextPayload(headers: Headers): boolean {
  if (headers.has('next-url')) return true;
  const mode = headers.get('sec-fetch-mode');
  return headers.get('sec-fetch-dest') === 'empty' && (mode === 'cors' || mode === 'same-origin');
}

const PAGE_KINDS = new Set<RequestKind>(['document', 'plain', 'prefetch', 'rsc', 'rsc-nav', 'rsc-prefetch', 'other']);
const CONTENT_KINDS = new Set<RequestKind>(['document', 'plain', 'prefetch', 'rsc', 'rsc-nav', 'rsc-prefetch']);
// The kinds S1 counts, and the bucket each one is counted in.
const COUNTED: Partial<Record<RequestKind, 'doc' | 'plain' | 'rsc'>> = {document: 'doc', plain: 'plain', rsc: 'rsc', 'rsc-nav': 'rsc'};

// Builds a path test from simple patterns: '/' and '/privacy' match exactly; '/tr/*' matches
// /tr and everything below it; ':name' is any one segment; '{tr,en}' is either word; a '*'
// inside a segment is any part of it ('/ac*' matches /ac and /account). Matching ignores
// case and a trailing slash.
export function paths(...patterns: (string | RegExp)[]): (path: string) => boolean {
  const compiled = patterns.map((pattern) => (typeof pattern === 'string' ? compilePattern(pattern) : pattern));
  return (path: string) => {
    const normalized = path.length > 1 && path.endsWith('/') ? path.replace(/\/+$/, '') || '/' : path;
    return compiled.some((pattern) => pattern.test(normalized));
  };
}

function compilePattern(pattern: string): RegExp {
  let body = pattern;
  let tail = '';
  if (body.endsWith('/*')) {
    body = body.slice(0, -2);
    tail = '(?:/.*)?';
  }
  const source = body
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) return '[^/]+';
      const choice = /^\{([^}]+)\}$/.exec(segment);
      if (choice) return `(?:${choice[1].split(',').map(escapeRegExp).join('|')})`;
      return segment.split('*').map(escapeRegExp).join('[^/]*');
    })
    .join('/');
  return new RegExp(`^${source || (tail ? '' : '/')}${tail}$`, 'i');
}

// ---------------------------------------------------------------------------------------
// E2

function compileNames(extra: readonly string[] | undefined, keep?: readonly string[]): {pattern: RegExp; names: Map<string, string>} {
  const names = new Map<string, string>();
  for (const name of [...SHARED_UNWELCOME, ...(extra ?? [])]) {
    if (name.trim()) names.set(name.toLowerCase(), name);
  }
  for (const name of keep ?? []) names.delete(name.toLowerCase());
  const alternatives = [...names.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  return {pattern: new RegExp(alternatives.length ? alternatives.join('|') : '(?!)', 'i'), names};
}

// E2: the reason a user agent is refused by name, or undefined. A crawler that names itself
// is refused wherever it goes. The shape rules -- no user agent, a URL, the truncated kit
// string -- are judged only when judgeShape is true, which the door makes it only for a GET
// of a content page without Accept-Language and Sec-Fetch-Mode. No browser sends those
// shapes, but a person's odd tool or a proxy that strips the user agent might, and so does a
// mail filter checking a link: a legal page, a form, a token link, a redirect or a request
// with a browser's other headers is never worth that risk.
export function nameReason(userAgent: string | null, unwelcome: {pattern: RegExp; names: Map<string, string>}, judgeShape = true): string | undefined {
  const value = (userAgent ?? '').trim();
  if (judgeShape) {
    if (!value) return 'ua-empty';
    if (/^https?:\/\//i.test(value)) return 'ua-url';
    if (value === TRUNCATED_UA) return 'ua-truncated';
  }
  if (!value) return undefined;
  const match = unwelcome.pattern.exec(value);
  if (match) return `unwelcome:${unwelcome.names.get(match[0].toLowerCase()) ?? match[0]}`;
  return undefined;
}

// ---------------------------------------------------------------------------------------
// S1: token buckets, per instance, in memory.

interface Bucket {
  tokens: number;
  at: number;
  cap: number;
  // Tokens per millisecond.
  rate: number;
}

interface Entry {
  buckets: Record<string, Bucket>;
  js?: number;
}

export interface BucketSpec {
  name: string;
  cap: number;
  perSecond: number;
}

export interface TakeClaim {
  key: string;
  specs: readonly BucketSpec[];
}

export interface TakeFailure {
  key: string;
  bucket: string;
  retryAfter: number;
}

function refill(bucket: Bucket, now: number): void {
  const elapsed = now - bucket.at;
  if (elapsed > 0) {
    bucket.tokens = Math.min(bucket.cap, bucket.tokens + elapsed * bucket.rate);
    bucket.at = now;
  }
}

function refilledShare(bucket: Bucket, now: number): number {
  const tokens = Math.min(bucket.cap, bucket.tokens + Math.max(0, now - bucket.at) * bucket.rate);
  return tokens / bucket.cap;
}

// Keys stay until every bucket they hold has refilled, so a crawler that pauses between
// batches comes back to the buckets it left. Memory is capped: above maxKeys, the entries
// closest to full go first, which keeps the ones that say the most about a flood.
export class DoorStore {
  readonly entries = new Map<string, Entry>();
  private lastSweep = 0;

  constructor(readonly maxKeys = 50000, readonly sweepEveryMs = 60000) {}

  get size(): number {
    return this.entries.size;
  }

  private entry(key: string): Entry {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {buckets: {}};
      this.entries.set(key, entry);
    }
    return entry;
  }

  // Takes one token from every bucket of every claim, or from none if any of them is empty
  // (a refused request would not have been served). Returns the first empty bucket.
  take(claims: readonly TakeClaim[], now: number): TakeFailure | undefined {
    const touched: Bucket[] = [];
    let failure: TakeFailure | undefined;
    for (const claim of claims) {
      const entry = this.entry(claim.key);
      for (const spec of claim.specs) {
        let bucket = entry.buckets[spec.name];
        if (!bucket) {
          bucket = {tokens: spec.cap, at: now, cap: spec.cap, rate: spec.perSecond / 1000};
          entry.buckets[spec.name] = bucket;
        } else {
          refill(bucket, now);
        }
        if (bucket.tokens < 1 && !failure) {
          failure = {key: claim.key, bucket: spec.name, retryAfter: Math.max(1, Math.ceil((1 - bucket.tokens) / (bucket.rate * 1000)))};
        }
        touched.push(bucket);
      }
    }
    if (!failure) for (const bucket of touched) bucket.tokens -= 1;
    this.maybeSweep(now);
    return failure;
  }

  markJs(key: string, now: number): void {
    this.entry(key).js = now;
    this.maybeSweep(now);
  }

  lastJs(key: string): number | undefined {
    return this.entries.get(key)?.js;
  }

  // Whether every bucket of an entry is full again and its JavaScript mark has expired.
  isSpent(entry: Entry, now: number): boolean {
    if (entry.js !== undefined && now - entry.js <= JS_WINDOW_MS) return false;
    for (const name in entry.buckets) {
      if (refilledShare(entry.buckets[name], now) < 1) return false;
    }
    return true;
  }

  sweep(now: number): void {
    this.lastSweep = now;
    for (const [key, entry] of this.entries) {
      if (this.isSpent(entry, now)) this.entries.delete(key);
    }
    if (this.entries.size <= this.maxKeys) return;
    const ranked: [string, number][] = [];
    for (const [key, entry] of this.entries) {
      let share = 1;
      for (const name in entry.buckets) share = Math.min(share, refilledShare(entry.buckets[name], now));
      ranked.push([key, share]);
    }
    ranked.sort((a, b) => b[1] - a[1]);
    const target = Math.floor(this.maxKeys * 0.9);
    for (const [key] of ranked) {
      if (this.entries.size <= target) break;
      this.entries.delete(key);
    }
  }

  private maybeSweep(now: number): void {
    if (now - this.lastSweep >= this.sweepEveryMs || this.entries.size > this.maxKeys) this.sweep(now);
  }
}

function specsFor(name: 'doc' | 'plain' | 'rsc', rates: DoorRates, factor: number): BucketSpec[] {
  const limit = name === 'rsc' ? rates.rsc : rates.document;
  return [
    {name, cap: limit.burst * factor, perSecond: limit.perSecond * factor},
    {name: `${name}Day`, cap: limit.perDay * factor, perSecond: (limit.perDay * factor) / DAY_SECONDS},
  ];
}

// The keys an address is counted under: an IPv4 address; an IPv6 /64 (one household or one
// phone) plus its /48; or the one shared key of requests without a usable address.
export function rateKeys(address: Address | undefined): {key: string; factor: 'one' | 'aggregate' | 'addressless'}[] {
  if (!address) return [{key: 'none', factor: 'addressless'}];
  if (address.v6 !== undefined) {
    return [
      {key: `6:${(address.v6 >> B64).toString(16)}`, factor: 'one'},
      {key: `48:${(address.v6 >> B80).toString(16)}`, factor: 'aggregate'},
    ];
  }
  return [{key: `4:${address.text}`, factor: 'one'}];
}

// ---------------------------------------------------------------------------------------
// Log lines: at most one a minute per address and rule.

// A scraper refused 50 times a second would otherwise write a line for each request. Per key
// (an address's rate key with the door, layer and reason) one line is written per window;
// the ones in between are only counted, and the next line written carries the count. Memory
// is capped: past maxKeys the key written longest ago is forgotten, count and all.
export class LineThrottle {
  private readonly entries = new Map<string, {at: number; held: number}>();

  constructor(readonly maxKeys = MAX_LINE_KEYS, readonly windowMs = LINE_EVERY_MS) {}

  get size(): number {
    return this.entries.size;
  }

  // How many lines were held back for the key since the last one written, when this one is
  // to be written; undefined when it is to be held back too.
  admit(key: string, now: number): number | undefined {
    const entry = this.entries.get(key);
    if (entry && now >= entry.at && now - entry.at < this.windowMs) {
      entry.held += 1;
      return undefined;
    }
    const held = entry?.held ?? 0;
    // Re-inserted, so the map stays ordered by the time each key was last written.
    this.entries.delete(key);
    this.entries.set(key, {at: now, held: 0});
    if (this.entries.size > this.maxKeys) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    return held;
  }
}

// ---------------------------------------------------------------------------------------
// S2

interface BrowserClaim {
  engine: 'chrome' | 'firefox' | 'safari';
  major: number;
}

// The browsers that send Sec-Fetch-* on every HTTPS request: Chromium 80+ (Chrome, Edge,
// Opera, Samsung, Yandex), Firefox 90+ and Safari 17+. In-app browsers and anything that
// calls itself a bot are left alone, and so are iOS browsers other than Safari.
export function browserClaim(userAgent: string): BrowserClaim | undefined {
  const ua = userAgent.slice(0, UA_SCAN);
  if (BOT_TOKEN.test(ua) || IN_APP.test(ua)) return undefined;
  const chrome = /Chrome\/(\d+)/.exec(ua);
  if (chrome) {
    const major = Number(chrome[1]);
    return major >= 80 ? {engine: 'chrome', major} : undefined;
  }
  const firefox = /Firefox\/(\d+)/.exec(ua);
  if (firefox) {
    const major = Number(firefox[1]);
    return major >= 90 ? {engine: 'firefox', major} : undefined;
  }
  const safari = /Version\/(\d+)(?:\.\d+)* (?:Mobile\/\S+ )?Safari\//.exec(ua);
  if (safari && !/CriOS|FxiOS|EdgiOS|OPiOS|Android|Chromium/.test(ua)) {
    const major = Number(safari[1]);
    return major >= 17 ? {engine: 'safari', major} : undefined;
  }
  return undefined;
}

// sec-ch-ua's Chromium version against the user agent's: 'absent' when there is nothing to
// compare.
function hintsAgree(headers: Headers, major: number): 'match' | 'mismatch' | 'absent' {
  const hints = headers.get('sec-ch-ua');
  if (!hints) return 'absent';
  const chromium = /"Chromium";\s*v="(\d+)"/i.exec(hints);
  if (!chromium) return 'absent';
  return Number(chromium[1]) === major ? 'match' : 'mismatch';
}

function cookieNames(header: string | null): Set<string> {
  const names = new Set<string>();
  if (!header) return names;
  for (const part of header.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) names.add(name);
  }
  return names;
}

function refererHost(header: string | null): string {
  if (!header) return '';
  try {
    return new URL(header).host;
  } catch {
    return 'unparsable';
  }
}

// ---------------------------------------------------------------------------------------
// Responses

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

// One page for every refusal, whichever rule fired: which one it was is in the log only.
function refusalPage(contact: string | undefined): string {
  const mail = contact ? escapeHtml(contact) : '';
  const writeTr = mail ? ` Bir yanlışlık olduğunu düşünüyorsanız bize yazın: <a href="mailto:${mail}">${mail}</a>` : '';
  const writeEn = mail ? ` If you think this is a mistake, write to us: <a href="mailto:${mail}">${mail}</a>` : '';
  return [
    '<!doctype html>',
    '<html lang="tr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex">',
    '<title>Erişim yok / Access refused</title>',
    '<style>body{font:16px/1.5 system-ui,sans-serif;max-width:34rem;margin:12vh auto;padding:0 16px;color:#1a1a1a;background:#fff}',
    'a{color:#0b57d0}hr{border:0;border-top:1px solid #ccc;margin:2em 0}',
    '@media (prefers-color-scheme:dark){body{color:#eee;background:#121212}a{color:#8ab4f8}hr{border-color:#444}}</style>',
    '</head><body>',
    '<p><strong>Bu istek otomatik bir kural tarafından geri çevrildi.</strong></p>',
    `<p>VPN ya da proxy kullanıyorsanız kapatıp <a href="">yeniden deneyin</a>.${writeTr}</p>`,
    '<hr>',
    '<p lang="en"><strong>This request was turned away by an automated rule.</strong></p>',
    `<p lang="en">If you are using a VPN or a proxy, turn it off and <a href="">try again</a>.${writeEn}</p>`,
    `<img src="${DOOR_BEACON}" alt="" width="1" height="1">`,
    '</body></html>',
  ].join('\n');
}

const REFUSAL_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex',
};

const PROBE_HEADERS = {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store'};

// The Response a non-pass verdict stands for.
export function doorResponse(result: DoorResult): Response {
  const noBody = result.body === undefined || result.body === null || result.status === 204 || result.status === 304;
  return new Response(noBody ? null : result.body, {status: result.status ?? 200, headers: result.headers});
}

// ---------------------------------------------------------------------------------------
// The door

function clip(text: string): string {
  return text.length > MAX_FIELD ? `${text.slice(0, MAX_FIELD)}…` : text;
}

function sameSecret(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  let difference = given.length ^ expected.length;
  for (let i = 0; i < expected.length; i += 1) {
    difference |= expected.charCodeAt(i) ^ given.charCodeAt(i % Math.max(1, given.length));
  }
  return difference === 0;
}

function environmentKey(): string | undefined {
  try {
    const holder = globalThis as {process?: {env?: Record<string, string | undefined>}};
    const value = holder.process?.env?.DOOR_KEY;
    return value && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function requestPath(request: Request): {path: string; host: string} {
  const withNext = request as Request & {nextUrl?: URL};
  const url = withNext.nextUrl ?? new URL(request.url);
  return {path: url.pathname || '/', host: request.headers.get('host') ?? url.host};
}

export type Door = (request: Request) => DoorResult;

export function createDoor(site: DoorSite, options: DoorOptions = {}): Door {
  const now = options.now ?? (() => Date.now());
  const write = options.log ?? ((line: string) => console.warn(line));
  const store = options.store ?? new DoorStore();
  const throttle = options.throttle ?? new LineThrottle();
  let data: CompiledData;
  try {
    data = options.data ? compileData(options.data) : compiledDefault();
  } catch (error) {
    data = emptyData();
    write(JSON.stringify({severity: 'ERROR', message: 'door: door-data.json unreadable, networks not checked', door: 'error', site: site.site, error: String(error).slice(0, 300)}));
  }
  const unwelcome = compileNames(site.unwelcome, site.welcome);
  const extraRefused = new Ranges(site.refusedNetworks ?? []);
  const rates = site.rates ?? RATES_DEFAULT;
  const doorKey = site.doorKey ?? environmentKey();
  const exempt = site.exempt ?? (() => false);
  const siteCookies = site.siteCookies ?? [];
  let lastNotice = -Infinity;
  const seen = new Map<string, number>();
  let seenMinute = -Infinity;
  let seenInMinute = 0;
  // The last 403 per address, oldest first, so the beacon's line can say whether the browser
  // that loaded the refusal page had really just been refused, and by which rule.
  const refusals = new Map<string, {at: number; rule: string}>();

  const labelOf = (labels: [string, Ranges][], address: Address, fallback: string): string =>
    labels.find(([, ranges]) => ranges.has(address))?.[0] ?? fallback;
  // The refused list an address is on: an ASN, a proven block's label, 'site', or ''.
  const refusedList = (address: Address | undefined): string => {
    if (!address) return '';
    if (data.proven.has(address)) return labelOf(data.provenLabels, address, 'proven');
    if (extraRefused.has(address)) return 'site';
    if (data.refusedAsns.has(address)) return labelOf(data.asnLabels, address, 'asn');
    return '';
  };

  if (data.invalid.length || extraRefused.invalid.length) {
    write(JSON.stringify({severity: 'ERROR', message: 'door: unreadable ranges ignored', door: 'error', site: site.site, invalid: [...data.invalid, ...extraRefused.invalid].slice(0, 20)}));
  }

  // Old data still works, but the clouds move and the crawlers' ranges grow: a refresh that
  // never ran shows up here, once per door, never as a failure.
  try {
    const age = now() - Date.parse(data.generated);
    if (Number.isFinite(age) && age > DATA_STALE_DAYS * DAY_SECONDS * 1000) {
      const days = Math.floor(age / (DAY_SECONDS * 1000));
      write(JSON.stringify({
        severity: 'NOTICE',
        message: `door: door-data.json is ${days} days old; run scripts/refresh-door-data.mjs`,
        door: 'notice',
        layer: 'data',
        reason: 'stale-data',
        site: site.site,
        generated: data.generated,
        days,
      }));
    }
  } catch {
    // A clock or a log that fails here is not worth a door that is not built.
  }

  return function check(request: Request): DoorResult {
    let kind: RequestKind = 'other';
    try {
      const {path, host} = requestPath(request);
      const method = request.method.toUpperCase();
      const headers = request.headers;
      const ua = headers.get('user-agent');
      const classified = classify(method, path, headers);
      kind = classified.kind;
      const client = clientAddress(headers.get('x-forwarded-for'));
      const address = client.address;
      const ip = address?.text ?? '';
      const at = now();
      const protoEntries = (headers.get('x-forwarded-proto') ?? '').split(',');
      const https = (protoEntries[protoEntries.length - 1] ?? '').trim().toLowerCase() === 'https';

      const line = (door: DoorLogLine['door'], layer: string, reason: string, extra: Record<string, unknown> = {}): DoorLogLine => ({
        severity: door === 'refused' ? 'WARNING' : door === 'would-refuse' || door === 'seen' ? 'NOTICE' : 'INFO',
        message: `door ${door} ${layer} ${reason}`,
        door,
        layer,
        reason,
        site: site.site,
        ip,
        ua: clip(ua ?? ''),
        path: clip(path),
        host: clip(host),
        method,
        kind,
        ...(address ? {} : {xff: clip(client.raw ?? ''), addressProblem: client.problem}),
        ...extra,
      });
      const emit = (entry: DoorLogLine): DoorLogLine => {
        write(JSON.stringify(entry));
        return entry;
      };
      // IPv4 address, IPv6 /64, or 'none': the key S1 counts the address under.
      const keys = rateKeys(address);
      const primaryKey = keys[0].key;
      // A refused or would-refuse line, unless the same one was written for this address in
      // the last minute; then it is only counted, and the next one written says how many.
      const record = (entry: DoorLogLine): {log: DoorLogLine; logged: boolean} => {
        const held = throttle.admit(`${primaryKey} ${entry.door} ${entry.layer} ${entry.reason}`, at);
        if (held === undefined) return {log: entry, logged: false};
        if (held > 0) entry.suppressed = held;
        write(JSON.stringify(entry));
        return {log: entry, logged: true};
      };

      // A last X-Forwarded-For entry that is not a public address means something now sits
      // between Cloud Run's edge and the app, and every visitor would share one key.
      if (client.problem === 'not-public' && https && at - lastNotice >= NOTICE_EVERY_MS) {
        lastNotice = at;
        emit(line('notice', 'address', 'not-public'));
      }

      if (kind === 'open') return {action: 'pass', kind, ip};

      if (kind === 'beacon') {
        // One line per address per ten minutes, and no more than a minute's worth in all, so
        // the beacon cannot be used to flood the logs. Any client that loads images pings it,
        // headless renderers too, so the line says which refused list the address is on and
        // which rule refused it in the last minute ('' when none did): a ping is evidence of a
        // person only together with those.
        const key = ip || 'none';
        const previous = seen.get(key);
        if (at - seenMinute >= 60000) {
          seenMinute = at;
          seenInMinute = 0;
        }
        let log: DoorLogLine | undefined;
        if ((previous === undefined || at - previous >= SEEN_EVERY_MS) && seenInMinute < SEEN_PER_MINUTE) {
          if (seen.size >= 1000) seen.clear();
          seen.set(key, at);
          seenInMinute += 1;
          const last = refusals.get(key);
          log = emit(line('seen', 'beacon', 'refusal-page-loaded', {
            referer: refererHost(headers.get('referer')),
            network: refusedList(address),
            refusal: last && at - last.at <= REFUSAL_WINDOW_MS ? last.rule : '',
          }));
        }
        return {action: 'answer', status: 204, body: null, headers: {'cache-control': 'no-store'}, kind, ip, log};
      }

      // E1
      const probe = probeReason(path);
      if (probe) {
        const {log, logged} = record(line('refused', 'E1', `probe:${probe}`, {status: 404}));
        return {action: 'refuse', status: 404, body: method === 'HEAD' ? null : 'Not Found\n', headers: {...PROBE_HEADERS}, log, logged, kind, ip};
      }

      const refuse = (layer: string, reason: string): DoorResult => {
        const {log, logged} = record(line('refused', layer, reason, {status: 403}));
        const key = ip || 'none';
        refusals.delete(key);
        refusals.set(key, {at, rule: `${layer}:${reason}`});
        if (refusals.size > MAX_REFUSALS) {
          const oldest = refusals.keys().next();
          if (!oldest.done) refusals.delete(oldest.value);
        }
        return {action: 'refuse', status: 403, body: method === 'HEAD' ? null : refusalPage(site.contact), headers: {...REFUSAL_HEADERS}, log, logged, kind, ip};
      };

      const contentPage = CONTENT_KINDS.has(kind) && !exempt(classified.page) && site.content(classified.page);

      // E2. The shape rules only for a GET of a content page that sends neither
      // Accept-Language nor Sec-Fetch-Mode: every browser sends at least one of them, and a
      // proxy that strips its user agent leaves them, while the empty-agent kits send neither.
      // A HEAD or a form is never judged by shape, nor anything outside the content pages,
      // nor a security vendor's address on any site (Microsoft's mail link scanner fetches
      // '/' with no header at all). trustVendors lets the vendors past the names as well.
      const vendor = data.vendors.has(address);
      if (!(vendor && site.trustVendors)) {
        const judgeShape = !vendor && contentPage && method === 'GET' && !headers.has('accept-language') && !headers.has('sec-fetch-mode');
        const name = nameReason(ua, unwelcome, judgeShape);
        if (name) return refuse('E2', name);
      }

      // Shadow layers below write findings; nothing in them refuses.
      const findings: {layer: string; reason: string; extra: Record<string, unknown>}[] = [];

      // E3
      if (address) {
        if (data.proven.has(address)) return refuse('E3', `network:${labelOf(data.provenLabels, address, 'proven')}`);
        if (extraRefused.has(address)) return refuse('E3', 'network:site');
        if (contentPage && data.refusedAsns.has(address)) {
          const reason = `network:${labelOf(data.asnLabels, address, 'asn')}`;
          if (!site.networksInShadow) return refuse('E3', reason);
          findings.push({layer: 'E3', reason, extra: {}});
        }
      }

      // Pages the site never counts or judges: no shadow layer writes about them.
      const onPage = PAGE_KINDS.has(kind) && !exempt(classified.page);

      // S3: a claimed search or answer crawler from outside its publisher's ranges, on pages.
      let verifiedBot: string | undefined;
      if (ua && address && onPage) {
        const tokens = new Set((ua.slice(0, UA_SCAN).match(CLAIM_PATTERN) ?? []).map((token) => token.toLowerCase()));
        if (tokens.size) {
          const claims = CLAIMS.filter((claim) => tokens.has(claim.token));
          const matched = claims.find((claim) => data.bots.get(claim.publisher)?.has(address));
          if (matched) verifiedBot = matched.name;
          else findings.push({layer: 'S3', reason: `unverified:${claims[0].name}`, extra: {}});
        }
      }

      const quiet = data.quiet.has(address) || verifiedBot !== undefined || sameSecret(headers.get('x-door-key'), doorKey);
      const judged = onPage && !quiet;

      // Evidence of a browser running our JavaScript: noted per address for S2's log. Next
      // strips the RSC header before middleware, but Next-Url and Sec-Fetch-* survive.
      const jsBefore = store.lastJs(primaryKey);
      const jsSeen = jsBefore !== undefined && at - jsBefore <= JS_WINDOW_MS;
      const fetchMode = headers.get('sec-fetch-mode');
      const isJs =
        headers.get('rsc') === '1' ||
        headers.has('next-url') ||
        headers.has('next-action') ||
        ((fetchMode === 'cors' || fetchMode === 'same-origin') && headers.get('sec-fetch-dest') === 'empty') ||
        (site.jsEvidence?.(path) ?? false);
      if (isJs) store.markJs(primaryKey, at);

      // S1
      const bucket = COUNTED[kind];
      if (judged && bucket) {
        const claims = keys.map(({key, factor}) => ({
          key,
          specs: specsFor(bucket, rates, factor === 'one' ? 1 : factor === 'aggregate' ? rates.aggregate48 : rates.addressless),
        }));
        const failure = store.take(claims, at);
        if (failure) {
          findings.push({layer: 'S1', reason: `rate:${failure.bucket}`, extra: {key: failure.key, retryAfter: failure.retryAfter}});
        }
      }

      // S2
      if (judged && https && kind !== 'other' && ua) {
        const claim = browserClaim(ua);
        if (claim) {
          const fetchHeaders = fetchMode !== null;
          const hints = claim.engine === 'chrome' ? hintsAgree(headers, claim.major) : 'absent';
          if (!fetchHeaders || hints === 'mismatch') {
            const names = cookieNames(headers.get('cookie'));
            findings.push({
              layer: 'S2',
              reason: fetchHeaders ? 'hints-mismatch' : 'no-sec-fetch',
              extra: {
                engine: claim.engine,
                major: claim.major,
                js: jsSeen,
                dest: headers.has('sec-fetch-dest'),
                hints,
                lang: headers.has('accept-language'),
                cookie: names.size > 0,
                siteCookie: siteCookies.some((name) => names.has(name)),
                referer: refererHost(headers.get('referer')),
              },
            });
          }
        }
      }

      if (findings.length) {
        const [first, ...rest] = findings;
        const extra: Record<string, unknown> = {};
        for (const finding of findings) Object.assign(extra, finding.extra);
        if (rest.length) extra.also = rest.map((finding) => `${finding.layer}:${finding.reason}`);
        const {log, logged} = record(line('would-refuse', first.layer, first.reason, extra));
        return {action: 'pass', kind, ip, log, logged};
      }
      return {action: 'pass', kind, ip};
    } catch (error) {
      try {
        write(JSON.stringify({severity: 'ERROR', message: 'door: internal error, request let through', door: 'error', site: site.site, error: String(error).slice(0, 300)}));
      } catch {
        // Nothing left to do: the request goes through.
      }
      return {action: 'pass', kind};
    }
  };
}

const doors = new WeakMap<DoorSite, Door>();

// The door for a site, built once per DoorSite object and process.
export function door(request: Request, site: DoorSite): DoorResult {
  let check = doors.get(site);
  if (!check) {
    try {
      check = createDoor(site);
    } catch (error) {
      console.warn(JSON.stringify({severity: 'ERROR', message: 'door: could not be built, request let through', door: 'error', site: site.site, error: String(error).slice(0, 300)}));
      return {action: 'pass', kind: 'other'};
    }
    doors.set(site, check);
  }
  return check(request);
}
