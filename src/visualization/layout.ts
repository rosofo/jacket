import { mapObject, pipe } from "rambda";
import type { EdgeWeight, Graph, NodeWeight } from "./graph";
import {
  Solver,
  Variable,
  Strength,
  Constraint,
  Expression,
  Operator,
} from "@lume/kiwi";

type NodeBox = {
  x: Variable;
  y: Variable;
  width: Variable;
  height: Variable;
};
type RawNodeBox = { [K in keyof NodeBox]: number };

export class LayoutSolver {
  private solver: Solver = new Solver();
  private boxes: Record<string, NodeBox> = {};

  get nodes() {
    return pipe(
      this.boxes,
      mapObject(
        (box) =>
          pipe(
            box,
            mapObject((variable) => variable.value())
          ) as RawNodeBox
      )
    );
  }

  solve() {
    this.solver.updateVariables();
  }

  addBoxes(ids: string[]) {
    for (const id of ids) {
      const x = new Variable(`node-x-${id}`);
      const y = new Variable(`node-y-${id}`);
      const width = new Variable(`node-w-${id}`);
      const height = new Variable(`node-h-${id}`);

      this.solver.addEditVariable(x, Strength.strong); // I understand what it means for a constraint to be strong, but a *variable*??
      this.solver.addEditVariable(y, Strength.strong);
      this.solver.addEditVariable(width, Strength.strong);
      this.solver.addEditVariable(height, Strength.strong);

      // worst api ever thanks kiwi
      // the RHS of an expression is implicitly 0, args are summed, tuples are multiplied
      // the below translates to -1 * width + 200 >= 0
      this.solver.addConstraint(
        new Constraint(
          new Expression([-1, width], 200),
          Operator.Le,
          0,
          Strength.required
        )
      );

      // oh wait there's a hidden RHS parameter so I can do this instead?
      this.solver.addConstraint(
        new Constraint(height, Operator.Ge, 100, Strength.required)
      );

      this.solver.createConstraint(x, Operator.Ge, 0, Strength.required);
      this.solver.createConstraint(y, Operator.Ge, 0, Strength.required);

      this.boxes[id] = { width, height, x, y };
    }
  }

  addEdgeConstraints(
    edges: {
      id: string;
      source: string;
      target: string;
      type: "parent" | "dependency";
    }[]
  ) {
    for (const edge of edges) {
      const sourceBox = this.boxes[edge.source];
      const targetBox = this.boxes[edge.target];
      if (edge.type === "parent") {
        // child should be lower than parent
        this.solver.createConstraint(
          targetBox.y,
          Operator.Ge,
          new Expression(sourceBox.y, sourceBox.height),
          Strength.required
        );
      } else {
        this.solver.createConstraint(
          new Expression(sourceBox.x, sourceBox.width),
          Operator.Ge,
          targetBox.x,
          Strength.strong
        );
      }
    }
  }
}

export function layoutGraph(graph: Graph) {}
