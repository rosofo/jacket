// You can grab the text of other files like so. Note the `?raw` at the end.
// import exampleShader from "./exampleShader.wgsl?raw"

interface Params {
  navigator: Navigator;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  /**
   * A logger for sending messages to the UI log
   */
  logger: Record<
    "trace" | "debug" | "info" | "warn" | "error",
    (msg: string) => void
  >;
  /**
   * Contains the text of any other files in the folder given to Jacket
   *
   * More useful if you aren't using a bundler.
   */
  files: Record<string, string>;
}

/**
 * The entry point exposed to Jacket.
 * You typically put your one-time setup code here, and return a closure to draw/compute repeatedly.
 *
 * > It is important that you use the {@link Navigator} and {@link GPUCanvasContext} supplied in the params,
 * > rather than obtaining them by normal means. These objects are proxied in order to track execution.
 *
 * @param params Inputs to your program from Jacket
 * @returns A function called by Jacket repeatedly, once per frame
 *
 * ## Useful links
 * - https://webgpufundamentals.org/
 * - https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
 *
 * ## WebGPU diagrams
 * ### Draw Process
 * ![WebGPU draw diagram](./webgpu-draw-diagram.svg)
 * ### Compute Process
 * ![WebGPU simple compute diagram](./webgpu-simple-compute-diagram.svg)
 */
export async function program({
  navigator,
  canvas,
  context,
  files,
  logger,
}: Params) {
  const frame = async () => {};
  return frame;
}
