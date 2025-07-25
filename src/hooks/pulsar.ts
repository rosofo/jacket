import { useCallback, useEffect, useMemo, useRef } from "react";
import { animate } from "animejs";
import { v4 as uuid } from "uuid";

const POOL: HTMLDivElement[] = [];

export function usePulsar(): { at: (x: number, y: number) => void };
export function usePulsar(
  x: number,
  y: number
): { at: (x: number, y: number) => void };
export default function usePulsar(
  x?: number,
  y?: number
): { at: (x: number, y: number) => void } {
  const root = useMemo(setupRoot, []);
  const id = useMemo(() => uuid(), []);
  useEffect(() => createPool(root), [root]);

  const spawn = useCallback(
    (x: number, y: number) => {
      let pulsar = document.getElementById(id) as HTMLDivElement | null;
      if (pulsar === null) {
        pulsar = POOL.pop() || null;
        if (pulsar === null) return;
      }
      pulsar.id = id;
      pulsar.classList.add("active");
      animate(pulsar, {
        opacity: [
          { from: 0 },
          { to: 1, duration: 200 },
          { to: 0, duration: 100 },
        ],
        translateX: [{ to: x, duration: 100 }],
        translateY: [{ to: y, duration: 100 }],
        composition: "blend",
      }).then(() => {
        pulsar.id = "";
        pulsar.classList.remove("active");
        POOL.push(pulsar);
      });
      animate(pulsar, {
        backgroundColor: [
          { from: "#1e001e50" },
          { to: "#1e005eaa", duration: 200 },
          { to: "#ae005e88", duration: 200 },
        ],
      });
    },
    [root]
  );
  useEffect(() => {
    if (x !== undefined && y !== undefined) spawn(x, y);
  }, [x, y]);

  return { at: spawn };
}

function setupRoot() {
  let root = document.getElementById("pulsar-root");
  if (root === null) {
    root = document.createElement("div");
    root.id = "pulsar-root";
    document.body.appendChild(root);
  }
  return root;
}

function createPool(root: HTMLElement) {
  if (POOL.length > 0) return;
  for (const _ of new Array(100).fill(null)) {
    const el = document.createElement("div");
    el.classList.add("pulsar");
    root.appendChild(el);
    POOL.push(el);
  }
}
