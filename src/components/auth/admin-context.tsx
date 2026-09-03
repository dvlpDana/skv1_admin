"use client";

import { createContext, useContext } from "react";
import type { AdminAccount } from "@/types/admin";

const AdminContext = createContext<AdminAccount | null>(null);

export function AdminProvider({
  admin,
  children,
}: {
  admin: AdminAccount;
  children: React.ReactNode;
}) {
  return (
    <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const admin = useContext(AdminContext);
  if (!admin) throw new Error("useAdmin must be used within AdminProvider");
  return admin;
}
