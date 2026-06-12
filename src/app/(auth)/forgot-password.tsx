import { useRouter } from "expo-router";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from "lucide-react-native";
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

export default function ForgotPasswordScreen() {
  const { pendingForgotUser, verifyForgotPasswordOtp, resetPassword, clearForgotSession } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(240); // 4 minutes timer
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // New Password Reset Fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Redirect back to login if there is no active recovery session
  useEffect(() => {
    if (!pendingForgotUser) {
      router.replace("/(auth)/login");
    }
  }, [pendingForgotUser]);

  // Countdown timer effect
  useEffect(() => {
    if (isOtpVerified) return; // Stop timer if OTP is verified

    if (timeLeft <= 0) {
      toast.error("Recovery OTP has expired. Please try again.");
      toast.dismiss();
      clearForgotSession();
      router.replace("/(auth)/login");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isOtpVerified]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleChangeText = (text: string, index: number) => {
    const newOtp = [...otp];
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
      const result = await verifyForgotPasswordOtp(enteredOtp);
      if (result.success) {
        toast.dismiss(); // Close active OTP notification toast
        setIsOtpVerified(true);
        toast.success("Identity verified! Please enter your new password.");
      } else {
        toast.error(result.error || "Incorrect recovery OTP.");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew || !trimmedConfirm) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (trimmedNew.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsVerifying(true);
    try {
      const result = await resetPassword(trimmedNew);
      if (result.success) {
        setIsResetSuccess(true);
        toast.success("Password updated successfully!");
      } else {
        toast.error(result.error || "Failed to update password.");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    toast.dismiss();
    clearForgotSession();
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
          <Text style={styles.appName}>Password Recovery</Text>
          <Text style={styles.subtitle}>
            Reset your account password easily by completing identity verification.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {!isOtpVerified ? (
            <>
              <Text style={styles.formTitle}>Verify Identity</Text>

              {/* OTP Inputs */}
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

              {/* Timer */}
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

              {/* Submit */}
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : !isResetSuccess ? (
            <>
              <Text style={styles.formTitle}>Reset Password</Text>

              {/* New Password Input */}
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color="#8F9BB3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#576275"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                  {showNewPassword ? (
                    <EyeOff size={18} color="#8F9BB3" />
                  ) : (
                    <Eye size={18} color="#8F9BB3" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color="#8F9BB3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#576275"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  {showConfirmPassword ? (
                    <EyeOff size={18} color="#8F9BB3" />
                  ) : (
                    <Eye size={18} color="#8F9BB3" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Reset Submit */}
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleResetPassword}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.recoveredContainer}>
              <View style={styles.checkCircle}>
                <CheckCircle size={32} color="#10B981" />
              </View>
              <Text style={styles.recoveredTitle}>Password Reset Success</Text>
              <Text style={styles.recoveredSubtitle}>
                Your password has been successfully updated! You can now log in using your new credentials.
              </Text>

              <TouchableOpacity style={styles.doneBtn} onPress={handleCancel}>
                <Text style={styles.doneBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
    width: "100%",
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  recoveredContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  recoveredTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  recoveredSubtitle: {
    color: "#8F9BB3",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    height: 52,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
    color: "#B2C0D6",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 12, 22, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 52,
    width: "100%",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
});
