import type { createSupabaseServiceClient } from "@/lib/supabase";
import { getFreshInstagramAccount } from "@/lib/instagram-token";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type InstagramGraphError = {
  message?: string;
};

type InstagramGraphListResponse<T> = {
  data?: T[];
  error?: InstagramGraphError;
};

type InstagramCatalogMediaResponse = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  comments_count?: number;
  like_count?: number;
};

export type InstagramCatalogMedia = {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
  commentsCount?: number | null;
  likeCount?: number | null;
};

export type InstagramProductCatalogItem = {
  id: string;
  sourceMediaId: string;
  title: string;
  priceText: string;
  priceAmount: number | null;
  currency: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  permalink: string;
  sourceCaption: string;
  tags: string[];
  confidence: number;
  timestamp: string;
};

export type InstagramCatalogOffer = Pick<
  InstagramProductCatalogItem,
  | "id"
  | "sourceMediaId"
  | "title"
  | "priceText"
  | "priceAmount"
  | "currency"
  | "description"
  | "imageUrl"
  | "thumbnailUrl"
  | "permalink"
  | "confidence"
> & {
  matchScore: number;
};

type CatalogOfferMatch = {
  item: InstagramProductCatalogItem;
  score: number;
  specificMatchCount: number;
};

type CatalogPrice = {
  priceText: string;
  priceAmount: number | null;
  currency: string;
};

const productIntentWords = [
  "price",
  "pricing",
  "cost",
  "how much",
  "details",
  "detail",
  "available",
  "availability",
  "buy",
  "purchase",
  "order",
  "book",
  "checkout",
  "confirm",
  "approved",
  "payment",
  "send",
  "show",
  "picture",
  "image",
  "photo",
  "product",
  "item",
  "option",
  "options",
  "catalog",
  "collection",
  "collections",
  "sell",
  "selling",
  "jewelry",
  "jewellery",
  "clothes",
  "clothing",
  "outfit",
  "outfits",
  "dress",
  "dresses",
  "kurta",
  "kurtas",
  "necklace",
  "necklaces",
  "choker",
  "chokers",
  "package",
  "plan",
  "size",
  "variant",
];

const productCaptionWords = [
  "price",
  "pricing",
  "cost",
  "rs",
  "pkr",
  "usd",
  "order",
  "buy",
  "shop",
  "available",
  "stock",
  "size",
  "delivery",
  "shipping",
  "book",
  "package",
  "offer",
  "sale",
  "new arrival",
  "dm",
  "link in bio",
];

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "your",
  "you",
  "are",
  "can",
  "please",
  "send",
  "price",
  "pricing",
  "cost",
  "details",
  "detail",
  "how",
  "much",
  "want",
  "need",
  "interested",
  "available",
  "budget",
  "range",
  "dollar",
  "dollars",
  "pkr",
  "rs",
  "usd",
  "have",
  "having",
  "any",
  "thing",
  "things",
  "new",
  "fancy",
  "regarding",
]);

const genericCatalogSearchWords = new Set([
  "show",
  "send",
  "see",
  "view",
  "browse",
  "image",
  "images",
  "photo",
  "photos",
  "picture",
  "pictures",
  "product",
  "products",
  "item",
  "items",
  "option",
  "options",
  "catalog",
  "carousel",
  "slider",
  "more",
  "some",
  "our",
  "all",
  "package",
  "packages",
  "plan",
  "plans",
  "order",
  "orders",
]);

const broadCatalogCategoryWords = new Set([
  "product",
  "products",
  "item",
  "items",
  "option",
  "options",
  "catalog",
  "collection",
  "collections",
  "design",
  "designs",
  "jewelry",
  "jewellery",
  "clothes",
  "clothing",
  "wear",
  "things",
  "stuff",
]);

const catalogGoalWords = new Set([
  "wedding",
  "bridal",
  "bride",
  "groom",
  "engagement",
  "party",
  "gift",
  "birthday",
  "eid",
  "daily",
  "office",
  "formal",
  "casual",
  "school",
  "event",
]);

