import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Auth } from "@/routes/auth";
const mocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options, useNavigate: vi.fn(), useRouter: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ cancelQueries: vi.fn(), clear: vi.fn() }) }));
vi.mock("@/components/study-provider", () => ({ useStudy: () => ({ user:null,name:"Learner",progress:{vehicle:"light"},refresh:vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase:{auth:{signInWithOAuth:mocks.signInWithOAuth}} }));
describe("Google-only account sign-in", () => {
  afterEach(() => vi.clearAllMocks());
  it("starts native Supabase Google OAuth and redirects to the existing auth route", async () => {
    mocks.signInWithOAuth.mockResolvedValue({data:{provider:"google",url:null},error:null});
    render(<Auth />);
    fireEvent.click(screen.getByRole("button",{name:"Continue with Google"}));
    await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledWith({provider:"google",options:{redirectTo:"http://localhost/auth"}}));
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/continue with lovable/i})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Create account"})).not.toBeInTheDocument();
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
