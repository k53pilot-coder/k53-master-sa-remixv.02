import { describe, expect, it } from "vitest";
import { getAdminVerificationSupabaseUrl } from "@/lib/admin-verification-url";

describe("getAdminVerificationSupabaseUrl", () => {
  it("allows the exact loopback Supabase URL for local OAuth tests", () => {
    expect(getAdminVerificationSupabaseUrl("http://127.0.0.1:54321"))
      .toBe("http://127.0.0.1:54321");
  });

  it("keeps verification pinned to production for all other values", () => {
    expect(getAdminVerificationSupabaseUrl(undefined))
      .toBe("https://qfolceulguweezxjvvjt.supabase.co");
    expect(getAdminVerificationSupabaseUrl("https://attacker.example"))
      .toBe("https://qfolceulguweezxjvvjt.supabase.co");
    expect(getAdminVerificationSupabaseUrl("http://localhost:54321"))
      .toBe("https://qfolceulguweezxjvvjt.supabase.co");
  });
});
