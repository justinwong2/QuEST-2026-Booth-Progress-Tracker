import type { VercelRequest, VercelResponse } from "@vercel/node";
import { findUserByStaffId, createUser } from "./_lib/sheets.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { staffId, nickname } = req.body as { staffId?: string; nickname?: string };
  if (!staffId || !nickname) {
    return res.status(400).json({ error: "staffId and nickname are required" });
  }

  const normalizedNickname = nickname.trim().toLowerCase();

  const existing = await findUserByStaffId(staffId);
  if (existing) {
    return res.status(200).json({ found: true, progress: existing.progress });
  }

  await createUser(staffId, normalizedNickname);
  return res.status(200).json({
    found: false,
    progress: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false },
  });
}
