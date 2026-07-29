import { createContext, useContext } from 'react';
import useChatHelpers from '~/hooks/Chat/useChatHelpers';
type TChatContext = ReturnType<typeof useChatHelpers>;

export const ChatContext = createContext<TChatContext | null>(null);
export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatContext.Provider');
  }
  return ctx;
};

/**
 * Chat helpers when rendered inside a chat view, otherwise `null`.
 *
 * `ChatContext.Provider` is mounted only by `ChatView`, so components that also render
 * standalone — the agent builder's parameter controls, opened from the marketplace or the
 * class dashboard — must not assume it exists. Use this instead of `useChatContext` there;
 * anything that genuinely requires a live conversation should keep using the throwing hook.
 */
export const useChatContextOptional = () => useContext(ChatContext);
