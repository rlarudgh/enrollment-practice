import { expect, test } from "@playwright/test";
import { EnrollmentPage } from "../helpers/enrollment-page";

test.describe("Enrollment Draft Persistence Tests", () => {
  let enrollmentPage: EnrollmentPage;

  test.beforeEach(async ({ page }) => {
    enrollmentPage = new EnrollmentPage(page);
    await enrollmentPage.goto();
  });

  test("should save draft data after completing step 1", async ({ page }) => {
    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    const draft = await page.evaluate(() => sessionStorage.getItem("enrollment_draft"));
    expect(draft).not.toBeNull();
    const parsed = JSON.parse(draft!);
    expect(parsed.courseId).toBe("course-1");
    expect(parsed.type).toBe("personal");
  });

  test("should restore draft data after page reload", async ({ page }) => {
    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await page.reload();
    // After reload, need to login again and navigate
    await enrollmentPage.goto();
    await enrollmentPage.expectStep(2);
  });

  test("should restore all draft data after completing through step 2", async ({ page }) => {
    await enrollmentPage.selectCategory("개발");
    await enrollmentPage.selectCourse("React 완벽 가이드");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await enrollmentPage.fillApplicantInfo({
      name: "박지성",
      email: "pjs@example.com",
      phone: "010-2222-2222",
      motivation: "React 개발자로 성장하고 싶습니다",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    const draft = await page.evaluate(() => sessionStorage.getItem("enrollment_draft"));
    expect(draft).not.toBeNull();
    const parsed = JSON.parse(draft!);
    expect(parsed.applicant.name).toBe("박지성");
    expect(parsed.applicant.email).toBe("pjs@example.com");
  });

  test("should clear draft data after successful submission", async ({ page }) => {
    await enrollmentPage.selectCategory("비즈니스");
    await enrollmentPage.selectCourse("스타트업 비즈니스 모델");
    await enrollmentPage.selectEnrollmentType("personal");
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(2);

    await enrollmentPage.fillApplicantInfo({
      name: "홍길동",
      email: "success@test.com",
      phone: "010-9999-9999",
    });
    await enrollmentPage.nextStep();
    await enrollmentPage.expectStep(3);

    await enrollmentPage.agreeToTerms();
    await enrollmentPage.submit();
    await enrollmentPage.expectSuccess();

    const draft = await page.evaluate(() => sessionStorage.getItem("enrollment_draft"));
    expect(draft).toBeNull();
  });
});
