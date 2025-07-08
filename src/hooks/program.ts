import { create } from "zustand/react";
import { proxify, unproxify, type ProxifyOptions } from "../utils/proxify";
import { useEffect } from "react";
import { produce } from "immer";
import { v4 as uuid } from "uuid";
import { groupBy, pipe } from "rambda";

type Value =
  | GPUBuffer
  | GPUDevice
  | GPUAdapter
  | GPURenderPassEncoder
  | GPURenderPipeline
  | GPUCommandEncoder
  | GPUPipelineLayout
  | GPUBindGroup
  | GPUBindGroupLayout;
type ValueTypeName<T extends { __brand: string }> =
  T["__brand"] extends `GPU${infer Name}` ? Name : never;
export type ItemMeta = { parentId?: string; id: string; ephemeral?: boolean };
export type _Item<V = Value> = V extends Value
  ? { type: ValueTypeName<V>; value: V }
  : never;
export type Item = _Item;
export type ProgramItem = Item & ItemMeta;
export type Program = ProgramItem[];

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
    set({ program: [] });
    const blob = new Blob([js], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const module = await import(
      /* @vite-ignore */
      url
    );
    URL.revokeObjectURL(url);
    const state = get();

    let isSetup = true;
    const ids = {};
    const addMaybe = (result: object) => {
      set(({ program }) => ({
        program: produce((program: Program) => {
          const ephemeral = !isSetup;
          const id = uuid();
          if (result instanceof GPUBuffer) {
            program.push({ type: "Buffer", value: result, ephemeral, id });
          } else if (result instanceof GPUAdapter) {
            program.push({ type: "Adapter", value: result, id });
            ids.adapter = id;
          } else if (result instanceof GPUDevice) {
            program.push({
              type: "Device",
              value: result,
              id,
              parentId: ids.adapter,
            });
            ids.device = id;
          } else if (result instanceof GPURenderPassEncoder) {
            program.push({
              type: "RenderPassEncoder",
              value: result,
              id,
              ephemeral,
              parentId: ids.device,
            });
          }
        })(program),
      }));
    };
    const clearEphemeral = () => {
      set(({ program }) => ({
        program: program.filter((item) => !item.ephemeral),
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
