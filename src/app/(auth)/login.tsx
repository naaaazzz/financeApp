import { useRouter } from "expo-router";
import { Lock, Mail, Phone } from "lucide-react-native";
import React, { useState } from "react";
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

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { requestOtp, requestForgotPasswordOtp } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    const isPhone = loginMethod === "phone";
    const identifier = isPhone ? phone : email;
    const missing = [];
    if (!identifier.trim()) {
      missing.push(isPhone ? "Phone Number" : "Email Address");
    }
    if (!isPhone && !password.trim()) {
      missing.push("Password");
    }

    if (missing.length > 0) {
      toast.error(`Missing fields: ${missing.join(", ")}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestOtp(identifier, isPhone, isPhone ? undefined : password);
      if (!result.success) {
        toast.error(result.error || "Invalid credentials");
      } else {
        toast.info(`Your OTP code is ${result.otp}. Enter it below to log in.`, 240000);
        router.push("/(auth)/otp");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestForgotPasswordOtp(email.trim());
      if (result.success) {
        toast.info(`Your Password Recovery OTP is: ${result.otp}. Enter it on the next screen.`, 240000);
        router.push("/(auth)/forgot-password");
      } else {
        toast.error(result.error || "Failed to generate recovery OTP");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
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
        <View style={styles.headerArea}>
          <Image
            source={require("../../../assets/images/spending.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Family Manager</Text>
          <Text style={styles.subtitle}>
            Track your expenses offline, securely.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Welcome Back</Text>

          {/* Login Method Toggle Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, loginMethod === "email" && styles.activeTabButton]}
              onPress={() => setLoginMethod("email")}
            >
              <Mail size={20} color={loginMethod === "email" ? "#FFFFFF" : "#8F9BB3"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, loginMethod === "phone" && styles.activeTabButton]}
              onPress={() => setLoginMethod("phone")}
            >
              <Phone size={20} color={loginMethod === "phone" ? "#FFFFFF" : "#8F9BB3"} />
            </TouchableOpacity>
          </View>

          {/* Dynamic Login Input Fields */}
          {loginMethod === "email" ? (
            <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color="#8F9BB3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor="#576275"
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>

              {/* Password Input (Only for Email) */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} style={{ marginBottom: 8 }}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Lock size={18} color="#8F9BB3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="#576275"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Phone size={18} color="#8F9BB3" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#576275"
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Redirect */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
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
  headerArea: {
    alignItems: "center",
    marginBottom: 40,
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
    marginBottom: 20,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(10, 12, 22, 0.6)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: "#8F9BB3",
    fontSize: 13,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  label: {
    color: "#B2C0D6",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
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
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#8F9BB3",
    fontSize: 14,
  },
  signUpText: {
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "700",
  },
  forgotText: {
    color: "#6366F1",
    fontSize: 12,
    fontWeight: "600",
  },
});
