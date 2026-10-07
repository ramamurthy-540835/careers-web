import {
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { resolveCountryCode } from "./countries";

export function countryCallingCode(countryInput: string): string | undefined {
  const code = resolveCountryCode(countryInput);
  return code && isSupportedCountry(code) ? `+${getCountryCallingCode(code)}` : undefined;
}

export function normalizeWhatsApp(value: string, countryInput: string): string {
  const code = resolveCountryCode(countryInput);
  const country = code && isSupportedCountry(code) ? code : undefined;
  const parsed = parsePhoneNumberFromString(value, country);
  return parsed?.isValid() ? parsed.number : value.trim();
}
