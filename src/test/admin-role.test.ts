import { describe, expect, it } from "vitest";
import { ADMIN_OWNER_EMAIL, getAdminRole, mayRequestAdminAccess } from "@/lib/admin-role";

const confirmedAt = "2026-11-17T16:19:33.528Z";

describe("admin role resolution", () => {
  it("recognizes the fixed primary owner only when Supabase confirms the email", () => {
    expect(getAdminRole({ email: ADMIN_OWNER_EMAIL.toUpperCase(), email_confirmed_at: confirmedAt, app_metadata: { provider: "email", providers: ["email", "google"] } })).toBe("owner");
    expect(getAdminRole({ email: ADMIN_OWNER_EMAIL, app_metadata: { provider: "email" } })).toBeNull();
    expect(getAdminRole({ email: ADMIN_OWNER_EMAIL, email_confirmed_at: null, app_metadata: { provider: "google" } })).toBeNull();
    expect(getAdminRole({ email: "other@gmail.com", email_confirmed_at: confirmedAt, app_metadata: { provider: "email", providers: ["email", "google"] } })).toBeNull();
  });

  it("recognizes granted roles only for Google-backed accounts", () => {
    expect(getAdminRole({ app_metadata: { provider: "google", roles: ["admin"] } })).toBe("admin");
    expect(getAdminRole({ app_metadata: { provider: "email", roles: ["admin"] } })).toBeNull();
  });

  it("accepts a linked Google identity in trusted app metadata", () => {
    expect(getAdminRole({ app_metadata: { provider: "email", providers: ["email", "google"], role: "admin" } })).toBe("admin");
  });

  it("does not trust user-editable metadata or non-Google identities", () => {
    expect(getAdminRole({ email: "other@gmail.com", user_metadata: { role: "owner" } })).toBeNull();
    expect(getAdminRole({ app_metadata: { provider: "email", role: "support" } })).toBeNull();
    expect(getAdminRole(null)).toBeNull();
  });

  it("shows the owner navigation only when the email is confirmed", () => {
    expect(mayRequestAdminAccess({ email: ADMIN_OWNER_EMAIL, email_confirmed_at: confirmedAt, app_metadata: { provider: "email" } })).toBe(true);
    expect(mayRequestAdminAccess({ email: ADMIN_OWNER_EMAIL, app_metadata: { provider: "google" } })).toBe(false);
    expect(mayRequestAdminAccess({ user_metadata: { role: "admin" } })).toBe(false);
    expect(mayRequestAdminAccess({ app_metadata: { provider: "google", role: "admin" } })).toBe(true);
    expect(mayRequestAdminAccess({ app_metadata: { provider: "email", role: "admin" } })).toBe(false);
  });
});
