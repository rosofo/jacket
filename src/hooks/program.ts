import { create } from "zustand/react";
import { devtools } from "zustand/middleware";
import { proxify, unproxify, type ProxifyOptions } from "../utils/proxify";
import { act, useEffect } from "react";
import { produce } from "immer";

export type Program = { type: string; value: object }[];
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
  program: [],
  renderFunc: null,
  evalProgram: async (js: string, vertex_wgsl: string, frag_wgsl: string) => {
    const blob = new Blob([js], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const module = await import(
      /* @vite-ignore */
      url
    );
    URL.revokeObjectURL(url);
    const state = get();

    const addMaybe = (result: object) => {
      if (result instanceof GPUDevice) {
        set(({ program }) => ({
          program: produce((program) => {
            program.push({ type: "device", value: result });
          })(program),
        }));
      } else if (result instanceof GPUAdapter) {
        set(({ program }) => ({
          program: produce((program) => {
            program.push({ type: "adapter", value: result });
          })(program),
        }));
      } else if (result instanceof GPURenderPassEncoder) {
        set(({ program }) => ({
          program: produce((program) => {
            program.push({ type: "encoder", value: result });
          })(program),
        }));
      }
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
    if (typeof renderFunc === "function") {
      set({ renderFunc });
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
