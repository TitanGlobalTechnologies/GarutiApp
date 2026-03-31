import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.backdrop} />
      <View style={styles.modal}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, destructive && styles.destructiveBtn]}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text style={[styles.confirmText, destructive && styles.destructiveText]}>
              {confirmLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9998,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modal: {
    backgroundColor: "#1a2636",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    width: "85%",
    maxWidth: 340,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3a4e",
    alignItems: "center",
  },
  cancelText: { color: "#9CA3AF", fontWeight: "600", fontSize: 14 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F97316",
    alignItems: "center",
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  destructiveBtn: { backgroundColor: "rgba(248,113,113,0.15)" },
  destructiveText: { color: "#F87171" },
});
