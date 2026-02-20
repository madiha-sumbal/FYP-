// screens/DriverLoginScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";

export default function DriverLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ✅ Validate Fields
  const validateFields = () => {
    let valid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  };

  // ✅ Handle Login — replace with real API call
  const handleLogin = async () => {
    if (!validateFields()) return;

    setLoading(true);
    try {
      // 🔁 Replace with real API:
      // const response = await fetch("https://api.raahi.com/driver/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, password }),
      // });
      // const data = await response.json();
      // if (!response.ok) throw new Error(data.message || "Login failed");
      // store token: await AsyncStorage.setItem("driverToken", data.token);

      // ✅ Simulated delay for demo
      await new Promise((res) => setTimeout(res, 1200));
      navigation.navigate("DriverDashboard");
    } catch (error) {
      Alert.alert("Login Failed", error.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Invite Link Verification — URL must match raahi.com format
  const verifyInviteLink = () => {
    const trimmed = inviteLink.trim();
    if (trimmed.startsWith("https://raahi.com/invite/driver/")) {
      setInviteModalVisible(false);
      setInviteLink("");
      Alert.alert("Verified ✓", "Your invite link is valid! Redirecting to dashboard...", [
        {
          text: "Continue",
          onPress: () => navigation.navigate("DriverDashboard"),
        },
      ]);
    } else {
      Alert.alert(
        "Invalid Link",
        "The invite link is not valid. Please paste the exact link received from your transporter.\n\nFormat: https://raahi.com/invite/driver/..."
      );
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* ───── Logo ───── */}
      <View style={styles.logoWrapper}>
        <View style={styles.logoCircle}>
          <Image
            source={{
              uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp",
            }}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandName}>RAAHI</Text>
        <Text style={styles.brandSub}>Driver Portal</Text>
      </View>

      {/* ───── Card ───── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome Back</Text>
        <Text style={styles.cardDesc}>
          Login using credentials shared by your Transporter
        </Text>

        {/* Email */}
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="driver@example.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={(v) => { setEmail(v); setEmailError(""); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Enter your password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={(v) => { setPassword(v); setPasswordError(""); }}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Invite Link Button */}
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => setInviteModalVisible(true)}
        >
          <Text style={styles.outlineBtnText}>🔗  Login with Invite Link</Text>
        </TouchableOpacity>

        {/* Register Link */}
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("DriverRequest")}
        >
          <Text style={styles.linkText}>
            New driver?{" "}
            <Text style={styles.linkHighlight}>Send a request to join</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Safe. Reliable. Professional Raahi Service.</Text>

      {/* ───── Invite Modal ───── */}
      <Modal visible={inviteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Paste Invite Link</Text>
            <Text style={styles.modalDesc}>
              Paste the exact invite link you received from your transporter. It
              starts with:{"\n"}
              <Text style={styles.modalHint}>
                https://raahi.com/invite/driver/...
              </Text>
            </Text>

            <TextInput
              style={styles.input}
              placeholder="https://raahi.com/invite/driver/..."
              placeholderTextColor="#aaa"
              value={inviteLink}
              onChangeText={setInviteLink}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={verifyInviteLink}>
              <Text style={styles.primaryBtnText}>Verify & Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setInviteModalVisible(false); setInviteLink(""); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const BRAND = "#afd826";
const BRAND_DARK = "#8ab81e";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F4F6F0",
  },
  logoWrapper: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: BRAND,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    color: BRAND_DARK,
    marginTop: 12,
    letterSpacing: 3,
  },
  brandSub: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    letterSpacing: 1,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFAFA",
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#e74c3c",
  },
  errorText: {
    fontSize: 12,
    color: "#e74c3c",
    marginBottom: 8,
    marginLeft: 2,
  },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8E8E8",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#bbb",
    fontSize: 13,
  },
  outlineBtn: {
    borderWidth: 2,
    borderColor: BRAND,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: BRAND_DARK,
  },
  linkRow: {
    marginTop: 18,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    color: "#888",
  },
  linkHighlight: {
    color: BRAND_DARK,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    color: "#bbb",
    fontSize: 12,
    textAlign: "center",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalBox: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  modalHint: {
    color: BRAND_DARK,
    fontWeight: "600",
    fontSize: 12,
  },
  cancelBtn: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
  },
});