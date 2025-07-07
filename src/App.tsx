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

const DEFAULT = "foo";

function App() {
  return (
    <div className="layout">
      <div className="box">
        <Canvas />
      </div>
      <div className="box">
        <ReactFlowProvider>
          <Overview />
        </ReactFlowProvider>
      </div>
      <div className="box small far subgrid">
        <Editor defaultText={DEFAULT} />
      </div>
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

interface GPUItemProps {
  name: string;
  attributes: AttributesSchema;
}
function GPUItem(props: GPUItemProps) {
  return (
    <div className="box subgrid">
      <div className="label">{props.name}</div>
      <div className="cluster">
        {Object.entries(props.attributes).map(([name, value]) => {
          let nodes = [];
          if (value instanceof Array) {
            nodes = value.map((item) => <div>{item.toString()}</div>);
          } else if (typeof value === "object") {
            return <GPUItem name={name} attributes={value} />;
          } else {
            nodes = [value?.toString()];
          }
          return (
            <div className="pill" key={name}>
              <div className="label">{name}</div>
              <div>{nodes}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
