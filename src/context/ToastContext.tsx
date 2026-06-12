import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { CheckCircle, AlertCircle, Info } from "lucide-react-native";

type ToastType = "success" | "error" | "info";

interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    dismiss: () => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [activeToast, setActiveToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<any>(null);
  
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);

  const hideToast = useCallback(() => {
    translateY.value = withTiming(-150, { duration: 250, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(setActiveToast)(null);
    });
    opacity.value = withTiming(0, { duration: 250 });
  }, [translateY, opacity]);

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setActiveToast({ type, message, duration });
    
    // Animate in
    translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(1, { duration: 250 });

    // Auto dismiss after specified duration (defaults to 3 seconds)
    const dismissDuration = duration !== undefined ? duration : 3000;
    timerRef.current = setTimeout(() => {
      hideToast();
    }, dismissDuration);
  }, [translateY, opacity, hideToast]);

  const success = useCallback((message: string, duration?: number) => showToast("success", message, duration), [showToast]);
  const error = useCallback((message: string, duration?: number) => showToast("error", message, duration), [showToast]);
  const info = useCallback((message: string, duration?: number) => showToast("info", message, duration), [showToast]);
  const dismiss = useCallback(() => hideToast(), [hideToast]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "rgba(16, 185, 129, 0.16)",
          borderColor: "rgba(16, 185, 129, 0.35)",
        };
      case "error":
        return {
          backgroundColor: "rgba(239, 68, 68, 0.16)",
          borderColor: "rgba(239, 68, 68, 0.35)",
        };
      default:
        return {
          backgroundColor: "rgba(99, 102, 241, 0.16)",
          borderColor: "rgba(99, 102, 241, 0.35)",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast: { success, error, info, dismiss } }}>
      {children}
      {activeToast && (
        <Animated.View style={[styles.toastContainer, getToastStyle(activeToast.type), animatedStyle]}>
          <View style={styles.toastContent}>
            {activeToast.type === "success" && (
              <CheckCircle size={18} color="#10B981" />
            )}
            {activeToast.type === "error" && (
              <AlertCircle size={18} color="#EF4444" />
            )}
            {activeToast.type === "info" && (
              <Info size={18} color="#6366F1" />
            )}
            <Text style={styles.toastText} numberOfLines={2}>
              {activeToast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 45, // Slide down from top of the screen
    left: 20,
    right: 20,
    zIndex: 99999,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
