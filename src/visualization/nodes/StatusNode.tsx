import React from "react";
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
              <div key={i} className="small">
                {status.node}
              </div>
            ))}
          </div>
        </BaseNode>
      </div>
    );
  }
);