const specificCatalogProductTypeWords = new Set([
  "jewelry",
  "jewellery",
  "clothes",
  "clothing",
  "outfit",
  "outfits",
  "necklace",
  "necklaces",
  "choker",
  "chokers",
  "earring",
  "earrings",
  "bracelet",
  "bracelets",
  "ring",
  "rings",
  "bangle",
  "bangles",
  "pendant",
  "pendants",
  "chain",
  "chains",
  "set",
  "sets",
  "dress",
  "dresses",
  "frock",
  "frocks",
  "shirt",
  "shirts",
  "tshirt",
  "tshirts",
  "tee",
  "tees",
  "denim",
  "jeans",
  "kurta",
  "kurtas",
  "suit",
  "suits",
  "course",
  "courses",
  "program",
  "programs",
  "package",
  "packages",
]);

const catalogSearchSynonymGroups = [
  ["kid", "kids", "child", "children", "boy", "boys", "girl", "girls", "toddler", "toddlers", "baby", "babies"],
  [
    "cloth",
    "cloths",
    "clothes",
    "clothing",
    "wear",
    "wears",
    "outfit",
    "outfits",
    "dress",
    "dresses",
    "frock",
    "frocks",
    "shirt",
    "shirts",
    "tshirt",
    "tshirts",
    "tee",
    "tees",
    "denim",
    "jean",
    "jeans",
    "kurta",
    "kurtas",
    "kameez",
    "suit",
    "suits",
  ],
  ["dress", "dresses", "frock", "frocks"],
  ["necklace", "necklaces", "choker", "chokers", "pendant", "pendants"],
  ["earring", "earrings", "jhumka", "jhumkas"],
  ["bracelet", "bracelets", "bangle", "bangles"],
  ["ring", "rings"],
  ["shirt", "shirts", "tshirt", "tshirts", "tee", "tees"],
  ["denim", "jean", "jeans"],
  ["kurta", "kurtas", "kameez", "suit", "suits"],
  ["coach", "coaches", "coaching", "training", "program", "course", "courses"],
];

