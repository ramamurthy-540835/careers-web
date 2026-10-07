import { expect, test } from "@playwright/test";

test("passport gate blocks progress", async ({ page }) => {
  await page.goto("/apply");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("WhatsApp number").fill("7845293775");
  await page.getByLabel("Country of residence").fill("India");
  await page.getByLabel("Nationality").fill("India");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await page.getByLabel("I hold a valid passport").check();
  await page.getByLabel("I hold a valid passport").uncheck();
  await expect(page.getByText(/A valid passport is mandatory/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
});
