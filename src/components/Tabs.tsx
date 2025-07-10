import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLProps,
  type ReactNode,
} from "react";
import { v4 as uuid } from "uuid";

export type Tabs = typeof TabsRoot & {
  Tab: typeof Tab;
};

type TabsContext = {
  states: Record<string, boolean>;
  set: (id: string, open: boolean) => void;
  remove: (id: string) => void;
};
const TabsContext = createContext<TabsContext>({
  states: {},
  set: (id: string, open: boolean) => {},
  remove: (id: string) => {},
});

export function TabsRoot({
  children,
  className,
  onTabChange,
}: {
  children: ReactNode;
  className?: string;
  onTabChange?: () => void;
}) {
  const [states, setStates] = useState<TabsContext["states"]>({});
  const set = useCallback(
    (id: string, open: boolean) => {
      setStates((states) => ({ ...states, [id]: open }));
      if (onTabChange !== undefined) onTabChange();
    },
    [setStates, onTabChange]
  );
  const remove = useCallback(
    (id: string) => {
      setStates((states) =>
        Object.fromEntries(
          Object.entries(states).filter(([otherId]) => id !== otherId)
        )
      );
    },
    [setStates]
  );
  return (
    <TabsContext.Provider value={{ states, set, remove }}>
      <div className={`tabs ${className || ""}`}>
        <div className="controls">
          {Object.entries(states).map(([id, open]) => (
            <input
              key={id}
              name="tab-control"
              type="checkbox"
              checked={open}
              onChange={(event) => {
                set(id, event.currentTarget.checked);
              }}
            />
          ))}
        </div>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function Tab(props: Omit<HTMLProps<HTMLDivElement>, "className">) {
  const id = useRef(uuid());
  const { states, set, remove } = useContext(TabsContext);
  useEffect(() => {
    const thisId = id.current;
    set(id.current, true);
    return () => remove(thisId);
  }, [id, set, remove]);
  const open = states[id.current];
  return <div className="tab" data-open={open} {...props} />;
}

export const Tabs: Tabs = Object.assign(TabsRoot, { Tab });
