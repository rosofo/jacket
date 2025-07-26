import { useEffect, useRef, type ReactNode } from "react";
import "./App.css";
import {
  useProgramStore,
  useRenderLoop,
  type GPUType,
  type Program,
} from "./hooks/program";
import Editor from "./Editor";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import Overview from "./visualization/overview";
import { ReactFlowProvider } from "@xyflow/react";
import Files from "./components/Files";
import LogPanel from "./components/LogPanel";
import { getLogger } from "@logtape/logtape";
import usePulsar from "./hooks/pulsar";
import useSettingsStore from "./hooks/settings";
import Settings from "./components/Settings";

const logger = getLogger(["jacket"]);

function App() {
  useEffect(() => {
    logger.info("jacket and shades, so cool.");
  }, []);
  const settings = useSettingsStore();
  return (
    <div>
      <div className="layout">
        <div className="box">{settings.enable.canvasPanel && <Canvas />}</div>
        <div className="box">
          {settings.enable.graphPanel && (
            <ReactFlowProvider>
              <Overview />
            </ReactFlowProvider>
          )}
        </div>
        <div className="box small far scroll">
          {settings.enable.filePanel && <Files />}
        </div>
        {settings.enable.logPanel && <LogPanel />}
      </div>
      <Settings />
    </div>
  );
}

export default App;

function Canvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const setCanvas = useProgramStore((state) => state.setCanvas);
  useEffect(() => {
    setCanvas(ref.current!);
  });
  useRenderLoop();
  return (
    <div className="frame">
      <canvas ref={ref} className="primary"></canvas>
    </div>
  );
}
