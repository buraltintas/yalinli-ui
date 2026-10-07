// Tests for door.ts. Run with `npm test`: tsc compiles door.ts (and copies door-data.json)
// into build/, then node's own test runner loads it from there. In a site repo, compile the
// site's copy to any folder with `tsc --module commonjs --target ES2020 --resolveJsonModule
// --esModuleInterop --skipLibCheck --outDir <dir> <path>/door.ts`, then run
// `DOOR_BUILD=<dir> node --test <this file>`.
//
// The tests under 'requests as Next really hands them to middleware' put requests through
// Next's own middleware adapter: the Next of the current directory (a site repo) and of every
// directory in DOOR_NEXT_DIRS (comma-separated). Without any Next they are skipped.

import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const BUILD = process.env.DOOR_BUILD ? resolve(process.env.DOOR_BUILD) : fileURLToPath(new URL('../build/', import.meta.url));
const door = require(resolve(BUILD, 'door.js'));
const DATA = require(resolve(BUILD, 'door-data.json'));
const {
  createDoor, doorResponse, classify, clientAddress, parseAddress, parseCidr, Ranges, DoorStore, paths,
  probeReason, browserClaim, rateKeys, SHARED_UNWELCOME, RATES_DEFAULT, RATES_BANKACI, DOOR_BEACON, doorDataInfo,
} = door;

// ---------------------------------------------------------------------------------------
// Fixtures

// Browsers as they really send themselves. fetch: whether they send Sec-Fetch-* (the in-app
// ones are given none, the worst case). hints: sec-ch-ua as Chromium browsers send it.
const PROFILES = {
  chromeWindows: {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    hints: '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    fetch: true,
  },
  chromeMac: {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    hints: '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    fetch: true,
  },
  chromeAndroid: {
    ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    hints: '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    fetch: true,
  },
  samsungInternet: {
    ua: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
    hints: '"Chromium";v="130", "Not:A-Brand";v="24", "Samsung Internet";v="28.0"',
    fetch: true,
  },
  edge: {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
    hints: '"Microsoft Edge";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    fetch: true,
  },
  yandex: {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 YaBrowser/25.8.0.0 Safari/537.36',
    hints: '"Chromium";v="138", "YaBrowser";v="25.8", "Not)A;Brand";v="24"',
    fetch: true,
  },
  chromeOld: {
    ua: 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
    fetch: false,
  },
  safariIphone26: {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
    fetch: true,
  },
  safariIphone17: {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    fetch: true,
  },
  safariIphone15: {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.6 Mobile/15E148 Safari/604.1',
    fetch: false,
  },
  safariIpad: {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
    fetch: true,
  },
  safariMac: {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    fetch: true,
  },
  chromeIphone: {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1',
    fetch: false,
  },
  firefoxWindows: {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0',
    fetch: true,
  },
  firefoxAndroid: {
    ua: 'Mozilla/5.0 (Android 14; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
    fetch: true,
  },
  instagramIphone: {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.27.80 (iPhone15,2; iOS 18_6; tr_TR; tr; scale=3.00; 1179x2556; 812345678)',
    fetch: false,
  },
  instagramAndroid: {
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.7390.97 Mobile Safari/537.36 Instagram 400.0.0.27.80 Android (34/14; 450dpi; 1080x2340; samsung; SM-A546E; a54x; s5e8835; tr_TR; 812345678)',
    fetch: false,
  },
  facebookIphone: {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/530.0.0.40.97;FBBV/812345678;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.6;FBSS/3;FBCR/;FBID/phone;FBLC/tr_TR;FBOP/5]',
    fetch: false,
  },
  googleAppIphone: {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/392.0.812345678 Mobile/15E148 Safari/604.1',
    fetch: false,
  },
  legacyWebView: {
    ua: 'Mozilla/5.0 (Linux; Android 9; Redmi Note 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36',
    fetch: false,
  },
};

// Turkish home and mobile lines, the team's phones, bank head offices, and some Turkish
// carrier IPv6 addresses.
const TURKISH = [
  '85.107.104.14', // TTNet (the owner's desktop)
  '78.183.96.145', // TTNet
  '176.233.28.176', // Superonline (team iPhone)
  '217.131.34.75', // Superonline
  '92.44.35.189', // Superonline
  '188.58.57.94', // Turkcell carrier NAT
  '31.142.68.167', // Turkcell
  '5.27.36.121', // Turkcell
  '5.47.236.110', // TT Mobil
  '176.220.219.127', // TT Mobil
  '176.54.199.131', // Vodafone TR
  '24.133.124.146', // Türksat
  '94.54.105.61', // Türksat
  '31.223.43.205', // TurkNet
  '95.65.146.212', // Vodafone Net
  '195.39.224.102', // Fibabanka head office
  '77.72.184.58', // Türkiye Finans
  '2a00:1d33:5abc:1:a1b2:c3d4:e5f6:1', // TTNet
  '2a02:4e0:2061:aa00:1c2:3:4:5', // Turkcell
  '2a00:1880:a341:12::7', // Vodafone TR
  '2a02:e0:d4ff:1::2', // Superonline
  '2a02:2010:2281:5::9', // TT Mobil
];

// Sites as the policy describes them. The real configs live in each repo; these stand in
// for them with the same shape.
const SITES = {
  bosagezme: {
    site: 'bosagezme',
    content: paths('/', '/{en,de,ru}', '/stores/*', '/{en,de,ru}/stores/*', '/discover/*', '/{en,de,ru}/discover/*', '/:city/:brand', '/{en,de,ru}/:city/:brand'),
    exempt: paths(
      '/account-deletion', '/{en,de,ru}/account-deletion', '/privacy', '/{en,de,ru}/privacy', '/terms', '/{en,de,ru}/terms',
      '/kvkk/*', '/{en,de,ru}/kvkk/*', '/report-content', '/{en,de,ru}/report-content', '/feedback', '/{en,de,ru}/feedback',
      '/create', '/{en,de,ru}/create', '/admin/*',
    ),
    unwelcome: [
      'SemrushBot', 'AhrefsBot', 'AhrefsSiteAudit', 'MJ12bot', 'DotBot', 'BLEXBot', 'SEOkicks', 'SERanking', 'DataForSeoBot',
      'Barkrowler', 'rogerbot', 'ZoominfoBot', 'Amazonbot', 'PetalBot', 'Bytespider', 'ImagesiftBot', 'meta-externalagent',
      'Applebot-Extended', 'CCBot', 'Diffbot', 'omgili', 'Timpibot', 'Webzio-Extended', 'FriendlyCrawler', 'AwarioBot', 'serpstatbot',
    ],
    refusedNetworks: ['47.74.0.0/15', '47.76.0.0/14', '47.80.0.0/13'],
    siteCookies: ['bosagezme_locale'],
    jsEvidence: paths('/api/runtime-config', '/api/clarity'),
    contact: 'info@bosagezme.com',
  },
  bankaciWeb: {
    site: 'bankaci-web',
    content: paths('/', '/tr/*', '/en/*'),
    exempt: paths(
      '/premium/*', '/admin/*', '/r/*', '/request/*', '/request-share.html', '/privacy', '/account-deletion', '/ac*/*',
      '/kart/*', '/indir', '/download', '/tr/gizlilik', '/en/privacy', '/tr/hesap-silme', '/en/account-deletion',
    ),
    rates: RATES_BANKACI,
    trustVendors: true,
    siteCookies: ['NEXT_LOCALE'],
  },
  kredibul: {
    site: 'kredibul',
    content: paths('/', '/tr/*', '/en/*'),
    exempt: paths(
      '/{tr,en}/talep-yaniti/*', '/{tr,en}/request-reply/*', '/tr/talep/*', '/en/request/*', '/tr/gizlilik', '/en/privacy',
      '/tr/hesap-silme', '/en/account-deletion',
    ),
    rates: RATES_BANKACI,
    trustVendors: true,
  },
  coffee: {
    site: 'coffee-dictionary',
    content: paths('/', '/{en,de,tr}', '/{en,de,tr}/term/*', '/{en,de,tr}/glossary/*', '/term/*', '/glossary/*'),
    exempt: paths(
      '/{en,de,tr}/account/delete', '/legal/*', '/{en,de,tr}/legal/*', '/apple-app-site-association', '/login', '/profile/*',
      '/editor/*', '/events/submit', '/{en,de,tr}/login', '/{en,de,tr}/profile/*',
    ),
    siteCookies: ['language'],
  },
  yalinli: {
    site: 'yalinli',
    content: paths('/', '/entries/*', '/about'),
    siteCookies: ['yalinli_lang'],
  },
};

const SITE_PATHS = {
  bosagezme: [
    '/', '/en', '/stores/ikea-bayrampasa', '/en/stores/ikea-bayrampasa', '/stores/icon-home', '/discover', '/de/discover/istanbul',
    '/istanbul/ikea', '/account-deletion', '/en/privacy', '/kvkk/basvuru', '/create', '/profile', '/favorites', '/admin/stores',
    '/api/runtime-config', '/api/proxy/me', '/api/proxy/stores/8f14e45f-ceea-467a-9a3e-6f1b2f3c4d5e', '/api/media/abc',
    '/_next/static/chunks/main-abc123.js', '/_next/image', '/favicon.ico', '/icon.png', '/opengraph-image', '/stores/x/opengraph-image-1ynb5e',
    '/robots.txt', '/sitemap.xml', '/sitemap/3.xml', '/.well-known/assetlinks.json', '/manifest.webmanifest',
  ],
  bankaciWeb: [
    '/', '/tr', '/en', '/tr/banka-faiz-oranlari', '/en/bank-loan-rates', '/tr/banka/garanti-bbva', '/en/bank/akbank',
    '/tr/kredi-hesaplama', '/tr/gizlilik', '/en/privacy', '/tr/hesap-silme', '/en/account-deletion', '/privacy', '/account-deletion',
    '/premium', '/premium/dashboard', '/admin', '/admin/users', '/r/AbCdEf123456', '/request/XyZ987', '/request-share.html',
    '/kart/oranlar', '/indir', '/download', '/llms.txt', '/icon.png', '/_next/static/css/app.css', '/robots.txt', '/sitemap.xml',
    '/.well-known/apple-app-site-association', '/.well-known/assetlinks.json', '/apple-app-site-association',
  ],
  kredibul: [
    '/', '/tr', '/en', '/tr/talep', '/en/request', '/tr/talep-yaniti/tok123', '/en/request-reply/tok123', '/tr/kampanyalar',
    '/api/kasko/brands', '/api/marketplace/threads', '/tr/gizlilik', '/robots.txt', '/.well-known/assetlinks.json',
  ],
  coffee: [
    '/', '/en', '/de', '/tr', '/en/term/espresso', '/term/espresso', '/en/glossary/a', '/glossary/b', '/en/account/delete',
    '/legal/agreement', '/en/legal/agreement', '/apple-app-site-association', '/login', '/profile', '/editor/new', '/events',
    '/events/submit', '/api/me', '/api/auth/refresh', '/api/v1/glossary/top-lookups', '/assets/logo.svg', '/robots.txt',
  ],
  yalinli: ['/', '/entries/42', '/about', '/tr', '/en', '/api/feed', '/robots.txt', '/icon.svg', '/_next/static/chunks/x.js'],
};

