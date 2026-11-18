import { describe, expect, it } from "vitest";
import { ADMIN_OWNER_EMAIL, getAdminRole, mayRequestAdminAccess } from "@/lib/admin-role";
describe("admin role resolution", () => {
  it("recognizes the owner only through a Google identity", () => {
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL.toUpperCase(),app_metadata:{provider:"google",providers:["google"]}})).toBe("owner");
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL,app_metadata:{provider:"email"}})).toBeNull();
  });
  it("recognizes granted roles only for Google-backed accounts", () => {
    expect(getAdminRole({app_metadata:{provider:"google",roles:["admin"]}})).toBe("admin");
    expect(getAdminRole({app_metadata:{provider:"email",roles:["admin"]}})).toBeNull();
  });
  it("accepts a linked Google identity in trusted app metadata", () => {
    expect(getAdminRole({app_metadata:{provider:"email",providers:["email","google"],role:"admin"}})).toBe("admin");
  });
  it("does not trust user-editable metadata or non-Google identities", () => {
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL,user_metadata:{role:"owner"}})).toBeNull();
    expect(getAdminRole({app_metadata:{provider:"email",role:"support"}})).toBeNull();
    expect(getAdminRole(null)).toBeNull();
  });
  it("shows admin navigation only to Google owners or trusted Google roles", () => {
    expect(mayRequestAdminAccess({email:ADMIN_OWNER_EMAIL,app_metadata:{provider:"google"}})).toBe(true);
    expect(mayRequestAdminAccess({user_metadata:{role:"admin"}})).toBe(false);
    expect(mayRequestAdminAccess({app_metadata:{provider:"google",role:"admin"}})).toBe(true);
    expect(mayRequestAdminAccess({app_metadata:{provider:"email",role:"admin"}})).toBe(false);
  });
});
