import {
  getContext,
  proxify,
  unproxify,
  type ProxifyOptions,
} from "../utils/proxify";
import { useEffect } from "react";
import { getLogger } from "@logtape/logtape";
import {
  parsePositionFromStacktrace,
  translateError,
} from "../utils/sourcemap";
import { genId } from "../utils/id";
import { useShallow } from "zustand/react/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import isDeepEqual from "react-fast-compare";

const logger = getLogger(["jacket", "program"]);

type ItemMeta = {
  parentId?: string;
  dependencies?: { id: string; untrackedValue?: unknown }[];
  id: string;
  ephemeral?: boolean;
  callChain?: string;
};
type Item = { value: unknown };

export type ProgramItem = Item & ItemMeta;
export type Program = ProgramItem[];

type ProgramStore = {
  program: Program;
  renderFunc: null | (() => void);
  evalProgram: (js: string, files: Record<string, string>) => Promise<void>;
  canvas: HTMLCanvasElement | null;
  context: GPUCanvasContext | null;
  setCanvas: (canvas: HTMLCanvasElement) => void;
  playing: boolean;
  setPlaying: (fn: (current: boolean) => boolean) => void;
};

export const useProgramStore = createWithEqualityFn<ProgramStore>(
  (set, get) => ({
    program: [],
    renderFunc: null,
    playing: true,
    setPlaying: (fn) => {
      set((state) => ({ playing: fn(state.playing) }));
    },
    evalProgram: async (js: string, files: Record<string, string>) => {
      logger.info`Reloading program after change...`;
      set({ program: [] });
      const module = await compileModule(js);
      const state = get();

      let isSetup = true;
      const addMaybe = (
        value: unknown,
        { id, parentId, dependencies, callChain }: ProgramItemContext
      ) => {
        set(({ program }) => {
          const ephemeral = !isSetup;
          return {
            program: [
              ...program,
              {
                ephemeral,
                id,
                parentId,
                value,
                callChain,
                dependencies,
              },
            ],
          };
        });
      };
      const clearEphemeral = () => {
        set(({ program }) => ({
          program: program.filter((item) => !item.ephemeral),
        }));
      };

      const proxifyOpts: Partial<
        ProxifyOptions<{ id: string; parentId?: string }>
      > = createProxifyOpts(addMaybe);
      const navProxy = proxify(navigator, proxifyOpts);
      const contextProxy = proxify(state.context!, proxifyOpts);
      let renderFunc;
      const userLogger = getLogger(["jacket", "user"]);
      try {
        renderFunc = await module.program({
          navigator: navProxy,
          context: contextProxy,
          canvas: state.canvas,
          files,
          logger: userLogger,
        });
      } catch (error) {
        const { filepath, line, column, err } = translateError(error, files);

        userLogger.error(
          `${filepath || ""} ${line}:${column}: [${err.name}] ${err.message}`
        );
        throw error;
      }

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
  }),
  (a, b) => {
    if (a instanceof Array) {
      // the `program` array is recreated every frame, so we do this to prevent unnecessary rerenders
      return isDeepEqual(a, b);
    } else {
      return Object.is(a, b);
    }
  }
);

type ProgramItemContext = Pick<
  ProgramItem,
  "id" | "parentId" | "dependencies" | "callChain"
> & {
  prevArgs?: unknown[];
};

export function createProxifyOpts(
  addMaybe: (value: unknown, ctx: ProgramItemContext) => void
): Partial<ProxifyOptions<ProgramItemContext>> {
  function genValueId(rawValue: unknown, parentId: string) {
    const trace = captureTrace();
    const position = parsePositionFromStacktrace(trace.stack);
    const id = genId(
      String(rawValue) + `${position?.line}:${position?.column}`,
      parentId
    );
    return id;
  }
  return {
    matchers: [
      {
        functionExecCallback: [
          (caller, args, func) => {
            return caller.toCallChainString().endsWith(".getMappedRange.()");
          },
          (caller, args, func) => {
            return { returnRaw: true };
          },
        ],
        fallthrough: false,
      },
      // {
      //   functionExecCallback: [
      //     (caller, args, func) =>
      //       caller.toCallChainString().endsWith(".configure.()"),
      //     (caller, args, func) => {
      //       return { value: func(...args.map(unproxify)) };
      //     },
      //   ],
      //   fallthrough: false,
      // },
    ],
    functionExecCallback: (caller, args, func) => {
      const ctx = caller.getContext() as ProgramItemContext;

      return {
        value: func(...args),
        context: { ...ctx, prevArgs: args },
      };
    },
    valueCallback: (caller, rawValue) => {
      if (typeof rawValue === "function" || rawValue instanceof Promise) return;
      const context = caller.getContext();
      const parentId = (context as { id: string }).id;

      const id = genValueId(rawValue, parentId);
      const deps = context.prevArgs
        ?.map((value) => {
          const argCtx = getContext(value) as ProgramItemContext | undefined;
          if (argCtx?.id !== undefined) {
            return { id: argCtx.id };
          } else if (typeof value === "object" && value !== null) {
            const argId = genValueId(value, "");
            return { id: argId, untrackedValue: unproxify(value) };
          }
        })
        .filter((value) => value !== undefined);
      const newCtx = {
        id,
        parentId,
        dependencies: deps,
      };
      addMaybe(rawValue, {
        ...newCtx,
        callChain: caller.toCallChainString(),
      });
      return {
        value: rawValue,
        context: newCtx,
      };
    },
    context: { id: "" },
  };
}

export async function compileModule(js: string) {
  const blob = new Blob([js], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const module = await import(
    /* @vite-ignore */
    url
  );
  URL.revokeObjectURL(url);
  return module;
}

export function useRenderLoop() {
  const renderFunc = useProgramStore(useShallow((state) => state.renderFunc));
  const playing = useProgramStore(useShallow((state) => state.playing));

  useEffect(() => {
    if (playing && renderFunc !== null) {
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
  }, [renderFunc, playing]);
}

function captureTrace() {
  const trace = {} as { stack: string };
  Error.captureStackTrace(trace);
  return trace;
}
