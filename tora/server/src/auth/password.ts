import { compare, hash } from "bcryptjs";

const ROUNDS = 12;
let dummyHash = "";

export async function preparePasswordHasher(): Promise<void> {
  dummyHash = await hash("tora-dummy-login", ROUNDS);
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  const valid = await compare(password, passwordHash ?? dummyHash);
  return Boolean(passwordHash) && valid;
}
