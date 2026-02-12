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

const API_BASE_URL = 'http://192.168.10.6:3000/api';
const GOOGLE_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

export default function TransporterRegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
    companyName: "",
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
  const [areaDetails, setAreaDetails] = useState({ country: "", city: "", zone: "" });

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMsg("");
  };

  const pickImage = async (source) => {
    setImageModalVisible(true);
    
    let result;
    if (source === 'camera') {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert("Permission Required", "Camera access is needed to take photos.");
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
    }
  };

  const removeImage = () => {
    setProfileImage(null);
    setImageModalVisible(false);
  };

  const selectLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required to select area.");
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    setRegion({
      ...region,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude
    });
    setLocationModalVisible(true);
  };

  const fetchAreaDetails = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      if (data.status === "OK") {
        const addressComponents = data.results[0].address_components;
        let country = "", city = "", zone = "";
        addressComponents.forEach(component => {
          if (component.types.includes("country")) country = component.long_name;
          else if (component.types.includes("administrative_area_level_1")) city = component.long_name;
          else if (component.types.includes("sublocality_level_1") || component.types.includes("locality")) zone = component.long_name;
        });
        setAreaDetails({ country, city, zone });
        setFormData(prev => ({
          ...prev,
          country,
          city,
          zone
        }));
      }
    } catch (err) {
      console.error("Error fetching area details:", err);
      Alert.alert("Error", "Could not fetch area details from map.");
    }
  };

  const confirmLocation = () => {
    if (location) {
      fetchAreaDetails(location.latitude, location.longitude);
    }
    setLocationModalVisible(false);
  };

  const validateAndRegister = async () => {
    setErrorMsg("");
    const { fullName, companyName, phone, country, city, zone, email, password, confirmPassword } = formData;

    if (!fullName.trim() || !companyName.trim() || !phone.trim() || !country.trim() || !city.trim() || !zone.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMsg("All fields are required.");
      return;
    }

    const nameRegex = /^[A-Za-z ]{2,50}$/;
    if (!nameRegex.test(fullName)) { setErrorMsg("Full name must be 2-50 characters long and contain only letters and spaces."); return; }

    const phoneRegex = /^[0-9+]{10,15}$/;
    if (!phoneRegex.test(phone)) { setErrorMsg("Please enter a valid phone number (10-15 digits)."); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setErrorMsg("Invalid email format. Please enter a valid email address."); return; }

    const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,16}$/;
    if (!passRegex.test(password)) { setErrorMsg("Password must be 8-16 characters and contain an uppercase letter, a digit, and a special character."); return; }

    if (password !== confirmPassword) { setErrorMsg("Passwords do not match."); return; }

    if (!profileImage) { setErrorMsg("Please upload a profile image."); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/transporter/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, profileImage })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", data.message, [
          { text: "OK", onPress: () => navigation.navigate("TransporterDashboard") },
        ]);
      } else setErrorMsg(data.message);
    } catch (error) {
      console.error('Registration error:', error);
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp" }}
          style={styles.logo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Transporter Registration</Text>
        <Text style={styles.headerSubtitle}>Create your transporter account</Text>
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          <TouchableOpacity style={styles.profileImageWrapper} onPress={() => setImageModalVisible(true)}>
            {profileImage ? (<Image source={{ uri: profileImage }} style={styles.profileImage} />)
              : (<Ionicons name="camera" size={40} color="#9ca3af" />)}
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadButton} onPress={() => setImageModalVisible(true)}>
            <Ionicons name={profileImage ? "sync" : "cloud-upload"} size={16} color="#fff" />
            <Text style={styles.uploadButtonText}>{profileImage ? "Change Photo" : "Upload Photo"}</Text>
          </TouchableOpacity>
        </View>

        {/* Full Name */}
        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Enter your full name" placeholderTextColor="#9ca3af"
            value={formData.fullName} onChangeText={text => updateFormData('fullName', text)} style={styles.input} />
        </View>

        {/* Company Name */}
        <Text style={styles.label}>Company Name</Text>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Enter your company name" placeholderTextColor="#9ca3af"
            value={formData.companyName} onChangeText={text => updateFormData('companyName', text)} style={styles.input} />
        </View>

        {/* Phone Number */}
        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Enter your phone number" placeholderTextColor="#9ca3af"
            value={formData.phone} onChangeText={text => updateFormData('phone', text)}
            keyboardType="phone-pad" style={styles.input} />
        </View>

        {/* Location Picker */}
        <Text style={styles.label}>Select Your Area</Text>
        <TouchableOpacity
          style={[styles.inputContainer, { justifyContent: "center" }]}
          onPress={selectLocation}
        >
          <Text style={{ color: areaDetails.city ? "#111827" : "#9ca3af" }}>
            {areaDetails.city ? `${areaDetails.zone}, ${areaDetails.city}, ${areaDetails.country}` : "Tap to choose your area on map"}
          </Text>
        </TouchableOpacity>

        {/* Email */}
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Enter your email address" placeholderTextColor="#9ca3af"
            value={formData.email} onChangeText={text => updateFormData('email', text)}
            keyboardType="email-address" autoCapitalize="none" style={styles.input} />
        </View>

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Create a password" placeholderTextColor="#9ca3af"
            value={formData.password} onChangeText={text => updateFormData('password', text)}
            secureTextEntry style={styles.input} />
        </View>

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputContainer}>
          <TextInput placeholder="Confirm your password" placeholderTextColor="#9ca3af"
            value={formData.confirmPassword} onChangeText={text => updateFormData('confirmPassword', text)}
            secureTextEntry style={styles.input} />
        </View>

        {/* Error */}
        {errorMsg ? (<View style={styles.errorContainer}><Text style={styles.errorText}>{errorMsg}</Text></View>) : null}

        {/* Register Button */}
        <TouchableOpacity onPress={validateAndRegister} style={styles.registerButton} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="person-add" size={20} color="#fff" />}
          <Text style={styles.registerButtonText}>{loading ? "Registering..." : "Register"}</Text>
        </TouchableOpacity>

        {/* Login */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("TransporterLogin")}>
            <Text style={styles.loginLink}>Login Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal visible={imageModalVisible} animationType="slide" transparent onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Profile Photo</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => pickImage('camera')}>
              <Ionicons name="camera" size={24} color="#374151" /><Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => pickImage('gallery')}>
              <Ionicons name="image" size={24} color="#374151" /><Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            {profileImage && (<TouchableOpacity style={styles.modalOption} onPress={removeImage}>
              <Ionicons name="trash" size={24} color="#dc2626" /><Text style={[styles.modalOptionText, { color: "#dc2626" }]}>Remove Photo</Text>
            </TouchableOpacity>)}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setImageModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal visible={locationModalVisible} animationType="slide" onRequestClose={() => setLocationModalVisible(false)}>
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={region}
            onPress={e => setLocation(e.nativeEvent.coordinate)}
          >
            {location && <Marker coordinate={location} />}
          </MapView>
          <TouchableOpacity onPress={confirmLocation} style={{ padding: 16, backgroundColor: "#afd826", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm Location</Text>
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
  }
});