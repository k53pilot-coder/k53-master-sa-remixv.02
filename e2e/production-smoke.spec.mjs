import { expect, test } from "@playwright/test";

const baseURL = process.env.K53_BASE_URL ?? "http://127.0.0.1:4173";

async function openReadyPage(page, path = "/") {
  const response = await page.goto(new URL(path, baseURL).toString(), { waitUntil: "domcontentloaded" });
  const content = page.locator("main.content");
  try {
    await expect(content).toBeVisible({ timeout: 30_000 });
  } catch (error) {
    console.error("Built Worker page did not render the app shell:", JSON.stringify({
      path,
      status: response?.status(),
      finalUrl: page.url(),
      title: await page.title().catch(() => "<page closed>"),
      body: (await page.locator("body").innerText().catch(() => "<page unavailable>")).slice(0, 1200),
    }));
    throw error;
  }
  await expect(content).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect(content.locator(".study-loading")).toHaveCount(0);
  await expect(content.locator(".cloud-warning")).toHaveCount(0);
}

test.describe("K53 Master SA built Worker browser smoke tests", () => {
  test("public About and authentication routes remain available", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await openReadyPage(page, "/about");
    await expect(page.locator("main h1").first()).toBeVisible();

    await openReadyPage(page, "/auth");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    expect(pageErrors, "uncaught browser runtime errors").toEqual([]);
  });

  test("unauthorised visitors cannot use any learning route or see learning navigation", async ({ page }) => {
    const routes = [
      "/",
      "/learn",
      "/signs",
      "/practice",
      "/mock-test",
      "/review",
      "/practical",
      "/dltc",
    ];

    for (const route of routes) {
      await openReadyPage(page, route);
      await expect(page.getByRole("heading", { name: "Learning access required" }), route).toBeVisible();
      await expect(page.getByRole("link", { name: "Sign in with Google" })).toHaveAttribute("href", "/auth");
      for (const protectedPath of ["/learn", "/signs", "/practice", "/mock-test", "/review", "/practical", "/dltc"]) {
        await expect(page.locator(`.main-nav a[href="${protectedPath}"]`)).toHaveCount(0);
      }
    }
  });

  test("Google sign-in CTA starts the configured OAuth flow", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await openReadyPage(page, "/auth");
    const signIn = page.getByRole("button", { name: "Continue with Google" });
    await expect(signIn).toBeVisible();
    await expect(signIn).toBeEnabled();

    const authorizeRequestPromise = page.waitForRequest(
      (request) =>
        request.url().includes("/auth/v1/authorize") &&
        new URL(request.url()).searchParams.get("provider") === "google",
      { timeout: 15_000 },
    );

    await signIn.click();
    const authorizeRequest = await authorizeRequestPromise;
    const authorizeURL = new URL(authorizeRequest.url());

    expect(authorizeURL.searchParams.get("provider")).toBe("google");
    expect(authorizeURL.searchParams.get("redirect_to")).toBe(`${baseURL}/auth`);
    expect(pageErrors, "uncaught browser runtime errors").toEqual([]);
  });

  test("admin route denies an unauthenticated browser session", async ({ page }) => {
    await openReadyPage(page, "/admin");

    await expect(
      page.getByText(
        "Sign in with Google to access administration. Only the owner account and accounts granted an admin role can enter.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "App administration" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sign in with Google" })).toHaveAttribute(
      "href",
      "/auth",
    );
  });

  test("public language selector updates the authentication interface", async ({ page }) => {
    await openReadyPage(page, "/auth");
    await page.getByRole("combobox", { name: "Language" }).selectOption("af");
    await expect(page.getByRole("button", { name: "Gaan voort met Google" })).toBeVisible();
    await page.getByRole("combobox", { name: "Taal" }).selectOption("en");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });
});
