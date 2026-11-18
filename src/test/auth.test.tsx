import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Auth, getOAuthRedirectTo } from "@/routes/auth";
const mocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options, useNavigate: vi.fn(), useRouter: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ cancelQueries: vi.fn(), clear: vi.fn() }) }));
vi.mock("@/components/study-provider", () => ({ useStudy: () => ({ user:null,name:"Learner",progress:{vehicle:"light"},refresh:vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase:{auth:{signInWithOAuth:mocks.signInWithOAuth}} }));
describe("Google-only account sign-in", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("starts native Supabase Google OAuth", async () => {
    mocks.signInWithOAuth.mockResolvedValue({data:{provider:"google",url:null},error:null});
    render(<Auth />);
    fireEvent.click(screen.getByRole("button",{name:"Continue with Google"}));
    await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledWith({provider:"google",options:{redirectTo:new URL("/auth", window.location.origin).toString()}}));
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/continue with lovable/i})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Create account"})).not.toBeInTheDocument();
  });
  it("always sends production builds on the main domain to the canonical K53 auth route", () => {
    expect(getOAuthRedirectTo(true,"k53.aiamplifysa.com","https://k53.aiamplifysa.com")).toBe("https://k53.aiamplifysa.com/auth");
  });
  it("does not send a production build opened on localhost back to localhost", () => {
    expect(getOAuthRedirectTo(true,"localhost","http://localhost:3000")).toBe("https://k53.aiamplifysa.com/auth");
  });
  it("does not send a production build opened on an unrelated hostname back there", () => {
    expect(getOAuthRedirectTo(true,"localhost","http://localhost:3000")).toBe("https://k53.aiamplifysa.com/auth");
  });
  it("preserves the hostname for Cloudflare preview deployments", () => {
    expect(getOAuthRedirectTo(true,"branch-k53-master-sa-remixv-02.aiamplifysa.workers.dev","https://branch-k53-master-sa-remixv-02.aiamplifysa.workers.dev")).toBe("https://branch-k53-master-sa-remixv-02.aiamplifysa.workers.dev/auth");
  });
  it("keeps localhost for local development", () => {
    expect(getOAuthRedirectTo(false,"localhost","http://localhost:3000")).toBe("http://localhost:3000/auth");
  });
  it("shows OAuth failures and re-enables Google sign-in", async () => {
    mocks.signInWithOAuth.mockRejectedValue(new Error("network unavailable"));
    render(<Auth />);
    const button=screen.getByRole("button",{name:"Continue with Google"});
    fireEvent.click(button);
    expect(await screen.findByRole("status")).toHaveTextContent("Could not reach the sign-in service. Check your connection and try again.");
    await waitFor(() => expect(button).toBeEnabled());
  });
});
