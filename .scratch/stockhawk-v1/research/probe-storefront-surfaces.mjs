import { createHash } from "node:crypto";

const targets = [
  { hint: "jellycat", name: "Jellycat US", url: "https://us.jellycat.com/" },
  { hint: "shopify", name: "Paper Luxe", url: "https://paper-luxe.com/" },
  { hint: "shopify", name: "Baby Supermarket", url: "https://babysupermarket.com/" },
  { hint: "woocommerce", name: "Creative Interiors", url: "https://creativeinteriorsetc.com/" },
  { hint: "woocommerce", name: "Moon Rabbit Toys", url: "https://moonrabbittoys.com/" },
  { hint: "lightspeed", name: "Daytrip Society", url: "https://daytripsociety.com/" },
  { hint: "lightspeed", name: "Oh Baby", url: "https://ohbabybr.com/" },
  { hint: "square", name: "The Nature Company of Salado", url: "https://thenatureco-ofsalado.square.site/" },
  { hint: "wix", name: "Touch of Grayce", url: "https://touchofgrayce.com/" },
  { hint: "wix", name: "Magpie Blossoms", url: "https://www.magpieblossoms.com/" },
  { hint: "squarespace", name: "Bonne Nuit New York", url: "https://bonnenuitnewyork.com/" },
  { hint: "squarespace", name: "Shop at Burketts", url: "https://shopatburketts.com/" },
  { hint: "bigcommerce", name: "Baby Crossing", url: "https://babycrossing.com/" },
  { hint: "magento", name: "City Chemist", url: "https://city-chemist.com/" },
  { hint: "magento", name: "Strand Books", url: "https://www.strandbooks.com/" },
  { hint: "magento", name: "Five Little Monkeys", url: "https://www.5littlemonkeys.com/" },
  { hint: "bookmanager", name: "Merritt Bookstore", url: "https://merrittbooks.com/" },
  { hint: "indiecommerce", name: "Harvard Book Store", url: "https://harvard.com/" },
  { hint: "miva", name: "Borsheims", url: "https://borsheims.com/" },
  { hint: "suitecommerce", name: "Henry Bear's Park", url: "https://www.henrybear.com/stores/details/8" },
  { hint: "nopcommerce", name: "Fairytales", url: "https://www.fairy-tales-inc.com/" },
  { hint: "solidus", name: "Lewis Gifts", url: "https://www.lewisgifts.com/" },
  { hint: "volusion", name: "Lola of North Beach", url: "https://lolaofnorthbeach.com/" },
  { hint: "webflowcommerce", name: "Connors Mercantile", url: "https://www.connorsmercantile.com/" },
  { hint: "godaddy", name: "Little Things Toy Store", url: "https://littlethingstoystore.com/" },
];

const requestedNames = new Set(process.argv.slice(2).map((value) => value.toLowerCase()));
const selectedTargets = requestedNames.size
  ? targets.filter((target) => requestedNames.has(target.hint.toLowerCase()) || requestedNames.has(target.name.toLowerCase()))
  : targets;

