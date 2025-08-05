import { useCallback, useEffect, useRef } from "react";
import "./App.css";
import { useProgramStore, useRenderLoop } from "./hooks/program";
import Overview from "./visualization/overview";
import { ReactFlowProvider } from "@xyflow/react";
import Files from "./components/Files";
import LogPanel from "./components/LogPanel";
import { getLogger } from "@logtape/logtape";
import useSettingsStore from "./hooks/settings";
import Settings from "./components/Settings";
import { GiPauseButton, GiPlayButton } from "react-icons/gi";
import FeatureWarning from "./components/FeatureWarning";

const logger = getLogger(["jacket"]);

function App() {
  useEffect(() => {
    logger.info("jacket and shades, so cool.");
  }, []);
  return (
    <div>
      <div className="layout">
        <div className="box">
          <Controls />
          <Canvas />
        </div>
        <div className="box">
          <ReactFlowProvider>
            <Overview />
          </ReactFlowProvider>
        </div>

        <FilePanel />

        <LogPanel />
      </div>
      <Settings />
      <FeatureWarning />
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

function Controls() {
  const playing = useProgramStore((state) => state.playing);
  const setPlaying = useProgramStore((state) => state.setPlaying);

  const onClick = useCallback(
    () => setPlaying((playing) => !playing),
    [setPlaying]
  );
  return (
    <div>
      <button onClick={onClick}>
        {!playing ? <GiPlayButton /> : <GiPauseButton />}
      </button>
    </div>
  );
}

function FilePanel() {
  const filePanel = useSettingsStore((state) => state.enable.filePanel);
  return <div className="box small far scroll">{filePanel && <Files />}</div>;
}
