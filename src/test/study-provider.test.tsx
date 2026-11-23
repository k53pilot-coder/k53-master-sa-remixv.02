import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyProvider, useStudy } from "@/components/study-provider";

const mocks = vi.hoisted(() => ({
  authListener: null as
    | ((
        event: string,
        session: { user: { id: string; user_metadata: Record<string, unknown> } | null },
      ) => void)
    | null,
  getSession: vi.fn(),
  loadProgress: vi.fn(),
  onAuthStateChange: vi.fn(),
  openDB: vi.fn(),
  syncProgress: vi.fn(),
}));

vi.mock("idb", () => ({ openDB: mocks.openDB }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));
vi.mock("@/lib/progress.functions", () => ({
  loadProgress: mocks.loadProgress,
  syncProgress: mocks.syncProgress,
}));

function Probe() {
  const { user, ready, cloudError, storageError, progress, record } = useStudy();
  return (
    <>
      <span>{user?.id ?? "signed out"}</span>
      <span data-testid="ready">{ready ? "ready" : "loading"}</span>
      <span data-testid="vehicle">{progress.vehicle}</span>
      {cloudError ? <span role="status">{cloudError}</span> : null}
      {storageError ? <span role="alert">{storageError}</span> : null}
      <button
        onClick={() =>
          record([
            {
              id: "00000000-0000-4000-8000-000000000001",
              question_id: "question-1",
              category: 0,
              correct: true,
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ])
        }
      >
        Record attempt
      </button>
    </>
  );
}

describe("StudyProvider account isolation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("writes a pending progress save to the account that created it", async () => {
    const userA = { id: "account-a", user_metadata: {} } as User;
    const userB = { id: "account-b", user_metadata: {} } as User;
    const puts: Array<{ value: unknown; key: string }> = [];
    const database = {
      get: vi.fn(async () => undefined),
      put: vi.fn(async (_store: string, value: unknown, key: string) => {
        puts.push({ value, key });
      }),
      transaction: vi.fn(() => ({
        store: {
          get: vi.fn(async () => undefined),
          put: vi.fn(async () => {}),
          delete: vi.fn(async () => {}),
        },
        done: Promise.resolve(),
      })),
    };
    let resolvePendingOpen: ((value: typeof database) => void) | undefined;
    const pendingOpen = new Promise<typeof database>((resolve) => {
      resolvePendingOpen = resolve;
    });
    let openCount = 0;
    mocks.openDB.mockImplementation(() => {
      openCount += 1;
      return openCount === 2 ? pendingOpen : Promise.resolve(database);
    });
    mocks.getSession.mockResolvedValue({ data: { session: { user: userA } } });
    mocks.onAuthStateChange.mockImplementation((listener) => {
      mocks.authListener = listener;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mocks.loadProgress.mockResolvedValue({ attempts: [], tests: [], profile: null });
    mocks.syncProgress.mockResolvedValue({ saved: true });

    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>,
    );

    await waitFor(() => expect(screen.getByText("account-a")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Record attempt" }));
    expect(openCount).toBe(2);

    act(() => {
      mocks.authListener?.("SIGNED_IN", { user: userB });
    });
    await waitFor(() => expect(screen.getByText("account-b")).toBeTruthy());

    await act(async () => {
      resolvePendingOpen?.(database);
      await pendingOpen;
    });

    expect(puts).toHaveLength(1);
    expect(puts[0]?.key).toBe("user:account-a");
    expect(puts[0]?.key).not.toBe("user:account-b");
  });

  it("keeps local study available when Supabase is not configured", async () => {
    const database = {
      get: vi.fn(async () => undefined),
      put: vi.fn(async () => {}),
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.onAuthStateChange.mockImplementation(() => {
      throw new Error("Missing Supabase environment variables");
    });
    mocks.openDB.mockResolvedValue(database);

    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("ready"));
    expect(screen.getByText("signed out")).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cloud sync is not configured for this deployment. Connect the correct Supabase project and set its URL and publishable key.",
    );
  });

  it("keeps a generic sync error for non-configuration failures", async () => {
    const database = {
      get: vi.fn(async () => undefined),
      put: vi.fn(async () => {}),
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.onAuthStateChange.mockImplementation(() => {
      throw new Error("Auth service returned 404");
    });
    mocks.openDB.mockResolvedValue(database);

    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("ready"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Account sync is unavailable. You can still study on this device.",
    );
  });

  it("reports local persistence failures instead of silently claiming progress is saved", async () => {
    const database = {
      get: vi.fn(async () => undefined),
      put: vi.fn().mockRejectedValue(new Error("storage quota exceeded")),
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    mocks.openDB.mockResolvedValue(database);

    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("ready"));
    fireEvent.click(screen.getByRole("button", { name: "Record attempt" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Progress could not be saved on this device.",
    );
    consoleError.mockRestore();
  });

  it("preserves guest progress separately when a user signs in", async () => {
    const guestProgress = {
      attempts: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          question_id: "guest-question",
          category: 0,
          correct: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      tests: [],
      learned: [0, 2],
      vehicle: "heavy" as const,
    };
    const accountProgress = {
      attempts: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          question_id: "account-question",
          category: 1,
          correct: false,
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      tests: [],
      learned: [1],
      vehicle: "motorcycle" as const,
    };
    const entries = new Map<string, unknown>([
      ["guest", guestProgress],
      ["user:account-a", accountProgress],
    ]);
    const database = {
      get: vi.fn(async (_store: string, key: string) => entries.get(key)),
      put: vi.fn(async (_store: string, value: unknown, key: string) => {
        entries.set(key, value);
      }),
      transaction: vi.fn(() => ({
        store: {
          get: vi.fn(async (key: string) => entries.get(key)),
          put: vi.fn(async (value: unknown, key: string) => {
            entries.set(key, value);
          }),
          delete: vi.fn(async (key: string) => {
            entries.delete(key);
          }),
        },
        done: Promise.resolve(),
      })),
    };
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "account-a", user_metadata: {} } } },
    });
    mocks.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    mocks.openDB.mockResolvedValue(database);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>,
    );

    await waitFor(() => expect(screen.getByText("account-a")).toBeTruthy());
    await waitFor(() => expect(entries.get("user:account-a")).toMatchObject({
      attempts: [expect.objectContaining({ question_id: "account-question" })],
      learned: [1],
      vehicle: "motorcycle",
    }));
    expect(entries.get("guest")).toEqual(guestProgress);
  });

  it("restores a saved vehicle preference from the account profile", async () => {
    const database = {
      get: vi.fn(async () => undefined),
      put: vi.fn(async () => {}),
      transaction: vi.fn(() => ({
        store: {
          get: vi.fn(async () => undefined),
          put: vi.fn(async () => {}),
          delete: vi.fn(async () => {}),
        },
        done: Promise.resolve(),
      })),
    };
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "account-a", user_metadata: {} } } },
    });
    mocks.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    mocks.openDB.mockResolvedValue(database);
    mocks.loadProgress.mockResolvedValue({
      attempts: [],
      tests: [],
      profile: { display_name: "Learner", vehicle: "heavy" },
    });
    mocks.syncProgress.mockResolvedValue({ saved: true });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });

    render(
      <StudyProvider>
        <Probe />
      </StudyProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("vehicle")).toHaveTextContent("heavy"));
  });
});