function makeRequest(path, {ip = '85.107.104.14', xff, headers = {}, method = 'GET', proto = 'https', host = 'site.test'} = {}) {
  const h = new Headers(headers);
  const forwarded = xff !== undefined ? xff : ip;
  if (forwarded !== null) h.set('x-forwarded-for', forwarded);
  if (proto) h.set('x-forwarded-proto', proto);
  return new Request(`https://${host}${path}`, {method, headers: h});
}

function navigation(profile, extra = {}) {
  const h = {
    'user-agent': profile.ua,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'upgrade-insecure-requests': '1',
    cookie: 'NEXT_LOCALE=tr; bosagezme_locale=tr',
  };
  if (profile.fetch) Object.assign(h, {'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'none', 'sec-fetch-user': '?1'});
  if (profile.hints) Object.assign(h, {'sec-ch-ua': profile.hints, 'sec-ch-ua-mobile': '?0', 'sec-ch-ua-platform': '"Windows"'});
  return {...h, ...extra};
}

// A Next payload as the browser sends it.
function rscHeaders(profile, prefetch) {
  const h = {'user-agent': profile.ua, accept: '*/*', rsc: '1', 'next-router-state-tree': '%5B%22%22%5D', 'next-url': '/', 'accept-language': 'tr', referer: 'https://site.test/'};
  if (prefetch) h['next-router-prefetch'] = '1';
  if (profile.fetch) Object.assign(h, {'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin'});
  if (profile.hints) h['sec-ch-ua'] = profile.hints;
  return h;
}

// What Next removes from every request before middleware or proxy runs (FLIGHT_HEADERS in
// next/dist/client/components/app-router-headers.js; the _rsc query goes too). The adapter
// tests below check this list against the real thing.
const FLIGHT_HEADERS = ['rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-hmr-refresh', 'next-router-segment-prefetch'];

function asNextHandsIt(headers) {
  const h = {...headers};
  for (const name of FLIGHT_HEADERS) delete h[name];
  return h;
}

// A Next payload as the site's middleware is handed it, where a prefetch and a navigation
// look the same. withoutUrl: a segment prefetch the router sends without Next-Url.
function payload(profile, {prefetch = true, withoutUrl = false} = {}) {
  const h = asNextHandsIt(rscHeaders(profile, prefetch));
  if (withoutUrl) delete h['next-url'];
  return h;
}

function assetHeaders(profile) {
  const h = {'user-agent': profile.ua, accept: 'image/avif,image/webp,image/apng,*/*;q=0.8', referer: 'https://site.test/'};
  if (profile.fetch) Object.assign(h, {'sec-fetch-dest': 'image', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'same-origin'});
  return h;
}

function apiHeaders(profile) {
  const h = {'user-agent': profile.ua, accept: 'application/json', referer: 'https://site.test/'};
  if (profile.fetch) Object.assign(h, {'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin'});
  return h;
}

// A door with a fake clock and a captured log.
function harness(site, {start = Date.UTC(2026, 9, 7, 6, 0, 0), store} = {}) {
  const lines = [];
  const clock = {now: start};
  const check = createDoor(site, {now: () => clock.now, log: (line) => lines.push(JSON.parse(line)), store: store ?? new DoorStore()});
  return {check, lines, clock, advance: (ms) => { clock.now += ms; }};
}

const SIMPLE = {site: 'test', content: paths('/', '/stores/*', '/tr/*', '/en/*'), exempt: paths('/tr/gizlilik', '/premium/*')};
const CHROME = PROFILES.chromeWindows;
const TR = '85.107.104.14';

// Next's middleware adapter from every Next install the tests can find, one per version.
function nextAdapters() {
  // Next's server sets this up before it loads any middleware.
  globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
  const dirs = [process.cwd(), ...(process.env.DOOR_NEXT_DIRS ?? '').split(',').map((dir) => dir.trim()).filter(Boolean)];
  const found = new Map();
  for (const dir of dirs) {
    try {
      const load = createRequire(resolve(dir, 'package.json'));
      const {version} = load('next/package.json');
      if (!found.has(version)) found.set(version, load('next/dist/server/web/adapter.js').adapter);
    } catch {
      // No Next there.
    }
  }
  return [...found];
}

// One request through Next's adapter into the door, the way a site's middleware gets it.
async function throughNext(adapter, check, path, headers, {ip = TR, query = ''} = {}) {
  let verdict;
  let handed;
  await adapter({
    page: '/middleware',
    handler: (request) => {
      handed = request;
      verdict = check(request);
      return undefined;
    },
    request: {
      method: 'GET',
      url: `https://site.test${path}${query}`,
      headers: {...headers, host: 'site.test', 'x-forwarded-for': ip, 'x-forwarded-proto': 'https'},
      nextConfig: {},
      signal: new AbortController().signal,
    },
  });
  return {verdict, handed};
}

// ---------------------------------------------------------------------------------------

describe('client address', () => {
  test('the last X-Forwarded-For entry is the client, whatever comes before it', () => {
    assert.equal(clientAddress('85.107.104.14').address.text, '85.107.104.14');
    assert.equal(clientAddress('47.79.1.1, 85.107.104.14').address.text, '85.107.104.14');
    assert.equal(clientAddress('85.107.104.14, 47.79.218.108').address.text, '47.79.218.108');
    assert.equal(clientAddress('1.1.1.1,2.2.2.2,  176.233.28.176  ').address.text, '176.233.28.176');
  });

  test('IPv6, brackets, ports, zones and IPv4-mapped addresses', () => {
    assert.equal(parseAddress('2a02:4e0:2061::1').v6 !== undefined, true);
    assert.equal(parseAddress('[2a02:4e0:2061::1]:443').text, '2a02:4e0:2061::1');
    assert.equal(parseAddress('85.107.104.14:51234').text, '85.107.104.14');
    assert.equal(parseAddress('fe80::1%en0').v6 !== undefined, true);
    const mapped = parseAddress('::ffff:47.79.218.108');
    assert.equal(mapped.text, '47.79.218.108');
    assert.equal(mapped.v4, parseAddress('47.79.218.108').v4);
    assert.equal(parseAddress('::FFFF:2f4f:da6c').text, '47.79.218.108');
    assert.equal(parseAddress('1.2.3'), undefined);
    assert.equal(parseAddress('256.1.1.1'), undefined);
    assert.equal(parseAddress('2001:db8::1::2'), undefined);
    assert.equal(parseAddress('1:2:3:4:5:6:7:8:9'), undefined);
    assert.equal(parseAddress('nonsense'), undefined);
    assert.equal(parseAddress(''), undefined);
  });

  test('missing, unparsable, unspecified and private addresses give no address', () => {
    assert.equal(clientAddress(null).problem, 'missing');
    assert.equal(clientAddress('  ').problem, 'missing');
    assert.equal(clientAddress('unknown').problem, 'unparsable');
    assert.equal(clientAddress('0.0.0.0').problem, 'unspecified');
    assert.equal(clientAddress('::').problem, 'unspecified');
    assert.equal(clientAddress('85.107.104.14, 10.1.2.3').problem, 'not-public');
    assert.equal(clientAddress('35.191.10.20').problem, 'not-public');
    assert.equal(clientAddress('130.211.0.9').problem, 'not-public');
    assert.equal(clientAddress('::1').problem, 'not-public');
    assert.equal(clientAddress('::ffff:127.0.0.1').problem, 'not-public');
    assert.equal(clientAddress('fd00::5').problem, 'not-public');
  });

  test('rate keys: IPv4 as is, IPv6 by /64 plus its /48, no address shares one key', () => {
    assert.deepEqual(rateKeys(parseAddress('85.107.104.14')), [{key: '4:85.107.104.14', factor: 'one'}]);
    const a = rateKeys(parseAddress('2a00:1d33:5abc:1:a1b2:c3d4:e5f6:1'));
    const b = rateKeys(parseAddress('2a00:1d33:5abc:1::99'));
    const c = rateKeys(parseAddress('2a00:1d33:5abc:2::1'));
    assert.equal(a[0].key, b[0].key);
    assert.notEqual(a[0].key, c[0].key);
    assert.equal(a[1].key, c[1].key);
    assert.equal(a[1].factor, 'aggregate');
    assert.deepEqual(rateKeys(undefined), [{key: 'none', factor: 'addressless'}]);
  });
});

describe('address ranges', () => {
  test('IPv4 and IPv6 matching at the edges', () => {
    const set = new Ranges(['47.74.0.0/15', '47.76.0.0/14', '47.80.0.0/13', '5.102.169.16/28', '2400:3200::/32', '240d:c000:1000::/36']);
    assert.equal(set.size, 4); // the three Alibaba blocks merge into one range
    for (const yes of ['47.74.0.0', '47.79.218.108', '47.87.255.255', '5.102.169.16', '5.102.169.31', '2400:3200::', '2400:3200:ffff:ffff:ffff:ffff:ffff:ffff', '240d:c000:1fff::1']) {
      assert.equal(set.has(parseAddress(yes)), true, yes);
    }
    for (const no of ['47.73.255.255', '47.88.0.0', '5.102.169.15', '5.102.169.32', '2400:3201::', '2400:31ff:ffff::', '240d:c000:2000::', '0.0.0.1', '255.255.255.255']) {
      assert.equal(set.has(parseAddress(no)), false, no);
    }
    assert.equal(set.has(undefined), false);
  });

  test('binary search agrees with a linear scan on random ranges', () => {
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const cidrs = [];
    for (let i = 0; i < 400; i += 1) {
      const bits = 8 + Math.floor(random() * 25);
      const base = Math.floor(random() * 4294967296);
      cidrs.push(`${base >>> 24}.${(base >>> 16) & 255}.${(base >>> 8) & 255}.${base & 255}/${bits}`);
    }
    const set = new Ranges(cidrs);
    const parsed = cidrs.map((cidr) => parseCidr(cidr).v4);
    for (let i = 0; i < 5000; i += 1) {
      const value = Math.floor(random() * 4294967296);
      const text = `${value >>> 24}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
      const linear = parsed.some(([start, end]) => start <= value && value <= end);
      assert.equal(set.has(parseAddress(text)), linear, text);
    }
  });

  test('a broken entry is skipped, not thrown', () => {
    const set = new Ranges(['1.2.3.0/24', 'not-a-cidr', '1.2.3.4/33', '2001:db8::/129']);
    assert.equal(set.size, 1);
    assert.deepEqual(set.invalid, ['not-a-cidr', '1.2.3.4/33', '2001:db8::/129']);
  });
});

describe('generated data', () => {
  test('it is complete and every entry parses', () => {
    assert.ok(!Number.isNaN(Date.parse(DATA.generated)));
    const info = doorDataInfo();
    assert.deepEqual(info.invalid, []);
    assert.equal(DATA.counts.refusedTotal.v4 > 300, true);
    for (const asn of ['AS45102', 'AS37963', 'AS132203', 'AS45090']) {
      assert.ok(DATA.refused.asns[asn].v4.length > 30, asn);
      assert.ok(DATA.refused.asns[asn].v6.length > 0, asn);
    }
    assert.equal(DATA.refused.proven.length, 8);
    for (const name of ['google', 'bing', 'openai', 'perplexity', 'duckduckgo', 'apple', 'anthropic']) {
      assert.ok(DATA.bots[name].v4.length + DATA.bots[name].v6.length > 0, name);
    }
  });

  test('no refused range overlaps a crawler, our own egress, a vendor or another open list', () => {
    const refused = [...Object.values(DATA.refused.asns).flatMap((entry) => [...entry.v4, ...entry.v6]), ...DATA.refused.proven.map((entry) => entry.cidr)];
    const open = [
      ...Object.values(DATA.bots).flatMap((entry) => [...entry.v4, ...entry.v6]),
      ...DATA.quiet.own.v4, ...DATA.quiet.own.v6, ...DATA.quiet.vendors.v4, ...DATA.quiet.vendors.v6,
    ];
    const refusedSet = new Ranges(refused);
    const openSet = new Ranges(open);
    // Two ranges overlap exactly when one of them starts inside the other.
    const starts = (cidrs) => cidrs.map((cidr) => {
      const parsed = parseCidr(cidr);
      return parsed.v4 ? {text: cidr, v4: parsed.v4[0]} : {text: cidr, v6: parsed.v6[0]};
    });
    for (const start of starts(refused)) assert.equal(openSet.has(start), false, start.text);
    for (const start of starts(open)) assert.equal(refusedSet.has(start), false, start.text);
    assert.deepEqual(Object.values(DATA.checks.overlapRemoved).filter((amount) => amount !== '0'), []);
  });

  test('the Google set holds Googlebot but not the Cloud Run egress anyone can rent', () => {
    const google = new Ranges([...DATA.bots.google.v4, ...DATA.bots.google.v6]);
    assert.equal(google.has(parseAddress('66.249.73.231')), true);
    assert.equal(google.has(parseAddress('34.96.62.62')), false);
    assert.equal(google.has(parseAddress('2600:1900::1')), false);
    assert.equal(google.has(parseAddress('34.21.205.86')), false);
  });
});

describe('request classification', () => {
  const h = (headers) => new Headers(headers);
  const nav = navigation(CHROME);
  test('open paths, the beacon, Next assets, API and static files', () => {
    assert.equal(classify('GET', '/robots.txt', h(nav)).kind, 'open');
    assert.equal(classify('GET', '/.well-known/apple-app-site-association', h(nav)).kind, 'open');
    assert.equal(classify('GET', '/.well-known/assetlinks.json', h(nav)).kind, 'open');
    assert.equal(classify('GET', DOOR_BEACON, h({})).kind, 'beacon');
    assert.equal(classify('GET', '/_next/static/chunks/a.js', h(nav)).kind, 'next');
    assert.equal(classify('GET', '/_next/image', h(nav)).kind, 'next');
    assert.equal(classify('GET', '/api/proxy/me', h(nav)).kind, 'api');
    assert.equal(classify('GET', '/api', h(nav)).kind, 'api');
    for (const path of ['/favicon.ico', '/site.webmanifest', '/sitemap.xml', '/sitemap/0.xml', '/request-share.html', '/llms.txt', '/a/b/photo.jpeg']) {
      assert.equal(classify('GET', path, h(nav)).kind, 'static', path);
    }
  });

  test('metadata routes without a dot are not page views', () => {
    const image = h({accept: 'image/avif,image/webp,*/*'});
    for (const path of ['/icon', '/apple-icon', '/icon0', '/opengraph-image', '/twitter-image', '/stores/x/opengraph-image-1ynb5e', '/blog/opengraph-image/small', '/apple-app-site-association']) {
      assert.equal(classify('GET', path, image).kind, 'metadata', path);
    }
    // A store whose slug looks like one is still a page when a browser opens it.
    assert.equal(classify('GET', '/stores/icon-home', h(nav)).kind, 'document');
  });

  test('documents, plain GETs, prefetches, RSC navigation and RSC prefetch', () => {
    assert.equal(classify('GET', '/stores/a', h(nav)).kind, 'document');
    assert.equal(classify('HEAD', '/stores/a', h(nav)).kind, 'document');
    assert.equal(classify('GET', '/stores/a', h({accept: '*/*'})).kind, 'plain');
    assert.equal(classify('GET', '/stores/a', h({})).kind, 'plain');
    assert.equal(classify('GET', '/stores/a', h({...nav, 'sec-purpose': 'prefetch'})).kind, 'prefetch');
    assert.equal(classify('GET', '/stores/a', h({...nav, 'sec-purpose': 'prefetch;prerender'})).kind, 'prefetch');
    assert.equal(classify('GET', '/stores/a', h({...nav, purpose: 'prefetch'})).kind, 'prefetch');
    assert.equal(classify('GET', '/stores/a', h(rscHeaders(CHROME, false))).kind, 'rsc-nav');
    assert.equal(classify('GET', '/stores/a', h(rscHeaders(CHROME, true))).kind, 'rsc-prefetch');
    assert.equal(classify('GET', '/stores/a', h({rsc: '1', 'next-router-segment-prefetch': '/_tree'})).kind, 'rsc-prefetch');
    assert.equal(classify('POST', '/stores/a', h({'next-action': 'abc'})).kind, 'other');
    assert.equal(classify('POST', '/tr/talep', h(nav)).kind, 'other');
  });

  test('Next payloads as middleware gets them: Next-Url or a fetch(), never text/html', () => {
    for (const profile of [CHROME, PROFILES.safariIphone26, PROFILES.firefoxAndroid, PROFILES.instagramAndroid, PROFILES.facebookIphone]) {
      for (const prefetch of [true, false]) {
        const headers = h(payload(profile, {prefetch}));
        assert.equal(headers.has('rsc'), false);
        assert.equal(classify('GET', '/stores/a', headers).kind, 'rsc', `${profile.ua} ${prefetch}`);
      }
    }
    // Either signal alone is enough: Next-Url from a browser without Sec-Fetch-*, and a
    // segment prefetch the router sends without Next-Url.
    assert.equal(classify('GET', '/stores/a', h({accept: '*/*', 'next-url': '/tr'})).kind, 'rsc');
    assert.equal(classify('GET', '/stores/a', h(payload(CHROME, {withoutUrl: true}))).kind, 'rsc');
    assert.equal(classify('GET', '/stores/a', h({'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'same-origin'})).kind, 'rsc');
    assert.equal(classify('HEAD', '/stores/a', h({accept: '*/*', 'next-url': '/'})).kind, 'rsc');
    // Not a no-cors request, not a navigation, nothing that asks for HTML, not a form.
    assert.equal(classify('GET', '/stores/a', h({accept: '*/*', 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'no-cors'})).kind, 'plain');
    assert.equal(classify('GET', '/stores/a', h({...nav, 'next-url': '/'})).kind, 'document');
    assert.equal(classify('GET', '/stores/a', h({accept: 'text/html', 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors'})).kind, 'document');
    assert.equal(classify('GET', '/stores/a', h({...nav, 'sec-purpose': 'prefetch', 'next-url': '/'})).kind, 'prefetch');
    assert.equal(classify('POST', '/stores/a', h({'next-action': 'abc', 'next-url': '/', 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors'})).kind, 'other');
    // API calls, Next's assets and static files stay what they were.
    assert.equal(classify('GET', '/api/proxy/me', h(apiHeaders(CHROME))).kind, 'api');
    assert.equal(classify('GET', '/_next/static/a.js', h(payload(CHROME))).kind, 'next');
    assert.equal(classify('GET', '/icon.png', h(payload(CHROME))).kind, 'static');
  });

  test('.rsc paths are payloads of the page they belong to', () => {
    assert.deepEqual(classify('GET', '/stores/a.rsc', h({})), {kind: 'rsc-nav', page: '/stores/a'});
    assert.deepEqual(classify('GET', '/stores/a.prefetch.rsc', h({})), {kind: 'rsc-prefetch', page: '/stores/a'});
    assert.deepEqual(classify('GET', '/stores/a.segments/_tree.segment.rsc', h({})), {kind: 'rsc-prefetch', page: '/stores/a'});
    assert.deepEqual(classify('GET', '/index.rsc', h({})), {kind: 'rsc-nav', page: '/'});
  });
});

describe('E1 probe paths', () => {
  const PROBES = [
    '/.env', '/.env.local', '/.env.production.bak', '/api/.env', '/backend/.env', '/tr/.env', '/%2eenv', '/.git/config', '/.git/HEAD',
    '/app/.git/index', '/.svn/entries', '/.hg/hgrc', '/.aws/credentials', '/.ssh/id_rsa', '/.docker/config.json', '/.DS_Store',
    '/.vscode/sftp.json', '/.htpasswd', '/.htaccess', '/.npmrc', '/wp-admin/', '/wp-admin/setup-config.php', '/wp-login.php',
    '/wp-content/plugins/x/readme.txt', '/wp-includes/wlwmanifest.xml', '/blog/wp-includes/wlwmanifest.xml', '/wp-json/wp/v2/users',
    '/xmlrpc.php', '/cgi-bin/luci', '/phpmyadmin/', '/phpMyAdmin/index.php', '/phpinfo', '/phpinfo.php', '/server-status', '/@fs/etc/passwd',
    '/index.php', '/admin.asp', '/default.aspx', '/login.jsp', '/test.cgi', '/index.php/admin', '/id_rsa', '/id_ed25519.pub',
    '/server.key', '/key.pem', '/appsettings.json', '/appsettings.Development.json', '/actuator', '/actuator/health', '/debug/vars',
  ];
  const NOT_PROBES = [
    '/.well-known/apple-app-site-association', '/.well-known/assetlinks.json', '/.well-known/security.txt', '/.well-known',
    '/robots.txt', '/sitemap.xml', '/sitemap/0.xml', '/sitemaps/stores-1.xml', '/_next/static/chunks/main-abc123.js',
    '/favicon.ico', '/icon.png', '/site.webmanifest', '/fonts/inter.woff2', '/.foo', '/tr/env', '/environment', '/stores/wordpress-home',
    '/en/term/php', '/tr/banka/garanti-bbva', '/debug', '/actuators', '/stores/keypem', '/', '/api/proxy/stores/abc',
  ];

  test('every listed probe gets a 404 without rendering, even from a Turkish browser', () => {
    const {check, lines} = harness(SIMPLE);
    for (const path of PROBES) {
      assert.ok(probeReason(path), path);
      const result = check(makeRequest(path, {ip: TR, headers: navigation(CHROME)}));
      assert.equal(result.action, 'refuse', path);
      assert.equal(result.status, 404, path);
      assert.equal(result.log.layer, 'E1', path);
    }
    assert.equal(lines.length, PROBES.length);
  });

  test('app links, robots.txt, sitemaps, Next assets and ordinary paths are never probes', () => {
    for (const path of NOT_PROBES) assert.equal(probeReason(path), undefined, path);
  });

  test('a HEAD probe gets no body', () => {
    const {check} = harness(SIMPLE);
    const result = check(makeRequest('/.env', {method: 'HEAD', headers: navigation(CHROME)}));
    assert.equal(result.status, 404);
    assert.equal(result.body, null);
  });
});

describe('E2 names', () => {
  const page = (ua, path = '/stores/a', site = SIMPLE, ip = '203.0.113.9') => {
    const {check} = harness(site);
    const headers = {accept: 'text/html'};
    if (ua !== null) headers['user-agent'] = ua;
    return check(makeRequest(path, {ip, headers}));
  };

  test('empty, missing, URL-shaped and truncated user agents get 403', () => {
    assert.equal(page('').log.reason, 'ua-empty');
    assert.equal(page('   ').log.reason, 'ua-empty');
    assert.equal(page(null).log.reason, 'ua-empty');
    assert.equal(page('http://example.com/scanner').log.reason, 'ua-url');
    assert.equal(page('https://example.com').log.reason, 'ua-url');
    assert.equal(page('HTTP://EXAMPLE.COM').log.reason, 'ua-url');
    assert.equal(page('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36').log.reason, 'ua-truncated');
    assert.equal(page('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ').log.reason, 'ua-truncated');
    for (const result of [page(''), page('http://x')]) {
      assert.equal(result.status, 403);
      assert.equal(result.log.layer, 'E2');
    }
  });

  test('the full truncated-looking browser string is a browser', () => {
    assert.equal(page(CHROME.ua).action, 'pass');
  });

  test('every shared no-reader name is refused, in any case, anywhere in the string', () => {
    for (const name of SHARED_UNWELCOME) {
      for (const ua of [`Mozilla/5.0 (compatible; ${name}/1.0; +https://example.com)`, name.toLowerCase(), name.toUpperCase()]) {
        const result = page(ua);
        assert.equal(result.status, 403, ua);
        assert.equal(result.log.reason, `unwelcome:${name}`, ua);
      }
    }
    assert.equal(page('Mozilla/5.0 (compatible) ShapBot/0.1.0').log.reason, 'unwelcome:ShapBot');
  });

  test("a site's own list adds to the shared one", () => {
    const bosa = SITES.bosagezme;
    assert.equal(page('Mozilla/5.0 (compatible; SERankingBacklinksBot/1.0; +https://seranking.com/backlinks-crawler)', '/stores/a', bosa).log.reason, 'unwelcome:SERanking');
    assert.equal(page('Mozilla/5.0 (compatible; AwarioBot/1.0; +https://awario.com/bots.html)', '/stores/a', bosa).status, 403);
    assert.equal(page('serpstatbot/2.1 (advanced backlink tracking bot; https://serpstatbot.com/; abuse@serpstatbot.com)', '/stores/a', bosa).status, 403);
    assert.equal(page('meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)', '/stores/a', bosa).status, 403);
  });

  test('Bankacı, coffee and yalinli keep training and answer crawlers open', () => {
    const open = [
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
      'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
      'Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)',
      'Mozilla/5.0 (compatible; GoogleOther)',
      'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
    ];
    for (const key of ['bankaciWeb', 'kredibul', 'coffee', 'yalinli']) {
      for (const ua of open) assert.equal(page(ua, '/tr/banka-faiz-oranlari', SITES[key]).action, 'pass', `${key} ${ua}`);
    }
  });

  test('robots.txt and /.well-known answer even an empty user agent', () => {
    for (const path of ['/robots.txt', '/.well-known/apple-app-site-association', '/.well-known/assetlinks.json']) {
      const {check, lines} = harness(SIMPLE);
      assert.equal(check(makeRequest(path, {ip: '45.138.12.9', headers: {}})).action, 'pass', path);
      assert.equal(check(makeRequest(path, {ip: '47.79.218.108', headers: {'user-agent': 'Bytespider'}})).action, 'pass', path);
      assert.equal(lines.length, 0, path);
    }
  });

  test('security vendors pass the name rules where the site trusts them', () => {
    const kaspersky = '93.159.230.85';
    assert.equal(page('', '/tr', SITES.bankaciWeb, kaspersky).action, 'pass');
    assert.equal(page('', '/tr', SITES.coffee, kaspersky).status, 403);
  });
});

describe('E3 networks', () => {
  const ASN_HITS = [
    ['47.79.218.108', 'AS45102'], ['8.209.1.1', 'AS45102'], ['43.130.1.1', 'AS132203'], ['101.42.1.1', 'AS45090'],
    ['2400:3200::1', 'AS37963'], ['2402:4e00::1', 'AS45090'], ['240d:c000:1000::1', 'AS132203'],
  ];
  const MISSES = ['85.107.104.14', '176.233.28.176', '188.58.57.94', '34.96.62.62', '2600:1900::1', '66.249.73.231', '17.166.23.150', '57.141.6.69', '2a02:4e0:2061::1'];
  const iphone = {'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1', accept: 'text/html'};

  test('Alibaba and Tencent are refused on content documents and payloads', () => {
    for (const [ip, asn] of ASN_HITS) {
      for (const headers of [iphone, {...iphone, accept: '*/*'}, rscHeaders(PROFILES.safariIphone26, false), rscHeaders(PROFILES.safariIphone26, true), payload(PROFILES.safariIphone26)]) {
        const {check} = harness(SIMPLE);
        const result = check(makeRequest('/stores/a', {ip, headers}));
        assert.equal(result.status, 403, ip);
        assert.equal(result.log.reason, `network:${asn}`, ip);
        assert.equal(result.log.layer, 'E3');
      }
    }
  });

  test('...and only there: not on API, assets, forms, exempt or other pages', () => {
    const {check, lines} = harness(SIMPLE);
    for (const [ip] of ASN_HITS) {
      for (const path of ['/api/proxy/me', '/_next/static/a.js', '/icon.png', '/tr/gizlilik', '/premium/x', '/profile', '/robots.txt']) {
        assert.equal(check(makeRequest(path, {ip, headers: iphone})).action, 'pass', `${ip} ${path}`);
      }
      assert.equal(check(makeRequest('/stores/a', {ip, headers: iphone, method: 'POST'})).action, 'pass');
    }
    assert.equal(lines.filter((line) => line.door === 'refused').length, 0);
  });

  test('the proven scanner blocks are refused on every path but robots.txt and /.well-known', () => {
    for (const {cidr, label} of DATA.refused.proven) {
      const ip = cidr.split('/')[0].replace(/\.(\d+)$/, (_, last) => `.${Number(last) + 1}`);
      for (const path of ['/stores/a', '/api/proxy/me', '/_next/static/a.js', '/tr/gizlilik', '/premium/x', '/sitemap.xml']) {
        const {check} = harness(SIMPLE);
        const result = check(makeRequest(path, {ip, headers: navigation(CHROME)}));
        assert.equal(result.status, 403, `${ip} ${path}`);
        assert.equal(result.log.reason, `network:${label}`);
      }
      const {check, lines} = harness(SIMPLE);
      assert.equal(check(makeRequest('/robots.txt', {ip})).action, 'pass');
      assert.equal(check(makeRequest('/.well-known/assetlinks.json', {ip})).action, 'pass');
      assert.equal(lines.length, 0);
    }
  });

  test('ordinary, crawler and own addresses are never refused by network', () => {
    const {check} = harness(SIMPLE);
    for (const ip of MISSES) assert.equal(check(makeRequest('/stores/a', {ip, headers: iphone})).action, 'pass', ip);
  });

  test('a forged first X-Forwarded-For entry changes nothing', () => {
    const {check} = harness(SIMPLE);
    assert.equal(check(makeRequest('/stores/a', {xff: '47.79.1.1, 85.107.104.14', headers: iphone})).action, 'pass');
    assert.equal(check(makeRequest('/stores/a', {xff: '85.107.104.14, 47.79.218.108', headers: iphone})).status, 403);
    assert.equal(check(makeRequest('/stores/a', {xff: '85.107.104.14,::ffff:47.79.218.108', headers: iphone})).status, 403);
  });

  test("a site's own refused networks apply on every path", () => {
    const {check} = harness(SITES.bosagezme);
    const result = check(makeRequest('/profile', {ip: '47.79.218.108', headers: iphone}));
    assert.equal(result.status, 403);
    assert.equal(result.log.reason, 'network:site');
    assert.equal(check(makeRequest('/robots.txt', {ip: '47.79.218.108', headers: iphone})).action, 'pass');
  });

  test('the refusal page is the same for every rule and has no tell', () => {
    const {check} = harness({...SIMPLE, contact: 'info@example.test'});
    const a = check(makeRequest('/stores/a', {ip: '47.79.218.108', headers: iphone}));
    const b = check(makeRequest('/stores/a', {ip: TR, headers: {'user-agent': 'Bytespider'}}));
    const c = check(makeRequest('/stores/a', {ip: '45.138.12.9', headers: iphone}));
    assert.equal(a.body, b.body);
    assert.equal(a.body, c.body);
    assert.match(a.body, /info@example\.test/);
    assert.match(a.body, new RegExp(DOOR_BEACON));
    assert.doesNotMatch(a.body, /\bE[123]\b|network|robots\.txt|disallow|alibaba|tencent/i);
    assert.equal(a.headers['cache-control'], 'no-store');
    const head = check(makeRequest('/stores/a', {ip: '47.79.218.108', headers: iphone, method: 'HEAD'}));
    assert.equal(head.body, null);
  });
});

describe('S1 rate buckets (shadow)', () => {
  const doc = (ip = TR, extra = {}) => makeRequest('/stores/a', {ip, headers: navigation(CHROME, extra)});

  test('the busiest real reader passes: 24 pages in 10 s, then 30 a minute for an hour', () => {
    const {check, lines, advance} = harness(SIMPLE);
    for (let i = 0; i < 24; i += 1) { assert.equal(check(doc()).action, 'pass'); advance(416); }
    for (let i = 0; i < 1800; i += 1) { check(doc()); advance(2000); }
    assert.equal(lines.length, 0);
  });

  test('200 documents in 10 s: would-refuse from the 127th, never refused', () => {
    const {check, lines, advance} = harness(SIMPLE);
    const failedAt = [];
    for (let i = 0; i < 200; i += 1) {
      const result = check(doc());
      assert.equal(result.action, 'pass');
      if (result.log) failedAt.push(i);
      advance(50);
    }
    assert.equal(failedAt[0], 126);
    assert.ok(failedAt.length > 60 && failedAt.length < 74, String(failedAt.length));
    assert.equal(lines[0].door, 'would-refuse');
    assert.equal(lines[0].layer, 'S1');
    assert.equal(lines[0].reason, 'rate:doc');
    assert.equal(lines[0].key, '4:85.107.104.14');
    assert.ok(lines[0].retryAfter >= 1);
  });

  test('at one instant exactly the burst passes', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 120; i += 1) check(doc());
    assert.equal(lines.length, 0);
    check(doc());
    assert.equal(lines.length, 1);
    assert.equal(lines[0].retryAfter, 1);
  });

  test('the daily cap: one page every 2 s fails on the 2,098th', () => {
    const {check, lines, advance} = harness(SIMPLE);
    let first;
    for (let i = 0; i < 2100; i += 1) {
      const result = check(doc());
      if (result.log && first === undefined) first = i;
      advance(2000);
    }
    assert.equal(first, 2097);
    assert.equal(lines[0].reason, 'rate:docDay');
  });

  test('Next payloads have their own high ceiling, prefetches and navigations alike, apart from pages', () => {
    const {check, lines} = harness(SIMPLE);
    // A prefetch whose header is still there, and the browser's own prefetch, are not counted.
    for (let i = 0; i < 10000; i += 1) check(makeRequest('/stores/a', {headers: rscHeaders(CHROME, true)}));
    for (let i = 0; i < 10000; i += 1) check(makeRequest('/stores/a', {headers: navigation(CHROME, {'sec-purpose': 'prefetch'})}));
    assert.equal(lines.length, 0);
    // As Next hands them over, prefetches and navigations fill one payload bucket.
    for (let i = 0; i < RATES_DEFAULT.rsc.burst; i += 1) check(makeRequest('/stores/a', {headers: payload(CHROME, {prefetch: i % 2 === 0})}));
    assert.equal(lines.length, 0);
    check(makeRequest('/stores/a', {headers: payload(CHROME)}));
    assert.equal(lines[0].reason, 'rate:rsc');
    assert.equal(lines[0].kind, 'rsc');
    // A navigation payload whose RSC header is still there shares the bucket.
    check(makeRequest('/stores/a', {headers: rscHeaders(CHROME, false)}));
    assert.equal(lines[1].reason, 'rate:rsc');
    assert.equal(lines[1].kind, 'rsc-nav');
    // Pages still have their whole burst.
    for (let i = 0; i < RATES_DEFAULT.document.burst; i += 1) check(doc());
    assert.equal(lines.length, 2);
  });

  test('400 prefetches from one Turkish address, as Next hands them over, write nothing; a document flood still does', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 400; i += 1) {
      const result = check(makeRequest(`/stores/s${i % 13}`, {headers: payload(PROFILES.safariIphone26, {withoutUrl: i % 3 === 0})}));
      assert.equal(result.kind, 'rsc');
    }
    // An in-app browser sends no Sec-Fetch-*; the Next client's Next-Url is enough.
    for (let i = 0; i < 400; i += 1) check(makeRequest(`/stores/s${i % 13}`, {headers: payload(PROFILES.instagramIphone)}));
    assert.deepEqual(lines, []);
    for (let i = 0; i < 200; i += 1) check(doc());
    assert.equal(lines.length, 200 - RATES_DEFAULT.document.burst);
    assert.ok(lines.every((line) => line.layer === 'S1' && line.reason === 'rate:doc' && line.kind === 'document'));
  });

  test('page GETs without text/html have a bucket of their own', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 121; i += 1) check(makeRequest('/stores/a', {headers: {'user-agent': 'python-requests/2.32', accept: '*/*'}}));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].reason, 'rate:plain');
    for (let i = 0; i < 120; i += 1) check(doc());
    assert.equal(lines.length, 1);
  });

  test('IPv6: one /64 is one key; a /48 together gets four times the limits', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 60; i += 1) check(doc(`2a00:1d33:5abc:1::${(i + 1).toString(16)}`));
    for (let i = 0; i < 60; i += 1) check(doc(`2a00:1d33:5abc:1:ffff::${(i + 1).toString(16)}`));
    assert.equal(lines.length, 0);
    check(doc('2a00:1d33:5abc:1::9999'));
    assert.equal(lines.length, 1);
    assert.match(lines[0].key, /^6:/);

    const wide = harness(SIMPLE);
    let first;
    for (let i = 0; i < 600; i += 1) {
      const result = wide.check(doc(`2a00:1d33:5abc:${(i % 50).toString(16)}::1`));
      if (result.log && first === undefined) first = i;
    }
    assert.equal(first, 480);
    assert.match(wide.lines[0].key, /^48:/);
  });

  test('requests without a usable address share one key and log what X-Forwarded-For held', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 480; i += 1) check(makeRequest('/stores/a', {xff: i % 2 ? null : '0.0.0.0', headers: navigation(CHROME)}));
    assert.equal(lines.length, 0);
    check(makeRequest('/stores/a', {xff: '0.0.0.0', headers: navigation(CHROME)}));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].key, 'none');
    assert.equal(lines[0].xff, '0.0.0.0');
    assert.equal(lines[0].addressProblem, 'unspecified');
    assert.equal(lines[0].ip, '');
  });

  test('Bankacı limits: 300 bankers behind one address open the same link in a minute', () => {
    const {check, lines, advance} = harness(SITES.bankaciWeb);
    for (let i = 0; i < 300; i += 1) { check(makeRequest('/tr/banka-faiz-oranlari', {ip: '195.39.224.102', headers: navigation(CHROME)})); advance(200); }
    assert.equal(lines.length, 0);
    const {check: instant, lines: instantLines} = harness(SITES.bankaciWeb);
    for (let i = 0; i < 301; i += 1) instant(makeRequest('/tr', {ip: '195.39.224.102', headers: navigation(CHROME)}));
    assert.equal(instantLines.length, 1);
    // ...and every one of those pages prefetches its 13 links.
    const office = harness(SITES.bankaciWeb);
    for (let i = 0; i < 300; i += 1) {
      office.check(makeRequest('/tr/banka-faiz-oranlari', {ip: '195.39.224.102', headers: navigation(CHROME)}));
      for (let j = 0; j < 13; j += 1) office.check(makeRequest(`/tr/banka/b${j}`, {ip: '195.39.224.102', headers: payload(CHROME)}));
      office.advance(200);
    }
    assert.deepEqual(office.lines, []);
  });

  test('exempt paths, API calls, assets and other methods are never counted', () => {
    const {check, lines} = harness(SITES.bankaciWeb);
    for (let i = 0; i < 1000; i += 1) {
      check(makeRequest('/premium/dashboard', {headers: navigation(CHROME)}));
      check(makeRequest('/r/AbCdEf123456', {headers: navigation(CHROME)}));
      check(makeRequest('/tr/gizlilik', {headers: navigation(CHROME)}));
      check(makeRequest('/api/x', {headers: apiHeaders(CHROME)}));
      check(makeRequest('/icon.png', {headers: assetHeaders(CHROME)}));
      check(makeRequest('/tr/talep', {headers: navigation(CHROME), method: 'POST'}));
    }
    assert.equal(lines.length, 0);
  });

  test('x-door-key skips S1 and S2 but never E1-E3', () => {
    const site = {...SIMPLE, doorKey: 'k3y-for-scripts'};
    const {check, lines} = harness(site);
    for (let i = 0; i < 500; i += 1) check(makeRequest('/stores/a', {headers: {'user-agent': 'curl/8.7.1', accept: 'text/html', 'x-door-key': 'k3y-for-scripts'}}));
    assert.equal(lines.length, 0);
    check(makeRequest('/stores/a', {headers: {'user-agent': 'curl/8.7.1', accept: 'text/html', 'x-door-key': 'wrong'}}));
    // The wrong key is just another request: the bucket was never touched by the keyed ones.
    assert.equal(lines.length, 0);
    assert.equal(check(makeRequest('/.env', {headers: {'x-door-key': 'k3y-for-scripts', 'user-agent': 'curl'}})).status, 404);
    assert.equal(check(makeRequest('/stores/a', {headers: {'x-door-key': 'k3y-for-scripts'}})).status, 403);
    assert.equal(check(makeRequest('/stores/a', {ip: '47.79.218.108', headers: {'x-door-key': 'k3y-for-scripts', 'user-agent': 'curl'}})).status, 403);
    assert.ok(lines.every((line) => !JSON.stringify(line).includes('k3y-for-scripts')));
  });

  test('the key is read from DOOR_KEY when the site does not set one', () => {
    process.env.DOOR_KEY = 'from-env';
    try {
      const {check, lines} = harness({...SIMPLE});
      for (let i = 0; i < 200; i += 1) check(makeRequest('/stores/a', {headers: {'user-agent': 'node', accept: 'text/html', 'x-door-key': 'from-env'}}));
      assert.equal(lines.length, 0);
    } finally {
      delete process.env.DOOR_KEY;
    }
  });

  test('verified crawlers and our own egress are not counted; training crawlers are', () => {
    const {check, lines} = harness(SITES.bankaciWeb);
    const googlebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    for (let i = 0; i < 1000; i += 1) {
      check(makeRequest('/tr', {ip: '66.249.73.231', headers: {'user-agent': googlebot, accept: 'text/html'}}));
      check(makeRequest('/tr', {ip: '34.96.62.62', headers: {'user-agent': 'node', accept: 'text/html'}}));
      check(makeRequest('/tr', {ip: '17.166.23.150', headers: {'user-agent': 'Mozilla/5.0 (Applebot/0.1)', accept: 'text/html'}}));
    }
    assert.equal(lines.length, 0);
    const claudebot = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)';
    for (let i = 0; i < 301; i += 1) check(makeRequest('/tr', {ip: '216.73.216.10', headers: {'user-agent': claudebot, accept: 'text/html'}}));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].reason, 'rate:doc');
  });
});

