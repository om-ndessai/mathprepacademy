import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AuthUser } from "@mathprep/core";

import type { AuthContextValue } from "./authContext";
import { AuthContext } from "./authContext";
import { signOutUser, subscribeToAuth } from "./authService";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Pick<AuthContextValue, "status" | "user">>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    return subscribeToAuth((user) => {
      setState(user ? { status: "signed-in", user } : { status: "signed-out", user: null });
    });
  }, []);

  const setUser = useCallback((user: AuthUser) => {
    setState({ status: "signed-in", user });
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setState({ status: "signed-out", user: null });
  }, []);

  const value = useMemo(() => ({ ...state, setUser, signOut }), [state, setUser, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