function compactText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value = "") {
  return compactText(
    value
      .toLowerCase()
      .replace(/\bclothses\b/g, "clothes")
      .replace(/\bclotheses\b/g, "clothes")
      .replace(/\bcloths\b/g, "clothes")
      .replace(/[#_/-]+/g, " ")
  );
}

function truncateText(value: string, maxLength: number) {
  const compact = compactText(value);

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function getCaptionLines(caption: string) {
  return caption
    .split(/\r?\n/)
    .map((line) => compactText(line.replace(/[#*•]+/g, " ")))
    .filter(Boolean);
}

function normalizeCurrency(value = "") {
  const normalized = value.toLowerCase().replace(".", "");

  if (normalized === "$" || normalized === "usd" || normalized === "dollar" || normalized === "dollars") {
    return "USD";
  }

  if (normalized === "rs" || normalized === "pkr" || normalized === "rupee" || normalized === "rupees") {
    return "PKR";
  }

  if (normalized === "aed") {
    return "AED";
  }

  if (normalized === "gbp" || normalized === "pound" || normalized === "pounds") {
    return "GBP";
  }

  if (normalized === "eur" || normalized === "euro" || normalized === "euros") {
    return "EUR";
  }

  return "";
}

function parseAmount(value = "") {
  const normalized = value.replace(/,/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

export function extractCatalogPrice(text: string): CatalogPrice {
  const patterns = [
    /\b(price|pricing|cost|rate|fee|only|now|sale)\s*[:\-]?\s*(\$|rs\.?|pkr|usd|aed|gbp|eur)?\s*([1-9][\d,]*(?:\.\d{1,2})?)\b/i,
    /\b(\$|rs\.?|pkr|usd|aed|gbp|eur)\s*([1-9][\d,]*(?:\.\d{1,2})?)\b/i,
    /\b([1-9][\d,]*(?:\.\d{1,2})?)\s*(usd|pkr|rs|rupees?|dollars?|aed|gbp|eur)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const captureGroups = match.slice(1).filter(Boolean);
    const currencyToken = captureGroups.find((item) => Boolean(normalizeCurrency(item || ""))) || "";
    const amountToken = captureGroups
      .reverse()
      .find((item) => Boolean(item && /^[1-9][\d,]*(?:\.\d{1,2})?$/.test(item)));
    const amount = parseAmount(amountToken || "");
    const currency = normalizeCurrency(currencyToken || "");
    const priceText = compactText(match[0].replace(/^(price|pricing|cost|rate|fee|only|now|sale)\s*[:\-]?\s*/i, ""));

    return {
      priceText,
      priceAmount: amount,
      currency,
    };
  }

  return {
    priceText: "",
    priceAmount: null,
    currency: "",
  };
}

function extractHashtags(caption: string) {
  return [...caption.matchAll(/#([a-z0-9_]+)/gi)]
    .map((match) => match[1].replace(/_/g, " ").toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}

function getCatalogTitle(caption: string, mediaId: string) {
  const lines = getCaptionLines(caption);
  const firstUsefulLine = lines.find((line) => {
    const normalized = normalizeSearchText(line);
    return (
      normalized.length >= 3 &&
      !normalized.startsWith("price") &&
      !normalized.startsWith("only") &&
      !normalized.startsWith("dm ") &&
      !/^\$?\s?\d/.test(normalized)
    );
  });

  if (firstUsefulLine) {
    return truncateText(firstUsefulLine.replace(/\s+#\w+/g, ""), 80);
  }

  const tag = extractHashtags(caption)[0];
  return tag ? truncateText(tag, 80) : `Instagram product ${mediaId.slice(-6)}`;
}

function getCatalogDescription(caption: string, title: string) {
  const withoutTags = caption.replace(/#[a-z0-9_]+/gi, " ");
  const lines = getCaptionLines(withoutTags).filter((line) => line !== title);
  const description = lines.join(" ");

  return truncateText(description || title, 260);
}

function getCatalogTags(caption: string, title: string) {
  const text = normalizeSearchText(`${title} ${caption}`);
  const keywordTags = productCaptionWords.filter((word) => text.includes(word));
  const hashtagTags = extractHashtags(caption);

  return [...new Set([...hashtagTags, ...keywordTags])].slice(0, 12);
}

function hasProductCaptionSignal(text: string) {
  const normalized = normalizeSearchText(text);
  return productCaptionWords.some((word) => normalized.includes(word));
}

function getCatalogConfidence(media: InstagramCatalogMedia, price: CatalogPrice, title: string) {
  let score = 0;

  if (price.priceText) score += 38;
  if (media.mediaUrl || media.thumbnailUrl) score += 22;
  if (hasProductCaptionSignal(media.caption)) score += 18;
  if (title && !title.startsWith("Instagram product")) score += 12;
  if ((media.commentsCount || 0) > 0) score += 4;
  if ((media.likeCount || 0) > 0) score += 4;

  return Math.min(98, score);
}

function normalizeMedia(media: InstagramCatalogMediaResponse): InstagramCatalogMedia {
  return {
    id: media.id,
    caption: media.caption || "",
    mediaType: media.media_type || "UNKNOWN",
    mediaUrl: media.media_url || "",
    thumbnailUrl: media.thumbnail_url || "",
    permalink: media.permalink || "",
    timestamp: media.timestamp || "",
    commentsCount: typeof media.comments_count === "number" ? media.comments_count : null,
    likeCount: typeof media.like_count === "number" ? media.like_count : null,
  };
}

async function fetchInstagramGraph<T>(path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(`https://graph.instagram.com/v21.0/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as T & { error?: InstagramGraphError };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Instagram could not load catalog posts.");
  }

  return data;
}

export async function fetchInstagramCatalogMedia(accessToken: string, limit = 24) {
  const response = await fetchInstagramGraph<InstagramGraphListResponse<InstagramCatalogMediaResponse>>("me/media", accessToken, {
    fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,comments_count,like_count",
    limit: String(limit),
  });

  return (response.data || []).map(normalizeMedia);
}

export function buildInstagramProductCatalog(mediaItems: InstagramCatalogMedia[]) {
  return mediaItems
    .map((media): InstagramProductCatalogItem | null => {
      const price = extractCatalogPrice(media.caption);
      const title = getCatalogTitle(media.caption, media.id);
      const description = getCatalogDescription(media.caption, title);
      const confidence = getCatalogConfidence(media, price, title);
      const imageUrl = media.mediaType === "VIDEO" ? media.thumbnailUrl || media.mediaUrl : media.mediaUrl || media.thumbnailUrl;

      if (!imageUrl && !price.priceText && !hasProductCaptionSignal(media.caption)) {
        return null;
      }

      if (confidence < 35) {
        return null;
      }

      return {
        id: `ig-${media.id}`,
        sourceMediaId: media.id,
        title,
        priceText: price.priceText,
        priceAmount: price.priceAmount,
        currency: price.currency,
        description,
        imageUrl,
        thumbnailUrl: media.thumbnailUrl,
        permalink: media.permalink,
        sourceCaption: media.caption,
        tags: getCatalogTags(media.caption, title),
        confidence,
        timestamp: media.timestamp,
      };
    })
    .filter((item): item is InstagramProductCatalogItem => Boolean(item))
    .sort((first, second) => {
      const confidenceDiff = second.confidence - first.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;
      return new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime();
    });
}

function getSearchTokens(value: string) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function getMeaningfulCatalogTokens(value: string) {
  return [
    ...new Set(
      getSearchTokens(value).filter((token) => !genericCatalogSearchWords.has(token))
    ),
  ];
}

function getCatalogProductTypeTokens(value: string) {
  return [
    ...new Set(getSearchTokens(value).filter((token) => specificCatalogProductTypeWords.has(token))),
  ];
}

function getCatalogTokenSynonyms(token: string) {
  return getCatalogSynonymGroup(token) || [token];
}

function catalogTokenSetsOverlap(first: string[], second: string[]) {
  const expandedSecond = new Set(second.flatMap(getCatalogTokenSynonyms));
  return first.some((token) => getCatalogTokenSynonyms(token).some((synonym) => expandedSecond.has(synonym)));
}

function stripConversationLabel(line: string) {
  return line.replace(/^\s*(instagram user|customer|lead|user|business|assistant|internal note)\s*:\s*/i, "").trim();
}

function isSameCatalogText(first = "", second = "") {
  return normalizeSearchText(stripConversationLabel(first)) === normalizeSearchText(stripConversationLabel(second));
}

function isBusinessCatalogContextLine(line: string) {
  return /^\s*(business|assistant|internal note)\s*:/i.test(line);
}

function isCatalogConfirmationOnlyLine(text: string) {
  const normalized = normalizeSearchText(text);
  return /^(confirm|confirmed|confirm order|confirmed order|approve order|approved order|order confirmed)$/i.test(normalized);
}

function hasCatalogBudgetSignal(normalized: string) {
  return (
    /\b(budget|under|below|less than|around|about|between|from|to|rs|pkr|usd|dollar|dollars|price range)\b/.test(normalized) ||
    /[$€£¥₨]\s*\d+|\b\d+\s*(rs|pkr|usd|dollars?|bucks?)\b/.test(normalized)
  );
}

function getCatalogBudgetAmount(normalized: string) {
  if (!hasCatalogBudgetSignal(normalized)) {
    return null;
  }

  const amounts = [
    ...normalized.matchAll(/[$€£¥₨]\s*(\d+(?:[.,]\d+)?)/g),
    ...normalized.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:rs|pkr|usd|dollars?|bucks?)\b/g),
    ...normalized.matchAll(/\b(?:budget|under|below|less than|around|about|price range|range)\D{0,18}(\d+(?:[.,]\d+)?)/g),
  ]
    .map((match) => Number(String(match[1] || "").replace(/,/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (amounts.length === 0) {
    return null;
  }

  return Math.max(...amounts);
}

function hasCatalogStyleOrMaterialSignal(normalized: string) {
  return /\b(gold|silver|rose gold|plated|diamond|pearl|stone|beads|traditional|modern|classic|antique|indian|pakistani|western|simple|heavy|light|premium|custom|customized|elegant|trendy|casual|formal|bridal|wedding|party|daily|office|gift|birthday|eid|black|white|pink|red|blue|green|yellow|purple|brown)\b/.test(
    normalized
  );
}

function hasCatalogGoalSignal(normalized: string) {
  const tokens = getSearchTokens(normalized);
  const hasBroadCategory = tokens.some((token) => broadCatalogCategoryWords.has(token));
  const hasSpecificProductType = tokens.some((token) => specificCatalogProductTypeWords.has(token));
  const hasGoalWord = tokens.some((token) => catalogGoalWords.has(token));

  return hasSpecificProductType || hasGoalWord || (hasBroadCategory && hasCatalogStyleOrMaterialSignal(normalized));
}

function isCatalogContextUseful(line: string) {
  const normalized = normalizeSearchText(line);
  return (
    hasCatalogBudgetSignal(normalized) ||
    hasCatalogGoalSignal(normalized) ||
    hasCatalogShoppingIntent(normalized) ||
    /\b(show|send|see|view|browse|catalog|carousel|slider|options?|images?|pictures?|photos?|details?|designs?|collection|available|availability|what kind|what type|what do you have)\b/.test(
      normalized
    )
  );
}

export function isCatalogAvailabilityRequest(text: string) {
  const normalized = normalizeSearchText(text);

  if (!normalized || isCatalogDeclineRequest(normalized) || isCatalogBookingOnlyRequest(normalized)) {
    return false;
  }

  if (getCatalogProductTypeTokens(normalized).length === 0) {
    return false;
  }

  const directCheckoutIntent =
    /\b(confirm order|place order|order it|checkout|payment|pay|paid|buy now|purchase now|send payment link|pay now)\b/.test(normalized);

  if (directCheckoutIntent) {
    return false;
  }

  return (
    /\b(?:do you|you|u|we)\s+have\b/.test(normalized) ||
    /\b(any|available|availability|in stock|stock|option|options|collection|collections|sell|selling|carry|offer|offers)\b/.test(normalized) ||
    /\bwhat\s+(?:kind|kinds|type|types)\b/.test(normalized)
  );
}

export function isFreshCatalogCategoryRequest(latestText = "", conversationContext = "") {
  const latest = normalizeSearchText(stripConversationLabel(latestText));

  if (!latest || isCatalogDeclineRequest(latest) || isCatalogBookingOnlyRequest(latest)) {
    return false;
  }

  const latestProductTypes = getCatalogProductTypeTokens(latest);

  if (latestProductTypes.length === 0) {
    return false;
  }

  const asksCategoryQuestion =
    isCatalogAvailabilityRequest(latest) ||
    /\b(any|available|availability|option|options|collection|collections|sell|selling|show|send|see|view|browse)\b/.test(latest);

  if (!asksCategoryQuestion) {
    return false;
  }

  const previousProductTypes = getCatalogProductTypeTokens(
    conversationContext
      .split(/\r?\n/)
      .filter((line) => !isBusinessCatalogContextLine(line))
      .map(stripConversationLabel)
      .filter((line) => line && !isSameCatalogText(line, latest))
      .join(" ")
  );

  return previousProductTypes.length === 0 || !catalogTokenSetsOverlap(latestProductTypes, previousProductTypes);
}

export function getCatalogDiscoveryState(text: string) {
  const normalized = normalizeSearchText(text);
  const hasBudget = hasCatalogBudgetSignal(normalized);
  const hasGoal = hasCatalogGoalSignal(normalized);

  return {
    hasBudget,
    hasGoal,
    ready: hasBudget && hasGoal,
    missing: [
      !hasGoal ? "product goal" : "",
      !hasBudget ? "budget" : "",
    ].filter(Boolean),
  };
}

export function buildCatalogSearchText(latestText = "", conversationContext = "") {
  if (isFreshCatalogCategoryRequest(latestText, conversationContext)) {
    return compactText(stripConversationLabel(latestText));
  }

  const lines = `${conversationContext}\n${latestText}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const relevantLines: string[] = [];

  lines.forEach((line) => {
    if (isBusinessCatalogContextLine(line)) {
      return;
    }

    const text = stripConversationLabel(line);

    if (!text) {
      return;
    }

    if (isCatalogConfirmationOnlyLine(text)) {
      return;
    }

    if (isCatalogDeclineRequest(text)) {
      relevantLines.length = 0;
      return;
    }

    if (isCatalogContextUseful(text)) {
      relevantLines.push(text);
    }
  });

  const latest = compactText(stripConversationLabel(latestText));
  if (latest && !relevantLines.includes(latest) && !isCatalogDeclineRequest(latest)) {
    relevantLines.push(latest);
  }

  return compactText(relevantLines.join("\n")) || latest;
}

function getCatalogSynonymGroup(token: string) {
  return catalogSearchSynonymGroups.find((group) => group.includes(token));
}

function catalogTokenMatchesText(text: string, token: string) {
  if (text.includes(token)) {
    return true;
  }

  const synonymGroup = getCatalogSynonymGroup(token);
  return Boolean(synonymGroup?.some((synonym) => text.includes(synonym)));
}

function catalogItemMatchesAnyProductType(item: InstagramProductCatalogItem, productTypeTokens: string[]) {
  if (productTypeTokens.length === 0) {
    return true;
  }

  const itemText = normalizeSearchText(`${item.title} ${item.description} ${item.tags.join(" ")} ${item.sourceCaption}`);
  return productTypeTokens.some((token) => catalogTokenMatchesText(itemText, token));
}

function getSpecificCatalogMatchCount(item: InstagramProductCatalogItem, text: string) {
  const tokens = getMeaningfulCatalogTokens(text);
  const itemText = normalizeSearchText(`${item.title} ${item.description} ${item.tags.join(" ")} ${item.sourceCaption}`);

  return tokens.reduce((count, token) => count + (catalogTokenMatchesText(itemText, token) ? 1 : 0), 0);
}

export function isCatalogBrowseRequest(text: string) {
  const normalized = normalizeSearchText(text);
  if (isCatalogDeclineRequest(normalized) || isCatalogDiscoveryOnlyRequest(normalized) || isCatalogSingleProductDetailRequest(normalized)) {
    return false;
  }

  const asksForGallery = /\b(show|send|see|view|browse|catalog|carousel|slider|options?|images?|pictures?|photos?)\b/.test(
    normalized
  );
  const directCheckoutIntent = /\b(confirm|checkout|payment|pay|paid|buy now|purchase now|place order|book it|order it)\b/.test(
    normalized
  );

  return asksForGallery && !directCheckoutIntent;
}

export function isCatalogDeclineRequest(text: string) {
  const normalized = normalizeSearchText(text);

  if (!normalized) {
    return false;
  }

  return (
    /\b(no thanks|no thank you|not now|maybe later|later|not interested|not looking|not required|not needed|no need|hold off|stop)\b/.test(normalized) ||
    /\b(?:don'?t|do not|dont|no)\s+(?:need|want|send|show|share|give|require|order|buy|purchase|checkout)\b/.test(normalized) ||
    /\b(?:don'?t|do not|dont)\s+(?:need|want|require)\b.*\b(?:product|products|item|items|detail|details|price|pricing|cost|offer|offers|option|options)\b/.test(normalized) ||
    /\b(?:product|products|item|items|detail|details|price|pricing|cost|offer|offers|option|options)\b.*\b(?:not needed|not required|no need|not now)\b/.test(normalized)
  );
}

export function hasCatalogShoppingIntent(text: string) {
  const normalized = normalizeSearchText(text);
  if (isCatalogDeclineRequest(normalized)) {
    return false;
  }

  return productIntentWords.some((word) => normalized.includes(word)) || getCatalogProductTypeTokens(normalized).length > 0;
}

export function isCatalogSingleProductDetailRequest(text: string) {
  const normalized = normalizeSearchText(text);

  if (!normalized || isCatalogDeclineRequest(normalized) || isCatalogBookingOnlyRequest(normalized)) {
    return false;
  }

  const asksForDetails =
    /\b(detail|details|description|describe|information|info|more info|material|materials|design|designs)\b/.test(normalized) ||
    /\bshow\b.*\b(detail|details|description|information|info)\b/.test(normalized);

  if (!asksForDetails) {
    return false;
  }

  const hasBroadCatalogRequest = /\b(all|whole|full|every|catalog|collection|products|items|options)\b/.test(normalized);
  const productTypeCount = getCatalogProductTypeTokens(normalized).length;
  const meaningfulCount = getMeaningfulCatalogTokens(normalized).length;

  return productTypeCount > 0 || (!hasBroadCatalogRequest && meaningfulCount >= 2);
}

export function isCatalogDiscoveryOnlyRequest(text: string) {
  const normalized = normalizeSearchText(text);

  if (!normalized || isCatalogDeclineRequest(normalized) || isCatalogBookingOnlyRequest(normalized)) {
    return false;
  }

  const directCheckoutIntent =
    /\b(confirm order|place order|order it|checkout|payment|pay|paid|buy now|purchase now|send payment link|pay now)\b/.test(normalized);

  if (directCheckoutIntent) {
    return false;
  }

  if (isCatalogAvailabilityRequest(normalized)) {
    return false;
  }

  const asksToBrowseOrLearn =
    /\b(show|send|see|view|browse|catalog|carousel|slider|options?|images?|pictures?|photos?|details?|designs?|collection|available|availability|price|pricing|cost|how much|what kind|what type|what do you have)\b/.test(
      normalized
    );

  if (!asksToBrowseOrLearn && !hasCatalogShoppingIntent(normalized)) {
    return false;
  }

  const tokens = getSearchTokens(normalized);
  const hasBroadCategory = tokens.some((token) => broadCatalogCategoryWords.has(token));
  const discoveryState = getCatalogDiscoveryState(normalized);

  if (discoveryState.ready) {
    return false;
  }

  return asksToBrowseOrLearn && (hasBroadCategory || discoveryState.hasGoal || hasCatalogShoppingIntent(normalized));
}

export function isCatalogBookingOnlyRequest(text: string) {
  const normalized = normalizeSearchText(text);

  if (!normalized) {
    return false;
  }

  const asksForAppointment =
    /\b(book|booking|schedule|scheduled|set up|arrange)\b.*\b(call|appointment|meeting|consult|consultation|demo)\b/.test(normalized) ||
    /\b(call|appointment|meeting|consult|consultation|demo)\b.*\b(book|booking|schedule|scheduled|set up|arrange)\b/.test(normalized) ||
    /\b(book a call|book call|schedule a call|schedule call|book appointment|schedule appointment|book meeting|schedule meeting)\b/.test(normalized);
  const hasProductCheckoutIntent =
    /\b(confirm order|place order|order it|checkout|payment|pay|buy|purchase|product|item|size|variant|shipping|delivery)\b/.test(normalized);

  return asksForAppointment && !hasProductCheckoutIntent;
}

export function scoreCatalogItemForText(item: InstagramProductCatalogItem, text: string) {
  const normalizedText = normalizeSearchText(text);
  const tokens = getSearchTokens(text);
  const itemText = normalizeSearchText(`${item.title} ${item.description} ${item.tags.join(" ")} ${item.sourceCaption}`);
  const itemTitle = normalizeSearchText(item.title);
  const budgetAmount = getCatalogBudgetAmount(normalizedText);
  let score = 0;

  tokens.forEach((token) => {
    if (catalogTokenMatchesText(itemText, token)) {
      score += catalogTokenMatchesText(itemTitle, token) ? 12 : 6;
    }
  });

  if (hasCatalogShoppingIntent(normalizedText)) score += 14;
  if (item.priceText && /\b(price|pricing|cost|how much|rate)\b/.test(normalizedText)) score += 14;
  if (budgetAmount && item.priceAmount && item.priceAmount <= budgetAmount) score += 18;
  if (item.imageUrl && /\b(image|picture|photo|show|send)\b/.test(normalizedText)) score += 8;
  score += Math.min(12, Math.round(item.confidence / 10));

  return score;
}

function toCatalogOffer(match: CatalogOfferMatch): InstagramCatalogOffer {
  return {
    id: match.item.id,
    sourceMediaId: match.item.sourceMediaId,
    title: match.item.title,
    priceText: match.item.priceText,
    priceAmount: match.item.priceAmount,
    currency: match.item.currency,
    description: match.item.description,
    imageUrl: match.item.imageUrl,
    thumbnailUrl: match.item.thumbnailUrl,
    permalink: match.item.permalink,
    confidence: match.item.confidence,
    matchScore: match.score,
  };
}

function getCatalogOfferMatches(text: string, catalog: InstagramProductCatalogItem[]) {
  if (
    catalog.length === 0 ||
    isCatalogDeclineRequest(text) ||
    isCatalogDiscoveryOnlyRequest(text) ||
    !hasCatalogShoppingIntent(text) ||
    isCatalogBookingOnlyRequest(text)
  ) {
    return [];
  }

  const meaningfulTokenCount = getMeaningfulCatalogTokens(text).length;
  const requestedProductTypes = getCatalogProductTypeTokens(text);
  const budgetAmount = getCatalogBudgetAmount(normalizeSearchText(text));
  const minimumScore = meaningfulTokenCount > 0 ? 18 : 30;

  return catalog
    .map((item) => ({
      item,
      score: scoreCatalogItemForText(item, text),
      specificMatchCount: getSpecificCatalogMatchCount(item, text),
    }))
    .filter((match) => {
      if (!catalogItemMatchesAnyProductType(match.item, requestedProductTypes)) {
        return false;
      }

      if (budgetAmount && match.item.priceAmount && match.item.priceAmount > budgetAmount) {
        return false;
      }

      if (meaningfulTokenCount > 0 && match.specificMatchCount === 0) {
        return false;
      }

      return match.score >= minimumScore;
    })
    .sort((first, second) => {
      const specificDiff = second.specificMatchCount - first.specificMatchCount;
      if (specificDiff !== 0) return specificDiff;
      return second.score - first.score;
    });
}

export function findCatalogOffers(text: string, catalog: InstagramProductCatalogItem[], maxItems = 6): InstagramCatalogOffer[] {
  return getCatalogOfferMatches(text, catalog).slice(0, maxItems).map(toCatalogOffer);
}

export function shouldUseSingleCatalogOffer(text: string, offers: InstagramCatalogOffer[]) {
  if (offers.length === 0) {
    return false;
  }

  if (isCatalogSingleProductDetailRequest(text)) {
    return true;
  }

  if ((isCatalogAvailabilityRequest(text) || isCatalogBrowseRequest(text)) && !getCatalogDiscoveryState(text).ready) {
    return false;
  }

  return true;
}

export function findBestCatalogOffer(text: string, catalog: InstagramProductCatalogItem[]): InstagramCatalogOffer | null {
  const offers = findCatalogOffers(text, catalog, 2);
  return shouldUseSingleCatalogOffer(text, offers) ? offers[0] : null;
}

export function formatCatalogForPrompt(catalog: InstagramProductCatalogItem[], text: string, maxItems = 6) {
  if (catalog.length === 0 || isCatalogDeclineRequest(text) || isCatalogDiscoveryOnlyRequest(text) || !hasCatalogShoppingIntent(text)) {
    return "";
  }

  const promptItemLimit = isCatalogSingleProductDetailRequest(text) ? 1 : maxItems;

  return getCatalogOfferMatches(text, catalog)
    .slice(0, promptItemLimit)
    .map(({ item }, index) => {
      const price = item.priceText ? `Price: ${item.priceText}` : "Price: not detected";
      const link = item.permalink ? `Post: ${item.permalink}` : "Post: unavailable";
      return `${index + 1}. ${item.title}\n${price}\nDetails: ${item.description}\n${link}`;
    })
    .join("\n\n");
}

function formatCatalogPriceText(priceText = "", amount?: number | null, currency = "USD") {
  const numericPriceText = Number(priceText.replace(/[^\d.-]/g, ""));

  if (priceText && Number.isFinite(numericPriceText) && numericPriceText > 0 && !/[a-z$€£¥₨]/i.test(priceText)) {
    return currency.toUpperCase() === "USD"
      ? `$${numericPriceText.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : `${currency.toUpperCase()} ${numericPriceText.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }

  if (priceText) {
    return priceText;
  }

  if (amount) {
    return currency.toUpperCase() === "USD"
      ? `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : `${currency.toUpperCase()} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }

  return "";
}

export function buildCatalogOfferReply(reply: string, offer: InstagramCatalogOffer | null) {
  if (!offer || !reply.trim()) {
    return reply;
  }

  const confirmLine = "To confirm this order, reply: Confirm order.";
  const price = formatCatalogPriceText(offer.priceText, offer.priceAmount, offer.currency || "USD");
  const normalizedReply = normalizeSearchText(reply);
  const mentionsConfirm = /\b(confirm order|reply confirm|to confirm)\b/i.test(reply);
  const mentionsTitle = normalizeSearchText(offer.title)
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .some((token) => normalizedReply.includes(token));
  const mentionsPrice = Boolean((offer.priceText || price) && normalizedReply.includes(normalizeSearchText(offer.priceText || price)));

  if (mentionsTitle && (mentionsPrice || !offer.priceText)) {
    return mentionsConfirm ? reply : `${reply.trim()}\n\n${confirmLine}`;
  }

  const details = [
    "Order option:",
    `- Package: ${offer.title}`,
    price ? `- Price: ${price}` : "",
    offer.description ? `- Details: ${truncateText(offer.description, 140)}` : "",
    offer.permalink ? `- Product link: ${offer.permalink}` : "",
    confirmLine,
  ].filter(Boolean);

  return `${reply.trim()}\n\n${details.join("\n")}`;
}

export async function getInstagramProductCatalogForUser(supabase: SupabaseServiceClient, userId: string) {
  const account = await getFreshInstagramAccount(supabase, userId);

  if (!account?.access_token) {
    return [];
  }

  const media = await fetchInstagramCatalogMedia(account.access_token);
  return buildInstagramProductCatalog(media);
}
