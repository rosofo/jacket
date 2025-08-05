import type { Meta, StoryObj } from "@storybook/react-vite";
import main from "./main.js?raw";
import "../index.css";
import "@xyflow/react/dist/style.css";

import { useStaticFiles } from "../hooks/files";
import App from "../App";

function Repro() {
  useStaticFiles({ ["main.js"]: main });
  return <App />;
}

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Repro/Jitter",
  component: Repro,
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Repro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: {} };
