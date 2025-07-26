import { create } from "zustand/react";
import { proxify, unproxify, type ProxifyOptions } from "../utils/proxify";
import { useEffect } from "react";
import { produce } from "immer";
import { v4 as uuid } from "uuid";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["jacket", "program"]);

export type ItemMeta = {
  parentId?: string;
  id: string;
  ephemeral?: boolean;
  callChain: string;
};
export type Item = { value: unknown };

export type ProgramItem = Item & ItemMeta;
export type Program = ProgramItem[];

export type ProgramStore = {
  program: Program;
  renderFunc: null | (() => void);
  evalProgram: (js: string, files: Record<string, string>) => Promise<void>;
  canvas: HTMLCanvasElement | null;
  context: GPUCanvasContext | null;
  setCanvas: (canvas: HTMLCanvasElement) => void;
};

export const useProgramStore = create<ProgramStore>((set, get) => ({
  program: [],
  renderFunc: null,
  evalProgram: async (js: string, files: Record<string, string>) => {
    logger.info`Reloading program after change...`;
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
    const addMaybe = (
      value: unknown,
      {
        id,
        parentId,
        callChain,
      }: { id: string; parentId?: string; callChain: string }
    ) => {
      set(({ program }) => ({
        program: produce((program: Program) => {
          const ephemeral = !isSetup;
          program.push({ ephemeral, id, parentId, value, callChain });
        })(program),
      }));
    };
    const clearEphemeral = () => {
      set(({ program }) => ({
        program: program.filter((item) => !item.ephemeral),
      }));
    };

    const proxifyOpts: Partial<
      ProxifyOptions<{ id: string; parentId?: string }>
    > = {
      functionExecCallback: (caller, args, func) => {
        return { value: func(...args.map(unproxify)) };
      },
      valueCallback: (caller, rawValue) => {
        if (typeof rawValue === "function" || rawValue instanceof Promise)
          return;
        const context = caller.getContext();
        const newCtx = { id: uuid(), parentId: context.id };
        addMaybe(rawValue, {
          ...newCtx,
          callChain: caller.toCallChainString(),
        });
        return {
          value: rawValue,
          context: newCtx,
        };
      },
      context: { id: uuid() },
    };
    const navProxy = proxify(navigator, proxifyOpts);
    const contextProxy = proxify(state.context!, proxifyOpts);
    const renderFunc = await module.program(navProxy, contextProxy, files);

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
