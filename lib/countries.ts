import regionList from "./countries.json";

export const countries = [
  ...regionList,
  { code: "AQ", name: "Antarctica" },
  { code: "BV", name: "Bouvet Island" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands" },
  { code: "HM", name: "Heard Island and McDonald Islands" },
  { code: "TF", name: "French Southern Territories" },
  { code: "UM", name: "United States Minor Outlying Islands" },
].sort((a, b) => a.name.localeCompare(b.name));

const byName = new Map(countries.map(({ name, code }) => [name.toLowerCase(), code]));
const codes = new Set(countries.map(({ code }) => code));

export function resolveCountryCode(input: string): string | undefined {
  const value = input.trim();
  const code = value.toUpperCase();
  if (codes.has(code)) return code;
  const match = /^(.*?)\s*\(([A-Za-z]{2})\)$/.exec(value);
  if (match && byName.get(match[1].trim().toLowerCase()) === match[2].toUpperCase()) {
    return match[2].toUpperCase();
  }
  return byName.get(value.toLowerCase());
}
