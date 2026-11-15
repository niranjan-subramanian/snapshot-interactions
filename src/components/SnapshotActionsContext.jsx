
import {
  createContext,
  useContext,
  useState,
} from "react";

const SnapshotActionsContext = createContext(null);

export function SnapshotActionsProvider({ children }) {
  const [actions, setActions] = useState([]);

  return (
    <SnapshotActionsContext.Provider
      value={{ actions, setActions }}
    >
      {children}
    </SnapshotActionsContext.Provider>
  );
}

export function useSnapshotActions() {
  const context = useContext(SnapshotActionsContext);

  if (!context) {
    throw new Error(
      "useSnapshotActions must be used inside SnapshotActionsProvider"
    );
  }

  return context;
}
