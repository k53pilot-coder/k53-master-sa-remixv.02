import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Auth } from "@/routes/auth";
import { AdminCodeLogin } from "@/routes/admin";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ invalidate: mocks.invalidate }),
  Link: ({ children, to }: { children: ReactNode; to: string }) =>
    createElement("a", { href: to }, children),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ cancelQueries: vi.fn(), clear: vi.fn() }),
}));
vi.mock("@/components/study-provider", () => ({
  useStudy: () => ({
    user: null,
    name: "Learner",
    progress: { vehicle: "light" },
    refresh: vi.fn(),
    cloudError: "Account sync is unavailable. You can still study on this device.",
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signInWithOtp: mocks.signInWithOtp,
    },
  },
}));
vi.mock("@/integrations/lovable", () => ({
  lovable: { auth: { signInWithOAuth: mocks.signInWithOAuth } },
}));

describe("account sign-in", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows OAuth failures and re-enables sign-in controls", async () => {
    mocks.signInWithOAuth.mockRejectedValue(new Error("network unavailable"));

    render(<Auth />);
    const googleButton = screen.getByRole("button", { name: "Continue with Google" });
    fireEvent.click(googleButton);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Could not reach the sign-in service. Check your connection and try again.",
    );
    await waitFor(() => expect(googleButton).toBeEnabled());
  });

  it("normalizes the email and signs in despite unrelated account-sync errors", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    render(<Auth />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "Learner@Example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "learner@example.com",
        password: "correct-horse-battery",
      }),
    );
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }));
  });

  it("allows an admin code request when account sync is unavailable", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: null });

    render(<AdminCodeLogin onVerified={vi.fn()} />);
    const requestButton = screen.getByRole("button", { name: "Email me a sign-in code" });
    expect(requestButton).toBeEnabled();
    fireEvent.click(requestButton);

    await waitFor(() =>
      expect(mocks.signInWithOtp).toHaveBeenCalledWith({
        email: "info@aiamplifysa.com",
        options: { shouldCreateUser: false },
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If this email has admin access, a one-time code has been sent.",
    );
  });
});
