// screens/TransporterLoginScreen.js
import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Image,
  ActivityIndicator 
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.10.6:3000/api';

export default function TransporterLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Email and password are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("Invalid email format. Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      console.log('🔐 Attempting login with:', email);
      
      const response = await fetch(`${API_BASE_URL}/transporter/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password
        }),
      });

      const data = await response.json();
      console.log('📥 Full Login response:', JSON.stringify(data, null, 2));

      if (response.ok && data.success) {
        // Clear any previous data first
        await AsyncStorage.multiRemove([
          'authToken',
          'transporterId',
          'transporterData',
          'transporterEmail',
          'transporterName',
          'transporterCompany',
          'userRole'
        ]);

        console.log('🧹 Cleared previous session data');

        // Store authentication token
        if (data.token) {
          await AsyncStorage.setItem('authToken', data.token);
          console.log('✅ Token saved');
        } else {
          console.warn('⚠️ No token in response');
        }

        // Store transporter data with all possible field variations
        if (data.transporter || data.data) {
          const transporterInfo = data.transporter || data.data;
          
          // Extract ID with multiple fallbacks
          const transporterId = transporterInfo._id || 
                               transporterInfo.id || 
                               transporterInfo.transporterId;
          
          // Extract company/name with multiple fallbacks
          const company = transporterInfo.company || 
                         transporterInfo.companyName || 
                         transporterInfo.businessName ||
                         'Transport Company';
          
          const name = transporterInfo.name || 
                      transporterInfo.fullName || 
                      transporterInfo.ownerName ||
                      company;

          console.log('📋 Extracted transporter info:', {
            id: transporterId,
            name: name,
            email: transporterInfo.email,
            company: company
          });

          // Save all data
          await AsyncStorage.setItem('transporterData', JSON.stringify(transporterInfo));
          await AsyncStorage.setItem('transporterId', transporterId);
          await AsyncStorage.setItem('transporterEmail', transporterInfo.email || email);
          await AsyncStorage.setItem('transporterName', name);
          await AsyncStorage.setItem('transporterCompany', company);
          await AsyncStorage.setItem('userRole', 'transporter');

          console.log('✅ All transporter data saved successfully');

          // Verify data was saved
          const savedId = await AsyncStorage.getItem('transporterId');
          const savedName = await AsyncStorage.getItem('transporterName');
          const savedCompany = await AsyncStorage.getItem('transporterCompany');
          
          console.log('✅ Verification - Saved data:', {
            id: savedId,
            name: savedName,
            company: savedCompany
          });

          Alert.alert(
            "Success", 
            `Welcome ${name}!`,
            [
              {
                text: "OK",
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "TransporterDashboard" }],
                  });
                }
              }
            ]
          );
        } else {
          console.error('❌ No transporter data in response');
          setErrorMsg("Login successful but profile data missing. Please contact support.");
        }
      } else {
        setErrorMsg(data.message || "Login failed. Please check your credentials.");
        console.error('❌ Login failed:', data.message);
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Email Required", "Please enter your email address first.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/transporter/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();
      Alert.alert(data.success ? "Success" : "Error", data.message);
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert("Error", "Failed to send reset link. Please try again.");
    }
  };

  const styles = {
    container: { 
      flex: 1, 
      backgroundColor: "#f8f9fa" 
    },
    header: { 
      paddingTop: 80,
      paddingBottom: 60,
      paddingHorizontal: 24,
      backgroundColor: "#afd826",
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      marginBottom: 40,
      alignItems: "center"
    },
    logo: {
      width: 80,
      height: 80,
      marginBottom: 16,
      borderRadius: 40,
      backgroundColor: "#fff",
      padding: 8
    },
    headerTitle: { 
      color: "#fff", 
      fontSize: 32, 
      fontWeight: "800",
      letterSpacing: 0.5,
      textAlign: "center"
    },
    headerSubtitle: {
      color: "#f0f9d8",
      fontSize: 16,
      marginTop: 8,
      fontWeight: "500",
      textAlign: "center"
    },
    formContainer: { 
      paddingHorizontal: 24
    },
    label: { 
      fontWeight: "600", 
      color: "#374151", 
      marginBottom: 8,
      fontSize: 14,
      letterSpacing: 0.2
    },
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
      borderColor: "#f3f4f6"
    },
    input: { 
      fontSize: 16, 
      color: "#111827"
    },
    errorContainer: {
      backgroundColor: "#fee2e2",
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: "#dc2626"
    },
    errorText: {
      color: "#dc2626",
      fontSize: 14,
      fontWeight: "500"
    },
    forgotPassword: {
      alignSelf: "flex-end",
      marginBottom: 24,
      marginTop: -8
    },
    forgotPasswordText: {
      color: "#afd826",
      fontWeight: "600",
      fontSize: 14
    },
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
      elevation: 6
    },
    loginButtonText: { 
      color: "#fff", 
      fontWeight: "800", 
      fontSize: 18,
      letterSpacing: 0.5
    },
    signupContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 40
    },
    signupText: {
      color: "#6b7280",
      fontSize: 15,
      fontWeight: "500"
    },
    signupLink: {
      color: "#afd826",
      fontWeight: "700",
      fontSize: 15,
      marginLeft: 4
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 32
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: "#e5e7eb"
    },
    dividerText: {
      marginHorizontal: 16,
      color: "#9ca3af",
      fontSize: 14,
      fontWeight: "500"
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp",
          }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Transporter Login</Text>
        <Text style={styles.headerSubtitle}>
          Login using your registered{" "}
          <Text style={{ fontWeight: "bold", color: "#fff" }}>Transporter account</Text>
        </Text>
      </View>

      <ScrollView 
        style={styles.formContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Email */}
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your email address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrorMsg("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrorMsg("");
            }}
            secureTextEntry
            style={styles.input}
          />
        </View>

        {/* Error Message */}
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Forgot Password */}
        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          style={styles.loginButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login →</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sign Up */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("TransporterRegister")}>
            <Text style={styles.signupLink}>Register Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}