describe('the bucket store', () => {
  const specs = [{name: 'doc', cap: 120, perSecond: 1}, {name: 'docDay', cap: 2000, perSecond: 2000 / 86400}];

  test('a key is kept until every bucket has refilled, then pruned', () => {
    const store = new DoorStore(50000, 60000);
    const t0 = 1_000_000;
    store.take([{key: 'a', specs}], t0);
    store.sweep(t0 + 40_000);
    assert.equal(store.size, 1); // the daily bucket needs 43.2 s for one token
    store.sweep(t0 + 44_000);
    assert.equal(store.size, 0);
  });

  test('a crawler that pauses between batches keeps its day', () => {
    const store = new DoorStore(50000, 60000);
    const t0 = 1_000_000;
    for (let i = 0; i < 100; i += 1) store.take([{key: 'b', specs}], t0);
    store.sweep(t0 + 30 * 60_000);
    assert.equal(store.size, 1);
    assert.ok(store.entries.get('b').buckets.docDay.tokens < 2000);
  });

  test('sweeps run on their own once a minute', () => {
    const store = new DoorStore(50000, 60000);
    store.take([{key: 'c', specs}], 0);
    store.take([{key: 'd', specs}], 120_000);
    assert.equal(store.size, 1);
    assert.ok(store.entries.has('d'));
  });

  test('above the cap the fullest entries go first', () => {
    const store = new DoorStore(10, 3_600_000);
    const t0 = 5_000;
    for (let i = 0; i < 20; i += 1) {
      for (let j = 0; j <= i; j += 1) store.take([{key: `k${i}`, specs}], t0);
    }
    assert.ok(store.size <= 10);
    for (let i = 19; i > 19 - store.size; i -= 1) assert.ok(store.entries.has(`k${i}`), `k${i}`);
    assert.equal(store.entries.has('k0'), false);
  });

  test('JavaScript marks expire after two minutes', () => {
    const store = new DoorStore();
    store.markJs('j', 10_000);
    store.sweep(100_000);
    assert.equal(store.size, 1);
    store.sweep(131_000);
    assert.equal(store.size, 0);
  });

  test('a refused request takes no token from any bucket', () => {
    const store = new DoorStore();
    const tight = [{name: 'x', cap: 1, perSecond: 0.001}];
    const wide = [{name: 'y', cap: 100, perSecond: 1}];
    assert.equal(store.take([{key: 'p', specs: tight}, {key: 'q', specs: wide}], 0), undefined);
    const failure = store.take([{key: 'p', specs: tight}, {key: 'q', specs: wide}], 0);
    assert.deepEqual({key: failure.key, bucket: failure.bucket}, {key: 'p', bucket: 'x'});
    assert.equal(store.entries.get('q').buckets.y.tokens, 99);
  });
});

