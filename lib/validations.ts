import { BLOOD_GROUPS } from "./constants";

export type Errors<T> = Partial<Record<keyof T, string>>;
type Rule = (value: string) => string | null;

export const rules = {
  required: (label: string): Rule => (v) => (v.trim() ? null : `Enter ${label.toLowerCase()}.`),
  email: (): Rule => (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : "Enter a valid email, like name@example.com."),
  phone: (): Rule => (v) => {
    const d = v.replace(/[\s-]/g, "");
    return /^(\+92|0)3\d{9}$/.test(d) ? null : "Enter a Pakistani mobile number, like 0300 1234567.";
  },
  password: (): Rule => (v) => {
    if (v.length < 8) return "Use at least 8 characters.";
    if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/\d/.test(v)) return "Include an uppercase letter, a lowercase letter and a number.";
    return null;
  },
  bloodGroup: (): Rule => (v) => ((BLOOD_GROUPS as string[]).includes(v) ? null : "Choose a blood group."),
  intRange: (label: string, min: number, max: number): Rule => (v) => {
    const n = Number(v);
    if (!v.trim() || !Number.isInteger(n)) return `Enter ${label.toLowerCase()} as a whole number.`;
    if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
    return null;
  },
  pastDate: (label: string): Rule => (v) => {
    if (!v) return `Enter ${label.toLowerCase()}.`;
    return new Date(v) <= new Date() ? null : `${label} can't be in the future.`;
  },
  futureDate: (label: string): Rule => (v) => {
    if (!v) return `Choose ${label.toLowerCase()}.`;
    const d = new Date(v);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today ? null : `${label} can't be in the past.`;
  },
  minAge: (years: number): Rule => (v) => {
    if (!v) return "Enter your date of birth.";
    const d = new Date(v);
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - years);
    return d <= limit ? null : `You must be at least ${years} years old.`;
  },
  otp: (): Rule => (v) => (/^\d{6}$/.test(v) ? null : "Enter the 6-digit code."),
};

/**
 * Validate a flat string record against a schema of rules.
 * Returns an object with the first error message per field.
 */
export function validate<T extends Record<string, string>>(values: T, schema: Partial<Record<keyof T, Rule[]>>): Errors<T> {
  const errors: Errors<T> = {};
  for (const key in schema) {
    const fieldRules = schema[key] ?? [];
    for (const rule of fieldRules) {
      const msg = rule(values[key] ?? "");
      if (msg) {
        errors[key] = msg;
        break;
      }
    }
  }
  return errors;
}

export function hasErrors<T>(e: Errors<T>): boolean {
  return Object.values(e).some(Boolean);
}
