export async function program({
  navigator,
  canvas,
  context,
}: {
  navigator: Navigator;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  logger: Record<string, (msg: string) => void>;
  files: Record<string, string>;
}) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  context.configure({
    device: device!,
    format: navigator.gpu.getPreferredCanvasFormat(),
  });
  const layout = device?.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT }],
    label: "bindgrouplayout",
  });
  const buffer = device!.createBuffer({
    size: 100,
    mappedAtCreation: true,
    usage: GPUBufferUsage.UNIFORM,
  });
  const texture = device?.createTexture({
    format: "bgra8unorm",
    size: { width: 100, height: 100 },
    usage: GPUTextureUsage.STORAGE_BINDING,
  });
  const bindgroup = device?.createBindGroup({
    layout: layout!,
    entries: [{ binding: 0, resource: { buffer } }],
  });

  const frame = async () => {};
  return frame;
}
