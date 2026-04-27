import { expect, test } from "@playwright/test";
import { EnrollmentPage } from "../helpers/enrollment-page";

test.describe("Group Enrollment Happy Path", () => {
  let enrollmentPage: EnrollmentPage;

  test.beforeEach(async ({ page }) => {
    enrollmentPage = new EnrollmentPage(page);
  });

  test("should complete group enrollment process successfully", async ({ page }) => {
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(1);

    // Step 1: Select course and group type
    await enrollmentPage.selectCategory("디자인");
    await enrollmentPage.selectCourse("Figma 실무 활용");
    await enrollmentPage.selectEnrollmentType("group");
    await enrollmentPage.nextStep();

    // Step 2: Fill applicant info and the default 2 participants
    await enrollmentPage.expectStep(2);
    await enrollmentPage.fillApplicantInfo({
      name: "김철수",
      email: "kim@test.com",
      phone: "010-2222-3333",
      motivation: "팀 협업을 위한 Figma 스킬 향상",
    });

    // Fill the default 2 participant slots (headCount defaults to 2)
    await enrollmentPage.fillGroupInfo({
      organizationName: "테스트회사",
      headCount: 2,
      contactPerson: "010-9999-8888",
      participants: [
        { name: "이영희", email: "lee@test.com" },
        { name: "박민준", email: "park@test.com" },
      ],
    });
    await enrollmentPage.nextStep();

    // Step 3: Verify and submit
    await enrollmentPage.expectStep(3);
    await expect(page.getByText("Figma 실무 활용")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("단체 신청")).toBeVisible();
    await expect(page.getByText("김철수")).toBeVisible();

    await enrollmentPage.agreeToTerms();
    await enrollmentPage.submit();

    // Verify success
    await enrollmentPage.expectSuccess();
    await expect(page.getByText("수강 신청이 완료되었습니다!")).toBeVisible();
    const enrollmentId = await enrollmentPage.getEnrollmentId();
    expect(enrollmentId).toMatch(/^ENR-/);
  });
});
