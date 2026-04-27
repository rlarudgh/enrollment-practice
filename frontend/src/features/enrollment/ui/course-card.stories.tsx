import type { Meta, StoryObj } from "@storybook/react";

import { CourseCard } from "./course-card.ui";

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
  thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=200&fit=crop",
};

const almostFullCourse = {
  ...mockCourse,
  id: "2",
  title: "UI/UX 디자인 심화",
  currentEnrollment: 26,
  category: "design",
};

const fullCourse = {
  ...mockCourse,
  id: "3",
  title: "마케팅 데이터 분석",
  currentEnrollment: 30,
  category: "marketing",
};

const meta = {
  title: "features/enrollment/CourseCard",
  component: CourseCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isSelected: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof CourseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    course: mockCourse,
    isSelected: false,
    onSelect: () => {},
  },
};

export const Selected: Story = {
  args: {
    course: mockCourse,
    isSelected: true,
    onSelect: () => {},
  },
};

export const AlmostFull: Story = {
  args: {
    course: almostFullCourse,
    isSelected: false,
    onSelect: () => {},
  },
};

export const Full: Story = {
  args: {
    course: fullCourse,
    isSelected: false,
    onSelect: () => {},
  },
};

export const NoThumbnail: Story = {
  args: {
    course: {
      ...mockCourse,
      thumbnail: undefined,
    },
    isSelected: false,
    onSelect: () => {},
  },
};

export const Grid = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
      <CourseCard course={mockCourse} isSelected={false} onSelect={() => {}} />
      <CourseCard course={almostFullCourse} isSelected={false} onSelect={() => {}} />
      <CourseCard course={fullCourse} isSelected={true} onSelect={() => {}} />
    </div>
  ),
};
