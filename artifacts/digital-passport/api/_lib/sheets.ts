import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

google.options({ auth });

const sheets = google.sheets("v4");
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

// Sheet columns: A=nickname, B=staffId, C=Booth1 ... H=Booth6
// Row 1 is the header; data starts at row 2.

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status !== 429 || attempt === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
  throw new Error("unreachable");
}

export async function findUserByStaffId(staffId: string) {
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Participants!A:H",
    })
  );
  const rows = res.data.values ?? [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === staffId) {
      const progress: Record<number, boolean> = {};
      for (let b = 1; b <= 6; b++) {
        progress[b] = rows[i][b + 1] === "done";
      }
      return { rowIndex: i + 1, progress }; // 1-indexed for Sheets API
    }
  }
  return null;
}

export async function createUser(staffId: string, nickname: string): Promise<number> {
  const res = await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Participants!A:H",
      valueInputOption: "RAW",
      requestBody: { values: [[nickname, staffId, "", "", "", "", "", ""]] },
    })
  );
  // updatedRange is like "Participants!A5:H5" — parse the row number
  const updatedRange = res.data.updates?.updatedRange;
  if (updatedRange) {
    const cellRef = updatedRange.split("!")[1]?.split(":")[0]; // e.g. "A5"
    const row = cellRef ? parseInt(cellRef.replace(/[A-Z]/g, ""), 10) : -1;
    if (!isNaN(row)) return row;
  }
  return -1;
}

export async function updateBoothInSheet(
  staffId: string,
  boothNumber: number,
  rowIndex?: number,
): Promise<boolean> {
  const row = rowIndex ?? (await findUserByStaffId(staffId))?.rowIndex;
  if (!row || row < 0) return false;
  const col = String.fromCharCode("C".charCodeAt(0) + boothNumber - 1);
  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Participants!${col}${row}`,
      valueInputOption: "RAW",
      requestBody: { values: [["done"]] },
    })
  );
  return true;
}
