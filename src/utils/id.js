import { randomUUID } from "crypto";

function generateId() {
  return randomUUID();
}

export { generateId };
