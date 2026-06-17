import { createSign } from "crypto";

export type BookingSheetRouteConfig = {
  id?: string;
  name?: string;
  bookingType?: string;
  sheetUrl?: string;
  worksheetName?: string;
  enabled?: boolean;
  confirmedOnly?: boolean;
};

export type BookingIntegrationConfig = {
  syncEnabled?: boolean;
  routes?: BookingSheetRouteConfig[];
};

export type BookingSheetRow = {
  customer: string;
  phone: string;
  bookingType: string;
  date: string;
  time: string;
  groundOrCourt: string;
  paymentStatus: string;
  confirmedAt: string;
  sourceConversation: string;
};

type ServiceAccountConfig = {
  email: string;
  privateKey: string;
};

const googleSheetsScope = "https://www.googleapis.com/auth/spreadsheets";
const googleTokenAudience = "https://oauth2.googleapis.com/token";
const bookingSheetHeaders = [
  "Customer",
  "Phone",
  "Booking type",
  "Date",
  "Time",
  "Ground / Court",
  "Status",
  "Confirmed at",
  "Source conversation",
];

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function base64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalizePrivateKey(value: string) {
  return value.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function getServiceAccountConfig(): ServiceAccountConfig | null {
  const email =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
    "";
  const privateKey =
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
    "";

  if (!email.trim() || !privateKey.trim()) {
    return null;
  }

  return {
    email: email.trim(),
    privateKey: normalizePrivateKey(privateKey),
  };
}

function createServiceAccountJwt(config: ServiceAccountConfig) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: config.email,
    scope: googleSheetsScope,
    aud: googleTokenAudience,
    exp: now + 3600,
    iat: now,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(config.privateKey);

  return `${signingInput}.${base64Url(signature)}`;
}

async function getGoogleAccessToken(config: ServiceAccountConfig) {
  const assertion = createServiceAccountJwt(config);
  const response = await fetch(googleTokenAudience, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string; error_description?: string; error?: string } | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Google service-account authentication failed.");
  }

  return payload.access_token;
}

export function getSheetDestinationUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^(docs\.google\.com|drive\.google\.com|script\.google\.com|script\.googleusercontent\.com|1drv\.ms|onedrive\.live\.com|office\.com)/i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  const googleSheetIdMatch = trimmedValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const googleSheetId = googleSheetIdMatch?.[1] || (/^[a-zA-Z0-9-_]{20,}$/.test(trimmedValue) ? trimmedValue : "");

  if (googleSheetId) {
    return `https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`;
  }

  return "";
}

export function getGoogleSheetId(value: string) {
  const trimmedValue = value.trim();
  const urlMatch = trimmedValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return "";
}

export function isAppsScriptUrl(url: string) {
  return /^https:\/\/script\.(google\.com|googleusercontent\.com)\//i.test(url);
}

export function isExcelUrl(url: string) {
  return /(1drv\.ms|onedrive\.live\.com|office\.com|sharepoint\.com)/i.test(url);
}

function escapeSheetTitle(value: string) {
  return value.replace(/'/g, "''");
}

function rowToValues(row: BookingSheetRow) {
  return [
    row.customer,
    row.phone,
    row.bookingType,
    row.date,
    row.time,
    row.groundOrCourt,
    row.paymentStatus,
    row.confirmedAt,
    row.sourceConversation,
  ];
}

function getGoogleSheetErrorMessage(status: number, rawMessage: string, worksheetName: string, serviceAccountEmail: string) {
  if (status === 403) {
    return `Google rejected the write. Share this spreadsheet with ${serviceAccountEmail} as Editor, then try again.`;
  }

  if (status === 404) {
    return "Google could not find that spreadsheet. Check the Sheet ID/link and make sure it is shared with the service account.";
  }

  return rawMessage || `Google Sheets could not write to "${worksheetName}".`;
}

async function createWorksheet(sheetId: string, accessToken: string, worksheetName: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: worksheetName,
            },
          },
        },
      ],
    }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  const rawMessage = payload?.error?.message || "";

  if (!response.ok && !/already exists/i.test(rawMessage)) {
    throw new Error(rawMessage || `Could not create the "${worksheetName}" tab.`);
  }
}

