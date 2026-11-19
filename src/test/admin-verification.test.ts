import { describe, expect, it, vi } from "vitest";
import { ADMIN_OWNER_EMAIL } from "@/lib/admin-role";
import { AdminVerificationError, verifyAdminAccess } from "@/lib/admin-verification";

describe("verifyAdminAccess", () => {
  it("verifies the bearer token with the Supabase Auth user endpoint and recognizes the owner", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        id: "owner-user-id",
        email: ADMIN_OWNER_EMAIL,
        email_confirmed_at: "2026-11-17T16:19:33.528Z",
        app_metadata: { provider: "email", providers: ["email", "google"] },
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const result = await verifyAdminAccess({
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "sb_publishable_example",
      accessToken: "signed-user-access-token",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://project.supabase.co/auth/v1/user"),
      expect.objectContaining({
        method: "GET",
        headers: {
          apikey: "sb_publishable_example",
          Authorization: "Bearer signed-user-access-token",
          Accept: "application/json",
        },
      }),
    );
    expect(result).toEqual({ role: "owner", userId: "owner-user-id" });
  });

  it("does not grant owner access to another account", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        id: "other-user-id",
        email: "someone@example.com",
        app_metadata: { provider: "email", providers: ["email", "google"] },
      }), { status: 200 }),
    );

    await expect(verifyAdminAccess({
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "sb_publishable_example",
      accessToken: "signed-user-access-token",
      fetcher,
    })).resolves.toEqual({ role: null, userId: "other-user-id" });
  });

  it("reports rejected sessions as verification failures rather than role denials", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await expect(verifyAdminAccess({
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "sb_publishable_example",
      accessToken: "expired-token",
      fetcher,
    })).rejects.toMatchObject<Partial<AdminVerificationError>>({
      name: "AdminVerificationError",
      status: 401,
    });
  });

  it("does not expose or log the supplied bearer token in errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network failure"));
    await expect(verifyAdminAccess({
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "sb_publishable_example",
      accessToken: "private-token-value",
      fetcher,
    })).rejects.toThrow("Supabase Auth could not be reached.");
  });
});
