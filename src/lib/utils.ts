import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "Unknown date";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Unknown date";
  }
}

export function formatDate(date: Date | string | null, fmt = "MMM d, yyyy"): string {
  if (!date) return "—";
  try {
    return format(new Date(date), fmt);
  } catch {
    return "—";
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "...";
}

export function getCompanyLogoUrl(companyName: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=random&size=64&bold=true`;
}

export function getWorkModeColor(workMode: string | null): string {
  switch (workMode) {
    case "REMOTE": return "bg-green-100 text-green-800";
    case "HYBRID": return "bg-yellow-100 text-yellow-800";
    case "ONSITE": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function getPlatformColor(platform: string | null): string {
  switch (platform) {
    case "LINKEDIN": return "bg-blue-100 text-blue-800";
    case "INDEED": return "bg-purple-100 text-purple-800";
    case "GLASSDOOR": return "bg-emerald-100 text-emerald-800";
    case "ZIPRECRUITER": return "bg-orange-100 text-orange-800";
    case "REDDIT": return "bg-red-100 text-red-800";
    case "HACKERNEWS": return "bg-orange-100 text-orange-800";
    case "REMOTIVE": return "bg-teal-100 text-teal-800";
    case "REMOTEOK": return "bg-sky-100 text-sky-800";
    case "ARBEITNOW": return "bg-indigo-100 text-indigo-800";
    default: return "bg-gray-100 text-gray-600";
  }
}

export const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NG", name: "Nigeria" },
  { code: "PK", name: "Pakistan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "PH", name: "Philippines" },
  { code: "CN", name: "China" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "OTHER", name: "Other" },
];
