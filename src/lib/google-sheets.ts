import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { normalizePhone } from "@/lib/phone";

export interface SheetContact {
  name: string | null;
  phone: string;
  email: string | null;
  sheetRowId: string;
}

export interface SheetFetchResult {
  contacts: SheetContact[];
  errors: string[];
}

const NAME_HEADERS = ["name", "nome", "full name", "contact"];
const PHONE_HEADERS = ["phone", "numero", "num", "telefono", "mobile", "cell"];
const EMAIL_HEADERS = ["email", "gmail", "e-mail", "mail"];

function parseSpreadsheetId(): string | undefined {
  const direct = process.env.GOOGLE_SHEETS_ID;
  if (direct) return direct;

  const url = process.env.GOOGLE_SHEET_URL;
  if (!url) return undefined;

  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1];
}

function parseGid(): string | undefined {
  if (process.env.GOOGLE_SHEETS_GID) return process.env.GOOGLE_SHEETS_GID;

  const url = process.env.GOOGLE_SHEET_URL;
  if (!url) return undefined;

  const match = url.match(/[?&#]gid=(\d+)/);
  return match?.[1];
}

function getCredentialsPath(): string | null {
  const credsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
  if (!credsPath) return null;

  const keyFile = path.resolve(process.cwd(), credsPath);
  if (!fs.existsSync(keyFile)) return null;

  return keyFile;
}

async function getServiceAccountSheets() {
  const keyFile = getCredentialsPath();
  if (!keyFile) return null;

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

async function resolveRange(
  spreadsheetId: string,
  sheets: ReturnType<typeof google.sheets> | null
): Promise<string> {
  if (process.env.GOOGLE_SHEETS_RANGE) {
    return process.env.GOOGLE_SHEETS_RANGE;
  }

  const gid = parseGid();
  let tabName = process.env.GOOGLE_SHEETS_TAB ?? "Sheet1";

  if (gid && sheets) {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const match = meta.data.sheets?.find(
      (sheet) => String(sheet.properties?.sheetId) === gid
    );
    if (match?.properties?.title) {
      tabName = match.properties.title;
    }
  }

  return `${tabName}!A1:Z1000`;
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate);
    if (index >= 0) return index;
  }
  return -1;
}

function resolveColumnMap(headers: string[]) {
  const nameIdx = findColumnIndex(headers, NAME_HEADERS);
  const phoneIdx = findColumnIndex(headers, PHONE_HEADERS);
  const emailIdx = findColumnIndex(headers, EMAIL_HEADERS);

  if (phoneIdx < 0) {
    throw new Error(
      `Could not find a phone column. Headers: ${headers.join(", ")}. Expected one of: ${PHONE_HEADERS.join(", ")}`
    );
  }

  return { nameIdx, phoneIdx, emailIdx };
}

async function fetchWithApiKey(
  spreadsheetId: string,
  range: string
): Promise<string[][] | null> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) return null;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const response = await fetch(url, { next: { revalidate: 0 } });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Sheets API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { values?: string[][] };
  return data.values ?? [];
}

async function fetchWithServiceAccount(
  spreadsheetId: string,
  range: string
): Promise<string[][] | null> {
  const sheets = await getServiceAccountSheets();
  if (!sheets) return null;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (response.data.values as string[][]) ?? [];
}

async function fetchWithCsvExport(spreadsheetId: string): Promise<string[][]> {
  const gid = parseGid() ?? "0";
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(
      `CSV export failed (${response.status}). Make the sheet public (Anyone with link → Viewer) or add GOOGLE_SHEETS_API_KEY / service account JSON.`
    );
  }

  return parseCsv(await response.text());
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" && next === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parseRows(allRows: string[][]): SheetFetchResult {
  if (allRows.length === 0) {
    return { contacts: [], errors: [] };
  }

  const [headerRow, ...dataRows] = allRows;
  const { nameIdx, phoneIdx, emailIdx } = resolveColumnMap(headerRow);

  const contacts: SheetContact[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, index) => {
    const rowNum = index + 2;
    const nameRaw = nameIdx >= 0 ? row[nameIdx] : undefined;
    const phoneRaw = row[phoneIdx];
    const emailRaw = emailIdx >= 0 ? row[emailIdx] : undefined;

    if (!phoneRaw?.trim() && !nameRaw?.trim() && !emailRaw?.trim()) {
      return;
    }

    const phone = normalizePhone(phoneRaw ?? "");
    if (!phone) {
      errors.push(`Row ${rowNum}: invalid or missing phone "${phoneRaw ?? ""}"`);
      return;
    }

    contacts.push({
      name: nameRaw?.trim() || null,
      phone,
      email: emailRaw?.trim() || null,
      sheetRowId: `row-${rowNum}-${phone}`,
    });
  });

  return { contacts, errors };
}

export async function fetchContactsFromSheet(): Promise<SheetFetchResult> {
  const spreadsheetId = parseSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error(
      "Set GOOGLE_SHEETS_ID or GOOGLE_SHEET_URL for Google Sheets access"
    );
  }

  const sheetsClient = await getServiceAccountSheets();
  const range = await resolveRange(spreadsheetId, sheetsClient);

  let rows: string[][] | null = null;

  if (sheetsClient) {
    rows = await fetchWithServiceAccount(spreadsheetId, range);
  }

  if (!rows) {
    rows = await fetchWithApiKey(spreadsheetId, range);
  }

  if (!rows) {
    rows = await fetchWithCsvExport(spreadsheetId);
  }

  return parseRows(rows);
}

export function getSheetsAuthStatus(): {
  mode: "service_account" | "api_key" | "csv_export" | "unconfigured";
  credentialsMissing?: boolean;
} {
  const credsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
  const keyFile = credsPath ? path.resolve(process.cwd(), credsPath) : null;
  const credentialsMissing = Boolean(
    credsPath && keyFile && !fs.existsSync(keyFile)
  );

  if (keyFile && fs.existsSync(keyFile)) {
    return { mode: "service_account" };
  }
  if (process.env.GOOGLE_SHEETS_API_KEY) {
    return { mode: "api_key", credentialsMissing };
  }
  if (parseSpreadsheetId()) {
    return { mode: "csv_export", credentialsMissing };
  }
  return { mode: "unconfigured", credentialsMissing };
}
