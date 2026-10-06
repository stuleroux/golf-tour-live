import { createHash, randomBytes } from "node:crypto";

export function hashInvitationToken(rawToken) {
  if (typeof rawToken !== "string" || rawToken.length < 32) {
    throw new Error("Invitation token is invalid");
  }
  return createHash("sha256").update(rawToken, "utf8").digest("base64url");
}

export function generateInvitationToken() {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashInvitationToken(rawToken) };
}
