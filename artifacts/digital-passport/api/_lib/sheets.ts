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

export async function findUserByStaffId(staffId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A:H",
  });
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

export async function createUser(staffId: string, nickname: string) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A:H",
    valueInputOption: "RAW",
    requestBody: { values: [[nickname, staffId, "", "", "", "", "", ""]] },
  });
}

export async function updateBoothInSheet(staffId: string, boothNumber: number) {
  const user = await findUserByStaffId(staffId);
  if (!user) return false;
  // Booth 1 → column C (index 2), Booth 2 → D, ..., Booth 6 → H
  const col = String.fromCharCode("C".charCodeAt(0) + boothNumber - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Sheet1!${col}${user.rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [["done"]] },
  });
  return true;
}
