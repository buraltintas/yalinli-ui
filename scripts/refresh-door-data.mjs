#!/usr/bin/env node
// Regenerates door-data.json, the address lists the door reads.
//
//   node scripts/refresh-door-data.mjs [--out path/to/door-data.json] [--dry-run]
//
// Without --out it writes to the first of lib/door-data.json, src/lib/door-data.json and
// door-data.json that already exists under the current directory. Run it about once a
// month, in every site at the same time, and read the diff before committing: the counts at
// the top of the file say what moved.
//
// What goes in, and why each list is there:
//
// - refused.asns: every prefix announced by Alibaba (AS45102 international, AS37963 China)
//   and Tencent (AS132203 international, AS45090 China), from RIPEstat. The scrapers on
//   these clouds rotate across dozens of prefixes, so only the whole announcement holds.
//   A prefix announced for less than half of RIPEstat's two-week window, not announced at
//   its end, or wider than an IPv4 /11 or IPv6 /20, is left out (a route leak is not the
//   network's own space) and listed in checks.briefLeftOut. Space inside a prefix that
//   another company routes now, with a route of its own equal to or more specific than the
//   prefix (leased blocks, a customer's block), is cut out and listed in
//   checks.foreignRouted; see routedSpace. The door refuses them on content pages only.
// - refused.proven: small hosting blocks that did nothing but scan and mirror in the logs.
//   The door refuses them on every path except robots.txt and /.well-known.
// - bots: the ranges each search or answer engine publishes for its crawlers and fetchers.
//   A request that names one of these crawlers is believed only from its own ranges.
// - quiet: our own Cloud Run egress and the security vendors whose URL checkers categorise
//   sites for bank and office proxies and check the links in e-mail. They are never counted
//   or judged by the shadow layers.
//
// Nothing that a person can browse from may end up in refused. Before writing, the script
// subtracts every bot, own and vendor range from the refused lists, subtracts every prefix
// announced by the Turkish home and mobile carriers and the Gulf carriers the apps are used
// on, and checks a list of known visitor addresses. A failed fetch writes nothing.

