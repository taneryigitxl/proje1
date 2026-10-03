import { hairColorHex, isBodyType, isHairStyle } from "./appearance.js";

const RESERVED_NAMES = new Set(["admin", "system", "tora", "server"]);

export function validateUsername(username: string): string | null {
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
    return "Use 3 to 16 letters, numbers, or underscores.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 72) {
    return "Use a password between 8 and 72 characters.";
  }
  return null;
}

export function normalizeCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function validateCharacterName(name: string): string | null {
  const normalized = normalizeCharacterName(name);
  if (!/^[A-Za-z][A-Za-z' ]{1,15}$/.test(normalized) || normalized.length < 3) {
    return "Use 3 to 16 letters. Spaces and apostrophes are allowed.";
  }
  if (RESERVED_NAMES.has(normalized.toLowerCase())) {
    return "That name is reserved.";
  }
  return null;
}

export function validateAppearance(input: {
  gender: string;
  hairStyle: string;
  hairColor: string;
}): string | null {
  if (!isBodyType(input.gender)) return "Choose a body type.";
  if (!isHairStyle(input.hairStyle)) return "Choose a hairstyle.";
  if (!hairColorHex(input.hairColor)) return "Choose a hair color.";
  return null;
}
