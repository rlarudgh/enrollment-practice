import type { Meta, StoryObj } from "@storybook/react";

import { SuccessScreen } from "./success-screen.ui";

const mockCourse = {
  id: "1",
  title: "React 완벽 가이드",
  description: "React 19의 새로운 기능부터 고급 패턴까지 배우는 종합 과정입니다.",
  category: "development",
  price: 150000,
  maxCapacity: 30,
  currentEnrollment: 12,
  startDate: "2026-05-01T09:00:00",
  endDate: "2026-06-15T18:00:00",
  instructor: "김개발",
};

const mockFormData = {
  courseId: "1",
  type: "personal" as const,
  applicant: {
    name: "홍길동",
    email: "hong@example.com",
    phone: "010-1234-5678",
  },
  agreedToTerms: true,
};

const mockGroupFormData = {
  courseId: "1",
  type: "group" as const,
  applicant: {
    name: "홍길동",
    email: "hong@example.com",
    phone: "010-1234-5678",
  },
  group: {
    organizationName: "ABC 회사",
    headCount: 5,
    participants: [
      { name: "홍길동", email: "hong@example.com" },
      { name: "김철수", email: "kim@example.com" },
    ],
    contactPerson: "홍길동",
  },
  agreedToTerms: true,
};

const mockResponse = {
  enrollmentId: "ENR-20260427-001",
  status: "confirmed" as const,
  enrolledAt: "2026-04-27T10:30:00",
};

const meta = {
  title: "features/enrollment/SuccessScreen",
  component: SuccessScreen,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SuccessScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Personal: Story = {
  args: {
    response: mockResponse,
    formData: mockFormData,
    course: mockCourse,
    onReset: () => {},
  },
};

export const Group: Story = {
  args: {
    response: mockResponse,
    formData: mockGroupFormData,
    course: mockCourse,
    onReset: () => {},
  },
};

export const Pending: Story = {
  args: {
    response: {
      ...mockResponse,
      status: "pending" as const,
    },
    formData: mockFormData,
    course: mockCourse,
    onReset: () => {},
  },
};

export const WithoutCourse: Story = {
  args: {
    response: mockResponse,
    formData: mockFormData,
    course: null,
    onReset: () => {},
  },
};
