import React, { createContext, useContext } from "react";
import { useConversations } from "../hooks/useConversations";

type ConversationsContextType = ReturnType<typeof useConversations>;

const ConversationsContext = createContext<ConversationsContextType | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const conversations = useConversations();
  return (
    <ConversationsContext.Provider value={conversations}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversationsContext must be used within ConversationsProvider");
  }
  return context;
}
