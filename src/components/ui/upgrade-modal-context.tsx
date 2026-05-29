"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { UpgradeModal } from "./upgrade-modal";

interface UpgradeModalContextType {
  showUpgrade: (recurso?: string) => void;
}

const Ctx = createContext<UpgradeModalContextType>({ showUpgrade: () => {} });

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [recurso, setRecurso] = useState<string | undefined>();

  const showUpgrade = useCallback((r?: string) => {
    setRecurso(r);
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ showUpgrade }}>
      {children}
      <UpgradeModal open={open} onClose={() => setOpen(false)} recurso={recurso} />
    </Ctx.Provider>
  );
}

export function useUpgradeModal() {
  return useContext(Ctx);
}

/** Helper: checa se a resposta é 403 e dispara o modal. Retorna true se bloqueado. */
export async function checkUpgradeResponse(
  res: Response,
  showUpgrade: (r?: string) => void,
  recurso?: string
): Promise<boolean> {
  if (res.status === 403) {
    showUpgrade(recurso);
    return true;
  }
  return false;
}
