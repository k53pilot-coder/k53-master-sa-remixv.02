import { describe, expect, it } from "vitest";
import { ADMIN_OWNER_EMAIL, getAdminRole, mayRequestAdminAccess } from "@/lib/admin-role";
describe("admin role resolution", () => {
  it("recognizes the verified primary owner even when the original provider remains email", () => {
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL.toUpperCase(),email_verified:true,app_metadata:{provider:"email",providers:["email","google"]}})).toBe("owner");
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL,email_verified:false,app_metadata:{provider:"google"}})).toBeNull();
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL,app_metadata:{provider:"google"}})).toBeNull();
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL,app_metadata:{provider:"email",providers:["email","google"]}})).toBeNull();
    expect(getAdminRole({email:ADMIN_OWNER_EMAIL,email_verified:true,app_metadata:{provider:"email"}})).toBe("owner");
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
  it("shows the owner navigation while session provider metadata is stale; the server re-verifies Google", () => {
    expect(mayRequestAdminAccess({email:ADMIN_OWNER_EMAIL,app_metadata:{provider:"email"}})).toBe(true);
    expect(mayRequestAdminAccess({email:ADMIN_OWNER_EMAIL,app_metadata:{provider:"google"}})).toBe(true);
    expect(mayRequestAdminAccess({user_metadata:{role:"admin"}})).toBe(false);
    expect(mayRequestAdminAccess({app_metadata:{provider:"google",role:"admin"}})).toBe(true);
    expect(mayRequestAdminAccess({app_metadata:{provider:"email",role:"admin"}})).toBe(false);
  });
});
