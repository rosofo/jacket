import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import type React from "react";

export type DropAreaItem = { name: string; icon: ReactNode };

export default function DropArea({
  item,
  fallback,
  onDrop,
  ...props
}: {
  item?: DropAreaItem;
  fallback?: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onDragOver">) {
  const showEntry = useMemo(() => {
    if (item !== undefined) {
      return (
        <div className="cluster">
          {item.icon}
          <div>{item.name}</div>
        </div>
      );
    } else {
      return fallback || null;
    }
  }, [item, fallback]);

  const [valid, setValid] = useState(true);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!event.dataTransfer.types.includes("Files")) {
          setValid(false);
          event.dataTransfer.dropEffect = "none";
        } else {
          setDragging(true);
        }
      }}
      onDragLeave={() => {
        setValid(true);
      }}
      onDrop={(event) => {
        onDrop && onDrop(event);
        setDragging(false);
      }}
      className="drop-area box far"
      data-invalid={!valid || undefined}
      data-dragging={dragging || undefined}
      {...props}
    >
      {showEntry}
    </div>
  );
}
