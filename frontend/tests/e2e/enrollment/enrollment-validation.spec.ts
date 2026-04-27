import { expect, test } from "@playwright/test";
import { EnrollmentPage } from "../helpers/enrollment-page";

test.describe("Enrollment Validation Tests", () => {
  let enrollmentPage: EnrollmentPage;

  test.beforeEach(async ({ page }) => {
    enrollmentPage = new EnrollmentPage(page);
  });

  test("should disable next step button when course is not selected", async () => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    // Next step button should be disabled when no course is selected
    await expect(enrollmentPage.getNextButton()).toBeDisabled();
  });

  test("should show validation errors for empty required fields in step 2", async ({ page }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("디자인");
    await enrollmentPage.selectCourse("UI/UX 디자인 기초");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    // Focus and blur name field to mark it as touched, then submit
    const nameInput = page.getByPlaceholder("홍길동");
    await nameInput.focus();
    await nameInput.blur();

    await enrollmentPage.nextStep();

    // Should show validation error for empty name (Zod reports min(2) error as it overwrites min(1) in formatZodErrors)
    await expect(page.getByText("이름은(는) 2자 이상이어야 합니다")).toBeVisible();
  });

  test("should show validation error for invalid email format", async ({ page }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    // Fill name with invalid email
    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "invalid-email",
      phone: "010-1234-5678",
    });

    // Blur the email field to trigger validation
    await page.getByPlaceholder("example@email.com").blur();

    // Try to proceed
    await enrollmentPage.nextStep();

    // Should show email validation error (Zod: "올바른 이메일 형식이 아닙니다")
    await expect(page.getByText("올바른 이메일 형식이 아닙니다")).toBeVisible();
  });

  test("should show validation error for invalid phone format", async ({ page }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    // Fill invalid phone number
    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "hong@test.com",
      phone: "123-456",
    });

    // Blur the phone field to trigger validation
    await page.getByPlaceholder("010-1234-5678").blur();

    // Try to proceed
    await enrollmentPage.nextStep();

    // Should show phone validation error
    await expect(page.getByText(/올바른 휴전화번호 형식이 아닙니다/)).toBeVisible();
  });

  test("should allow proceeding after fixing validation errors", async ({ page }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    // Fill with valid data directly
    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "hong@test.com",
      phone: "010-1234-5678",
      motivation: "React를 배우고 싶습니다",
    });

    // Proceed without errors
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    // Complete to step 3 without errors
    await enrollmentPage.agreeToTerms();
    await enrollmentPage.submit();
    await enrollmentPage.expectSuccess();
  });
});
