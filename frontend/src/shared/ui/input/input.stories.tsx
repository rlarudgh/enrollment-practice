import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "./input";

const meta = {
  title: "shared/ui/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "tel"],
    },
    disabled: {
      control: "boolean",
    },
    placeholder: {
      control: "text",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
    type: "text",
  },
};

export const Email: Story = {
  args: {
    type: "email",
    placeholder: "email@example.com",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Password",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Disabled input",
    value: "Cannot edit",
  },
};

export const WithValue: Story = {
  args: {
    value: "Hello World",
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input type="text" placeholder="Text input" />
      <Input type="email" placeholder="Email input" />
      <Input type="password" placeholder="Password input" />
      <Input type="number" placeholder="Number input" />
      <Input type="tel" placeholder="Phone input" />
    </div>
  ),
};
