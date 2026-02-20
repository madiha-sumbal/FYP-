// DriverLoginScreen.js - FIXED
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { authAPI, setAuthToken } from "./apiService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DriverLoginScreen = ({ navigation }) => {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      console.log("🔄 Attempting login with:", { email: email.toLowerCase().trim() });

      const response = await authAPI.login(email, password);
      console.log("✅ Login response:", response.data);

      if (response.data.success) {
        const driverData = response.data.driver || response.data.user;

        if (!driverData || !driverData.id) {
          throw new Error("Invalid user data received");
        }

        // ✅ Store all auth keys
        await setAuthToken(response.data.token);
        await AsyncStorage.setItem("userId",   driverData.id);
        await AsyncStorage.setItem("driverId", driverData.id);
        await AsyncStorage.setItem("userData", JSON.stringify(driverData));

        console.log("✅ Auth stored — ID:", driverData.id, "| Role:", driverData.role);

        // ✅ Navigate first — Alert AFTER replace causes black screen on Android
        navigation.replace("DriverDashboard", { driver: driverData });

      } else {
        Alert.alert("Login Failed", response.data.message || "Unknown error occurred");
      }
    } catch (error) {
      console.error("❌ Login error:", error);

      let msg = "Login failed. Please try again.";
      if (error.code === "NETWORK_ERROR" || error.message?.includes("Network Error")) {
        msg = "Cannot connect to server.\n• Check internet connection\n• Ensure server is running";
      } else if (error.response?.status === 400) {
        msg = error.response.data?.message || "Invalid email or password format";
      } else if (error.response?.status === 401) {
        msg = "Invalid email or password";
      } else if (error.response?.status === 403) {
        msg = error.response.data?.message || "Account not registered as a driver";
      } else if (error.message) {
        msg = error.message;
      }

      Alert.alert("Login Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container:          { flex: 1, backgroundColor: "#f8f9fa" },
    header:             { paddingTop: 80, paddingBottom: 60, paddingHorizontal: 24, backgroundColor: "#afd826", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, marginBottom: 40 },
    headerTitle:        { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: 0.5, textAlign: "center" },
    headerSubtitle:     { color: "#f0f9d8", fontSize: 16, marginTop: 8, fontWeight: "500", textAlign: "center" },
    formContainer:      { paddingHorizontal: 24 },
    label:              { fontWeight: "600", color: "#374151", marginBottom: 8, fontSize: 14 },
    inputContainer:     { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#f3f4f6" },
    input:              { fontSize: 16, color: "#111827" },
    forgotPassword:     { alignSelf: "flex-end", marginBottom: 24, marginTop: -8 },
    forgotPasswordText: { color: "#afd826", fontWeight: "600", fontSize: 14 },
    loginButton:        { backgroundColor: "#afd826", paddingVertical: 18, borderRadius: 16, alignItems: "center", marginBottom: 24, shadowColor: "#afd826", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    loginButtonText:    { color: "#fff", fontWeight: "800", fontSize: 18, letterSpacing: 0.5 },
    signupContainer:    { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8, marginBottom: 40 },
    signupText:         { color: "#6b7280", fontSize: 15, fontWeight: "500" },
    signupLink:         { color: "#afd826", fontWeight: "700", fontSize: 15, marginLeft: 4 },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Back</Text>
        <Text style={styles.headerSubtitle}>Login to your driver account</Text>
      </View>

      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          style={styles.forgotPassword}
          onPress={() => Alert.alert("Forgot Password", "Password recovery coming soon.")}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.loginButtonText}>Login →</Text>
          }
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("DriverRegistration")} disabled={loading}>
            <Text style={styles.signupLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default DriverLoginScreen;