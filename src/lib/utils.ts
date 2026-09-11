import type { PropertyAreaUnit } from "@/types";
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const priceFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number, unit = "total"): string {
  const formatted = priceFormatter.format(price);
  if (unit === "monthly") return `${formatted}/mo`;
  if (unit === "yearly") return `${formatted}/yr`;
  return formatted;
}

export function formatCompactPrice(price: number): string {
  if (price >= 1_000_000) {
    const lakh = price / 100_000;
    if (lakh >= 10) return `PKR ${(price / 1_000_000).toFixed(lakh >= 100 ? 0 : 1)} crore`;
    return `PKR ${lakh.toFixed(lakh >= 10 ? 0 : 1)} lac`;
  }
  if (price >= 100_000) {
    const lac = price / 100_000;
    return `PKR ${lac.toFixed(lac >= 10 ? 0 : 1)} lac`;
  }
  if (price >= 1_000) return `PKR ${Math.round(price / 1_000)}k`;
  return `PKR ${price}`;
}

export function formatArea(size: number | null | undefined, unit: PropertyAreaUnit | null | undefined): string {
  if (size == null || !unit) return "";
  const value = size % 1 === 0 ? String(size) : size.toFixed(2);
  return `${value} ${unit}`;
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(date),
  );
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function inThreeMonthsISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}