describe('S2 browser headers (shadow)', () => {
  const run = (headers, {path = '/stores/a', proto = 'https', ip = '203.0.113.50', site = SIMPLE} = {}) => {
    const {check, lines} = harness(site);
    const result = check(makeRequest(path, {ip, headers, proto}));
    assert.equal(result.action, 'pass');
    return lines;
  };
  const bare = (profile) => ({'user-agent': profile.ua, accept: 'text/html,*/*', 'accept-language': 'en'});

  test('Chromium, Firefox and Safari 17+ without Sec-Fetch are would-refuse', () => {
    for (const [name, engine] of [['chromeWindows', 'chrome'], ['chromeAndroid', 'chrome'], ['samsungInternet', 'chrome'], ['edge', 'chrome'], ['firefoxWindows', 'firefox'], ['safariIphone17', 'safari'], ['safariIphone26', 'safari'], ['safariMac', 'safari']]) {
      const lines = run(bare(PROFILES[name]));
      assert.equal(lines.length, 1, name);
      assert.equal(lines[0].layer, 'S2');
      assert.equal(lines[0].reason, 'no-sec-fetch');
      assert.equal(lines[0].engine, engine);
      assert.equal(lines[0].door, 'would-refuse');
    }
  });

  test('the same browsers with their real headers pass silently', () => {
    for (const name of ['chromeWindows', 'chromeAndroid', 'samsungInternet', 'edge', 'yandex', 'firefoxWindows', 'safariIphone17', 'safariIphone26', 'safariMac']) {
      assert.equal(run(navigation(PROFILES[name])).length, 0, name);
    }
  });

  test('in-app browsers, old browsers, iOS browsers and crawlers are not judged', () => {
    for (const name of ['instagramIphone', 'instagramAndroid', 'facebookIphone', 'googleAppIphone', 'legacyWebView', 'chromeIphone', 'chromeOld', 'safariIphone15']) {
      assert.equal(run(bare(PROFILES[name])).length, 0, name);
    }
    assert.equal(run({'user-agent': 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)', accept: 'text/html'}).length, 0);
    assert.equal(run({'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36 MyCrawler', accept: 'text/html'}).length, 0);
  });

  test('only over https', () => {
    assert.equal(run(bare(CHROME), {proto: 'http'}).length, 0);
    assert.equal(run(bare(CHROME), {proto: ''}).length, 0);
  });

  test('client hints that disagree with the user agent are noted', () => {
    const lines = run(navigation(CHROME, {'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120"'}));
    assert.equal(lines[0].reason, 'hints-mismatch');
    assert.equal(lines[0].hints, 'mismatch');
  });

  test('payload requests are judged too, as the canary they are', () => {
    const lines = run(rscHeaders({...CHROME, fetch: false}, false));
    assert.equal(lines[0].kind, 'rsc-nav');
    assert.equal(lines[0].layer, 'S2');
    const handed = run(payload({...CHROME, fetch: false}));
    assert.equal(handed[0].kind, 'rsc');
    assert.equal(handed[0].reason, 'no-sec-fetch');
  });

  test('exempt paths, API, assets and verified crawlers are not judged', () => {
    for (const path of ['/tr/gizlilik', '/premium/x', '/api/x', '/icon.png', '/_next/static/a.js']) {
      assert.equal(run(bare(CHROME), {path}).length, 0, path);
    }
    assert.equal(run(bare(CHROME), {ip: '66.249.73.231'}).length, 0);
    assert.equal(run(bare(CHROME), {ip: '93.159.230.85'}).length, 0); // Kaspersky's URL checker
  });

  test('the log notes JavaScript evidence, cookies and the referrer, never their values', () => {
    const {check, lines, advance} = harness(SITES.bosagezme);
    const ip = '203.0.113.77';
    check(makeRequest('/stores/a', {ip, headers: payload(CHROME)}));
    advance(60_000);
    check(makeRequest('/stores/b', {ip, headers: {...bare(CHROME), cookie: 'bosagezme_locale=tr; session=SECRETVALUE', referer: 'https://www.google.com/search?q=x'}}));
    assert.equal(lines.length, 1);
    assert.equal(lines[0].js, true);
    assert.equal(lines[0].cookie, true);
    assert.equal(lines[0].siteCookie, true);
    assert.equal(lines[0].referer, 'www.google.com');
    assert.equal(lines[0].lang, true);
    assert.ok(!JSON.stringify(lines[0]).includes('SECRETVALUE'));
    assert.ok(!JSON.stringify(lines[0]).includes('q=x'));
    advance(180_000);
    check(makeRequest('/stores/c', {ip, headers: bare(CHROME)}));
    assert.equal(lines[1].js, false);
    assert.equal(lines[1].cookie, false);
  });

  test('a payload as Next hands it over is evidence, Next-Url or a fetch() alone too', () => {
    for (const headers of [payload(CHROME), payload(CHROME, {withoutUrl: true}), payload(PROFILES.instagramIphone)]) {
      const {check, lines} = harness(SITES.bosagezme);
      check(makeRequest('/stores/a', {ip: '203.0.113.79', headers}));
      check(makeRequest('/stores/b', {ip: '203.0.113.79', headers: bare(CHROME)}));
      assert.equal(lines.length, 1);
      assert.equal(lines[0].js, true, JSON.stringify(headers));
    }
  });

  test('a jsEvidence path from the same address counts as evidence', () => {
    const {check, lines} = harness(SITES.bosagezme);
    const ip = '203.0.113.78';
    check(makeRequest('/api/runtime-config', {ip, headers: {'user-agent': CHROME.ua}}));
    check(makeRequest('/stores/a', {ip, headers: bare(CHROME)}));
    assert.equal(lines[0].js, true);
  });

  test('browserClaim reads the engines it should', () => {
    assert.deepEqual(browserClaim(CHROME.ua), {engine: 'chrome', major: 141});
    assert.deepEqual(browserClaim(PROFILES.safariIphone26.ua), {engine: 'safari', major: 26});
    assert.deepEqual(browserClaim(PROFILES.safariIphone17.ua), {engine: 'safari', major: 17});
    assert.deepEqual(browserClaim(PROFILES.safariMac.ua), {engine: 'safari', major: 18});
    assert.deepEqual(browserClaim(PROFILES.firefoxAndroid.ua), {engine: 'firefox', major: 143});
    assert.equal(browserClaim(PROFILES.safariIphone15.ua), undefined);
    // Only the first 512 characters are read.
    assert.equal(browserClaim(`${'x'.repeat(600)} ${CHROME.ua}`), undefined);
    assert.equal(browserClaim(PROFILES.chromeIphone.ua), undefined);
    assert.equal(browserClaim(PROFILES.instagramAndroid.ua), undefined);
    assert.equal(browserClaim('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), undefined);
  });

  test('a 15 KB fake user agent costs no more than a real one', () => {
    const fakes = [
      `Mozilla/5.0 Version/${'1'.repeat(15000)}`,
      `Mozilla/5.0 ${'Version/1'.repeat(1700)}`,
      `Mozilla/5.0 Version/${'1.'.repeat(7500)} Safari/`,
      `Mozilla/5.0 (Macintosh) Version/18.${'5'.repeat(15000)} Safari/605.1.15`,
    ];
    const {check} = harness(SIMPLE);
    const started = process.hrtime.bigint();
    for (const ua of fakes) {
      for (let i = 0; i < 10; i += 1) {
        browserClaim(ua);
        check(makeRequest('/stores/a', {ip: '203.0.113.90', headers: {'user-agent': ua, accept: 'text/html'}}));
      }
    }
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(ms < 100, `${ms.toFixed(1)} ms for 80 checks`);
  });
});

describe('S3 claimed crawlers (shadow)', () => {
  const first = (cidr) => {
    const parsed = parseCidr(cidr);
    const v = parsed.v4[0] + (parsed.v4[1] > parsed.v4[0] ? 1 : 0);
    return `${v >>> 24}.${(v >>> 16) & 255}.${(v >>> 8) & 255}.${v & 255}`;
  };
  const visit = (ua, ip, path = '/tr') => {
    const {check, lines} = harness(SITES.bankaciWeb);
    const result = check(makeRequest(path, {ip, headers: {'user-agent': ua, accept: 'text/html'}}));
    assert.equal(result.action, 'pass');
    return lines;
  };
  const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

  test('genuine crawlers from their publishers pass silently', () => {
    const cases = [
      [GOOGLEBOT, '66.249.73.231'],
      ['Googlebot-Image/1.0', '66.249.73.232'],
      ['Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', first(DATA.bots.bing.v4[0])],
      ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)', '17.241.208.161'],
      ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot', first(DATA.bots.openai.v4[0])],
      ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot', first(DATA.bots.openai.v4[5])],
      ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)', first(DATA.bots.perplexity.v4[0])],
      ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)', first(DATA.bots.perplexity.v4[1])],
      ['DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)', first(DATA.bots.duckduckgo.v4[0])],
      ['DuckAssistBot/1.2; (+http://duckduckgo.com/duckassistbot.html)', first(DATA.bots.duckduckgo.v4[1])],
      ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)', '216.73.216.7'],
      ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)', '216.73.219.200'],
    ];
    for (const [ua, ip] of cases) assert.deepEqual(visit(ua, ip), [], `${ua} ${ip}`);
  });

  test('the same names from anywhere else are would-refuse, never refused', () => {
    const cases = [
      [GOOGLEBOT, '34.21.205.86', 'Googlebot'],
      [GOOGLEBOT, '34.96.62.62', 'Googlebot'], // Cloud Run egress: anyone can rent it
      [GOOGLEBOT, TR, 'Googlebot'], // the owner's own tests
      ['Mozilla/5.0 (compatible; bingbot/2.0)', '198.51.100.1', 'bingbot'],
      ['Applebot/0.1', '198.51.100.2', 'Applebot'],
      ['ChatGPT-User/1.0', '34.21.205.86', 'ChatGPT-User'],
      ['OAI-SearchBot/1.0', '198.51.100.3', 'OAI-SearchBot'],
      ['PerplexityBot/1.0', '198.51.100.4', 'PerplexityBot'],
      ['Perplexity-User/1.0', '198.51.100.5', 'Perplexity-User'],
      ['DuckDuckBot/1.1', '198.51.100.6', 'DuckDuckBot'],
      ['DuckAssistBot/1.2', '34.21.205.86', 'DuckAssistBot'],
      ['Claude-SearchBot/1.0', '34.21.205.86', 'Claude-SearchBot'],
      ['Claude-User/1.0', '198.51.100.7', 'Claude-User'],
    ];
    for (const [ua, ip, name] of cases) {
      const lines = visit(ua, ip);
      assert.equal(lines.length, 1, `${ua} ${ip}`);
      assert.equal(lines[0].layer, 'S3');
      assert.equal(lines[0].reason, `unverified:${name}`);
      assert.equal(lines[0].door, 'would-refuse');
    }
  });

  test('no claim, no check; no address, no verdict; robots.txt is free', () => {
    assert.deepEqual(visit('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)', '1.2.3.4'), []);
    const {check, lines} = harness(SITES.bankaciWeb);
    check(makeRequest('/tr', {xff: '0.0.0.0', headers: {'user-agent': 'Claude-User/1.0', accept: 'text/html'}}));
    check(makeRequest('/robots.txt', {ip: '34.21.205.86', headers: {'user-agent': GOOGLEBOT}}));
    assert.equal(lines.length, 0);
  });

  test('only on pages the site judges: not on API calls, assets or exempt pages', () => {
    for (const path of ['/api/proxy/stores/index', '/api/x', '/icon.png', '/_next/static/a.js', '/premium/x', '/tr/gizlilik', '/r/AbCdEf123456']) {
      assert.deepEqual(visit(GOOGLEBOT, '85.107.1.1', path), [], path);
    }
    assert.equal(visit(GOOGLEBOT, '85.107.1.1', '/tr/banka-faiz-oranlari').length, 1);
  });

  test('one request, one line: S3 and S1 together', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 121; i += 1) check(makeRequest('/stores/a', {ip: '34.21.205.86', headers: {'user-agent': GOOGLEBOT, accept: 'text/html'}}));
    assert.equal(lines.length, 121);
    assert.equal(lines[120].layer, 'S3');
    assert.deepEqual(lines[120].also, ['S1:rate:doc']);
  });
});

