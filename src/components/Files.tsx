import {
  GiTriangleTarget,
  GiAbstract086,
  GiEmptyChessboard,
  GiCrossedSwords,
  GiOpenFolder,
} from "react-icons/gi";

import { sortBy } from "es-toolkit";
import { useFiles } from "../hooks/files";
import React, { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useProgramStore } from "../hooks/program";
import { filterObject, pipe } from "rambda";
import DropArea from "./DropArea";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["jacket", "files"]);

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

const DEFAULT_JS = `/**
 * @param {Navigator} navigator
 * @param {GPUCanvasContext} context
 * @param {Record<string, string>} files
 */
export async function program(navigator, context, files) {
    const adapter = await navigator.gpu?.requestAdapter({
        featureLevel: 'compatibility',
    });
    const device = await adapter?.requestDevice();

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ 
      device,
      format: presentationFormat,
    });

    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: device.createShaderModule({
          code: files['vertex.wgsl'],
        }),
      },
      fragment: {
        module: device.createShaderModule({
          code: files['fragment.wgsl'],
        }),
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
    return () => {
       const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        clearValue: [0, 0, 0, 0], // Clear to transparent
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.draw(3);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
    }
}`;

export default function Files() {
  const { files, choose, create, path, status, setHandle } = useFiles();

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      for (const item of event.dataTransfer.items) {
        const handle = await item.getAsFileSystemHandle();
        if (handle === null) {
          logger.error`Couldn't use ${item.kind}.`;
          continue;
        }
        if (handle.kind === "file") {
          logger.error`Couldn't use individual file '${handle.name}'. Please choose a directory.`;
          continue;
        }
        setHandle(handle as FileSystemDirectoryHandle);
      }
    },
    [setHandle]
  );

  const missingJs = !("main.js" in files);
  const evalProgram = useProgramStore((state) => state.evalProgram);
  useEffect(() => {
    const js = files["main.js"];
    if (js !== undefined) {
      const rest = pipe(
        files,
        filterObject((v, k) => k !== "main.js")
      );
      evalProgram(js, rest);
    }
  }, [files, evalProgram]);

  let statusEl: ReactNode;
  switch (status) {
    case "no-access":
      statusEl = (
        <div>
          <GiCrossedSwords
            data-status="no-access"
            className="icon double-flash"
          />
          <div className="dot"></div>
        </div>
      );
      break;
    case "loaded":
      statusEl = (
        <GiTriangleTarget className="icon fade" data-status="loaded" />
      );
      break;
    case "loading":
      statusEl = <GiAbstract086 className="spin icon" data-status="loading" />;
      break;
    case "reloading":
      statusEl = <GiTriangleTarget data-status="refetching" className="icon" />;
      break;
    default:
      statusEl = <GiEmptyChessboard data-status="inactive" className="icon" />;
  }

  return (
    <div className="stack">
      <div className="cluster box small">
        <div className="stack">
          <h2>&nbsp;</h2>
          <div className="cluster">
            <DropArea
              fallback={<div>Drop Folder / Choose</div>}
              item={path ? { name: path, icon: <GiOpenFolder /> } : undefined}
              onDrop={onDrop}
              onClick={choose}
            />
            {statusEl}
            {missingJs && <div>missing: main.js</div>}
          </div>
        </div>
        <div className="stack">
          <h2>Add Templates</h2>
          <div className="cluster">
            <button
              disabled={!path}
              onClick={() => create("main.js", DEFAULT_JS)}
            >
              main.js
            </button>
            <button
              disabled={!path}
              onClick={() => create("vertex.wgsl", DEFAULT_VERTEX)}
            >
              vertex.wgsl
            </button>
            <button
              disabled={!path}
              onClick={() => create("fragment.wgsl", DEFAULT_FRAGMENT)}
            >
              fragment.wgsl
            </button>
          </div>
        </div>
      </div>
      <div aria-label="status" className="scroll">
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
