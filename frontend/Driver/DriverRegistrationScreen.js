import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import * as Location from "expo-location";
import axios from "axios";

// ══════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════
const API_BASE_URL = Platform.select({
  ios: "http://localhost:3000",
  android: "http://172.21.243.83:3000",
  default: "http://172.21.243.83:3000"
});

const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

const COLORS = {
  brand: "#afd826",
  brandDark: "#8ab81e",
  brandLight: "#f0fce4",
  error: "#ef4444",
  text: "#333",
  textLight: "#666",
  textLighter: "#999",
  border: "#ddd",
  background: "#F4F6F0",
  white: "#fff",
  inputBg: "#fafafa",
};

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════
export default function DriverRegisterScreen({ navigation }) {
  // ── State Management ──────────────────────────────────
  const [step, setStep] = useState("form");
  const [serverConnected, setServerConnected] = useState(true);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    license: "",
    vehicleNo: "",
  });
  const [errors, setErrors] = useState({});

  // Location
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLocation, setHomeLocation] = useState(null);

  // Location Search Modal
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Transporter
  const [transporters, setTransporters] = useState([]);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [fetchingTransporters, setFetchingTransporters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Computed Values ───────────────────────────────────
  const homeMapUrl = useMemo(() => {
    if (!homeLocation) return null;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${homeLocation.latitude},${homeLocation.longitude}&zoom=15&size=600x200&markers=color:green%7Clabel:H%7C${homeLocation.latitude},${homeLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
  }, [homeLocation]);

  // ── Effects ───────────────────────────────────────────
  useEffect(() => {
    checkServerConnection();
  }, []);

  // ── API Functions ─────────────────────────────────────
  const checkServerConnection = useCallback(async () => {
    try {
      console.log("🌐 Checking server connection at:", API_BASE_URL);
      const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
      console.log("✅ Server connected:", response.status);
      setServerConnected(true);
    } catch (err) {
      console.error("❌ Server connection failed:", err.message);
      setServerConnected(false);
      Alert.alert(
        "Connection Error",
        `Cannot connect to server at ${API_BASE_URL}\n\nPlease ensure:\n• Backend server is running on port 3000\n• IP address ${API_BASE_URL.split('://')[1].split(':')[0]} is correct\n• Both devices are on same WiFi\n• Firewall allows connection`,
        [
          { text: "Retry", onPress: checkServerConnection },
          { text: "Continue Anyway", style: "cancel" }
        ]
      );
    }
  }, []);

  const fetchTransporters = useCallback(async () => {
    setFetchingTransporters(true);
    try {
      console.log('🔍 Fetching transporters from:', `${API_BASE_URL}/api/users`);
      const res = await axios.get(`${API_BASE_URL}/api/users`, { timeout: 10000 });
      
      console.log('📦 Response:', res.data);
      
      if (res.data.success && res.data.users) {
        const transporterUsers = res.data.users.filter(
          (u) => u.role === "transporter" || u.role === "Transporter"
        );
        setTransporters(transporterUsers);
        console.log('✅ Transporters loaded:', transporterUsers.length);
        
        if (transporterUsers.length === 0) {
          Alert.alert("Info", "No transporters found in database. Please try again later or contact support.");
        }
      } else {
        setTransporters([]);
        Alert.alert("Error", "Invalid response from server");
      }
    } catch (err) {
      console.error("❌ Fetch transporters error:", err);
      Alert.alert(
        "Connection Error",
        "Failed to load transporters. Please check your connection and try again.",
        [
          { text: "Retry", onPress: fetchTransporters },
          { text: "Cancel", style: "cancel" }
        ]
      );
      setTransporters([]);
    } finally {
      setFetchingTransporters(false);
    }
  }, []);

  // ── Location Functions ────────────────────────────────
  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access to continue.");
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      
      try {
        const res = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        if (res.data.status === "OK" && res.data.results.length > 0) {
          setHomeAddress(res.data.results[0].formatted_address);
        } else {
          setHomeAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
        }
      } catch {
        setHomeAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      }
      
      setHomeLocation(coords);
      
      // Clear location error if exists
      if (errors.location) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.location;
          return newErrors;
        });
      }
    } catch (err) {
      console.error("Location error:", err);
      Alert.alert("Error", "Failed to get current location.");
    }
  }, [errors.location]);

  const searchLocation = useCallback(async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    setSearchingLocation(true);
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_MAPS_API_KEY}&components=country:pk`
      );
      if (res.data.status === "OK") {
        setSearchResults(res.data.predictions);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setSearchingLocation(false);
    }
  }, []);

  const selectSearchResult = useCallback(async (placeId, description) => {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      if (res.data.status === "OK") {
        const loc = res.data.result.geometry.location;
        setHomeAddress(description);
        setHomeLocation({ latitude: loc.lat, longitude: loc.lng });
        setSearchModalVisible(false);
        setSearchQuery("");
        setSearchResults([]);
        
        // Clear location error if exists
        if (errors.location) {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.location;
            return newErrors;
          });
        }
      }
    } catch (err) {
      console.error("Place details error:", err);
      Alert.alert("Error", "Failed to get location details.");
    }
  }, [errors.location]);

  // ── Form Validation ───────────────────────────────────
  const validateForm = useCallback(() => {
    const e = {};
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneReg = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    
    if (!formData.fullName.trim() || formData.fullName.trim().length < 3)
      e.fullName = "Full name must be at least 3 characters.";
    if (!formData.email.trim() || !emailReg.test(formData.email.trim()))
      e.email = "Please enter a valid email address.";
    if (!formData.phone.trim() || !phoneReg.test(formData.phone.trim()))
      e.phone = "Please enter a valid phone number (e.g., +92 3XX XXXXXXX).";
    if (!formData.password.trim() || formData.password.trim().length < 6)
      e.password = "Password must be at least 6 characters.";
    if (!formData.license.trim() || formData.license.trim().length < 4)
      e.license = "Please enter a valid license number.";
    if (!formData.vehicleNo.trim() || formData.vehicleNo.trim().length < 3)
      e.vehicleNo = "Please enter a valid vehicle number.";
    if (!homeLocation)
      e.location = "Please select your home / pickup location.";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [formData, homeLocation]);

  // ── Form Handlers ─────────────────────────────────────
  const updateFormField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleNextStep = useCallback(() => {
    Keyboard.dismiss();
    if (!validateForm()) return;
    fetchTransporters();
    setSelectedTransporter(null);
    setStep("transporter");
  }, [validateForm, fetchTransporters]);

  const handleSendRequest = useCallback(async () => {
    if (!selectedTransporter) {
      Alert.alert("Select a Transporter", "Please choose a transporter to continue.");
      return;
    }
    
    setSubmitting(true);
    try {
      const requestData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password.trim(),
        license: formData.license.trim().toUpperCase(),
        vehicleNo: formData.vehicleNo.trim().toUpperCase(),
        address: homeAddress,
        location: {
          type: "Point",
          coordinates: [homeLocation.longitude, homeLocation.latitude],
          address: homeAddress
        },
        transporterId: selectedTransporter._id,
        transporterName: selectedTransporter.name || 
                        selectedTransporter.fullName || 
                        selectedTransporter.company || 
                        'Transporter',
      };

      console.log("📤 Sending driver request to:", `${API_BASE_URL}/api/driver-requests`);
      console.log("📦 Request data:", JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        `${API_BASE_URL}/api/driver-requests`,
        requestData,
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log("✅ Response status:", response.status);
      console.log("✅ Response data:", response.data);

      if (response.data.success) {
        Alert.alert(
          "Request Sent Successfully! ✓",
          `Your driver request has been sent to ${
            selectedTransporter.name || selectedTransporter.company || 'Transporter'
          }.\n\nYou'll be notified at ${formData.email.trim().toLowerCase()} once approved.`,
          [
            {
              text: "Go to Login",
              onPress: () => {
                // Reset form
                setFormData({
                  fullName: "",
                  email: "",
                  phone: "",
                  password: "",
                  license: "",
                  vehicleNo: "",
                });
                setHomeAddress("");
                setHomeLocation(null);
                setSelectedTransporter(null);
                setStep("form");
                navigation.navigate("DriverLogin");
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to send request.");
      }
    } catch (err) {
      console.error("❌ Request error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      if (err.response) {
        Alert.alert(
          "Registration Failed",
          err.response.data.message || err.response.data.error || "Failed to send request. Please try again."
        );
      } else if (err.request) {
        Alert.alert(
          "Network Error",
          `Cannot connect to server.\n\nPlease ensure:\n• Server is running\n• IP: ${API_BASE_URL}\n• Same WiFi network`,
          [
            { text: "Retry", onPress: handleSendRequest },
            { text: "Cancel", style: "cancel" }
          ]
        );
      } else {
        Alert.alert("Error", err.message || "Failed to send request.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedTransporter, formData, homeAddress, homeLocation, navigation]);

  // ══════════════════════════════════════════════════════
  // UI COMPONENTS
  // ══════════════════════════════════════════════════════
  const InputField = useCallback(({ 
    label, 
    value, 
    onChange, 
    placeholder, 
    keyboardType, 
    autoCapitalize, 
    errorKey, 
    secureTextEntry,
    returnKeyType = "next",
    onSubmitEditing
  }) => (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>
        {label} <Text style={{ color: COLORS.error }}>*</Text>
      </Text>
      <TextInput
        style={[styles.input, errors[errorKey] ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLighter}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || "words"}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        returnKeyType={returnKeyType}
        blurOnSubmit={returnKeyType === "done"}
        enablesReturnKeyAutomatically={true}
        onSubmitEditing={onSubmitEditing}
      />
      {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
    </View>
  ), [errors]);

  const StepBar = useCallback(() => (
    <View style={styles.stepWrap}>
      <View style={styles.stepRow}>
        {step === "form" ? (
          <View style={[styles.stepDot, styles.stepActive]} />
        ) : (
          <View style={styles.stepDone}>
            <Text style={styles.stepDoneText}>✓</Text>
          </View>
        )}
        <View style={[styles.stepLine, step === "transporter" && { backgroundColor: COLORS.brand }]} />
        <View style={[styles.stepDot, step === "transporter" && styles.stepActive]} />
      </View>
      <View style={styles.stepLabelRow}>
        <Text style={[styles.stepLabel, { color: COLORS.brandDark }]}>Your Info</Text>
        <Text style={[styles.stepLabel, { color: step === "transporter" ? COLORS.brandDark : COLORS.textLighter }]}>
          Select Transporter
        </Text>
      </View>
    </View>
  ), [step]);

  const Logo = useCallback(() => (
    <View style={styles.logoWrap}>
      <View style={styles.logoCircle}>
        <Image
          source={{ uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp" }}
          style={styles.logoImg}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.brand}>RAAHI</Text>
      <Text style={styles.brandSub}>Driver Registration</Text>
    </View>
  ), []);

  // ══════════════════════════════════════════════════════
  // RENDER SCREENS
  // ══════════════════════════════════════════════════════
  
  // Server Connection Error Screen
  if (!serverConnected) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📡</Text>
        <Text style={styles.errorTitle}>Connection Failed</Text>
        <Text style={styles.errorMessage}>
          Cannot connect to server at:{'\n'}
          {API_BASE_URL}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkServerConnection}>
          <Text style={styles.retryTxt}>🔄 Retry Connection</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryBtn, { backgroundColor: '#6b7280', marginTop: 12 }]} 
          onPress={() => setServerConnected(true)}
        >
          <Text style={styles.retryTxt}>Continue Anyway</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════
  // STEP 1 — Registration Form
  // ════════════════════════════════════════════════════
  if (step === "form") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Logo />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create Driver Profile</Text>
              <Text style={styles.cardDesc}>
                Fill in your details and select your home location. Then choose a transporter to send your request.
              </Text>

              <StepBar />

              {/* Personal Info */}
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <InputField 
                label="Full Name" 
                value={formData.fullName} 
                onChange={(v) => updateFormField('fullName', v)}
                placeholder="e.g. Ahmed Raza" 
                errorKey="fullName" 
                returnKeyType="next"
              />
              <InputField 
                label="Email Address" 
                value={formData.email} 
                onChange={(v) => updateFormField('email', v)}
                placeholder="driver@example.com" 
                keyboardType="email-address" 
                autoCapitalize="none" 
                errorKey="email" 
                returnKeyType="next"
              />
              <InputField 
                label="Phone Number" 
                value={formData.phone} 
                onChange={(v) => updateFormField('phone', v)}
                placeholder="+92 3XX XXXXXXX" 
                keyboardType="phone-pad" 
                autoCapitalize="none" 
                errorKey="phone" 
                returnKeyType="next"
              />
              <InputField 
                label="Password" 
                value={formData.password} 
                onChange={(v) => updateFormField('password', v)}
                placeholder="Minimum 6 characters" 
                autoCapitalize="none" 
                errorKey="password"
                secureTextEntry
                returnKeyType="next"
              />

              {/* Vehicle Info */}
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <InputField 
                label="License Number" 
                value={formData.license} 
                onChange={(v) => updateFormField('license', v)}
                placeholder="e.g. LHR-12345" 
                autoCapitalize="characters" 
                errorKey="license" 
                returnKeyType="next"
              />
              <InputField 
                label="Vehicle Number" 
                value={formData.vehicleNo} 
                onChange={(v) => updateFormField('vehicleNo', v)}
                placeholder="e.g. LEA-1234" 
                autoCapitalize="characters" 
                errorKey="vehicleNo" 
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              {/* Location */}
              <Text style={styles.sectionTitle}>Home / Pickup Location</Text>

              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Text style={styles.locationDot}>📍</Text>
                  <Text style={styles.locationLabel}>Select Your Location</Text>
                </View>

                {homeAddress ? (
                  <View style={styles.selectedLocation}>
                    <Text style={styles.selectedLocationText}>{homeAddress}</Text>
                    {homeMapUrl && (
                      <Image
                        source={{ uri: homeMapUrl }}
                        style={styles.miniMap}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                ) : null}

                {errors.location ? (
                  <Text style={[styles.errorText, { marginBottom: 6 }]}>{errors.location}</Text>
                ) : null}

                <View style={styles.locationButtons}>
                  <TouchableOpacity
                    style={styles.locationBtn}
                    onPress={getCurrentLocation}
                  >
                    <Text style={styles.locationBtnIcon}>🧭</Text>
                    <Text style={styles.locationBtnText}>Current Location</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.locationBtn}
                    onPress={() => setSearchModalVisible(true)}
                  >
                    <Text style={styles.locationBtnIcon}>🔍</Text>
                    <Text style={styles.locationBtnText}>Search Area</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Approval Note */}
              <View style={styles.approvalNote}>
                <Text style={styles.approvalNoteText}>
                  📝 Your registration will be reviewed by the transporter. You'll be notified via email once approved.
                </Text>
              </View>

              {/* Next Button */}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep}>
                <Text style={styles.primaryBtnTxt}>Next → Select Transporter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate("DriverLogin")}
              >
                <Text style={styles.linkTxt}>
                  Already registered?{" "}
                  <Text style={styles.linkHL}>Login here</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>Safe. Reliable. Professional Raahi Service.</Text>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Location Search Modal */}
        <Modal visible={searchModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1, justifyContent: "flex-end" }}
            >
              <View style={styles.searchModalBox}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Search Location</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSearchModalVisible(false);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchInputWrap}>
                  <Text style={styles.searchInputIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for location..."
                    placeholderTextColor={COLORS.textLighter}
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      searchLocation(text);
                    }}
                    autoFocus
                    returnKeyType="search"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>

                {searchingLocation ? (
                  <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 20 }} />
                ) : null}

                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.place_id}
                  style={{ maxHeight: 300 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => selectSearchResult(item.place_id, item.description)}
                    >
                      <Text style={styles.searchResultIcon}>📍</Text>
                      <Text style={styles.searchResultText}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    searchQuery.length >= 3 && !searchingLocation ? (
                      <Text style={styles.noResults}>No locations found</Text>
                    ) : null
                  }
                />
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════
  // STEP 2 — Select Transporter
  // ════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.formScroll}
        showsVerticalScrollIndicator={false}
      >
        <Logo />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Your Transporter</Text>
          <Text style={styles.cardDesc}>
            Choose a transporter to work with. They will review your application.
          </Text>

          <StepBar />

          {/* Transporter List */}
          {fetchingTransporters ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color={COLORS.brand} />
              <Text style={{ marginTop: 12, color: COLORS.textLight }}>Loading transporters...</Text>
            </View>
          ) : transporters.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📦</Text>
              <Text style={styles.emptyStateText}>No transporters available</Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 16 }]}
                onPress={fetchTransporters}
              >
                <Text style={styles.primaryBtnTxt}>🔄 Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {transporters.map((t) => {
                const isSelected = selectedTransporter?._id === t._id;
                return (
                  <TouchableOpacity
                    key={t._id}
                    style={[
                      styles.transporterCard,
                      isSelected && styles.transporterCardSelected,
                    ]}
                    onPress={() => setSelectedTransporter(t)}
                  >
                    <View style={styles.transporterRow}>
                      <View style={styles.transporterInfo}>
                        <Text style={styles.transporterName}>
                          {t.name || t.fullName || t.company || "Transporter"}
                        </Text>
                        {t.email && (
                          <Text style={styles.transporterEmail}>📧 {t.email}</Text>
                        )}
                        {t.phone && (
                          <Text style={styles.transporterPhone}>📞 {t.phone}</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Buttons */}
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!selectedTransporter || submitting) && styles.primaryBtnDisabled,
              ]}
              onPress={handleSendRequest}
              disabled={!selectedTransporter || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryBtnTxt}>
                  Send Request to {selectedTransporter?.name || selectedTransporter?.company || "Transporter"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, styles.secondaryBtn, { marginTop: 12 }]}
              onPress={() => setStep("form")}
            >
              <Text style={styles.secondaryBtnTxt}>← Back to Form</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Safe. Reliable. Professional Raahi Service.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImg: {
    width: 60,
    height: 60,
  },
  brand: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.brandDark,
    marginTop: 8,
  },
  brandSub: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 20,
  },
  stepWrap: {
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  stepActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brand,
  },
  stepDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDoneText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  stepLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.inputBg,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  locationCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: COLORS.inputBg,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationDot: {
    fontSize: 20,
    marginRight: 8,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  selectedLocation: {
    marginBottom: 12,
  },
  selectedLocationText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 10,
  },
  miniMap: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  locationButtons: {
    flexDirection: "row",
    gap: 10,
  },
  locationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.brand,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  locationBtnIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  locationBtnText: {
    fontSize: 13,
    color: COLORS.brandDark,
    fontWeight: "600",
  },
  approvalNote: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 24,
  },
  approvalNoteText: {
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnTxt: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.brand,
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryBtnTxt: {
    color: COLORS.brandDark,
    fontSize: 16,
    fontWeight: "bold",
  },
  linkRow: {
    marginTop: 16,
    alignItems: "center",
  },
  linkTxt: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  linkHL: {
    color: COLORS.brandDark,
    fontWeight: "bold",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textLighter,
    marginTop: 24,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  searchModalBox: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 28,
    color: COLORS.textLighter,
    fontWeight: "300",
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.inputBg,
    marginBottom: 16,
  },
  searchInputIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  noResults: {
    textAlign: "center",
    color: COLORS.textLighter,
    fontSize: 14,
    marginTop: 20,
  },
  transporterCard: {
    borderWidth: 2,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.inputBg,
  },
  transporterCardSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  transporterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transporterInfo: {
    flex: 1,
  },
  transporterName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  transporterEmail: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  transporterPhone: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  radioOuterSelected: {
    borderColor: COLORS.brand,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.brand,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLighter,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryTxt: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});