const userAgent = "StockHawk/0 architecture-research (private read-only storefront audit)";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const decodeBody = (buffer, contentType) => {
  const charset = /charset=([^;\s]+)/i.exec(contentType ?? "")?.[1]?.replace(/["']/g, "").toLowerCase();
  try {
    return new TextDecoder(charset || "utf-8", { fatal: false }).decode(buffer);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  }
};

const fetchLimited = async (initialUrl, { maxBytes = 1_000_000, accept, method = "GET" } = {}) => {
  const chain = [];
  let url = initialUrl;

  for (let redirect = 0; redirect <= 7; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response;
    try {
      response = await fetch(url, {
        method,
        redirect: "manual",
        headers: {
          "user-agent": userAgent,
          accept: accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.5",
          "accept-language": "en-US,en;q=0.8",
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      return {
        ok: false,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        cause: error instanceof Error && error.cause ? String(error.cause) : null,
        chain,
      };
    }
    clearTimeout(timeout);

    const location = response.headers.get("location");
    chain.push({ url, status: response.status, location });
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      url = new URL(location, url).href;
      continue;
    }

    const chunks = [];
    let bytes = 0;
    let truncated = false;
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const remaining = maxBytes - bytes;
        if (remaining <= 0) {
          truncated = true;
          await reader.cancel();
          break;
        }
        chunks.push(value.byteLength > remaining ? value.subarray(0, remaining) : value);
        bytes += Math.min(value.byteLength, remaining);
        if (value.byteLength > remaining || bytes >= maxBytes) {
          truncated = true;
          await reader.cancel();
          break;
        }
      }
    }

    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const contentType = response.headers.get("content-type") ?? "";
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: url,
      chain,
      headers: {
        server: response.headers.get("server"),
        contentType,
        contentLength: response.headers.get("content-length"),
        link: response.headers.get("link"),
        xWpTotal: response.headers.get("x-wp-total"),
        xWpTotalPages: response.headers.get("x-wp-totalpages"),
        retryAfter: response.headers.get("retry-after"),
        cacheControl: response.headers.get("cache-control"),
      },
      bytes,
      truncated,
      sha256: createHash("sha256").update(body).digest("hex"),
      text: decodeBody(body, contentType),
    };
  }

  return { ok: false, error: "too_many_redirects", chain };
};

const matchAll = (text, pattern, limit = 20) => {
  const matches = [];
  for (const match of text.matchAll(pattern)) {
    matches.push(match[1] ?? match[0]);
    if (matches.length >= limit) break;
  }
  return matches;
};

const platformSignals = (html, finalUrl) => {
  const source = `${html}\n${finalUrl}`;
  const rules = {
    shopify: /cdn\.shopify\.com|Shopify\.(?:theme|routes)|shopify-section|myshopify\.com/i,
    woocommerce: /woocommerce|wc-(?:blocks|ajax)|wp-content\/plugins\/woocommerce/i,
    wordpress: /wp-content|wp-includes|\/wp-json\//i,
    bigcommerce: /cdn\d*\.bigcommerce\.com|stencil-utils|bigcommerce/i,
    magento: /Magento_|static\/version\d+|(?:src|href)=["'][^"']*\/mage\/|x-magento/i,
    wix: /wixstatic\.com|wix-code-sdk|wix-thunderbolt/i,
    squarespace: /static\.squarespace\.com|squarespace-cdn|Squarespace/i,
    square_weebly: /square\.site|weebly|editmysite\.com/i,
    ecwid: /app\.ecwid\.com|ecwid-shopping-cart|ec-store/i,
    lightspeed: /lightspeedhq|ecom\.cloud|shoplightspeed/i,
    webflow: /webflow\.com|data-wf-(?:page|site)/i,
    drupal: /drupalSettings|sites\/default\/files|Drupal/i,
    miva: /miva|Merchant2\/merchant\.mvc/i,
    volusion: /volusion|vnav\.site|a3\.volusion\.com/i,
    nopcommerce: /nopCommerce|nopcommerce/i,
    netsuite: /netsuite|shopping\.na\d+\.netsuite/i,
    godaddy: /godaddysites\.com|wsimg\.com|GoDaddy/i,
  };
  return Object.entries(rules).filter(([, rule]) => rule.test(source)).map(([name]) => name);
};

const summarizeHtml = (response) => {
  if (!response?.text) return null;
  const html = response.text;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const hrefs = matchAll(html, /href=["']([^"'#]+)["']/gi, 500);
  const catalogish = hrefs.filter((href) => /\/(?:collections?|categories?|products?|shop|store)(?:\/|\?|$)/i.test(href));
  const jsonLdTypes = matchAll(html, /["']@type["']\s*:\s*["']([^"']+)["']/gi, 100);
  const identifiers = {
    skuTokens: (html.match(/["']sku["']\s*:/gi) ?? []).length,
    gtinTokens: (html.match(/["'](?:gtin|gtin12|gtin13|gtin14|mpn)["']\s*:/gi) ?? []).length,
    brandTokens: (html.match(/["']brand["']\s*:/gi) ?? []).length,
    variantTokens: (html.match(/["']variants?["']\s*:/gi) ?? []).length,
  };
  return {
    title,
    platforms: platformSignals(html, response.finalUrl),
    catalogishLinkCountInCapturedHtml: catalogish.length,
    catalogishLinkExamples: [...new Set(catalogish)].slice(0, 8),
    jsonLdTypes: [...new Set(jsonLdTypes)].slice(0, 20),
    identifiers,
  };
};

const summarizeSitemap = (response) => {
  if (!response?.text) return null;
  const xmlLocations = matchAll(response.text, /<loc>\s*([^<]+?)\s*<\/loc>/gi, 10_000);
  const locations = xmlLocations.length
    ? xmlLocations
    : response.text.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^https?:\/\/\S+$/.test(line)).slice(0, 10_000);
  const rootName = /<sitemapindex\b/i.test(response.text)
    ? "sitemapindex"
    : /<urlset\b/i.test(response.text)
      ? "urlset"
      : "unknown";
  return {
    rootName,
    capturedLocationCount: locations.length,
    productLikeLocations: locations.filter((location) => /\/(?:products?|p)\//i.test(location)).length,
    examples: locations.slice(0, 8),
  };
};

const summarizeJson = (response) => {
  if (!response?.text) return null;
  try {
    const value = JSON.parse(response.text);
    const product = Array.isArray(value)
      ? value[0]
      : Array.isArray(value?.products)
        ? value.products[0]
        : value?.data?.products?.items?.[0] ?? value?.data?.products?.edges?.[0]?.node;
    return {
      topLevel: Array.isArray(value) ? "array" : Object.keys(value ?? {}).slice(0, 20),
      sampleProductKeys: product && typeof product === "object" ? Object.keys(product).slice(0, 30) : [],
      sampleVariantCount: Array.isArray(product?.variants) ? product.variants.length : null,
      sampleAvailability: product?.available ?? product?.variants?.[0]?.available ?? product?.is_in_stock ?? product?.is_purchasable ?? product?.stock_status ?? null,
      sampleSku: product?.sku ?? product?.variants?.[0]?.sku ?? null,
    };
  } catch {
    return { parseError: true, prefix: response.text.slice(0, 160).replace(/\s+/g, " ") };
  }
};

const platformProbeUrl = (origin, signals) => {
  if (signals.includes("shopify")) return new URL("/products.json?limit=1", origin).href;
  if (signals.includes("woocommerce")) return new URL("/wp-json/wc/store/v1/products?per_page=1&page=1", origin).href;
  if (signals.includes("magento")) {
    const query = "{products(search:\"Jellycat\",pageSize:1,currentPage:1){total_count page_info{current_page total_pages} items{name sku stock_status __typename}}}";
    return new URL(`/graphql?query=${encodeURIComponent(query)}`, origin).href;
  }
  return null;
};

const stripBody = (response) => {
  if (!response) return response;
  const { text: _text, ...summary } = response;
  return summary;
};

const inspectTarget = async (target) => {
  const startedAt = new Date().toISOString();
  const home = await fetchLimited(target.url);
  const final = home.finalUrl ?? target.url;
  const origin = new URL(final).origin;
  const htmlSummary = summarizeHtml(home);
  await sleep(250);
  const robots = await fetchLimited(new URL("/robots.txt", origin).href, { maxBytes: 300_000, accept: "text/plain,*/*;q=0.5" });
  const sitemapDirectives = robots.text
    ? matchAll(robots.text, /^\s*Sitemap:\s*(\S+)\s*$/gim, 20)
    : [];
  await sleep(250);
  const sitemapUrl = sitemapDirectives[0]
    ?? new URL(htmlSummary?.platforms.includes("bigcommerce") ? "/xmlsitemap.php" : "/sitemap.xml", origin).href;
  const sitemap = await fetchLimited(sitemapUrl, { maxBytes: 1_500_000, accept: "application/xml,text/xml,*/*;q=0.5" });
  const sitemapSummary = summarizeSitemap(sitemap);
  const childCandidates = sitemapSummary?.rootName === "sitemapindex"
    ? matchAll(sitemap.text, /<loc>\s*([^<]+?)\s*<\/loc>/gi, 10_000)
    : [];
  const childSitemapUrl = childCandidates.find((url) => /product|store-products|sitemap\.ols/i.test(url)) ?? childCandidates[0] ?? null;
  let childSitemap = null;
  if (childSitemapUrl) {
    await sleep(250);
    childSitemap = await fetchLimited(childSitemapUrl.replaceAll("&amp;", "&"), { maxBytes: 2_000_000, accept: "application/xml,text/xml,text/plain,*/*;q=0.5" });
  }
  const probeUrl = platformProbeUrl(origin, htmlSummary?.platforms ?? []);
  let platformProbe = null;
  if (probeUrl) {
    await sleep(250);
    platformProbe = await fetchLimited(probeUrl, { maxBytes: 500_000, accept: "application/json,*/*;q=0.5" });
  }

  return {
    target,
    startedAt,
    requestCount: 3 + Number(Boolean(childSitemapUrl)) + Number(Boolean(probeUrl)),
    home: { ...stripBody(home), summary: htmlSummary },
    robots: {
      ...stripBody(robots),
      sitemapDirectives,
      disallowsProductPaths: robots.text ? /^\s*Disallow:\s*\/(?:products?|collections?|shop)/gim.test(robots.text) : null,
    },
    sitemap: { requestedUrl: sitemapUrl, ...stripBody(sitemap), summary: sitemapSummary },
    childSitemap: childSitemap
      ? { requestedUrl: childSitemapUrl.replaceAll("&amp;", "&"), ...stripBody(childSitemap), summary: summarizeSitemap(childSitemap) }
      : null,
    platformProbe: platformProbe
      ? { requestedUrl: probeUrl, ...stripBody(platformProbe), summary: summarizeJson(platformProbe) }
      : null,
  };
};

const results = [];
let nextIndex = 0;
const worker = async () => {
  while (nextIndex < selectedTargets.length) {
    const target = selectedTargets[nextIndex];
    nextIndex += 1;
    results.push(await inspectTarget(target));
  }
};

await Promise.all(Array.from({ length: Math.min(2, selectedTargets.length) }, worker));
results.sort((left, right) => targets.findIndex((target) => target.url === left.target.url) - targets.findIndex((target) => target.url === right.target.url));

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  userAgent,
  concurrency: Math.min(2, selectedTargets.length),
  targetCount: selectedTargets.length,
  requestCount: results.reduce((sum, result) => sum + result.requestCount, 0),
  results,
}, null, 2));
