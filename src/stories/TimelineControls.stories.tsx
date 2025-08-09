import "../resources";
import type { Meta, StoryObj } from "@storybook/react-vite";
import TimelineControls from "../components/TimelineControls";

const meta = {
  component: TimelineControls,
  argTypes: {
    position: { control: { type: "range", min: 0, max: 1, step: 0.001 } },
  },
} satisfies Meta<typeof TimelineControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { duration: 10, position: 0.4, frames: 600, frame: 66, playing: true },
};
