import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { generateSlug } from "@/lib/utils";

describe("utils", () => {
  it("cn merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn("foo", false && "bar")).toBe("foo");
  });

  it("generateSlug creates valid slugs", () => {
    const slug = generateSlug("Hello World");
    expect(slug).toMatch(/^hello-world-/);
    const slug2 = generateSlug("  Lioris Salon & Spa  ");
    expect(slug2).toMatch(/^lioris-salon-spa-/);
  });
});

describe("permissions", () => {
  it("owner has staff:create permission", async () => {
    const { can } = await import("@/lib/permissions");
    expect(can("OWNER", "staff:create")).toBe(true);
  });

  it("receptionist does not have staff:create", async () => {
    const { can } = await import("@/lib/permissions");
    expect(can("RECEPTIONIST", "staff:create")).toBe(false);
  });
});
