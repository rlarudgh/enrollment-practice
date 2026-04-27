import type { Page } from "@playwright/test";

const TEST_USER = {
  email: "student@test.com",
  password: "test1234",
};

export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto("/login");

  // Wait for MSW to initialize
  await page.waitForTimeout(1000);

  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);

  // Click the submit button and wait for navigation
  await Promise.all([
    page.waitForURL(/\/enrollment/, { timeout: 20000 }),
    page.getByRole("button", { name: "로그인" }).click(),
  ]);
}

export async function loginAsCreator(page: Page) {
  await login(page, "creator@test.com", "test1234");
}
