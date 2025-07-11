import {
  GiTriangleTarget,
  GiAbstract086,
  GiEmptyChessboard,
  GiCrossedSwords,
} from "react-icons/gi";

import { sortBy } from "es-toolkit";
import { useFiles } from "../hooks/files";
import type { IconType } from "react-icons/lib";
import { useEffect, useMemo, type ReactNode } from "react";
import { useProgramStore } from "../hooks/program";
const DEFAULT_VERTEX = `@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2(0.0, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5)
  );

  return vec4f(pos[VertexIndex], 0.0, 1.0);
}`;
const DEFAULT_FRAGMENT = `@fragment
fn main() -> @location(0) vec4f {
  return vec4(1.0, 0.0, 0.0, 1.0);
}`;

export default function Files() {
  const { files, choose, create, path, status } = useFiles();
  // const evalProgram = useProgramStore(state => state.evalProgram)
  // useEffect(() => {}, [files['vertex.wgsl']])

  let statusEl: ReactNode;
  switch (status) {
    case "no-access":
      statusEl = (
        <GiCrossedSwords
          data-status="no-access"
          className="icon double-flash"
        />
      );
      break;
    case "loaded":
      statusEl = (
        <GiTriangleTarget className="icon fade" data-status="loaded" />
      );
      break;
    case "loading":
      if (Object.keys(files).length > 0) {
        statusEl = (
          <GiTriangleTarget data-status="refetching" className="icon" />
        );
      } else {
        statusEl = (
          <GiAbstract086 className="spin icon" data-status="loading" />
        );
      }
      break;
    default:
      statusEl = <GiEmptyChessboard data-status="inactive" className="icon" />;
  }

  return (
    <div>
      <div className="cluster box small">
        <div className="stack">
          <h2>&nbsp;</h2>
          <div className="cluster">
            <button onClick={choose}>
              {status === null ? "Choose Directory" : `path: ${path}`}
            </button>
            {statusEl}
          </div>
        </div>
        <div className="stack">
          <h2>Add Templates</h2>
          <div className="cluster">
            <button
              disabled={!path}
              onClick={() => create("vertex.wgsl", DEFAULT_VERTEX)}
            >
              Vertex
            </button>
            <button
              disabled={!path}
              onClick={() => create("fragment.wgsl", DEFAULT_FRAGMENT)}
            >
              Fragment
            </button>
          </div>
        </div>
      </div>
      <div aria-label="status">
        {sortBy(Object.entries(files), [([k]) => k]).map(([name, text]) => {
          return (
            <div key={name}>
              <h3>{name}</h3>
              <pre>{text}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
