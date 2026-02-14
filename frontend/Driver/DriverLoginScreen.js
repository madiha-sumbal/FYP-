// DriverLoginScreen.js - FIXED VERSION
import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator 
} from "react-native";
import { authAPI, setAuthToken, getAuthToken } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DriverLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const checkExistingLogin = async () => {
      try {
        const token = await getAuthToken();
        const userId = await AsyncStorage.getItem('userId');
        
        if (token && userId && isMounted) {
          console.log('✅ Found existing session, navigating to dashboard...');
          navigation.replace('DriverDashboard');
        }
      } catch (error) {
        console.error('Error checking existing login:', error);
      } finally {
        if (isMounted) {
          setCheckingLogin(false);
        }
      }
    };

    checkExistingLogin();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    if (!email.includes('@')) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Attempting login with:', { email: email.toLowerCase().trim() });
      
      const response = await authAPI.login(email, password);
      
      console.log('✅ Login response:', response.data);
      
      if (response.data.success) {
        // ✅ FIXED: Get driver data (mapped from user in apiService)
        const driverData = response.data.driver || response.data.user;
        
        if (!driverData || !driverData.id) {
          throw new Error('Invalid user data received');
        }

        // Store auth data
        await setAuthToken(response.data.token);
        await AsyncStorage.setItem('userId', driverData.id);
        await AsyncStorage.setItem('userData', JSON.stringify(driverData));
        
        console.log('✅ Auth data stored successfully');
        console.log('  - User ID:', driverData.id);
        console.log('  - Role:', driverData.role);

        // Navigate to dashboard
        navigation.replace('DriverDashboard', {
          driver: driverData
        });
        
        Alert.alert("Success", "Logged in successfully!");
      } else {
        Alert.alert("Login Failed", response.data.message || "Unknown error occurred");
      }
    } catch (error) {
      console.error('❌ Login error details:', error);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        errorMessage = "Cannot connect to server. Please check:\n• Your internet connection\n• Server is running\n• Correct server IP address";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid email or password format";
      } else if (error.response?.status === 401) {
        errorMessage = "Invalid email or password";
      } else if (error.response?.status === 403) {
        errorMessage = error.response.data?.message || "This account is not registered as a driver";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Login Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPress = () => {
    navigation.navigate('DriverRegistration');
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
      marginBottom: 40
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8f9fa'
    }
  };

  if (checkingLogin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#afd826" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Checking login status...</Text>
      </View>
    );
  }

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
          onPress={() => Alert.alert("Forgot Password", "Password recovery feature will be implemented soon.")}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login →</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <TouchableOpacity 
            onPress={handleRegisterPress}
            disabled={loading}
          >
            <Text style={styles.signupLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default DriverLoginScreen;