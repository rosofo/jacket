import {
  useEffect,
  useLayoutEffect,
  useRef,
  type PropsWithoutRef,
  type RefObject,
} from "react";
import { useProgramStore } from "./hooks/program";
import { useAsyncDebouncer } from "@tanstack/react-pacer";
import MonacoEditor, { type MonacoEditorProps } from "react-monaco-editor";
import gpuTypes from "@webgpu/types/dist/index.d.ts?raw";
import { Tabs } from "./components/Tabs";
import type { editor } from "monaco-editor";

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

  const editors = useRef<editor.IStandaloneCodeEditor[]>([]);

  return (
    <Tabs
      className="editor"
      onTabChange={() => {
        editors.current.forEach((editor) => editor.layout());
      }}
    >
      <div>
        <AutoResizeEditor
          onChange={(text) => {
            texts.current.js = text;
            evalProgramMaybe(
              texts.current.js,
              texts.current.vertex_wgsl,
              texts.current.frag_wgsl
            );
          }}
          editorDidMount={(editor) => {
            editors.current.push(editor);
          }}
          defaultValue={JS}
          language="javascript"
          editorWillMount={(monaco) => {
            monaco.languages.typescript.javascriptDefaults.addExtraLib(
              gpuTypes
            );
          }}
        />
        <AutoResizeEditor
          onChange={(text) => {
            texts.current.vertex_wgsl = text;
            evalProgramMaybe(
              texts.current.js,
              texts.current.vertex_wgsl,
              texts.current.frag_wgsl
            );
          }}
          editorDidMount={(editor) => {
            editors.current.push(editor);
          }}
          language="wgsl"
          defaultValue={VERTEX_SHADER}
        />
        <AutoResizeEditor
          onChange={(text) => {
            texts.current.frag_wgsl = text;
            evalProgramMaybe(
              texts.current.js,
              texts.current.vertex_wgsl,
              texts.current.frag_wgsl
            );
          }}
          editorDidMount={(editor) => {
            editors.current.push(editor);
          }}
          language="wgsl"
          defaultValue={FRAG_SHADER}
        />
      </div>
    </Tabs>
  );
}

function useEditorResize(): [
  RefObject<editor.IStandaloneCodeEditor | null>,
  RefObject<HTMLDivElement | null>,
] {
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries, observer) => {
      editorRef.current?.layout();
    });
    observer.observe(containerRef.current!);
    return () => {
      observer.disconnect();
    };
  });
  return [editorRef, containerRef];
}

export function AutoResizeEditor({
  editorDidMount,
  options,
  ...props
}: Omit<MonacoEditorProps, "theme" | "className">) {
  const commonOptions: Partial<MonacoEditorProps["options"]> = {
    minimap: { enabled: false },
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 2,
    showFoldingControls: "never",
  };

  const [editorRef, containerRef] = useEditorResize();
  return (
    <Tabs.Tab ref={containerRef}>
      <MonacoEditor
        theme="vs-dark"
        className="monaco-inner"
        editorDidMount={(editor, monaco) => {
          editorRef.current = editor;
          if (editorDidMount !== undefined) editorDidMount(editor, monaco);
        }}
        options={{
          ...commonOptions,
          ...options,
        }}
        {...props}
      />
    </Tabs.Tab>
  );
}
