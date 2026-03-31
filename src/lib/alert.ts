/**
 * Cross-platform alert that works on web (window.alert) and native (Alert.alert)
 */
import { Alert, Platform } from "react-native";

export function showAlert(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: "OK", onPress: onOk }]);
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    } else {
      onCancel?.();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", onPress: onCancel },
      { text: "OK", onPress: onConfirm },
    ]);
  }
}
