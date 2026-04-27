import type { Locator, Page } from "@playwright/test";
import { login } from "./auth";

export interface ApplicantData {
  name: string;
  email: string;
  phone: string;
  motivation?: string;
}

export interface GroupData {
  organizationName: string;
  headCount: number;
  contactPerson: string;
  participants: Array<{ name: string; email: string }>;
}

export class EnrollmentPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await login(this.page);
  }

  // --- Step 1: Course Selection ---

  async selectCategory(category: string) {
    await this.page.getByRole("button", { name: category, exact: true }).click();
    // Wait for course list to load
    await this.page.waitForTimeout(500);
  }

  async selectCourse(courseTitle: string) {
    // The card title is inside a div with data-slot="card-title"
    // Click on the title text directly - it's within the card so the click propagates
    const titleEl = this.page.locator('[data-slot="card-title"]', { hasText: courseTitle }).first();
    await titleEl.waitFor({ state: "visible", timeout: 10000 });
    await titleEl.click();
  }

  async selectEnrollmentType(type: "personal" | "group") {
    // Click the text label which toggles the radio
    const label = type === "personal" ? "개인 신청" : "단체 신청";
    await this.page.getByText(label, { exact: true }).click();
  }

  // --- Step 2: Applicant Info ---

  async fillApplicantInfo(data: ApplicantData) {
    await this.page.getByPlaceholder("홍길동").fill(data.name);
    await this.page.getByPlaceholder("example@email.com").fill(data.email);
    await this.page.getByPlaceholder("010-1234-5678").fill(data.phone);
    if (data.motivation) {
      await this.page.getByPlaceholder(/수강을 결정하게 된 동기/).fill(data.motivation);
    }
  }

  async fillGroupInfo(data: GroupData) {
    await this.page.getByPlaceholder("회사명 또는 단체명").fill(data.organizationName);
    await this.page.getByPlaceholder("담당자 전화번호").fill(data.contactPerson);

    // Only set head count if different from default (2)
    if (data.headCount !== 2) {
      const headCountInput = this.page.locator('input[type="number"]');
      await headCountInput.evaluate((el: HTMLInputElement, value: number) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        setter?.call(el, String(value));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, data.headCount);
      await this.page.waitForTimeout(1500);
    }

    // Fill participants using placeholder text (Base UI renders duplicate inputs per field)
    for (let i = 0; i < data.participants.length; i++) {
      const p = data.participants[i];
      await this.page
        .getByPlaceholder(`참가자 ${i + 1} 이름`)
        .first()
        .fill(p.name);
      await this.page
        .getByPlaceholder(`참가자 ${i + 1} 이메일`)
        .first()
        .fill(p.email);
    }
  }

  // --- Step 3: Review & Submit ---

  async agreeToTerms() {
    await this.page.getByRole("checkbox", { name: "이용약관에 동의합니다" }).click();
  }

  async submit() {
    await this.page.getByRole("button", { name: /신청하기/ }).click();
  }

  // --- Navigation ---

  async nextStep() {
    await this.page.getByRole("button", { name: "다음 단계" }).click();
  }

  async prevStep() {
    await this.page.getByRole("button", { name: "이전 단계" }).click();
  }

  // --- Assertions ---

  async expectStep(step: number) {
    const stepLabels = ["강의 선택", "정보 입력", "확인 및 제출"];
    await this.page
      .getByText(stepLabels[step - 1])
      .first()
      .waitFor();
  }

  async expectSuccess() {
    await this.page.getByText("수강 신청이 완료되었습니다!").waitFor();
  }

  async getEnrollmentId(): Promise<string> {
    const idElement = this.page.locator("span.font-mono");
    return idElement.innerText();
  }

  async expectError(message: string) {
    await this.page.getByText(message).waitFor();
  }

  // --- Locators ---

  getSubmitButton(): Locator {
    return this.page.getByRole("button", { name: /신청하기|제출 중/ });
  }

  getNextButton(): Locator {
    return this.page.getByRole("button", { name: "다음 단계" });
  }
}
