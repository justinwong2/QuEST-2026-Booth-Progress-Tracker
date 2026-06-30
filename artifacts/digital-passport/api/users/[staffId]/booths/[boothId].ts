import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateBoothInSheet } from "../../../_lib/sheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { staffId, boothId } = req.query as { staffId: string; boothId: string };
  const boothNumber = parseInt(boothId, 10);

  if (isNaN(boothNumber) || boothNumber < 1 || boothNumber > 6) {
    return res.status(400).json({ error: "Invalid booth ID" });
  }

  const updated = await updateBoothInSheet(staffId, boothNumber);
  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({ ok: true });
}
