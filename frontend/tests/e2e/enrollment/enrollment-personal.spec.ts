import { expect, test } from "@playwright/test";
import { EnrollmentPage } from "../helpers/enrollment-page";

test.describe("Personal Enrollment Happy Path", () => {
  let enrollmentPage: EnrollmentPage;

  test.beforeEach(async ({ page }) => {
    enrollmentPage = new EnrollmentPage(page);
  });

  test("should complete personal enrollment process successfully", async () => {
    // 1. Login and navigate to enrollment page
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    // 2. Step 1: Select course and type
    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();

    // 3. Step 2: Fill applicant information
    await enrollmentPage.expectStep(2);
    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "hong@test.com",
      phone: "010-1234-5678",
      motivation: "React를 배워서 실무 프로젝트에 적용하고 싶습니다.",
    });
    await enrollmentPage.nextStep();

    // 4. Step 3: Verify summaries and submit
    await enrollmentPage.expectStep(3);

    // Verify course summary (wait for course data to load)
    await expect(enrollmentPage.page.getByText("React 완벽 가이드")).toBeVisible({
      timeout: 10000,
    });
    await expect(enrollmentPage.page.getByText("개인 신청")).toBeVisible();

    // Verify applicant summary
    await expect(enrollmentPage.page.getByText("홍길동")).toBeVisible();
    await expect(enrollmentPage.page.getByText("hong@test.com")).toBeVisible();

    // Agree to terms and submit
    await enrollmentPage.agreeToTerms();
    await enrollmentPage.submit();

    // 5. Verify success screen
    await enrollmentPage.expectSuccess();
    await expect(enrollmentPage.page.getByText("수강 신청이 완료되었습니다!")).toBeVisible();

    // Verify enrollment ID is displayed
    const enrollmentId = await enrollmentPage.getEnrollmentId();
    expect(enrollmentId).toMatch(/^ENR-/);
  });
});
