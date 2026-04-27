import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "shared/ui/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content of the card.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const Small: Story = {
  render: () => (
    <Card size="sm" className="w-72">
      <CardHeader>
        <CardTitle>Small Card</CardTitle>
        <CardDescription>Compact card variant</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Smaller padding and gaps.</p>
      </CardContent>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Notification</CardTitle>
        <CardDescription>You have 3 unread messages</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Mark all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Check your inbox for the latest updates.</p>
      </CardContent>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent>
        <p>A simple card with only content, no header or footer.</p>
      </CardContent>
    </Card>
  ),
};
