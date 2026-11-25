import { createContext, useContext, useMemo, useState } from "react";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [route, setRoute] = useState(null);
  const value = useMemo(
    () => ({ session, setSession, route, setRoute }),
    [session, route],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}