describe('log lines', () => {
  test('one JSON line per refusal, with the fields Cloud Logging needs and nothing private', () => {
    const {check, lines} = harness(SIMPLE);
    const result = check(makeRequest('/stores/a?utm_source=x&token=SECRET', {ip: '47.79.218.108', headers: {'user-agent': 'x'.repeat(5000), cookie: 'session=SECRET', accept: 'text/html'}}));
    assert.equal(result.status, 403);
    assert.equal(lines.length, 1);
    const line = lines[0];
    for (const field of ['door', 'layer', 'reason', 'site', 'ip', 'ua', 'path', 'severity', 'message']) assert.ok(field in line, field);
    assert.equal(line.path, '/stores/a');
    assert.ok(line.ua.length <= 260);
    assert.equal(line.severity, 'WARNING');
    assert.ok(!JSON.stringify(line).includes('SECRET'));
    assert.equal('xff' in line, false);
  });

  test('a private last X-Forwarded-For entry raises one notice per ten minutes', () => {
    const {check, lines, advance} = harness(SIMPLE);
    for (let i = 0; i < 5; i += 1) check(makeRequest('/robots.txt', {xff: '85.107.104.14, 10.0.0.5'}));
    assert.equal(lines.filter((line) => line.door === 'notice').length, 1);
    advance(11 * 60_000);
    check(makeRequest('/robots.txt', {xff: '10.0.0.5'}));
    check(makeRequest('/robots.txt', {xff: '0.0.0.0'}));
    assert.equal(lines.filter((line) => line.door === 'notice').length, 2);
    const local = harness(SIMPLE);
    local.check(makeRequest('/', {xff: '::1', proto: null, headers: navigation(CHROME)}));
    assert.equal(local.lines.length, 0); // local development stays quiet
  });
});

