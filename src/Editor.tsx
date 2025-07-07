import { useEffect, useLayoutEffect, useRef } from "react";
import { useProgramStore } from "./hooks/program";
import { useAsyncDebouncer } from "@tanstack/react-pacer";
import MonacoEditor, { type MonacoEditorProps } from "react-monaco-editor";
import gpuTypes from "@webgpu/types/dist/index.d.ts?raw";

const JS = `/**
 * @param {Navigator} navigator
 * @param {GPUCanvasContext} context
 * @param {string} vertex
 * @param {string} frag
 */
export async function program(navigator, context, vertex, frag) {
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
          code: vertex,
        }),
      },
      fragment: {
        module: device.createShaderModule({
          code: frag,
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

const VERTEX_SHADER = `@vertex
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

const FRAG_SHADER = `@fragment
fn main() -> @location(0) vec4f {
  return vec4(1.0, 0.0, 0.0, 1.0);
}`;

export default function Editor({
  onChange,
  defaultText,
}: {
  defaultText?: string;
  onChange?: (text: string | undefined) => void;
}) {
  const evalProgram = useProgramStore((state) => state.evalProgram);
  const { maybeExecute: evalProgramMaybe } = useAsyncDebouncer(evalProgram, {
    wait: 500,
  });

  const texts = useRef({
    js: JS,
    vertex_wgsl: VERTEX_SHADER,
    frag_wgsl: FRAG_SHADER,
  });
  const commonOptions: Partial<MonacoEditorProps["options"]> = {
    automaticLayout: true,
    minimap: { enabled: false },
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 2,
    showFoldingControls: "never",
  };

  return (
    <div className="editor ">
      <MonacoEditor
        theme="vs-dark"
        className="monaco-inner"
        onChange={(text) => {
          texts.current.js = text;
          evalProgramMaybe(
            texts.current.js,
            texts.current.vertex_wgsl,
            texts.current.frag_wgsl
          );
        }}
        defaultValue={JS}
        language="javascript"
        editorWillMount={(monaco) => {
          monaco.languages.typescript.javascriptDefaults.addExtraLib(gpuTypes);
        }}
        options={{
          language: "javascript",
          ...commonOptions,
        }}
      />
      <MonacoEditor
        theme="vs-dark"
        className="monaco-inner"
        onChange={(text) => {
          texts.current.vertex_wgsl = text;
          evalProgramMaybe(
            texts.current.js,
            texts.current.vertex_wgsl,
            texts.current.frag_wgsl
          );
        }}
        language="wgsl"
        defaultValue={VERTEX_SHADER}
        options={{
          ...commonOptions,
        }}
      />
      <MonacoEditor
        theme="vs-dark"
        className="monaco-inner"
        onChange={(text) => {
          texts.current.frag_wgsl = text;
          evalProgramMaybe(
            texts.current.js,
            texts.current.vertex_wgsl,
            texts.current.frag_wgsl
          );
        }}
        language="wgsl"
        defaultValue={FRAG_SHADER}
        options={{
          ...commonOptions,
        }}
      />
    </div>
  );
}
