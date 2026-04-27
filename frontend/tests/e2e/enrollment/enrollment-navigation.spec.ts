import { expect, test } from "@playwright/test";
import { EnrollmentPage } from "../helpers/enrollment-page";

test.describe("Step Navigation and Data Persistence", () => {
  let enrollmentPage: EnrollmentPage;

  test.beforeEach(async ({ page }) => {
    enrollmentPage = new EnrollmentPage(page);
  });

  test("should maintain selected course when going back and forth between steps", async ({
    page,
  }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("TypeScript 마스터 클래스");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    // Go back to step 1
    await enrollmentPage.prevStep();
    await enrollmentPage.expectStep(1);

    // Verify course is still selected (card shows "선택됨")
    const selectedCard = page.locator('[data-slot="card"]', { hasText: "선택됨" }).first();
    await expect(selectedCard).toBeVisible();

    // Go forward again
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "hong@test.com",
      phone: "010-1234-5678",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    // Go back to step 2
    await enrollmentPage.prevStep();
    await enrollmentPage.expectStep(2);

    // Verify applicant data persisted
    await expect(page.getByPlaceholder("홍길동")).toHaveValue("홍길동");
    await expect(page.getByPlaceholder("example@email.com")).toHaveValue("hong@test.com");
    await expect(page.getByPlaceholder("010-1234-5678")).toHaveValue("010-1234-5678");
  });

  test("should navigate back to step 1 when clicking edit from step 3", async ({ page }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("비즈니스");
    await enrollmentPage.selectCourse("스타트업 비즈니스 모델");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();

    await enrollmentPage.expectStep(2);
    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "hong@test.com",
      phone: "010-1234-5678",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    await page.getByRole("button", { name: "수정" }).first().click();
    await enrollmentPage.expectStep(1);
  });

  test("should show step indicators throughout the flow", async ({ page }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    // Verify step 1 title is visible
    await expect(page.getByText("강의 선택").first()).toBeVisible();

    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await expect(page.getByText("정보 입력").first()).toBeVisible();

    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "hong@test.com",
      phone: "010-1234-5678",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    await expect(page.getByText("확인 및 제출").first()).toBeVisible();
  });
});
