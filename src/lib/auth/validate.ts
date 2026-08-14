export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone);
}

export function isValidPincode(pincode: string) {
  return /^\d{6}$/.test(pincode.trim());
}

export function registerIssues(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}): string | null {
  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    return "Please enter your full name.";
  }
  if (!isValidEmail(input.email)) return "Please enter a valid email address.";
  if (!isValidPhone(input.phone)) return "Please enter a valid 10-digit mobile number.";
  if (input.password !== input.confirmPassword) return "Passwords do not match.";
  if (!input.terms) return "Please agree to the Terms & Conditions and Privacy Policy.";
  return null;
}
