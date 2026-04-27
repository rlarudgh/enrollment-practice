import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";

const meta = {
  title: "shared/ui/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components to your app using the cli.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-96">
      <AlertCircle className="size-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
    </Alert>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Alert className="w-96">
      <AlertCircle className="size-4" />
      <AlertTitle>Note</AlertTitle>
      <AlertDescription>This action cannot be undone.</AlertDescription>
    </Alert>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription>A new version is available for download.</AlertDescription>
      <AlertAction>
        <button
          type="button"
          className="text-xs font-medium underline underline-offset-4 hover:text-foreground"
        >
          Update
        </button>
      </AlertAction>
    </Alert>
  ),
};
