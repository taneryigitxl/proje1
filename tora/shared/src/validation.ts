import { hairColorHex, isBodyType, isHairStyle } from "./appearance.js";

const RESERVED_NAMES = new Set(["admin", "system", "tora", "server"]);

export function validateUsername(username: string): string | null {
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
    return "3 ile 16 karakter kullan. Harf, rakam veya alt çizgi olabilir.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return "Geçerli bir e-posta adresi gir.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 72) {
    return "Şifre 8 ile 72 karakter arasında olmalı.";
  }
  return null;
}

export function normalizeCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function validateCharacterName(name: string): string | null {
  const normalized = normalizeCharacterName(name);
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü' ]{1,15}$/.test(normalized) || normalized.length < 3) {
    return "3 ile 16 harf kullan. Boşluk ve kesme işareti olabilir.";
  }
  if (RESERVED_NAMES.has(normalized.toLowerCase())) {
    return "Bu isim ayrılmış.";
  }
  return null;
}

export function validateAppearance(input: {
  gender: string;
  hairStyle: string;
  hairColor: string;
}): string | null {
  if (!isBodyType(input.gender)) return "Bir beden seç.";
  if (!isHairStyle(input.hairStyle)) return "Bir saç modeli seç.";
  if (!hairColorHex(input.hairColor)) return "Bir saç rengi seç.";
  return null;
}