describe('the refusal page beacon', () => {
  test('answers 204 and logs one seen line per address per ten minutes', () => {
    const {check, lines, advance} = harness(SIMPLE);
    const ping = (ip) => check(makeRequest(DOOR_BEACON, {ip, headers: {'user-agent': '', accept: 'image/*', referer: 'https://site.test/stores/a'}}));
    const first = ping('47.79.218.108');
    assert.equal(first.action, 'answer');
    assert.equal(first.status, 204);
    ping('47.79.218.108');
    ping('2a02:4e0:2061::5');
    assert.equal(lines.length, 2);
    assert.equal(lines[0].door, 'seen');
    assert.equal(lines[0].referer, 'site.test');
    advance(10 * 60_000);
    ping('47.79.218.108');
    assert.equal(lines.length, 3);
    assert.equal(doorResponse(first).status, 204);
  });

  test('says which refused list the address is on and which rule refused it in the last minute', () => {
    const {check, lines, advance} = harness(SIMPLE);
    const ping = (ip) => {
      check(makeRequest(DOOR_BEACON, {ip, headers: {'user-agent': CHROME.ua, accept: 'image/*', referer: 'https://site.test/stores/a'}}));
      return lines[lines.length - 1];
    };
    // Refused a moment ago: the page loaded in a browser.
    check(makeRequest('/stores/a', {ip: '47.79.218.108', headers: navigation(CHROME)}));
    assert.deepEqual([ping('47.79.218.108').network, lines[lines.length - 1].refusal], ['AS45102', 'E3:network:AS45102']);
    // On the list but never refused here: a renderer pinging, not a person turned away.
    assert.deepEqual([ping('47.79.218.109').network, lines[lines.length - 1].refusal], ['AS45102', '']);
    // Refused by name, from a Turkish line.
    check(makeRequest('/stores/a', {ip: TR, headers: {'user-agent': 'Bytespider'}}));
    assert.deepEqual([ping(TR).network, lines[lines.length - 1].refusal], ['', 'E2:unwelcome:Bytespider']);
    // A refusal more than a minute old no longer counts.
    check(makeRequest('/stores/a', {ip: '45.138.12.9', headers: navigation(CHROME)}));
    advance(61_000);
    assert.deepEqual([ping('45.138.12.9').network, lines[lines.length - 1].refusal], ['TC Datacenter', '']);
    // Address-less refusals share one key, like the beacon's.
    check(makeRequest('/stores/a', {xff: null, headers: {'user-agent': ''}}));
    assert.equal(ping(null).refusal, 'E2:ua-empty');
  });

  test('the memory of refusals is capped', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 2100; i += 1) check(makeRequest('/stores/a', {ip: `198.51.${i >> 8}.${i & 255}`, headers: {'user-agent': ''}}));
    check(makeRequest(DOOR_BEACON, {ip: '198.51.0.0'}));
    check(makeRequest(DOOR_BEACON, {ip: `198.51.${2099 >> 8}.${2099 & 255}`}));
    const seen = lines.filter((line) => line.door === 'seen');
    assert.deepEqual(seen.map((line) => line.refusal), ['', 'E2:ua-empty']);
  });

  test('cannot flood the log', () => {
    const {check, lines} = harness(SIMPLE);
    for (let i = 0; i < 500; i += 1) check(makeRequest(DOOR_BEACON, {ip: `198.51.${i >> 8}.${i & 255}`}));
    assert.equal(lines.length, 60);
  });
});

