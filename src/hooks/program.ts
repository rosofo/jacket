import { create } from "zustand/react";

export type Program = (
  | GPUBuffer
  | GPUBindGroup
  | GPUBindGroupLayout
  | GPUCommandEncoder
  | GPUPipelineLayout
  | GPURenderPipeline
)[];
export type ProgramStore = {
  program: Program;
  evalProgram: (text: string) => Promise<void>;
  canvas: HTMLCanvasElement | null;
  context: GPUCanvasContext | null;
  setCanvas: (canvas: HTMLCanvasElement) => void;
};
export const useProgramStore = create<ProgramStore>((set, get) => ({
  program: [],
  evalProgram: async (text: string) => {
    const blob = new Blob([text], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const module = await import(
      /* @vite-ignore */
      url
    );
    URL.revokeObjectURL(url);
    const state = get();
    const program = await module.program(state.canvas);
    set({
      program,
    });
  },
  canvas: null,
  context: null,
  setCanvas: (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("webgpu");
    set({ canvas, context });
  },
}));