import {existsSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const RIPESTAT = 'https://stat.ripe.net/data';
const SOURCE_APP = 'door-refresh';
const USER_AGENT = 'door-refresh/1.0 (+monthly range refresh)';

// company: the holder names of the same company's other networks (Alibaba Cloud Singapore,
// Taobao, the other Tencent AS). Their routes inside a refused prefix leave the space refused:
// it is still that cloud. Any other origin takes the space it routes off the list.
const ALIBABA = /alibaba|aliyun|taobao/i;
const TENCENT = /tencent/i;
const REFUSED_ASNS = [
  {asn: 45102, expect: /alibaba/i, company: ALIBABA, minimum: 50},
  {asn: 37963, expect: /alibaba|hangzhou/i, company: ALIBABA, minimum: 50},
  {asn: 132203, expect: /tencent/i, company: TENCENT, minimum: 50},
  {asn: 45090, expect: /tencent|shenzhen/i, company: TENCENT, minimum: 100},
];

// Who routes the refused prefixes now is asked of RIPEstat once per block: the IPv4 /16 or
// IPv6 /32 around a prefix (see routeBlocks). On 7 Oct 2026 that was 279 calls, the busiest
// block holding 370 routes. related-prefixes stops at 1000 routes without saying so (47.0.0.0/8
// listed 1000 of 1676), so a block that reaches it stops the run, as do more blocks than this.
const BLOCK_BITS = {4: 16, 6: 32};
const ROUTES_SHOWN = 1000;
const MAX_BLOCKS = 600;
const PARALLEL = 4;

// Each one was seen doing nothing but probe for secrets or mirror whole sites, from every
// address in the block, on more than one of our sites. A block that only fetches a few pages
// and their images now and then (a snapshot or brand monitor) does not belong here: that is
// why 5.102.169.16/28 (CustodianDC) was taken off on 7 Oct 2026.
export const PROVEN = [
  {cidr: '45.138.12.0/24', label: 'TC Datacenter'},
  {cidr: '45.148.10.0/24', label: 'TECHOFF/DMZHOST'},
  {cidr: '93.123.109.0/24', label: 'TECHOFF/DMZHOST'},
  {cidr: '195.178.110.0/24', label: 'TECHOFF/DMZHOST'},
  {cidr: '102.220.162.0/23', label: 'VPS Dedicated'},
  {cidr: '213.209.159.0/24', label: 'Feo Prest'},
  {cidr: '88.216.183.0/24', label: 'Cherry Servers'},
];

const GOOGLE_CRAWLERS = 'https://developers.google.com/static/search/apis/ipranges';
const BOTS = {
  // Google: its crawlers and user-triggered fetchers, plus every address Google uses for
  // itself (goog.json minus the Cloud customer ranges in cloud.json), so neither a stale
  // crawler list nor a new Google fetcher is ever mistaken for an impostor. Cloud Run's
  // shared egress is in goog.json but not in cloud.json, and anyone can rent it, so it is
  // taken out again: a crawler name from there proves nothing.
  google: [
    `${GOOGLE_CRAWLERS}/googlebot.json`,
    `${GOOGLE_CRAWLERS}/special-crawlers.json`,
    `${GOOGLE_CRAWLERS}/user-triggered-fetchers.json`,
    `${GOOGLE_CRAWLERS}/user-triggered-fetchers-google.json`,
    {own: 'https://www.gstatic.com/ipranges/goog.json', minus: 'https://www.gstatic.com/ipranges/cloud.json'},
  ],
  bing: ['https://www.bing.com/toolbox/bingbot.json'],
  openai: ['https://openai.com/searchbot.json', 'https://openai.com/chatgpt-user.json'],
  perplexity: ['https://www.perplexity.com/perplexitybot.json', 'https://www.perplexity.com/perplexity-user.json'],
  duckduckgo: ['https://duckduckgo.com/duckduckbot.json', 'https://duckduckgo.com/duckassistbot.json'],
  // Apple owns the whole of 17.0.0.0/8; Applebot's published list sits inside it.
  apple: [{fixed: ['17.0.0.0/8']}],
  // Anthropic's crawlers and user fetchers: the block AWS announces for Anthropic.
  anthropic: [{fixed: ['216.73.216.0/22']}],
};
// Our own server-side rendering and the Cloud Run services' outbound traffic.
const OWN = ['34.96.0.0/14', '2600:1900::/28'];

const BOT_MINIMUM = {google: 50, bing: 5, openai: 5, perplexity: 3, duckduckgo: 10, apple: 1, anthropic: 1};

// URL checkers and categorisers that bank and office web filters rely on, and the cloud
// proxies many offices browse through. Their holder name is checked before their prefixes
// are trusted, so a reassigned number is dropped instead of whitelisted. An entry with
// fixed ranges and a name is a vendor whose network is too big to trust whole: only the
// block its checker was seen in is kept, by hand, and every refresh keeps it.
export const VENDORS = [
  {asn: 40934, expect: /fortinet/i},
  {asn: 200107, expect: /kaspersky/i},
  {asn: 16880, expect: /trend ?micro/i},
  {asn: 36692, expect: /cisco|opendns|umbrella/i},
  {asn: 26282, expect: /symantec|avago|broadcom/i},
  {asn: 21345, expect: /symantec|ca technology/i},
  {asn: 16733, expect: /symantec|gen digital|norton/i},
  {asn: 54538, expect: /palo ?alto/i},
  {asn: 22616, expect: /zscaler/i},
  {asn: 53813, expect: /zscaler/i},
  {asn: 62044, expect: /zscaler/i},
  {asn: 55256, expect: /netskope/i},
  {asn: 44444, expect: /forcepoint/i},
  {asn: 22843, expect: /proofpoint/i},
  {asn: 26211, expect: /proofpoint/i},
  {asn: 13916, expect: /proofpoint/i},
  {asn: 30031, expect: /mimecast/i},
  {asn: 42427, expect: /mimecast/i},
  {asn: 15324, expect: /barracuda/i},
  // Microsoft's mail link scanner: on 6 Oct 2026 it checked links to bankaci.app and
  // kredibul.bankaci.app with a GET and no user agent from .19, .22, .23, .29 and .30. Only
  // this /24: the rest of AS8075 is Azure, which anyone can rent.
  {name: 'Microsoft link scanner', fixed: ['134.149.116.0/24']},
];

// Networks real visitors come from. Nothing they announce may ever be refused.
const VISITOR_ASNS = [
  9121, 47331, // Türk Telekom (TTNet)
  16135, // Turkcell
  20978, // TT Mobil
  15897, // Vodafone Türkiye
  34984, // Superonline
  47524, // Türksat
  12735, // TurkNet
  8386, // Vodafone Net
  25019, 5384, 15802, // STC, Etisalat, du (Gulf app users)
];

// Addresses seen in the logs: the first group must stay open, the second must be refused.
export const MUST_STAY_OPEN = [
  '85.107.104.14', '176.233.28.176', '188.58.57.94', '31.142.68.167', '5.47.236.110',
  '195.39.224.102', '77.72.184.58', '34.96.62.62', '2600:1900::1', '66.249.73.231',
  '17.166.23.150', '57.141.6.69', '216.73.216.1', '134.149.116.19',
];
const MUST_REFUSE = ['47.79.218.108', '43.130.1.1', '101.42.1.1', '213.209.159.84', '47.74.0.1', '47.87.255.254'];

// ---------------------------------------------------------------------------------------
// Address arithmetic. Everything is an inclusive [start, end] range of BigInts, per family.

function parseV4(text) {
  const parts = text.split('.');
  if (parts.length !== 4) return undefined;
  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return undefined;
    value = (value << 8n) | BigInt(part);
  }
  return value;
}

