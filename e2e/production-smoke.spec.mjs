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
  test("public navigation routes hydrate and render", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await openReadyPage(page, "/");
    await expect(page.locator("main h1").first()).toBeVisible();

    const routes = [
      "/learn",
      "/signs",
      "/practice",
      "/mock-test",
      "/review",
      "/practical",
      "/dltc",
      "/about",
    ];

    for (const route of routes) {
      const link = page.locator(`.main-nav a[href="${route}"]`).first();
      await expect(link, `navigation link ${route}`).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}(?:[?#].*)?$`));
      await expect(page.locator("main h1").first(), `page heading for ${route}`).toBeVisible();
      await expect(page.locator("main .study-loading")).toHaveCount(0);
    }

    expect(pageErrors, "uncaught browser runtime errors").toEqual([]);
  });

  test("Google sign-in CTA starts the configured canonical OAuth flow", async ({ page }) => {
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
    expect(authorizeURL.searchParams.get("redirect_to")).toBe(
      "https://k53.aiamplifysa.com/auth",
    );
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

  test("road-sign flashcard controls and search respond", async ({ page }) => {
    await openReadyPage(page, "/signs");

    const search = page.getByRole("textbox", { name: "Search road signs" });
    await expect(search).toBeVisible();
    await search.fill("STOP");
    await expect(page.getByRole("heading", { name: "Road signs library" })).toBeVisible();

    const flashcards = page.getByRole("button", { name: "Flashcards" });
    await expect(flashcards).toBeEnabled();
    await flashcards.click();
    await expect(page.getByRole("button", { name: "Reveal meaning" })).toBeVisible();
    await page.getByRole("button", { name: "Reveal meaning" }).click();
    await expect(page.locator(".flashcard h2")).toBeVisible();
    const next = page.getByRole("button", { name: "Next flashcard" });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByRole("button", { name: "Reveal meaning" })).toBeVisible();
  });

  test("practice CTA starts a quiz and answer controls respond", async ({ page }) => {
    await openReadyPage(page, "/practice");

    const start = page.getByRole("button", { name: "Start practice" });
    await expect(start).toBeVisible();
    await expect(start).toBeEnabled();
    await start.click();

    await expect(page.locator(".quiz-space h1")).toBeVisible();
    const answer = page.locator(".answer-options button").first();
    await expect(answer).toBeEnabled();
    await answer.click();
    await expect(page.locator(".feedback")).toBeVisible();
    await expect(page.getByRole("button", { name: /Next/ })).toBeEnabled();

    await page.getByRole("button", { name: /Exit practice/ }).click();
    await expect(page.getByRole("button", { name: "Start practice" })).toBeVisible();
  });

  test("language switch changes the sign-library interface", async ({ page }) => {
    await openReadyPage(page, "/signs");
    await page.getByRole("combobox", { name: "Language" }).selectOption("af");
    await expect(
      page.getByRole("heading", { name: "Padtekenbiblioteek" }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Taal" }).selectOption("en");
    await expect(page.getByRole("heading", { name: "Road signs library" })).toBeVisible();
  });
});
