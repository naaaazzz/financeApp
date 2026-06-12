import { useRouter } from "expo-router";
import { ArrowLeft, KeyRound } from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function OtpScreen() {
  const { pendingOtpUser, verifyOtp, clearOtpSession } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutes countdown (240 seconds)

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Redirect back to login if there is no pending OTP session
  useEffect(() => {
    if (!pendingOtpUser) {
      router.replace("/(auth)/login");
    }
  }, [pendingOtpUser]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      toast.error("OTP has expired. Please log in again.");
      toast.dismiss();
      clearOtpSession();
      router.replace("/(auth)/login");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleChangeText = (text: string, index: number) => {
    const newOtp = [...otp];
    // Keep only the last character entered
    const cleanChar = text.replace(/[^0-9]/g, "").slice(-1);
    newOtp[index] = cleanChar;
    setOtp(newOtp);

    // Auto-focus next input box if filled
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      // If box is empty, clear and focus previous box
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length < 6) {
      toast.error("Please enter the full 6-digit OTP code.");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOtp(enteredOtp);
      if (result.success) {
        toast.dismiss(); // Close the 4-minute active OTP notification
        toast.success("Welcome back! Logged in successfully.");
        // The RootNavigationGate automatically handles redirection to (tabs)
      } else {
        toast.error(result.error || "Incorrect OTP. Please try again.");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    toast.dismiss();
    clearOtpSession();
    router.replace("/(auth)/login");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <ArrowLeft size={20} color="#8F9BB3" />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.headerArea}>
          <Image
            source={require("../../../assets/images/spending.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit verification code shown in your toast notification.
          </Text>
          {pendingOtpUser && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Sent to: {pendingOtpUser.value}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Enter OTP</Text>

          {/* OTP Code Blocks */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit !== "" && styles.otpInputActive,
                ]}
                keyboardType="number-pad"
                maxLength={2}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                placeholder="-"
                placeholderTextColor="#576275"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Timer Display */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>OTP will expire in:</Text>
            <Text
              style={[
                styles.timerCountdown,
                timeLeft <= 60 && styles.timerCountdownUrgent,
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={handleVerify}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify & Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0C16",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 24,
    zIndex: 10,
    gap: 8,
  },
  backButtonText: {
    color: "#8F9BB3",
    fontSize: 14,
    fontWeight: "600",
  },
  headerArea: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 60,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#8F9BB3",
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  badge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  badgeText: {
    color: "#818CF8",
    fontSize: 12,
    fontWeight: "600",
  },
  formContainer: {
    backgroundColor: "rgba(24, 27, 48, 0.7)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  formTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 24,
  },
  otpInput: {
    flex: 1,
    height: 52,
    backgroundColor: "rgba(10, 12, 22, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  otpInputActive: {
    borderColor: "#6366F1",
    backgroundColor: "rgba(99, 102, 241, 0.05)",
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  timerLabel: {
    color: "#8F9BB3",
    fontSize: 14,
  },
  timerCountdown: {
    color: "#6366F1",
    fontSize: 15,
    fontWeight: "700",
  },
  timerCountdownUrgent: {
    color: "#EF4444",
  },
  verifyBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
