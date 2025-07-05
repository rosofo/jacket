import { useEffect, useRef, type ReactNode } from "react";
import "./App.css";
import { useProgramStore, type GPUType, type Program } from "./hooks/program";
import Editor from "./Editor";
import { z } from "zod/v4";

const DEFAULT = "foo";

function App() {
  return (
    <div className="layout">
      <div className="box">
        <Canvas />
      </div>
      <div className="box">
        <div className="grid">
          <Items />
        </div>
      </div>
      <div className="box subgrid">
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
  return (
    <div className="frame">
      <canvas ref={ref} className="primary"></canvas>
    </div>
  );
}

interface GPUItemProps {
  name: string;
  attributes: Record<string, ReactNode>;
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

function Items() {
  const program = useProgramStore((state) => state.program);
  return (
    <>
      {program.map((value, i) => (
        <GPUItem
          key={i}
          name={value.label || value.constructor.name.replace("GPU", "")}
          attributes={attributesOf(value)}
        />
      ))}
    </>
  );
}

const AttributesSchema = z.lazy(() =>
  z.preprocess(
    (value) => {
      const entries = [];
      for (const k in value) {
        entries.push([k, value[k]]);
      }
      return Object.fromEntries(entries);
    },
    z
      .record(
        z.string(),
        z
          .union([
            z.string(),
            z.number(),
            z.array(z.union([z.string(), z.number()])),
            z.null(),
          ])
          .catch(null)
      )
      .transform((attrs) =>
        Object.fromEntries(
          Object.entries(attrs).map(([k, v]) =>
            k === "usage" ? [k, toUsages(v).join(" | ")] : [k, v]
          )
        )
      )
      .transform((attrs) =>
        Object.fromEntries(
          Object.entries(attrs).filter(
            ([k, v]) => v !== null && v !== undefined
          )
        )
      )
  )
);
type Attributes = z.infer<typeof AttributesSchema>;
function attributesOf(value: Program[0]) {
  return AttributesSchema.parse(value);
}

function toUsages(value: number): (keyof GPUBufferUsage)[] {
  const usages: (keyof GPUBufferUsage)[] = [];
  for (const usage in GPUBufferUsage) {
    const cmp = value & GPUBufferUsage[usage as keyof GPUBufferUsage];
    if (cmp > 0) {
      usages.push(usage as keyof GPUBufferUsage);
    }
  }
  return usages;
}