function parseV6(text) {
  let source = text;
  const last = source.lastIndexOf(':');
  if (last >= 0 && source.slice(last + 1).includes('.')) {
    const v4 = parseV4(source.slice(last + 1));
    if (v4 === undefined) return undefined;
    source = `${source.slice(0, last + 1)}${(v4 >> 16n).toString(16)}:${(v4 & 0xffffn).toString(16)}`;
  }
  const halves = source.split('::');
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return undefined;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return undefined;
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }
  return value;
}

function parseCidr(text) {
  const [address, bitsText] = text.trim().split('/');
  const family = address.includes(':') ? 6 : 4;
  const width = family === 4 ? 32 : 128;
  const value = family === 4 ? parseV4(address) : parseV6(address);
  const bits = bitsText === undefined ? width : Number(bitsText);
  if (value === undefined || !Number.isInteger(bits) || bits < 0 || bits > width) {
    throw new Error(`not an address range: ${text}`);
  }
  const host = (1n << BigInt(width - bits)) - 1n;
  const start = value & ~host & ((1n << BigInt(width)) - 1n);
  return {family, start, end: start | host, bits};
}

// The same prefix however RIPEstat spells it: '2402:4e00::/32' and '2402:4E00:0::/32' alike.
function prefixKey({family, start, bits}) {
  return `${family}|${start}|${bits}`;
}

function formatCidr({family, start, bits}) {
  return `${family === 4 ? formatV4(start) : formatV6(start)}/${bits}`;
}

// The block of the given length that holds a parsed prefix.
function blockAround({family, start}, bits) {
  const width = family === 4 ? 32 : 128;
  const host = (1n << BigInt(width - bits)) - 1n;
  return {family, start: start & ~host, end: (start & ~host) | host, bits};
}

function formatV4(value) {
  return [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 255n)).join('.');
}

function formatV6(value) {
  const groups = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n) groups.push(Number((value >> shift) & 0xffffn));
  // The longest run of two or more zero groups becomes '::'.
  let bestStart = -1;
  let bestLength = 1;
  for (let i = 0; i < 8;) {
    if (groups[i] !== 0) { i += 1; continue; }
    let j = i;
    while (j < 8 && groups[j] === 0) j += 1;
    if (j - i > bestLength) { bestStart = i; bestLength = j - i; }
    i = j;
  }
  const hex = groups.map((group) => group.toString(16));
  if (bestStart < 0) return hex.join(':');
  return `${hex.slice(0, bestStart).join(':')}::${hex.slice(bestStart + bestLength).join(':')}`;
}

