import { expect, test } from "@playwright/test";

test("submits a complete application with the full accumulated payload", async ({
  page,
}) => {
  let createBody: Record<string, unknown> | undefined;
  let createResponse: Record<string, unknown> | undefined;
  await page.route("**/api/applications", async (route) => {
    createBody = route.request().postDataJSON();
    createResponse = {
      application_id: "11111111-1111-4111-8111-111111111111",
      upload_url: "https://upload.example/cv",
      gcs_path: "cv/2026/10/11111111-1111-4111-8111-111111111111/cv.pdf",
    };
    await route.fulfill({ json: createResponse });
  });
  await page.route("https://upload.example/**", (route) =>
    route.fulfill({ status: 200 }),
  );
  await page.route("**/api/applications/*/complete", (route) =>
    route.fulfill({ json: { ok: true } }),
  );

  await page.goto("/apply");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("WhatsApp (E.164)").fill("+918925310144");
  await page.getByLabel("Country of residence (ISO code)").fill("IN");
  await page.getByLabel("Nationality (ISO code)").fill("IN");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("I hold a valid passport").check();
  await page.getByLabel("Passport expiry").fill("2030-12-31");
  await page.getByLabel(/I am willing to be posted/).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Role").selectOption("ai_engineer");
  await page.getByLabel("Years of experience").fill("3");
  await page.getByLabel("Certification name").fill("Professional ML Engineer");
  await page.getByLabel(/Prism AI platform/).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByLabel("Motivation")
    .fill(
      "I want to contribute rigorous climate and AI engineering expertise to IPCC-aligned projects while growing with Nature Labs.",
    );
  await page.getByLabel(/CV PDF or DOCX/).setInputFiles({
    name: "cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n"),
  });
  await page.getByLabel(/I consent to collection/).check();
  await page.getByLabel(/I agree to be contacted/).check();
  await page.getByRole("button", { name: "Submit application" }).click();

  await expect(page).toHaveURL(
    /\/apply\/success\/11111111-1111-4111-8111-111111111111/,
  );
  expect(createBody).toMatchObject({
    whatsapp: "+918925310144",
    country_of_residence: "IN",
    nationality: "IN",
    consent_dpdp: true,
    consent_contact: true,
    certifications: [{ name: "Professional ML Engineer" }],
  });
  expect(createResponse).toMatchObject({
    application_id: "11111111-1111-4111-8111-111111111111",
  });
});
