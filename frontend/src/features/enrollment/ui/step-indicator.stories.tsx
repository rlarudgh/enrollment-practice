import type { Meta, StoryObj } from "@storybook/react";

import { StepIndicator } from "./step-indicator.ui";

const meta = {
  title: "features/enrollment/StepIndicator",
  component: StepIndicator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    currentStep: {
      control: { type: "number", min: 1, max: 3 },
    },
  },
} satisfies Meta<typeof StepIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultArgs = {
  totalSteps: 3,
  stepLabels: ["강의 선택", "신청자 정보", "신청 완료"],
};

export const Step1: Story = {
  args: {
    ...defaultArgs,
    currentStep: 1,
  },
};

export const Step2: Story = {
  args: {
    ...defaultArgs,
    currentStep: 2,
  },
};

export const Step3: Story = {
  args: {
    ...defaultArgs,
    currentStep: 3,
  },
};

export const AllSteps = {
  render: () => (
    <div className="flex flex-col gap-8 w-full max-w-lg">
      <StepIndicator currentStep={1} totalSteps={3} stepLabels={["강의 선택", "신청자 정보", "신청 완료"]} />
      <StepIndicator currentStep={2} totalSteps={3} stepLabels={["강의 선택", "신청자 정보", "신청 완료"]} />
      <StepIndicator currentStep={3} totalSteps={3} stepLabels={["강의 선택", "신청자 정보", "신청 완료"]} />
    </div>
  ),
};