// Merges overlapping and adjacent ranges.
function merge(ranges) {
  const sorted = [...ranges].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const out = [];
  for (const range of sorted) {
    const previous = out[out.length - 1];
    if (previous && range.start <= previous.end + 1n) {
      if (range.end > previous.end) previous.end = range.end;
    } else {
      out.push({start: range.start, end: range.end});
    }
  }
  return out;
}

// a minus b; both merged and sorted.
function subtract(a, b) {
  const out = [];
  let j = 0;
  for (const range of a) {
    let start = range.start;
    const end = range.end;
    while (j < b.length && b[j].end < start) j += 1;
    let k = j;
    while (k < b.length && b[k].start <= end && start <= end) {
      if (b[k].start > start) out.push({start, end: b[k].start - 1n});
      start = b[k].end + 1n;
      k += 1;
    }
    if (start <= end) out.push({start, end});
  }
  return out;
}

function size(ranges) {
  return ranges.reduce((total, range) => total + (range.end - range.start + 1n), 0n);
}

// The fewest CIDR blocks that cover [start, end] exactly.
function toCidrs(ranges, family) {
  const width = family === 4 ? 32 : 128;
  const out = [];
  for (const range of ranges) {
    let start = range.start;
    while (start <= range.end) {
      let bits = width;
      while (bits > 0) {
        const block = 1n << BigInt(width - bits + 1);
        if (start % block !== 0n || start + block - 1n > range.end) break;
        bits -= 1;
      }
      out.push(`${family === 4 ? formatV4(start) : formatV6(start)}/${bits}`);
      start += 1n << BigInt(width - bits);
    }
  }
  return out;
}

// A list of CIDR strings as merged ranges per family.
export function rangesOf(cidrs) {
  const byFamily = {4: [], 6: []};
  for (const cidr of cidrs) {
    const parsed = parseCidr(cidr);
    byFamily[parsed.family].push(parsed);
  }
  return {4: merge(byFamily[4]), 6: merge(byFamily[6])};
}

export function union(...sets) {
  return {4: merge(sets.flatMap((set) => set[4])), 6: merge(sets.flatMap((set) => set[6]))};
}

function minus(a, b) {
  return {4: subtract(a[4], b[4]), 6: subtract(a[6], b[6])};
}

export function cidrsOf(set) {
  return {v4: toCidrs(set[4], 4), v6: toCidrs(set[6], 6)};
}

export function contains(set, address) {
  const {family, start} = parseCidr(address);
  return set[family].some((range) => range.start <= start && start <= range.end);
}

function overlaps(set, cidr) {
  const {family, start, end} = parseCidr(cidr);
  return set[family].some((range) => range.start <= end && start <= range.end);
}

// ---------------------------------------------------------------------------------------
// Fetching. Every request retries twice; any failure stops the run before anything is written.

async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {'user-agent': USER_AGENT, accept: 'application/json'},
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Some publishers send a leading newline or a non-JSON content type.
      return JSON.parse((await response.text()).trim());
    } catch (error) {
      lastError = error;
      await new Promise((done) => setTimeout(done, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`could not fetch ${url}: ${lastError?.message ?? lastError}`);
}

async function ripestat(call, resource) {
  const url = `${RIPESTAT}/${call}/data.json?resource=${encodeURIComponent(resource)}&sourceapp=${SOURCE_APP}`;
  const body = await getJson(url);
  if (body.status !== 'ok' || !body.data) throw new Error(`RIPEstat ${call} ${resource}: ${body.status}`);
  return body.data;
}

async function announced(asn) {
  const data = await ripestat('announced-prefixes', `AS${asn}`);
  return {prefixes: data.prefixes.map((entry) => entry.prefix), window: [data.query_starttime, data.query_endtime], data};
}

// Every route RIPEstat sees now inside a block, with its origin and the origin's holder.
async function routesIn(block) {
  return routesInside(await ripestat('related-prefixes', block), block);
}

// work(item) for every item, a few at a time; the first failure fails the whole.
async function inParallel(items, work) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({length: Math.min(PARALLEL, items.length)}, worker));
  return results;
}

