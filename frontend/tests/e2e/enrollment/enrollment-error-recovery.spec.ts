import { expect, test } from "@playwright/test";
import { EnrollmentPage } from "../helpers/enrollment-page";

test.describe("Enrollment Error Recovery Tests", () => {
  let enrollmentPage: EnrollmentPage;

  test("should handle DUPLICATE_ENROLLMENT error on second submission", async ({ page }) => {
    enrollmentPage = new EnrollmentPage(page);

    // First submission - should succeed
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("비즈니스");
    await enrollmentPage.selectCourse("리더십과 팀 빌딩");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "duplicate@test.com",
      phone: "010-1234-5678",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    await enrollmentPage.agreeToTerms();
    await enrollmentPage.submit();
    await enrollmentPage.expectSuccess();

    // Now start a new enrollment with the same email and course
    await page.getByRole("button", { name: "새로운 신청" }).click();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCourse("리더십과 팀 빌딩");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "duplicate@test.com",
      phone: "010-1234-5678",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    await enrollmentPage.agreeToTerms();
    await enrollmentPage.submit();

    // Should show duplicate enrollment error
    await expect(page.getByText(/이미 신청한/)).toBeVisible({ timeout: 10000 });
    // Form data should be preserved (still on step 3)
    await expect(page.getByText("리더십과 팀 빌딩")).toBeVisible();
  });

  test("should preserve form data when staying on error state", async ({ page }) => {
    enrollmentPage = new EnrollmentPage(page);

    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("비즈니스");
    await enrollmentPage.selectCourse("스타트업 비즈니스 모델");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await enrollmentPage.fillApplicantInfo({
      name: "박지성",
      email: "psg@test.com",
      phone: "010-2222-3333",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    // Verify all data is shown
    await expect(page.getByText("스타트업 비즈니스 모델")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("박지성")).toBeVisible();
    await expect(page.getByText("psg@test.com")).toBeVisible();
    await expect(page.getByText("010-2222-3333")).toBeVisible();

    // Go back and modify
    await enrollmentPage.prevStep();
    await enrollmentPage.expectStep(2);

    // Data should be preserved in the form
    await expect(page.getByPlaceholder("홍길동")).toHaveValue("박지성");
    await expect(page.getByPlaceholder("example@email.com")).toHaveValue("psg@test.com");
  });
});
