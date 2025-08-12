import React, { type ReactNode } from "react";
import { BaseNode } from "./BaseNode";
import type { StatusData } from "./types";
import type { JacketProps, BaseData } from "./types";

export const StatusNode = React.memo(
  (props: JacketProps<BaseData & StatusData>) => {
    return (
      <div className="cluster">
        <BaseNode {...props}>
          {props.data.label}
          <div className="outside-right stack">
            {props.data.statuses.map((status, i) => (
              <StatusNodeStatus key={i} {...status} />
            ))}
          </div>
        </BaseNode>
      </div>
    );
  }
);

function StatusNodeStatus({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="cluster small">
      {icon}
      {label}
    </div>
  );
}