describe('responses and robustness', () => {
  test('doorResponse builds the response the verdict stands for', async () => {
    const {check} = harness(SIMPLE);
    const refused = doorResponse(check(makeRequest('/stores/a', {headers: {}})));
    assert.equal(refused.status, 403);
    assert.match(refused.headers.get('content-type'), /text\/html/);
    assert.match(await refused.text(), /otomatik bir kural/);
    const probe = doorResponse(check(makeRequest('/.git/config', {headers: {'user-agent': CHROME.ua}})));
    assert.equal(probe.status, 404);
    assert.equal(await probe.text(), 'Not Found\n');
  });

  test('a broken site matcher lets the request through and says so', () => {
    const {check, lines} = harness({...SIMPLE, content: () => { throw new Error('boom'); }});
    const result = check(makeRequest('/stores/a', {ip: '47.79.218.108', headers: navigation(CHROME)}));
    assert.equal(result.action, 'pass');
    assert.equal(lines[0].door, 'error');
  });

  test('unreadable data refuses no network but keeps the path and name rules', () => {
    const lines = [];
    const check = createDoor(SIMPLE, {data: {}, log: (line) => lines.push(JSON.parse(line)), store: new DoorStore()});
    assert.equal(lines[0].door, 'error');
    assert.equal(check(makeRequest('/stores/a', {ip: '47.79.218.108', headers: navigation(CHROME)})).action, 'pass');
    assert.equal(check(makeRequest('/.env', {headers: navigation(CHROME)})).status, 404);
    assert.equal(check(makeRequest('/stores/a', {headers: {'user-agent': 'Scrapy/2.11'}})).status, 403);
  });

  test('a site config that cannot be built lets everything through', () => {
    const lines = [];
    const original = console.warn;
    console.warn = (line) => lines.push(JSON.parse(line));
    try {
      const result = door.door(makeRequest('/stores/a', {headers: {}}), {site: 'broken', content: () => true, unwelcome: 5});
      assert.equal(result.action, 'pass');
      assert.equal(lines[0].door, 'error');
    } finally {
      console.warn = original;
    }
  });

  test('odd input does not throw', () => {
    const {check} = harness(SIMPLE);
    for (const path of ['/%E0%A4%A', '/%', '/a//b', '/' + 'x'.repeat(5000), '/tr/%C5%9Fehir']) {
      assert.ok(['pass', 'refuse'].includes(check(makeRequest(path, {headers: navigation(CHROME)})).action), path);
    }
    for (const xff of ['', ',', ', ,', '[::1', '1.2.3.4.5', 'a'.repeat(1000), '::ffff:', '2001:db8:::1']) {
      assert.equal(check(makeRequest('/stores/a', {xff, headers: navigation(CHROME)})).action, 'pass', xff);
    }
  });

  test('door() builds one door per site object and keeps its buckets', () => {
    const lines = [];
    const original = console.warn;
    console.warn = (line) => lines.push(line);
    try {
      const site = {site: 'cached', content: () => true};
      for (let i = 0; i < 121; i += 1) door.door(makeRequest('/a', {ip: '203.0.113.200', headers: navigation(CHROME)}), site);
      assert.equal(lines.length, 1);
      assert.equal(JSON.parse(lines[0]).reason, 'rate:doc');
    } finally {
      console.warn = original;
    }
  });
});

