import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.10.6:3000/api";

export default function PassengerLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Error", "Please enter both email and password");
    }

    setLoading(true);

    try {
      console.log("🔐 Attempting passenger login...");
      console.log("📧 Email:", email.toLowerCase().trim());
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password.trim(),
          role: "passenger", // Explicitly tell backend this is passenger login
        }),
      });

      const data = await response.json();
      console.log("📥 Full Login response:", JSON.stringify(data, null, 2));

      // Check if login was successful
      if (!response.ok || !data.success) {
        Alert.alert("Login Failed", data.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      // Extract token and user data from response
      const token = data.token || data.accessToken || data.data?.token;
      const userData = data.passenger || data.user || data.data?.user || data.data;

      console.log("🎫 Token:", token ? "✓ Found" : "✗ Missing");
      console.log("👤 User data extracted:", JSON.stringify(userData, null, 2));

      if (!token) {
        Alert.alert("Login Error", "Authentication token missing from server");
        setLoading(false);
        return;
      }

      if (!userData) {
        Alert.alert("Login Error", "User data missing from server");
        setLoading(false);
        return;
      }

      // ✅ CRITICAL: Verify user role is PASSENGER
      const userRole = (userData.role || userData.userRole || "").toLowerCase().trim();
      console.log("🎭 User role:", userRole);

      if (userRole !== "passenger") {
        setLoading(false);
        return Alert.alert(
          "Access Denied",
          `This account is registered as "${userRole}". Only Passenger accounts can login here. Please use the correct login screen.`
        );
      }

      // ✅ Check if passenger account is approved - DETAILED LOGGING
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📋 APPROVAL CHECK - Full user data:");
      console.log(JSON.stringify(userData, null, 2));
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔍 Checking approval fields:");
      console.log("  - status:", userData.status);
      console.log("  - isVerified:", userData.isVerified);
      console.log("  - approved:", userData.approved);
      console.log("  - isApproved:", userData.isApproved);
      console.log("  - accountStatus:", userData.accountStatus);
      console.log("  - approvalStatus:", userData.approvalStatus);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Check multiple possible approval indicators
      const isApproved = 
        userData.status?.toLowerCase() === "approved" ||
        userData.status?.toLowerCase() === "active" ||
        userData.accountStatus?.toLowerCase() === "approved" ||
        userData.accountStatus?.toLowerCase() === "active" ||
        userData.approvalStatus?.toLowerCase() === "approved" ||
        userData.isVerified === true ||
        userData.approved === true ||
        userData.isApproved === true;

      console.log("✅ Final approval status:", isApproved);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (!isApproved) {
        setLoading(false);
        
        // Show detailed status in alert
        const statusInfo = `
Current Status: ${userData.status || userData.accountStatus || 'unknown'}
Verified: ${userData.isVerified ? 'Yes' : 'No'}
Approved: ${userData.approved || userData.isApproved ? 'Yes' : 'No'}
        `.trim();
        
        return Alert.alert(
          "Account Pending Approval ⏳",
          `Your Passenger account is waiting for transporter approval.\n\n${statusInfo}\n\nYou will be notified once approved.`,
          [
            { text: "OK" },
            { 
              text: "Contact Support", 
              onPress: () => {
                console.log("User wants to contact support");
                // You can add support contact logic here
              }
            }
          ]
        );
      }

      // ✅ Save credentials to AsyncStorage
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));
      await AsyncStorage.setItem("userRole", "passenger");

      console.log("✅ Login successful! Navigating to dashboard...");

      // ✅ Navigate to Passenger Dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: "PassengerAppNavigation" }],
      });

    } catch (error) {
      console.error("❌ Login error:", error);
      console.error("Error details:", error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
      }
      
      Alert.alert(
        "Connection Error", 
        "Unable to connect to server. Please check your internet connection and try again.\n\nError: " + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToRequest = () => {
    navigation.navigate("PassengerRequestScreen");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Image
              source={{
                uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp",
              }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appSubtitle}>Welcome Back</Text>
        </View>
      </View>

      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            editable={!loading}
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login →</Text>
          )}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={handleNavigateToRequest} disabled={loading}>
            <Text style={styles.registerLink}>Send Request</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 24,
    backgroundColor: "#afd826",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoContainer: { alignItems: "center", marginBottom: 10 },
  logo: {
    width: 100,
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#afd826",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  logoImage: { width: 60, height: 60 },
  appSubtitle: {
    color: "#f0f9d8",
    fontSize: 16,
    marginTop: 8,
    fontWeight: "500",
    textAlign: "center",
  },
  formContainer: { paddingHorizontal: 24 },
  label: { fontWeight: "600", color: "#374151", marginBottom: 8, fontSize: 14 },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  input: { fontSize: 16, color: "#111827" },
  loginButton: {
    backgroundColor: "#afd826",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#afd826",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonText: { color: "#fff", fontWeight: "800", fontSize: 18, letterSpacing: 0.5 },
  registerContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8, marginBottom: 40 },
  registerText: { color: "#6b7280", fontSize: 15, fontWeight: "500" },
  registerLink: { color: "#afd826", fontWeight: "700", fontSize: 15, marginLeft: 4 },
});