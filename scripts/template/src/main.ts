export async function program({
  navigator,
  canvas,
  files,
  logger,
}: {
  navigator: Navigator;
  canvas: HTMLCanvasElement;
  logger: Record<string, (msg: string) => void>;
  files: Record<string, string>;
}) {
  const frame = async () => {};
  return frame;
}
