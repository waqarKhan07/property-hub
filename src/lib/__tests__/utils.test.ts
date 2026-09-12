import { describe, expect, it } from "vitest";
import { cn, formatArea, formatCompactPrice, formatPrice, getErrorMessage, initials, slugify, timeAgo } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy classes with a space", () => {
    expect(cn("a", "b", false, null, undefined, "", "c")).toBe("a b c");
  });
});

describe("formatPrice", () => {
  it("formats grouped amounts", () => {
    expect(formatPrice(123456)).toContain("123,456");
  });
  it("appends /mo for monthly", () => {
    const out = formatPrice(45000, "monthly");
    expect(out.endsWith("/mo")).toBe(true);
    expect(out).toContain("45,000");
  });
  it("appends /yr for yearly", () => {
    const out = formatPrice(500000, "yearly");
    expect(out.endsWith("/yr")).toBe(true);
    expect(out).toContain("500,000");
  });
});

describe("formatCompactPrice", () => {
  it("uses crore for 100 lac or more", () => {
    expect(formatCompactPrice(12_000_000)).toMatch(/crore/);
  });
  it("uses lac between a lac and a crore", () => {
    expect(formatCompactPrice(2_500_000)).toBe("PKR 25 lac");
  });
  it("uses k for thousands under a lac", () => {
    expect(formatCompactPrice(60_000)).toBe("PKR 60k");
  });
  it("uses raw number under a thousand", () => {
    expect(formatCompactPrice(750)).toBe("PKR 750");
  });
});

describe("formatArea", () => {
  it("returns empty for null input", () => {
    expect(formatArea(null, "marla")).toBe("");
    expect(formatArea(5, null)).toBe("");
  });
  it("formats whole numbers without decimals", () => {
    expect(formatArea(5, "marla")).toBe("5 marla");
  });
  it("formats decimals with two places", () => {
    expect(formatArea(2.5, "kanal")).toBe("2.50 kanal");
  });
});

describe("timeAgo", () => {
  const now = Date.now();
  it("returns Just now under a minute", () => {
    expect(timeAgo(new Date(now - 30_000))).toBe("Just now");
  });
  it("returns minutes ago", () => {
    expect(timeAgo(new Date(now - 10 * 60_000))).toBe("10m ago");
  });
  it("returns hours ago", () => {
    expect(timeAgo(new Date(now - 5 * 3_600_000))).toBe("5h ago");
  });
  it("returns days ago", () => {
    expect(timeAgo(new Date(now - 3 * 86_400_000))).toBe("3d ago");
  });
  it("returns months ago", () => {
    expect(timeAgo(new Date(now - 45 * 86_400_000))).toBe("1mo ago");
  });
  it("returns years ago", () => {
    expect(timeAgo(new Date(now - 2 * 365 * 86_400_000))).toBe("2y ago");
  });
});

describe("slugify", () => {
  it("lowercases and trims", () => {
    expect(slugify("  Modern DHA House  ")).toBe("modern-dha-house");
  });
  it("removes special characters", () => {
    expect(slugify("2-Bed Flat! (Lahore)")).toBe("2-bed-flat-lahore");
  });
  it("cleans leading and trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });
});

describe("initials", () => {
  it("uses two letters from a single name", () => {
    expect(initials("Ali")).toBe("AL");
  });
  it("uses first letters of first and last name", () => {
    expect(initials("Muhammad Ahmed")).toBe("MA");
  });
  it("returns ? for missing name", () => {
    expect(initials(null)).toBe("?");
    expect(initials("")).toBe("?");
  });
});

describe("getErrorMessage", () => {
  it("uses Error message", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });
  it("uses message from plain object", () => {
    expect(getErrorMessage({ message: "custom" })).toBe("custom");
  });
  it("falls back for unknown values", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong. Please try again.");
  });
});