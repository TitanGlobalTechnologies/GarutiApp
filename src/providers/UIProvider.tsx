import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import Toast from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";

interface ToastOptions {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface UIContextType {
  showToast: (options: ToastOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastOptions, setToastOptions] = useState<ToastOptions>({ message: "" });

  // Confirm modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({ title: "", message: "" });
  const confirmResolve = useRef<((value: boolean) => void) | null>(null);

  const showToast = useCallback((options: ToastOptions) => {
    setToastOptions(options);
    setToastVisible(true);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolve.current = resolve;
      setConfirmOptions(options);
      setConfirmVisible(true);
    });
  }, []);

  function handleConfirm() {
    setConfirmVisible(false);
    confirmResolve.current?.(true);
    confirmResolve.current = null;
  }

  function handleCancel() {
    setConfirmVisible(false);
    confirmResolve.current?.(false);
    confirmResolve.current = null;
  }

  return (
    <UIContext.Provider value={{ showToast, showConfirm }}>
      {children}
      <Toast
        visible={toastVisible}
        message={toastOptions.message}
        type={toastOptions.type}
        duration={toastOptions.duration}
        onDismiss={() => setToastVisible(false)}
      />
      <ConfirmModal
        visible={confirmVisible}
        title={confirmOptions.title}
        message={confirmOptions.message}
        confirmLabel={confirmOptions.confirmLabel}
        cancelLabel={confirmOptions.cancelLabel}
        destructive={confirmOptions.destructive}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
