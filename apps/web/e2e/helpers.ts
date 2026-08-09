import { test as base, expect } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * All e2e specs import `test` from here: it forces the dev sign-in backend
 * (localStorage flag read by authService) before any page script runs, because
 * the real Google popup cannot be automated even when Firebase is configured.
 */
export const test = base.extend({
  page: async ({ page }, run) => {
    await page.addInitScript(() => localStorage.setItem("mathprep.devLogin", "1"));
    await run(page);
  },
});

export { expect };

/** Sign in through the dev form and wait for the home page. */
export async function signIn(page: Page, name = "Test Student", email = "student@example.com") {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Your name" }).fill(name);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: `Welcome, ${name}` })).toBeVisible();
}
