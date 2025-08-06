import "../resources";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Overview from "../visualization/overview";
import Files from "../components/Files";
import { useStaticFiles } from "../hooks/files";
import threejsMain from "./assets/threejs.main.js?raw";
import { Canvas } from "../App";

function Graph({ files }: { files: Record<string, string> }) {
  useStaticFiles(files);
  return (
    <div>
      <div style={{ width: 640, height: 480 }}>
        <Overview />
      </div>
      <div style={{ display: "none" }}>
        <Files />
        <Canvas />
      </div>
    </div>
  );
}

const meta = {
  component: Graph,
} satisfies Meta<typeof Graph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FastChanges: Story = {
  args: {
    files: { ["main.js"]: threejsMain },
  },
};
