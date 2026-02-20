import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.18.49:3000/api';

export default function PassengerLogin({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);



  const handleLogin = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      
      const requestBody = {
        email: email.toLowerCase().trim(),
        password: password.trim(),
        role: 'passenger'
      };
      
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔐 PASSENGER LOGIN ATTEMPT");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📤 Request:", {
        email: requestBody.email,
        role: requestBody.role,
        password: "***HIDDEN***"
      });
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      console.log("📥 Response Status:", response.status);
      console.log("📥 Response Data:", {
        success: data.success,
        hasToken: !!data.token,
        hasUser: !!data.user,
        message: data.message
      });

      if (data.success && data.token && data.user) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ LOGIN SUCCESSFUL");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📦 User Data:");
        console.log("  - ID:", data.user.id || data.user._id);
        console.log("  - Name:", data.user.name);
        console.log("  - Email:", data.user.email);
        console.log("  - Role:", data.user.role);
        console.log("  - Transporter ID:", data.user.transporterId);
        
        // ✅ CRITICAL: Save auth data to AsyncStorage
        const userId = data.user.id || data.user._id;
        const userDataStr = JSON.stringify(data.user);
        
        console.log("💾 Saving to AsyncStorage...");
        
        await AsyncStorage.setItem('authToken', data.token);
        console.log("  ✅ Token saved");
        
        await AsyncStorage.setItem('userId', userId.toString());
        console.log("  ✅ User ID saved:", userId);
        
        await AsyncStorage.setItem('userData', userDataStr);
        console.log("  ✅ User data saved");
        
        // Verify data was saved
        const savedToken = await AsyncStorage.getItem('authToken');
        const savedUserId = await AsyncStorage.getItem('userId');
        const savedUserData = await AsyncStorage.getItem('userData');
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ VERIFICATION:");
        console.log("  - Token:", savedToken ? "✅ Saved (" + savedToken.substring(0, 20) + "...)" : "❌ Not saved");
        console.log("  - User ID:", savedUserId ? "✅ Saved (" + savedUserId + ")" : "❌ Not saved");
        console.log("  - User Data:", savedUserData ? "✅ Saved" : "❌ Not saved");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        if (!savedToken || !savedUserId) {
          console.error("❌ CRITICAL: Data not saved to AsyncStorage!");
          Alert.alert('Error', 'Failed to save login data. Please try again.');
          return;
        }
        
        console.log("🚀 Navigating to PassengerAppNavigation...");
        
        // Small delay to ensure AsyncStorage is fully written
        setTimeout(() => {
          // ✅ FIXED: Changed from 'PassengerDashboard' to 'PassengerAppNavigation'
          navigation.replace('PassengerAppNavigation');
        }, 100);
        
      } else {
        console.log("❌ Login failed:", data.message);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
        Alert.alert(
          'Login Failed',
          data.message || 'Invalid email or password. Please check your credentials and try again.'
        );
      }
    } catch (error) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error('❌ LOGIN ERROR:', error);
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      Alert.alert(
        'Connection Error',
        'Failed to connect to server. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigation.navigate('PassengerRequestScreen');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#A1D826', '#8BC220']}
          style={styles.header}
        >
          <Icon name="bus" size={80} color="#fff" style={styles.icon} />
          <Text style={styles.title}>Passenger Login</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={20} color="#A1D826" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color="#A1D826" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#A1D826', '#8BC220']}
              style={styles.loginButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginButtonText}>Login</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>Don't have an account? Register</Text>
          </TouchableOpacity>

          {/* Debug Button (Remove in production) */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                const token = await AsyncStorage.getItem('authToken');
                const userId = await AsyncStorage.getItem('userId');
                const userData = await AsyncStorage.getItem('userData');
                
                Alert.alert(
                  'Debug: Auth Data',
                  `Token: ${token ? 'Present' : 'Missing'}\nUser ID: ${userId || 'Missing'}\nUser Data: ${userData ? 'Present' : 'Missing'}`,
                  [
                    { text: 'Clear All', onPress: async () => {
                      await AsyncStorage.multiRemove(['authToken', 'userId', 'userData']);
                      Alert.alert('Cleared', 'All auth data cleared');
                    }},
                    { text: 'OK' }
                  ]
                );
              }}
            >
              <Text style={styles.debugButtonText}>🔧 Debug Auth Data</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#A1D826',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  registerButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#A1D826',
    fontSize: 16,
    fontWeight: '600',
  },
  debugButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
});