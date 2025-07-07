import { create } from "zustand/react";
import { proxify, unproxify, type ProxifyOptions } from "../utils/proxify";
import { useEffect } from "react";
import { produce } from "immer";

export type ProgramItem<T extends [string, object] | [string, object, object]> =
  {
    type: T[0];
    value: T[1];
    ephemeral?: boolean;
  } & (T[3] | object);
export type Program = {
  setup: ProgramItem<["device", GPUDevice] | ["adapter", GPUAdapter]>[];
  buffers: ProgramItem<["buffer", GPUBuffer]>[];
  pass: ProgramItem<["encoder", GPURenderPassEncoder | GPUCommandEncoder]>[];
};
export type ProgramStore = {
  program: Program;
  renderFunc: null | (() => void);
  evalProgram: (
    js: string,
    vertex_wgsl: string,
    frag_wgsl: string
  ) => Promise<void>;
  canvas: HTMLCanvasElement | null;
  context: GPUCanvasContext | null;
  setCanvas: (canvas: HTMLCanvasElement) => void;
};

export const useProgramStore = create<ProgramStore>((set, get) => ({
  program: { buffers: [], setup: [], pass: [] },
  renderFunc: null,
  evalProgram: async (js: string, vertex_wgsl: string, frag_wgsl: string) => {
    set({ program: { buffers: [], setup: [], pass: [] } });
    const blob = new Blob([js], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const module = await import(
      /* @vite-ignore */
      url
    );
    URL.revokeObjectURL(url);
    const state = get();

    let isSetup = true;
    const addMaybe = (result: object) => {
      set(({ program }) => ({
        program: produce((program: Program) => {
          const ephemeral = !isSetup;
          if (result instanceof GPUBuffer) {
            program.buffers.push({ type: "buffer", value: result, ephemeral });
          } else if (result instanceof GPUAdapter) {
            program.setup.push({ type: "adapter", value: result });
          } else if (result instanceof GPUDevice) {
            program.setup.push({ type: "device", value: result });
          } else if (result instanceof GPURenderPassEncoder) {
            program.pass.push({ type: "encoder", value: result, ephemeral });
          }
        })(program),
      }));
    };
    const clearEphemeral = () => {
      set(({ program }) => ({
        program: produce((program: Program) => {
          program.buffers = program.buffers.filter((buf) => !buf.ephemeral);
          program.setup = program.setup.filter((s) => !s.ephemeral);
          program.pass = program.pass.filter((s) => !s.ephemeral);
        })(program),
      }));
    };

    const proxifyOpts: Partial<ProxifyOptions> = {
      functionExecCallback: (caller, args, rawFunc) => {
        const unproxifiedArgs = args.map(unproxify);
        const result = rawFunc(...unproxifiedArgs);

        if (result instanceof Promise) {
          result.then(addMaybe);
        } else {
          addMaybe(result);
        }
        return { value: result };
      },
    };
    const navProxy = proxify(navigator, proxifyOpts);
    const contextProxy = proxify(state.context!, proxifyOpts);
    const renderFunc = await module.program(
      navProxy,
      contextProxy,
      vertex_wgsl,
      frag_wgsl
    );

    isSetup = false;
    if (typeof renderFunc === "function") {
      set({
        renderFunc: () => {
          clearEphemeral();
          renderFunc();
        },
      });
    } else {
      set({ renderFunc: null });
    }
  },
  canvas: null,
  context: null,
  setCanvas: (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("webgpu");
    set({ canvas, context });
  },
}));

export function useRenderLoop() {
  const renderFunc = useProgramStore((state) => state.renderFunc);
  useEffect(() => {
    if (renderFunc !== null) {
      let cancelled = false;
      const animate = () => {
        renderFunc();
        if (!cancelled) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);

      return () => {
        cancelled = true;
      };
    }
  });
}