// RIPEstat writes its times in UTC without a zone.
function utc(text) {
  return Date.parse(/(?:z|[+-]\d\d:?\d\d)$/i.test(text) ? text : `${text}Z`);
}

// The prefixes a refused network has really held: announced for at least half of RIPEstat's
// window and still at its end, and no wider than any cloud announces (IPv4 /11, IPv6 /20). A
// short route leak by one of these networks must not put someone else's addresses on the
// refused list until the next refresh, nor a block it has given up. Takes the
// announced-prefixes data as RIPEstat returns it; a prefix announced now has a span that runs
// to the window's end.
export function steadyPrefixes(data, minimumShare = 0.5) {
  const from = utc(data.query_starttime);
  const to = utc(data.query_endtime);
  if (!(to > from)) throw new Error(`RIPEstat window ${data.query_starttime} to ${data.query_endtime} is empty`);
  if (data.prefixes.length && data.prefixes.every((entry) => !Array.isArray(entry.timelines))) {
    throw new Error('RIPEstat sent no timelines; cannot tell steady prefixes from brief ones');
  }
  const kept = [];
  const left = [];
  for (const entry of data.prefixes) {
    const bits = Number(entry.prefix.split('/')[1]);
    const widest = entry.prefix.includes(':') ? 20 : 11;
    let held = 0;
    let last = -Infinity;
    for (const span of entry.timelines ?? []) {
      const start = Math.max(from, utc(span.starttime));
      const end = Math.min(to, utc(span.endtime));
      if (end > start) held += end - start;
      last = Math.max(last, utc(span.endtime));
    }
    const share = Math.min(1, held / (to - from));
    if (!(bits >= widest)) left.push({prefix: entry.prefix, why: `wider than /${widest}`});
    else if (share < minimumShare) left.push({prefix: entry.prefix, why: `announced ${Math.round(share * 100)}% of the window`});
    else if (!(last >= to)) left.push({prefix: entry.prefix, why: 'not announced at the end of the window'});
    else kept.push(entry.prefix);
  }
  return {kept, left};
}

