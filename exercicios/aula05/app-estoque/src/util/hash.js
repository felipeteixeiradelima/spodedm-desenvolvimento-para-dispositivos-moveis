import { createHash } from "node:crypto";

export function hashText(input) {
  return createHash("sha256").update(input).digest("hex");
}
