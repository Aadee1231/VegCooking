import { Alert, Platform, ToastAndroid } from "react-native";

export function toast(msg: string) {
  if (!msg) return;
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("Flavur", msg);
  }
}