// The blocks to ask RIPEstat who routes what in: around each prefix its IPv4 /16 or IPv6 /32,
// or for a prefix that wide or wider the block one bit wider, so that every prefix sits
// strictly inside a block and a route equal to it is listed with the rest. A block inside
// another block is left out.
export function routeBlocks(prefixes) {
  const blocks = new Map();
  for (const prefix of prefixes) {
    const parsed = parseCidr(prefix);
    const block = blockAround(parsed, Math.min(BLOCK_BITS[parsed.family], parsed.bits - 1));
    blocks.set(prefixKey(block), block);
  }
  const widestFirst = [...blocks.values()].sort((a, b) => a.bits - b.bits || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const out = [];
  for (const block of widestFirst) {
    if (!out.some((wider) => wider.family === block.family && wider.start <= block.start && block.end <= wider.end)) out.push(block);
  }
  return out.map(formatCidr);
}

// The routes inside the block from RIPEstat's related-prefixes data for it, as
// {prefix, origin, holder}; its neighbours and wider routes are left out. A list as long as
// RIPEstat ever shows may have been cut, so it stops the run.
export function routesInside(data, block) {
  if (!Array.isArray(data?.prefixes)) throw new Error(`RIPEstat related-prefixes ${block}: no list`);
  const inside = data.prefixes.filter((entry) => entry.relationship === 'Overlap - More Specific');
  if (inside.length >= ROUTES_SHOWN) throw new Error(`RIPEstat lists ${inside.length} routes inside ${block}, as many as it shows; the list may be cut`);
  return inside.map((entry) => ({prefix: entry.prefix, origin: Number(entry.origin_asn), holder: String(entry.asn_name ?? '')}));
}

// The space a refused network routes itself now: every address of its prefixes whose most
// specific route is its own, as a router sends packets. A route of another company equal to
// or more specific than one of its prefixes takes that route's space off (an equal one too:
// the two share it), unless a still more specific route of the network's own takes it back.
// Routes of the same company's other networks (company tests the holder name) change
// nothing. Takes the network's prefixes and the routes RIPEstat lists inside their blocks as
// {prefix, origin, holder}; returns the space, the part of the prefixes it lost and the
// routes that took some.
export function routedSpace(asn, prefixes, routes, company) {
  const ours = new Map(prefixes.map((prefix) => {
    const parsed = parseCidr(prefix);
    return [prefixKey(parsed), prefix];
  }));
  // The most specific of the network's prefixes holding a route, or undefined.
  const within = (parsed) => {
    for (let bits = parsed.bits; bits >= 0; bits -= 1) {
      const prefix = ours.get(prefixKey(blockAround(parsed, bits)));
      if (prefix) return prefix;
    }
    return undefined;
  };
  const foreign = new Map();
  for (const route of routes) {
    if (route.origin === asn || company.test(route.holder ?? '')) continue;
    const parsed = parseCidr(route.prefix);
    const inside = within(parsed);
    const key = `${prefixKey(parsed)}|${route.origin}`;
    if (inside && !foreign.has(key)) foreign.set(key, {...route, prefix: formatCidr(parsed), bits: parsed.bits, within: inside});
  }
  // Widest first, so a more specific route overrides a wider one; at equal length the other
  // company's route comes after the network's own and wins.
  const layers = [
    ...prefixes.map((prefix) => ({prefix, bits: parseCidr(prefix).bits, own: true})),
    ...[...foreign.values()].map(({prefix, bits}) => ({prefix, bits, own: false})),
  ].sort((a, b) => a.bits - b.bits || Number(b.own) - Number(a.own));
  let space = {4: [], 6: []};
  for (const layer of layers) space = layer.own ? union(space, rangesOf([layer.prefix])) : minus(space, rangesOf([layer.prefix]));
  const lost = minus(rangesOf(prefixes), space);
  // In address order, so the list reads the same from one refresh to the next.
  const order = (route) => parseCidr(route.prefix);
  const took = [...foreign.values()]
    .filter((route) => overlaps(lost, route.prefix))
    .sort((a, b) => {
      const x = order(a);
      const y = order(b);
      return x.family - y.family || (x.start < y.start ? -1 : x.start > y.start ? 1 : 0) || x.bits - y.bits || a.origin - b.origin;
    })
    .map(({prefix, origin, holder, within: inside}) => ({prefix, origin: `AS${origin}`, holder, within: inside}));
  const lostCidrs = cidrsOf(lost);
  return {space, lost: [...lostCidrs.v4, ...lostCidrs.v6], routes: took};
}

async function holder(asn) {
  const data = await ripestat('as-overview', `AS${asn}`);
  return String(data.holder ?? '');
}

// The publishers' files share one shape: {creationTime, prefixes: [{ipv4Prefix} | {ipv6Prefix}]}.
async function published(url) {
  const body = await getJson(url);
  const prefixes = (body.prefixes ?? []).map((entry) => entry.ipv4Prefix ?? entry.ipv6Prefix).filter(Boolean);
  if (prefixes.length === 0) throw new Error(`${url} lists no prefixes`);
  return {prefixes, creationTime: body.creationTime ?? null};
}

// ---------------------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {dryRun: false, out: undefined};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!args.out) {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      resolve(process.cwd(), 'lib/door-data.json'),
      resolve(process.cwd(), 'src/lib/door-data.json'),
      resolve(process.cwd(), 'door-data.json'),
      resolve(here, '../door-data.json'),
    ];
    args.out = candidates.find((path) => existsSync(path));
    if (!args.out) throw new Error('no door-data.json found; pass --out');
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = [];
  const warnings = [];

  // Refused networks.
  const asnSets = {};
  const asnMeta = {};
  const briefLeftOut = {};
  const steady = {};
  for (const {asn, expect, minimum} of REFUSED_ASNS) {
    const [name, {prefixes: all, window, data: ripe}] = await Promise.all([holder(asn), announced(asn)]);
    if (!expect.test(name)) throw new Error(`AS${asn} is now held by "${name}"; check before refusing it`);
    const {kept: prefixes, left} = steadyPrefixes(ripe);
    const v4 = prefixes.filter((prefix) => !prefix.includes(':'));
    if (v4.length < minimum) throw new Error(`AS${asn} announces only ${v4.length} steady IPv4 prefixes; expected ${minimum}+`);
    steady[asn] = prefixes;
    asnMeta[asn] = {holder: name, announced: all.length};
    if (left.length) briefLeftOut[`AS${asn}`] = left;
    sources.push({url: `${RIPESTAT}/announced-prefixes AS${asn}`, window, prefixes: all.length, steady: prefixes.length});
  }

  // Of those prefixes, only the space each network routes itself now (see routedSpace).
  const blocks = routeBlocks(Object.values(steady).flat());
  if (blocks.length > MAX_BLOCKS) throw new Error(`${blocks.length} blocks to ask RIPEstat about; the limit is ${MAX_BLOCKS}`);
  const routes = (await inParallel(blocks, routesIn)).flat();
  sources.push({url: `${RIPESTAT}/related-prefixes`, blocks: blocks.length, routes: routes.length, at: new Date().toISOString()});
  const foreignRouted = {};
  for (const {asn, company} of REFUSED_ASNS) {
    // A list that misses the network's own routes is no picture of who routes what.
    const listed = new Set(routes.filter((route) => route.origin === asn).map((route) => prefixKey(parseCidr(route.prefix))));
    const found = steady[asn].filter((prefix) => listed.has(prefixKey(parseCidr(prefix)))).length;
    if (found < steady[asn].length * 0.9) throw new Error(`RIPEstat related-prefixes shows ${found} of the ${steady[asn].length} prefixes of AS${asn}; not writing`);
    const {space, lost, routes: took} = routedSpace(asn, steady[asn], routes, company);
    asnSets[asn] = space;
    if (lost.length) foreignRouted[`AS${asn}`] = {dropped: lost, routes: took};
  }
  const proven = rangesOf(PROVEN.map((entry) => entry.cidr));

  // Publisher ranges.
  const botSets = {};
  for (const [name, list] of Object.entries(BOTS)) {
    const parts = [];
    for (const source of list) {
      if (typeof source === 'string') {
        const {prefixes, creationTime} = await published(source);
        parts.push(rangesOf(prefixes));
        sources.push({url: source, creationTime, prefixes: prefixes.length});
      } else if (source.fixed) {
        parts.push(rangesOf(source.fixed));
      } else {
        const [own, cloud] = await Promise.all([published(source.own), published(source.minus)]);
        parts.push(minus(minus(rangesOf(own.prefixes), rangesOf(cloud.prefixes)), rangesOf(OWN)));
        sources.push({url: source.own, creationTime: own.creationTime, prefixes: own.prefixes.length});
        sources.push({url: source.minus, creationTime: cloud.creationTime, prefixes: cloud.prefixes.length, use: 'subtracted'});
      }
    }
    botSets[name] = union(...parts);
    const count = botSets[name][4].length + botSets[name][6].length;
    if (count < BOT_MINIMUM[name]) throw new Error(`${name} has only ${count} ranges; expected ${BOT_MINIMUM[name]}+`);
  }

  // Quiet networks.
  const own = rangesOf(OWN);
  const vendorParts = [];
  const vendorMeta = {};
  const vendorFixed = {};
  for (const {asn, expect, name: label, fixed} of VENDORS) {
    if (fixed) {
      vendorParts.push(rangesOf(fixed));
      vendorFixed[label] = fixed;
      continue;
    }
    const [name, {prefixes}] = await Promise.all([holder(asn), announced(asn)]);
    if (!expect.test(name)) {
      warnings.push(`vendor AS${asn} is held by "${name}"; left out`);
      continue;
    }
    vendorParts.push(rangesOf(prefixes));
    vendorMeta[asn] = {holder: name, announced: prefixes.length};
  }
  const vendors = union(...vendorParts);

  // Visitor networks: fetched only to make sure none of them is ever refused.
  const visitorParts = [];
  for (const asn of VISITOR_ASNS) {
    const {prefixes} = await announced(asn);
    visitorParts.push(rangesOf(prefixes));
  }
  const visitors = union(...visitorParts);

  // Nothing that may stay open can be refused: subtract it, and say how much that was.
  const neverRefuse = union(...Object.values(botSets), own, vendors, visitors);
  const removed = {};
  const refusedAsns = {};
  for (const [asn, set] of Object.entries(asnSets)) {
    const kept = minus(set, neverRefuse);
    removed[`AS${asn}`] = String(size(set[4]) - size(kept[4]) + size(set[6]) - size(kept[6]));
    refusedAsns[asn] = kept;
  }
  const keptProven = minus(proven, neverRefuse);
  removed.proven = String(size(proven[4]) - size(keptProven[4]));
  for (const [key, amount] of Object.entries(removed)) {
    if (amount !== '0') warnings.push(`${amount} addresses of ${key} overlap an open list and were left out`);
  }

  const allRefused = union(...Object.values(refusedAsns), keptProven);
  for (const address of MUST_STAY_OPEN) {
    if (contains(allRefused, address)) throw new Error(`${address} would be refused; not writing`);
  }
  for (const address of MUST_REFUSE) {
    if (!contains(allRefused, address)) warnings.push(`${address} is no longer refused`);
  }
  if (!contains(botSets.google, '66.249.73.231')) throw new Error('Googlebot 66.249.73.231 is missing from google');
  if (contains(botSets.google, '34.96.62.62')) throw new Error('Cloud Run egress 34.96.62.62 is in google; it must not verify a crawler');

  const provenOut = [];
  for (const {cidr, label} of PROVEN) {
    const kept = cidrsOf(minus(rangesOf([cidr]), neverRefuse));
    for (const piece of [...kept.v4, ...kept.v6]) provenOut.push({cidr: piece, label});
  }

  const data = {
    about: 'Generated by scripts/refresh-door-data.mjs. Do not edit by hand; run the script and read the diff.',
    generated: new Date().toISOString(),
    counts: {},
    refused: {
      asns: Object.fromEntries(Object.entries(refusedAsns).map(([asn, set]) => [
        `AS${asn}`, {holder: asnMeta[asn].holder, ...cidrsOf(set)},
      ])),
      proven: provenOut,
    },
    bots: Object.fromEntries(Object.entries(botSets).map(([name, set]) => [name, cidrsOf(set)])),
    quiet: {own: cidrsOf(own), vendors: cidrsOf(vendors)},
    checks: {
      overlapRemoved: removed,
      briefLeftOut,
      foreignRouted,
      visitorAsns: VISITOR_ASNS,
      vendorAsns: vendorMeta,
      vendorFixed,
      mustStayOpen: MUST_STAY_OPEN,
      warnings,
    },
    sources,
  };

  const counts = {};
  for (const [asn, entry] of Object.entries(data.refused.asns)) counts[asn] = {v4: entry.v4.length, v6: entry.v6.length};
  counts.proven = data.refused.proven.length;
  for (const [name, entry] of Object.entries(data.bots)) counts[`bots.${name}`] = {v4: entry.v4.length, v6: entry.v6.length};
  for (const [name, entry] of Object.entries(data.quiet)) counts[`quiet.${name}`] = {v4: entry.v4.length, v6: entry.v6.length};
  const refusedAll = cidrsOf(allRefused);
  counts.refusedTotal = {v4: refusedAll.v4.length, v6: refusedAll.v6.length};
  data.counts = counts;

  const text = `${JSON.stringify(data, null, 1)}\n`;
  console.log(JSON.stringify({out: args.out, bytes: text.length, counts, warnings}, null, 2));
  if (args.dryRun) return;

  if (existsSync(args.out)) {
    const before = JSON.parse(readFileSync(args.out, 'utf8'));
    if (before.counts) console.log(`previous file generated ${before.generated}`);
  }
  writeFileSync(args.out, text);
  console.log(`wrote ${args.out}`);
}

// Run as a script; imported (by the tests), it only lends its functions.
function runAsScript() {
  try {
    return realpathSync(resolve(process.argv[1] ?? '')) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (runAsScript()) {
  main().catch((error) => {
    console.error(`refresh-door-data: ${error.message}`);
    process.exit(1);
  });
}
