import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { CheckCircle, AlertCircle, Info } from "lucide-react-native";

type ToastType = "success" | "error" | "info";

interface ToastOptions {
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
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
    translateY.value = withSpring(-150, { damping: 15 }, () => {
      runOnJS(setActiveToast)(null);
    });
    opacity.value = withSpring(0);
  }, [translateY, opacity]);

  const showToast = useCallback((type: ToastType, message: string) => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setActiveToast({ type, message });
    
    // Animate in
    translateY.value = withSpring(0, { damping: 15 });
    opacity.value = withSpring(1);

    // Auto dismiss after 3 seconds
    timerRef.current = setTimeout(() => {
      hideToast();
    }, 3000);
  }, [translateY, opacity, hideToast]);

  const success = useCallback((message: string) => showToast("success", message), [showToast]);
  const error = useCallback((message: string) => showToast("error", message), [showToast]);
  const info = useCallback((message: string) => showToast("info", message), [showToast]);

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
    <ToastContext.Provider value={{ toast: { success, error, info } }}>
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