async function appendValues(sheetId: string, accessToken: string, worksheetName: string, values: string[][]) {
  const range = `'${escapeSheetTitle(worksheetName)}'!A:I`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    },
  );
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

  return {
    ok: response.ok,
    status: response.status,
    message: payload?.error?.message || "",
  };
}

export async function writeBookingRows(route: BookingSheetRouteConfig, rows: BookingSheetRow[], options?: { includeHeaders?: boolean }) {
  const name = getString(route.name) || "Booking sheet route";
  const sheetUrl = getString(route.sheetUrl);
  const worksheetName = getString(route.worksheetName) || "Confirmed Bookings";
  const destinationUrl = getSheetDestinationUrl(sheetUrl);

  if (!destinationUrl) {
    throw new Error("Add a valid Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link first.");
  }

  if (isAppsScriptUrl(destinationUrl)) {
    const response = await fetch(destinationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "tractionflo_booking_export",
        route: {
          name,
          bookingType: getString(route.bookingType) || "Confirmed booking",
          worksheetName,
        },
        bookings: rows,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned ${response.status}. Check the web app deployment and permissions.`);
    }

    return {
      lastSync: "Webhook sent just now",
      message: `${name} webhook accepted ${rows.length === 1 ? "the booking" : `${rows.length} bookings`}.`,
    };
  }

  const sheetId = getGoogleSheetId(sheetUrl);

  if (!sheetId) {
    if (isExcelUrl(destinationUrl)) {
      throw new Error("Excel links can be opened/copied, but real writes need a Microsoft Graph or webhook integration. Use a Google Sheet ID/link or Apps Script URL.");
    }

    throw new Error("Use a Google Sheet ID/link, Apps Script URL, or supported Excel web link.");
  }

  const serviceAccount = getServiceAccountConfig();

  if (!serviceAccount) {
    throw new Error("Google Sheets writes need service-account env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY. Share the sheet with that service account as Editor.");
  }

  const accessToken = await getGoogleAccessToken(serviceAccount);
  const values = rows.map(rowToValues);
  let response = await appendValues(sheetId, accessToken, worksheetName, values);

  if (!response.ok && /unable to parse range|range/i.test(response.message)) {
    await createWorksheet(sheetId, accessToken, worksheetName);
    if (options?.includeHeaders !== false) {
      await appendValues(sheetId, accessToken, worksheetName, [bookingSheetHeaders]);
    }
    response = await appendValues(sheetId, accessToken, worksheetName, values);
  }

  if (!response.ok) {
    throw new Error(getGoogleSheetErrorMessage(response.status, response.message, worksheetName, serviceAccount.email));
  }

  return {
    lastSync: "Booking saved just now",
    message: `${name} wrote ${rows.length === 1 ? "a booking" : `${rows.length} bookings`} to "${worksheetName}".`,
  };
}

export function findBookingRoute(integrations: BookingIntegrationConfig | undefined, preferredBookingType: string) {
  if (!integrations?.syncEnabled || !Array.isArray(integrations.routes)) {
    return null;
  }

  const activeRoutes = integrations.routes.filter((route) => route.enabled !== false && getString(route.sheetUrl));
  const normalizedType = preferredBookingType.toLowerCase();

  return (
    activeRoutes.find((route) => getString(route.bookingType).toLowerCase() === normalizedType) ||
    activeRoutes.find((route) => normalizedType.includes(getString(route.bookingType).toLowerCase())) ||
    activeRoutes.find((route) => /all confirmed/i.test(getString(route.bookingType))) ||
    null
  );
}

