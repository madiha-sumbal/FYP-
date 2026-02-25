// screens/TransporterRegisterScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const API_BASE_URL = 'http://192.168.10.12:3000/api';
const GOOGLE_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

export default function TransporterRegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    companyName: "",
    country: "",
    city: "",
    zone: ""
  });
  const [profileImage, setProfileImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState({
    latitude: 33.6844,
    longitude: 73.0479,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  });

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMsg("");
  };

  const pickImage = async (source) => {
    let result;
    if (source === 'camera') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert("Permission Required", "Camera access is needed to take photos.");
        setImageModalVisible(false);
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!galleryPermission.granted) {
        Alert.alert("Permission Required", "Gallery access is needed to select photos.");
        setImageModalVisible(false);
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      setImageModalVisible(false);
    } else {
      setImageModalVisible(false);
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setImageModalVisible(false);
  };

  const selectLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to select area.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };
      setRegion(newRegion);
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      setLocationModalVisible(true);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Could not get your current location.");
    }
  };

  const fetchAreaDetails = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === "OK" && data.results.length > 0) {
        const addressComponents = data.results[0].address_components;
        let country = "", city = "", zone = "";
        
        addressComponents.forEach(component => {
          if (component.types.includes("country")) {
            country = component.long_name;
          } else if (component.types.includes("administrative_area_level_1")) {
            city = component.long_name;
          } else if (component.types.includes("sublocality_level_1") || 
                     component.types.includes("locality")) {
            zone = component.long_name;
          }
        });
        
        setFormData(prev => ({
          ...prev,
          country: country || prev.country,
          city: city || prev.city,
          zone: zone || prev.zone
        }));

        return true;
      }
      return false;
    } catch (err) {
      console.error("Error fetching area details:", err);
      Alert.alert("Error", "Could not fetch area details from map.");
      return false;
    }
  };

  const confirmLocation = async () => {
    if (location) {
      const success = await fetchAreaDetails(location.latitude, location.longitude);
      if (success) {
        setLocationModalVisible(false);
      }
    } else {
      Alert.alert("Error", "Please select a location on the map.");
    }
  };

  const validateAndRegister = async () => {
    setErrorMsg("");
    const { fullName, companyName, phone, country, city, zone, email, password, confirmPassword } = formData;

    // Check all required fields
    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!companyName.trim()) {
      setErrorMsg("Company name is required.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Phone number is required.");
      return;
    }
    if (!country.trim() || !city.trim() || !zone.trim()) {
      setErrorMsg("Please select your area on the map.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Email is required.");
      return;
    }
    if (!password) {
      setErrorMsg("Password is required.");
      return;
    }
    if (!confirmPassword) {
      setErrorMsg("Please confirm your password.");
      return;
    }

    // Validate full name
    const nameRegex = /^[A-Za-z ]{2,50}$/;
    if (!nameRegex.test(fullName)) {
      setErrorMsg("Full name must be 2-50 characters long and contain only letters and spaces.");
      return;
    }

    // Validate phone
    const phoneRegex = /^[0-9+]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      setErrorMsg("Please enter a valid phone number (10-15 digits).");
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("Invalid email format. Please enter a valid email address.");
      return;
    }

    // Validate password
    const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,16}$/;
    if (!passRegex.test(password)) {
      setErrorMsg("Password must be 8-16 characters and contain an uppercase letter, a digit, and a special character.");
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    // Check profile image
    if (!profileImage) {
      setErrorMsg("Please upload a profile image.");
      return;
    }

    setLoading(true);

    try {
      // Create FormData for image upload
      const formDataToSend = new FormData();
      
      // Add all text fields
      formDataToSend.append('email', email.trim());
      formDataToSend.append('password', password);
      formDataToSend.append('fullName', fullName.trim());
      formDataToSend.append('phone', phone.trim());
      formDataToSend.append('companyName', companyName.trim());
      formDataToSend.append('country', country.trim());
      formDataToSend.append('city', city.trim());
      formDataToSend.append('zone', zone.trim());
      
      // Add profile image
      const imageUri = profileImage;
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formDataToSend.append('profileImage', {
        uri: imageUri,
        name: filename || 'profile.jpg',
        type: type,
      });

      console.log('Sending registration request...');

      const response = await fetch(`${API_BASE_URL}/transporter/register`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formDataToSend
      });

      const responseText = await response.text();
      console.log('Server response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON parse error:', e);
        setErrorMsg("Invalid response from server.");
        setLoading(false);
        return;
      }

      if (response.ok && data.success) {
        Alert.alert(
          "Success",
          data.message || "Registration successful!",
          [
            {
              text: "OK",
              onPress: () => {
                // Clear form
                setFormData({
                  email: "",
                  password: "",
                  confirmPassword: "",
                  fullName: "",
                  phone: "",
                  companyName: "",
                  country: "",
                  city: "",
                  zone: ""
                });
                setProfileImage(null);
                navigation.navigate("TransporterLogin");
              },
            },
          ]
        );
      } else {
        setErrorMsg(data.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp" }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Transporter Registration</Text>
        <Text style={styles.headerSubtitle}>Create your transporter account</Text>
      </View>

      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          <TouchableOpacity
            style={styles.profileImageWrapper}
            onPress={() => setImageModalVisible(true)}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <Ionicons name="camera" size={40} color="#9ca3af" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setImageModalVisible(true)}
          >
            <Ionicons name={profileImage ? "sync" : "cloud-upload"} size={16} color="#fff" />
            <Text style={styles.uploadButtonText}>
              {profileImage ? "Change Photo" : "Upload Photo"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Full Name */}
        <Text style={styles.label}>Full Name *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your full name"
            placeholderTextColor="#9ca3af"
            value={formData.fullName}
            onChangeText={text => updateFormData('fullName', text)}
            style={styles.input}
          />
        </View>

        {/* Company Name */}
        <Text style={styles.label}>Company Name *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your company name"
            placeholderTextColor="#9ca3af"
            value={formData.companyName}
            onChangeText={text => updateFormData('companyName', text)}
            style={styles.input}
          />
        </View>

        {/* Phone Number */}
        <Text style={styles.label}>Phone Number *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your phone number"
            placeholderTextColor="#9ca3af"
            value={formData.phone}
            onChangeText={text => updateFormData('phone', text)}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        {/* Location Picker */}
        <Text style={styles.label}>Select Your Area *</Text>
        <TouchableOpacity
          style={[styles.inputContainer, { justifyContent: "center" }]}
          onPress={selectLocation}
        >
          <Text style={{ color: formData.city ? "#111827" : "#9ca3af" }}>
            {formData.city
              ? `${formData.zone}, ${formData.city}, ${formData.country}`
              : "Tap to choose your area on map"}
          </Text>
        </TouchableOpacity>

        {/* Email */}
        <Text style={styles.label}>Email Address *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your email address"
            placeholderTextColor="#9ca3af"
            value={formData.email}
            onChangeText={text => updateFormData('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>Password *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Create a password"
            placeholderTextColor="#9ca3af"
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            secureTextEntry
            style={styles.input}
          />
        </View>

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Confirm your password"
            placeholderTextColor="#9ca3af"
            value={formData.confirmPassword}
            onChangeText={text => updateFormData('confirmPassword', text)}
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

        {/* Register Button */}
        <TouchableOpacity
          onPress={validateAndRegister}
          style={styles.registerButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="person-add" size={20} color="#fff" />
          )}
          <Text style={styles.registerButtonText}>
            {loading ? "Registering..." : "Register"}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("TransporterLogin")}>
            <Text style={styles.loginLink}>Login Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={imageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Profile Photo</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => pickImage('camera')}
            >
              <Ionicons name="camera" size={24} color="#374151" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => pickImage('gallery')}
            >
              <Ionicons name="image" size={24} color="#374151" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity style={styles.modalOption} onPress={removeImage}>
                <Ionicons name="trash" size={24} color="#dc2626" />
                <Text style={[styles.modalOptionText, { color: "#dc2626" }]}>
                  Remove Photo
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.mapHeader}>
            <TouchableOpacity
              onPress={() => setLocationModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.mapHeaderText}>Select Your Location</Text>
          </View>
          <MapView
            style={{ flex: 1 }}
            region={region}
            onPress={e => setLocation(e.nativeEvent.coordinate)}
          >
            {location && <Marker coordinate={location} />}
          </MapView>
          <TouchableOpacity
            onPress={confirmLocation}
            style={styles.confirmLocationButton}
            disabled={!location}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.confirmLocationText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: "#afd826",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 30,
    alignItems: "center"
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 16,
    borderRadius: 35,
    backgroundColor: "#fff",
    padding: 8
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center"
  },
  headerSubtitle: {
    color: "#f0f9d8",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "500",
    textAlign: "center"
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40
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
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 24
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#afd826",
    overflow: "hidden"
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  uploadButton: {
    backgroundColor: "#afd826",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
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
  registerButton: {
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 8
  },
  registerButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.5
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40
  },
  loginText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "500"
  },
  loginLink: {
    color: "#afd826",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    marginLeft: 12
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16
  },
  mapHeader: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  closeButton: {
    marginRight: 15
  },
  mapHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  confirmLocationButton: {
    padding: 16,
    backgroundColor: "#afd826",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8
  },
  confirmLocationText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  }
});