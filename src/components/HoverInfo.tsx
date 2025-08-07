import { useCallback, useEffect, useRef } from "react";
import { useHoverInfoStore } from "../hooks/hover-info";
import {
  Animatable,
  animate,
  createAnimatable,
  createScope,
  Scope,
} from "animejs";
import { getLogger } from "@logtape/logtape";

export default function HoverInfo() {
  const store = useHoverInfoStore();
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const scope = useRef<Scope>(null);

  useEffect(() => {
    scope.current = createScope({ root: root });
    scope.current.add("startHover", () => {
      animate(box.current!, {
        opacity: 0.9,
        scale: 1,
        duration: 200, // millis
      });
    });
    scope.current.add("endHover", () => {
      animate(box.current!, {
        opacity: 0,
        scale: 0,
        duration: 200, // millis
        composition: "replace",
      });
    });
    const target = createAnimatable(box.current!, {
      x: 20,
      y: 20,
    });

    const setPosition = (event: MouseEvent) => {
      target.x(event.clientX);
      target.y(event.clientY);
    };
    window.addEventListener("mousemove", setPosition);

    return () => {
      scope.current!.revert();
      window.removeEventListener("mousemove", setPosition);
    };
  }, [root, box]);

  useEffect(() => {
    if (store.hovering) {
      scope.current?.methods.startHover();
    } else {
      scope.current?.methods.endHover();
    }
  }, [store.hovering]);

  return (
    <div className="absolute" ref={root}>
      <div
        ref={box}
        className="box flat absolute"
        style={{
          opacity: 0,
          pointerEvents: "none",
          transformOrigin: "top left",
        }}
      >
        {store.node}
      </div>
    </div>
  );
}