describe('paths()', () => {
  test('exact, prefix, segment, choice and inner wildcard patterns', () => {
    const match = paths('/', '/privacy', '/tr/*', '/:locale/account-deletion', '/{en,de}/stores/*', '/ac*/*');
    for (const yes of ['/', '/privacy', '/privacy/', '/tr', '/tr/', '/tr/banka/x', '/ru/account-deletion', '/en/stores/a', '/DE/stores/a', '/ac', '/account', '/account/x']) {
      assert.equal(match(yes), true, yes);
    }
    for (const no of ['/privacyx', '/trx', '/en', '/en/account-deletion/x', '/fr/stores/a', '/a', '/b/ac']) {
      assert.equal(match(no), false, no);
    }
    assert.equal(paths(/^\/x\d+$/)('/x12'), true);
    assert.equal(paths('/*')('/anything/at/all'), true);
  });
});

// ---------------------------------------------------------------------------------------
// Next removes the RSC headers and the _rsc query before middleware or proxy runs. The tests
// above build that request by hand; these take it from Next itself.

describe('requests as Next really hands them to middleware', () => {
  const adapters = nextAdapters();
  if (adapters.length === 0) test('needs a Next install: run in a site repo or set DOOR_NEXT_DIRS', {skip: 'no Next found'}, () => {});

  for (const [version, adapter] of adapters) {
    test(`Next ${version}: the headers the door gets are the ones these tests assume, and a payload is still one`, async () => {
      const {check} = harness(SIMPLE);
      const own = new Set(['host', 'x-forwarded-for', 'x-forwarded-proto']);
      for (const profile of [CHROME, PROFILES.safariIphone26, PROFILES.instagramIphone]) {
        for (const prefetch of [true, false]) {
          const sent = rscHeaders(profile, prefetch);
          const sentWithSegment = prefetch ? {...sent, 'next-router-segment-prefetch': '/_tree'} : sent;
          const {verdict, handed} = await throughNext(adapter, check, '/stores/a', sentWithSegment, {query: '?_rsc=1x2y3'});
          const names = [...handed.headers.keys()].filter((name) => !own.has(name)).sort();
          assert.deepEqual(names, Object.keys(asNextHandsIt(sentWithSegment)).sort());
          assert.equal(handed.nextUrl.search, '');
          assert.equal(verdict.kind, 'rsc');
          assert.equal(verdict.action, 'pass');
        }
      }
      const {verdict} = await throughNext(adapter, check, '/stores/a', navigation(CHROME));
      assert.equal(verdict.kind, 'document');
      const alibaba = await throughNext(adapter, check, '/stores/a', rscHeaders(PROFILES.safariIphone26, true), {ip: '47.79.218.108', query: '?_rsc=1'});
      assert.equal(alibaba.verdict.status, 403);
    });

    test(`Next ${version}: 400 prefetches from one Turkish address write no S1 line; a document flood still does`, async () => {
      const {check, lines} = harness(SIMPLE);
      for (let i = 0; i < 400; i += 1) {
        const profile = i % 2 ? PROFILES.safariIphone26 : PROFILES.instagramAndroid;
        const {verdict} = await throughNext(adapter, check, `/stores/s${i % 13}`, rscHeaders(profile, true), {query: `?_rsc=${i.toString(36)}`});
        assert.equal(verdict.kind, 'rsc');
      }
      assert.deepEqual(lines, []);
      for (let i = 0; i < 200; i += 1) await throughNext(adapter, check, '/stores/a', navigation(CHROME));
      assert.equal(lines.length, 200 - RATES_DEFAULT.document.burst);
      assert.ok(lines.every((line) => line.layer === 'S1' && line.reason === 'rate:doc' && line.kind === 'document'));
    });
  }
});

// ---------------------------------------------------------------------------------------
// The promise: a person in a browser from a Turkish line is never refused, and never even
// noted as would-refuse, on any page of any site, whatever kind of request the page makes.

describe('real people are never refused or would-refused', () => {
  test('every site, every browser, every Turkish address, every path and request kind', () => {
    let requests = 0;
    for (const [key, site] of Object.entries(SITES)) {
      for (const [profileName, profile] of Object.entries(PROFILES)) {
        for (const ip of TURKISH) {
          const {check, lines, advance} = harness(site);
          for (const path of SITE_PATHS[key]) {
            const kinds = [
              navigation(profile), payload(profile, {prefetch: true}), payload(profile, {prefetch: false}), payload(profile, {withoutUrl: true}),
              rscHeaders(profile, true), rscHeaders(profile, false), assetHeaders(profile), apiHeaders(profile),
            ];
            for (const headers of kinds) {
              const result = check(makeRequest(path, {ip, headers}));
              requests += 1;
              assert.equal(result.action, 'pass', `${key} ${profileName} ${ip} ${path}`);
            }
            advance(1500);
          }
          assert.deepEqual(lines, [], `${key} ${profileName} ${ip}`);
        }
      }
    }
    assert.ok(requests > 300000, String(requests));
  });

  test('the busiest measured sessions stay below every threshold', () => {
    // The team iPhone on Boşa Gezme: 421 API calls a minute, 4,302 prefetches, a /discover
    // loop, and 129 pages in a day. The payloads as Next hands them over, so prefetches count.
    {
      const {check, lines, advance} = harness(SITES.bosagezme);
      const ip = '176.233.28.176';
      const phone = PROFILES.safariIphone26;
      for (let minute = 0; minute < 60; minute += 1) {
        for (let i = 0; i < 421; i += 1) check(makeRequest('/api/proxy/me/discovery-location', {ip, headers: apiHeaders(phone)}));
        for (let i = 0; i < 72; i += 1) check(makeRequest('/discover', {ip, headers: payload(phone, {prefetch: true})}));
        for (let i = 0; i < 12; i += 1) check(makeRequest('/stores/a', {ip, headers: payload(phone, {prefetch: false})}));
        check(makeRequest('/stores/a', {ip, headers: navigation(phone)}));
        advance(60_000);
      }
      for (let i = 0; i < 129; i += 1) { check(makeRequest('/stores/b', {ip, headers: navigation(phone)})); advance(300_000); }
      assert.deepEqual(lines, []);
    }
    // A coffee reader opening a glossary letter: about 210 payloads within 30 s.
    {
      const {check, lines, advance} = harness(SITES.coffee);
      for (let i = 0; i < 210; i += 1) {
        check(makeRequest('/en/glossary/a', {ip: '91.53.85.227', headers: payload(CHROME, {prefetch: i % 4 !== 0})}));
        advance(140);
      }
      assert.deepEqual(lines, []);
    }
    // An Instagram wave behind one Vodafone carrier-NAT address: 22 pages and 456 cached
    // assets in ten minutes, from the in-app browser.
    {
      const {check, lines, advance} = harness(SITES.coffee);
      for (let i = 0; i < 22; i += 1) {
        check(makeRequest(`/en/term/t${i}`, {ip: '176.54.199.131', headers: navigation(PROFILES.instagramIphone)}));
        for (let j = 0; j < 21; j += 1) check(makeRequest(`/_next/static/chunks/${j}.js`, {ip: '176.54.199.131', headers: assetHeaders(PROFILES.instagramIphone)}));
        advance(27_000);
      }
      assert.deepEqual(lines, []);
    }
    // A German editor at 49 pages an hour for a working day.
    {
      const {check, lines, advance} = harness(SITES.coffee);
      for (let i = 0; i < 49 * 8; i += 1) { check(makeRequest('/de/term/x', {ip: '2003:e3:ef4f:1::5', headers: navigation(PROFILES.firefoxWindows)})); advance(73_000); }
      assert.deepEqual(lines, []);
    }
  });
});
