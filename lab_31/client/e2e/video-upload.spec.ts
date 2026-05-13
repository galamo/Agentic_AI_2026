import { test, expect } from "@playwright/test";

const UPLOAD_URL = "http://localhost:8000/upload-video";

test.describe("Lab 31 Video Upload", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows heading and upload form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Lab 31 Video Upload", level: 1 }),
    ).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upload Video" }),
    ).toBeVisible();
  });

  test("shows validation error when submitting without a file", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Upload Video" }).click();
    await expect(page.locator(".error")).toHaveText(
      "Please choose a video file first.",
    );
  });

  test("displays OUTPUT after successful upload", async ({ page }) => {
    await page.route(UPLOAD_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ OUTPUT: "Mocked transcript line 1\nline 2" }),
      });
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: "clip.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("fake mp4 bytes for e2e"),
    });
    await page.getByRole("button", { name: "Upload Video" }).click();

    await expect(page.getByRole("heading", { name: "OUTPUT", level: 2 })).toBeVisible();
    await expect(page.locator(".output-section pre")).toHaveText(
      "Mocked transcript line 1\nline 2",
    );
  });

  test("shows server error message when upload fails", async ({ page }) => {
    await page.route(UPLOAD_URL, async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Unsupported codec" }),
      });
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: "bad.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("x"),
    });
    await page.getByRole("button", { name: "Upload Video" }).click();

    await expect(page.locator(".error")).toHaveText("Unsupported codec");
  });

  test("shows loading state while request is in flight", async ({ page }) => {
    await page.route(UPLOAD_URL, async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ OUTPUT: "done" }),
      });
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: "wait.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("y"),
    });
    await page.getByRole("button", { name: "Upload Video" }).click();

    await expect(
      page.getByRole("button", { name: "Uploading..." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upload Video" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
