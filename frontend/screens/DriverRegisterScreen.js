// screens/DriverRegisterScreen.js
import React, { useState, useEffect } from "react";
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
} from "react-native";
import * as Location from "expo-location";
import axios from "axios";

// ── Config ──────────────────────────────────────────
const API_BASE_URL = "http://192.168.10.10:3000/api";
const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

const BRAND = "#afd826";
const BRAND_DARK = "#8ab81e";

export default function DriverRegisterScreen({ navigation }) {
  // ── Step: "form" | "transporter" ──────────────────
  const [step, setStep] = useState("form");

  // ── Form Fields ───────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [license, setLicense] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [errors, setErrors] = useState({});

  // ── Location ──────────────────────────────────────
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLocation, setHomeLocation] = useState(null); // { latitude, longitude }

  // ── Location Search Modal ─────────────────────────
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // ── Transporter State ─────────────────────────────
  const [transporters, setTransporters] = useState([]);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [fetchingTransporters, setFetchingTransporters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Map preview URL ───────────────────────────────
  const homeMapUrl = homeLocation
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${homeLocation.latitude},${homeLocation.longitude}&zoom=15&size=600x200&markers=color:green%7Clabel:H%7C${homeLocation.latitude},${homeLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`
    : null;

  // ── Fetch transporters from backend ───────────────
  const fetchTransporters = async () => {
    setFetchingTransporters(true);
    try {
      console.log('🔍 Fetching transporters from:', `${API_BASE_URL}/users`);
      const res = await axios.get(`${API_BASE_URL}/users`);
      
      console.log('📦 Response:', res.data);
      
      if (res.data.success && res.data.users) {
        const transporterUsers = res.data.users.filter(
          (u) => u.role === "transporter"
        );
        setTransporters(transporterUsers);
        console.log('✅ Transporters loaded:', transporterUsers.length);
        
        if (transporterUsers.length === 0) {
          Alert.alert("Info", "No transporters found. Please try again later.");
        }
      } else {
        setTransporters([]);
      }
    } catch (err) {
      console.error("❌ Fetch transporters error:", err);
      Alert.alert(
        "Error", 
        "Failed to load transporters. Please check your connection.",
        [
          { text: "Retry", onPress: () => fetchTransporters() },
          { text: "Cancel", style: "cancel" }
        ]
      );
      setTransporters([]);
    } finally {
      setFetchingTransporters(false);
    }
  };

  // ── Get current GPS location ──────────────────────
  const getCurrentLocation = async () => {
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
      // Reverse geocode
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
    } catch (err) {
      console.error("Location error:", err);
      Alert.alert("Error", "Failed to get current location.");
    }
  };

  // ── Search location via Google Places ─────────────
  const searchLocation = async (query) => {
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
  };

  // ── Select a search result → get coordinates ──────
  const selectSearchResult = async (placeId, description) => {
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
      }
    } catch (err) {
      console.error("Place details error:", err);
      Alert.alert("Error", "Failed to get location details.");
    }
  };

  // ── Form Validation ───────────────────────────────
  const validateForm = () => {
    const e = {};
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneReg = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    
    if (!fullName.trim() || fullName.trim().length < 3)
      e.fullName = "Full name must be at least 3 characters.";
    if (!email.trim() || !emailReg.test(email.trim()))
      e.email = "Please enter a valid email address.";
    if (!phone.trim() || !phoneReg.test(phone.trim()))
      e.phone = "Please enter a valid phone number (e.g., +92 3XX XXXXXXX).";
    if (!password.trim() || password.trim().length < 6)
      e.password = "Password must be at least 6 characters.";
    if (!license.trim() || license.trim().length < 4)
      e.license = "Please enter a valid license number.";
    if (!vehicleNo.trim() || vehicleNo.trim().length < 3)
      e.vehicleNo = "Please enter a valid vehicle number.";
    if (!homeLocation)
      e.location = "Please select your home / pickup location.";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step 1 → Step 2 ───────────────────────────────
  const handleNextStep = () => {
    if (!validateForm()) return;
    fetchTransporters();   // fetch fresh list every time
    setSelectedTransporter(null);
    setStep("transporter");
  };

  // ── Final Submit ──────────────────────────────────
  const handleSendRequest = async () => {
    if (!selectedTransporter) {
      Alert.alert("Select a Transporter", "Please choose a transporter to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const requestData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim(),
        license: license.trim().toUpperCase(),
        vehicleNo: vehicleNo.trim().toUpperCase(),
        address: homeAddress,
        latitude: homeLocation.latitude,
        longitude: homeLocation.longitude,
        transporterId: selectedTransporter._id,
        transporterName: selectedTransporter.name || selectedTransporter.company,
      };

      console.log("📤 Sending driver request:", requestData);

      const res = await axios.post(`${API_BASE_URL}/driver/request`, requestData);

      console.log("✅ Response:", res.data);

      if (res.data.success) {
        Alert.alert(
          "Request Sent Successfully! ✓",
          `Your driver request has been sent to ${
            selectedTransporter.name || selectedTransporter.company
          }.\n\nYou'll be notified at ${email.trim().toLowerCase()} once approved.`,
          [
            {
              text: "Go to Login",
              onPress: () => {
                // Reset form
                setFullName("");
                setEmail("");
                setPhone("");
                setPassword("");
                setLicense("");
                setVehicleNo("");
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
        Alert.alert("Error", res.data.message || "Failed to send request.");
      }
    } catch (err) {
      console.error("❌ Request error:", err);
      if (err.response) {
        Alert.alert("Error", err.response.data.message || "Failed to send request.");
      } else if (err.request) {
        Alert.alert("Network Error", "Cannot connect to server. Please check your connection.");
      } else {
        Alert.alert("Error", "Failed to send request.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reusable Input ────────────────────────────────
  const Field = ({ label, value, onChange, placeholder, keyboardType, autoCapitalize, errorKey, secureTextEntry }) => (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>
        {label} <Text style={{ color: "#ef4444" }}>*</Text>
      </Text>
      <TextInput
        style={[styles.input, errors[errorKey] ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        value={value}
        onChangeText={(v) => {
          onChange(v);
          if (errors[errorKey]) setErrors((p) => ({ ...p, [errorKey]: null }));
        }}
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || "words"}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
      />
      {errors[errorKey] ? <Text style={styles.errorText}>{errors[errorKey]}</Text> : null}
    </View>
  );

  // ── Step Indicator ────────────────────────────────
  const StepBar = () => (
    <View style={styles.stepWrap}>
      <View style={styles.stepRow}>
        {step === "form" ? (
          <View style={[styles.stepDot, styles.stepActive]} />
        ) : (
          <View style={styles.stepDone}>
            <Text style={styles.stepDoneText}>✓</Text>
          </View>
        )}
        <View style={[styles.stepLine, step === "transporter" && { backgroundColor: BRAND }]} />
        <View style={[styles.stepDot, step === "transporter" && styles.stepActive]} />
      </View>
      <View style={styles.stepLabelRow}>
        <Text style={[styles.stepLabel, { color: BRAND_DARK }]}>Your Info</Text>
        <Text style={[styles.stepLabel, { color: step === "transporter" ? BRAND_DARK : "#bbb" }]}>
          Select Transporter
        </Text>
      </View>
    </View>
  );

  // ════════════════════════════════════════════════════
  //  STEP 1 — Registration Form
  // ════════════════════════════════════════════════════
  if (step === "form") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F6F0" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
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

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create Driver Profile</Text>
              <Text style={styles.cardDesc}>
                Fill in your details and select your home location. Then choose a transporter to send your request.
              </Text>

              <StepBar />

              {/* ── Personal Info ── */}
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <Field 
                label="Full Name" 
                value={fullName} 
                onChange={setFullName} 
                placeholder="e.g. Ahmed Raza" 
                errorKey="fullName" 
              />
              <Field 
                label="Email Address" 
                value={email} 
                onChange={setEmail} 
                placeholder="driver@example.com" 
                keyboardType="email-address" 
                autoCapitalize="none" 
                errorKey="email" 
              />
              <Field 
                label="Phone Number" 
                value={phone} 
                onChange={setPhone} 
                placeholder="+92 3XX XXXXXXX" 
                keyboardType="phone-pad" 
                autoCapitalize="none" 
                errorKey="phone" 
              />
              <Field 
                label="Password" 
                value={password} 
                onChange={setPassword} 
                placeholder="Minimum 6 characters" 
                autoCapitalize="none" 
                errorKey="password"
                secureTextEntry
              />

              {/* ── Vehicle Info ── */}
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <Field 
                label="License Number" 
                value={license} 
                onChange={setLicense} 
                placeholder="e.g. LHR-12345" 
                autoCapitalize="characters" 
                errorKey="license" 
              />
              <Field 
                label="Vehicle Number" 
                value={vehicleNo} 
                onChange={setVehicleNo} 
                placeholder="e.g. LEA-1234" 
                autoCapitalize="characters" 
                errorKey="vehicleNo" 
              />

              {/* ── Location ── */}
              <Text style={styles.sectionTitle}>Home / Pickup Location</Text>

              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Text style={styles.locationDot}>📍</Text>
                  <Text style={styles.locationLabel}>Select Your Location</Text>
                </View>

                {/* Selected address + map preview */}
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

                {/* Location buttons */}
                <View style={styles.locationButtons}>
                  <TouchableOpacity
                    style={styles.locationBtn}
                    onPress={() => {
                      getCurrentLocation();
                      if (errors.location) setErrors((p) => ({ ...p, location: null }));
                    }}
                  >
                    <Text style={styles.locationBtnIcon}>🧭</Text>
                    <Text style={styles.locationBtnText}>Current Location</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.locationBtn}
                    onPress={() => {
                      setSearchModalVisible(true);
                      if (errors.location) setErrors((p) => ({ ...p, location: null }));
                    }}
                  >
                    <Text style={styles.locationBtnIcon}>🔍</Text>
                    <Text style={styles.locationBtnText}>Search Area</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Approval Note ── */}
              <View style={styles.approvalNote}>
                <Text style={styles.approvalNoteText}>
                  📝 Your registration will be reviewed by the transporter. You'll be notified via email once approved.
                </Text>
              </View>

              {/* ── Next Button ── */}
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

        {/* ── Location Search Modal ── */}
        <Modal visible={searchModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.searchModalBox}>
              {/* Header */}
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

              {/* Search input */}
              <View style={styles.searchInputWrap}>
                <Text style={styles.searchInputIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Search for area, street, or landmark..."
                  placeholderTextColor="#bbb"
                  value={searchQuery}
                  onChangeText={(t) => {
                    setSearchQuery(t);
                    searchLocation(t);
                  }}
                  autoFocus
                  autoCorrect={false}
                />
                {searchingLocation && (
                  <ActivityIndicator size="small" color={BRAND} />
                )}
              </View>

              {/* Results */}
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.place_id}
                style={{ maxHeight: 380 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => selectSearchResult(item.place_id, item.description)}
                  >
                    <Text style={styles.srIcon}>📍</Text>
                    <View style={styles.srText}>
                      <Text style={styles.srMain}>
                        {item.structured_formatting.main_text}
                      </Text>
                      <Text style={styles.srSub}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    </View>
                    <Text style={styles.srChevron}>›</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchQuery.length >= 3
                        ? "No results found"
                        : "Type at least 3 characters to search"}
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════
  //  STEP 2 — Transporter Selection
  // ════════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F6F0" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep("form")} style={styles.backBtn}>
          <Text style={styles.backBtnTxt}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerLogo}>
          <Image
            source={{ uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp" }}
            style={styles.headerLogoImg}
            resizeMode="contain"
          />
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Step + title */}
      <View style={styles.step2Top}>
        <StepBar />
        <Text style={styles.s2Title}>Choose Your Transporter</Text>
        <Text style={styles.s2Desc}>
          Select the company you'd like to drive for. They'll review and approve your request.
        </Text>
      </View>

      {/* Transporter List */}
      {fetchingTransporters ? (
        <View style={styles.loadBox}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadTxt}>Loading transporters...</Text>
        </View>
      ) : transporters.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyTxt}>No transporters available</Text>
          <Text style={styles.emptySubTxt}>Please try again later or contact support.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTransporters}>
            <Text style={styles.retryTxt}>🔄  Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transporters}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const sel = selectedTransporter?._id === item._id;
            return (
              <TouchableOpacity
                style={[styles.tCard, sel && styles.tCardSelected]}
                onPress={() => setSelectedTransporter(item)}
                activeOpacity={0.8}
              >
                {/* Card header */}
                <View style={styles.tCardHeader}>
                  <View style={[styles.tAvatar, sel && { backgroundColor: "#e8ffc0" }]}>
                    <Text style={styles.tAvatarIcon}>🏢</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tNameRow}>
                      <Text style={[styles.tName, sel && { color: BRAND_DARK }]}>
                        {item.name || item.fullName || 'Transporter'}
                      </Text>
                      {sel && <Text style={styles.tCheck}>✓</Text>}
                    </View>
                    {item.company && (
                      <Text style={styles.tCompany}>🏢 {item.company}</Text>
                    )}
                  </View>
                </View>
                {/* Card details */}
                <View style={styles.tDetails}>
                  {item.email && (
                    <View style={styles.tDetailRow}>
                      <Text style={styles.tDetailIcon}>✉️</Text>
                      <Text style={styles.tDetailTxt}>{item.email}</Text>
                    </View>
                  )}
                  {item.phone && (
                    <View style={styles.tDetailRow}>
                      <Text style={styles.tDetailIcon}>📞</Text>
                      <Text style={styles.tDetailTxt}>{item.phone}</Text>
                    </View>
                  )}
                  {(item.city || item.zone) && (
                    <View style={styles.tDetailRow}>
                      <Text style={styles.tDetailIcon}>📍</Text>
                      <Text style={[styles.tDetailTxt, { color: BRAND_DARK }]}>
                        {item.zone ? `${item.zone}, ` : ""}{item.city || ""}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {selectedTransporter && (
          <Text style={styles.selLabel}>
            Selected:{" "}
            <Text style={styles.selName}>
              {selectedTransporter.name || selectedTransporter.fullName || 'Transporter'}
            </Text>
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { marginTop: 0 },
            (!selectedTransporter || submitting) && styles.btnOff,
          ]}
          onPress={handleSendRequest}
          disabled={!selectedTransporter || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnTxt}>Send Registration Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════
const styles = StyleSheet.create({
  formScroll: { flexGrow: 1, alignItems: "center", padding: 20, paddingBottom: 44 },
  logoWrap: { alignItems: "center", marginBottom: 20 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: BRAND,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  logoImg: { width: 54, height: 54 },
  brand: { fontSize: 26, fontWeight: "800", color: BRAND_DARK, marginTop: 10, letterSpacing: 3 },
  brandSub: { fontSize: 13, color: "#888", marginTop: 2, letterSpacing: 1 },
  card: {
    width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 22,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#222", textAlign: "center" },
  cardDesc: { fontSize: 13, color: "#999", textAlign: "center", marginTop: 5, marginBottom: 14, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#444", marginTop: 14, marginBottom: 6, letterSpacing: 0.2 },
  stepWrap: { marginBottom: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  stepDone: { width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND, justifyContent: "center", alignItems: "center" },
  stepDoneText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#E0E0E0" },
  stepActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND, borderWidth: 2, borderColor: BRAND_DARK },
  stepLine: { flex: 1, height: 2, backgroundColor: "#E0E0E0", marginHorizontal: 8, maxWidth: 90 },
  stepLabelRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, marginTop: 5 },
  stepLabel: { fontSize: 11, fontWeight: "500" },
  fieldWrapper: { marginBottom: 11 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 5 },
  input: { height: 50, borderWidth: 1.5, borderColor: "#E0E0E0", borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: "#333", backgroundColor: "#FAFAFA" },
  inputError: { borderColor: "#e74c3c" },
  errorText: { fontSize: 12, color: "#e74c3c", marginTop: 3, marginLeft: 2 },
  locationCard: { backgroundColor: "#f8f8f8", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E0E0E0", marginBottom: 12 },
  locationHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  locationDot: { fontSize: 18, marginRight: 6 },
  locationLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  selectedLocation: { marginBottom: 10 },
  selectedLocationText: { fontSize: 13, color: "#555", lineHeight: 18, marginBottom: 8 },
  miniMap: { width: "100%", height: 110, borderRadius: 10 },
  locationButtons: { flexDirection: "row", gap: 10 },
  locationBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: BRAND, gap: 5,
  },
  locationBtnIcon: { fontSize: 16 },
  locationBtnText: { fontSize: 13, color: BRAND_DARK, fontWeight: "600" },
  approvalNote: { backgroundColor: "#f0f9d8", padding: 12, borderRadius: 12, marginTop: 14, borderLeftWidth: 4, borderLeftColor: BRAND },
  approvalNoteText: { color: "#374151", fontSize: 13, lineHeight: 18, fontWeight: "500" },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  primaryBtnTxt: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: 0.4 },
  btnOff: { opacity: 0.45 },
  linkRow: { marginTop: 15, alignItems: "center" },
  linkTxt: { fontSize: 14, color: "#888" },
  linkHL: { color: BRAND_DARK, fontWeight: "600" },
  footer: { marginTop: 22, color: "#ccc", fontSize: 12, textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  searchModalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#222" },
  modalClose: { fontSize: 20, color: "#888", fontWeight: "600" },
  searchInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: "#E0E0E0" },
  searchInputIcon: { fontSize: 16, marginRight: 8 },
  searchInputField: { flex: 1, height: 46, fontSize: 14, color: "#333" },
  searchResultItem: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  srIcon: { fontSize: 18, marginRight: 10 },
  srText: { flex: 1 },
  srMain: { fontSize: 14, fontWeight: "600", color: "#222" },
  srSub: { fontSize: 12, color: "#888", marginTop: 2 },
  srChevron: { fontSize: 22, color: "#ccc", marginLeft: 6 },
  emptySearch: { paddingVertical: 40, alignItems: "center" },
  emptySearchText: { fontSize: 14, color: "#bbb", textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  backBtn: { width: 60 },
  backBtnTxt: { fontSize: 15, color: BRAND_DARK, fontWeight: "600" },
  headerLogo: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F4F6F0", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: BRAND },
  headerLogoImg: { width: 28, height: 28 },
  step2Top: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  s2Title: { fontSize: 19, fontWeight: "700", color: "#222", textAlign: "center", marginTop: 6 },
  s2Desc: { fontSize: 13, color: "#999", textAlign: "center", marginTop: 4, marginBottom: 10, lineHeight: 18 },
  loadBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadTxt: { marginTop: 12, color: "#aaa", fontSize: 14 },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTxt: { fontSize: 16, fontWeight: "600", color: "#999" },
  emptySubTxt: { fontSize: 13, color: "#bbb", marginTop: 6, textAlign: "center" },
  retryBtn: { marginTop: 18, backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  listPad: { paddingHorizontal: 16, paddingBottom: 100 },
  tCard: { backgroundColor: "#fff", borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1.5, borderColor: "#E8E8E8", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  tCardSelected: { borderColor: BRAND, backgroundColor: "#f9ffe8" },
  tCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  tAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", marginRight: 12 },
  tAvatarIcon: { fontSize: 22 },
  tNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tName: { fontSize: 15, fontWeight: "700", color: "#333", flex: 1 },
  tCheck: { fontSize: 18, color: BRAND_DARK, fontWeight: "700" },
  tCompany: { fontSize: 12, color: "#888", marginTop: 3 },
  tDetails: { gap: 5 },
  tDetailRow: { flexDirection: "row", alignItems: "center" },
  tDetailIcon: { fontSize: 14, marginRight: 7 },
  tDetailTxt: { fontSize: 12, color: "#666", flex: 1 },
  bottomBar: { backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0", elevation: 8, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8 },
  selLabel: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 6 },
  selName: { fontWeight: "700", color: BRAND_DARK },
});