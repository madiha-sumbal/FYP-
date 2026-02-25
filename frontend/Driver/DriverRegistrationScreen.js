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

// ✅ FIX: Correct IP matching server.js and TransporterDashboard
const API_BASE_URL = Platform.select({
  ios:     "http://192.168.10.12:3000",
  android: "http://192.168.10.12:3000",
  default: "http://192.168.10.12:3000",
});

const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

// ✅ Vehicle capacity map — used both for display and payload
const VEHICLE_CAPACITY = { car: 4, van: 12, bus: 30 };

const COLORS = {
  brand:        "#afd826",
  brandDark:    "#8ab81e",
  brandLight:   "#f0fce4",
  error:        "#ef4444",
  text:         "#333",
  textLight:    "#666",
  textLighter:  "#999",
  border:       "#ddd",
  background:   "#F4F6F0",
  white:        "#fff",
  inputBg:      "#fafafa",
};

// ── Vehicle Types ─────────────────────────────────────
const VEHICLE_TYPES = [
  { id: "car", label: "Car", icon: "🚗", desc: "Up to 4 passengers",  capacity: 4  },
  { id: "van", label: "Van", icon: "🚐", desc: "Up to 12 passengers", capacity: 12 },
  { id: "bus", label: "Bus", icon: "🚌", desc: "Up to 30 passengers", capacity: 30 },
];

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════
export default function DriverRegisterScreen({ navigation }) {

  // ── State ─────────────────────────────────────────────
  const [step,            setStep]            = useState("form");
  const [serverConnected, setServerConnected] = useState(true);

  const [formData, setFormData] = useState({
    fullName:    "",
    email:       "",
    phone:       "",
    password:    "",
    license:     "",
    vehicleNo:   "",
    vehicleType: "",
  });
  const [errors, setErrors] = useState({});

  const [homeAddress,  setHomeAddress]  = useState("");
  const [homeLocation, setHomeLocation] = useState(null);

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery,        setSearchQuery]        = useState("");
  const [searchResults,      setSearchResults]      = useState([]);
  const [searchingLocation,  setSearchingLocation]  = useState(false);

  const [transporters,         setTransporters]         = useState([]);
  const [selectedTransporter,  setSelectedTransporter]  = useState(null);
  const [fetchingTransporters, setFetchingTransporters] = useState(false);
  const [submitting,           setSubmitting]           = useState(false);

  // ── Computed ──────────────────────────────────────────
  const homeMapUrl = useMemo(() => {
    if (!homeLocation) return null;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${homeLocation.latitude},${homeLocation.longitude}&zoom=15&size=600x200&markers=color:green%7Clabel:H%7C${homeLocation.latitude},${homeLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
  }, [homeLocation]);

  // selected vehicle info
  const selectedVehicleInfo = useMemo(
    () => VEHICLE_TYPES.find((v) => v.id === formData.vehicleType) || null,
    [formData.vehicleType]
  );

  // ── Effects ───────────────────────────────────────────
  useEffect(() => { checkServerConnection(); }, []);

  // ── API ───────────────────────────────────────────────
  const checkServerConnection = useCallback(async () => {
    try {
      await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
      setServerConnected(true);
    } catch (err) {
      setServerConnected(false);
      Alert.alert(
        "Connection Error",
        `Cannot connect to server at ${API_BASE_URL}\n\nCheck:\n• Backend is running on port 3000\n• IP is 192.168.10.12\n• Same WiFi network`,
        [
          { text: "Retry",           onPress: checkServerConnection },
          { text: "Continue Anyway", style: "cancel", onPress: () => setServerConnected(true) },
        ]
      );
    }
  }, []);

  const fetchTransporters = useCallback(async () => {
    setFetchingTransporters(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users`, { timeout: 10000 });
      if (res.data.success && res.data.users) {
        const list = res.data.users.filter(
          (u) => u.role === "transporter" || u.role === "Transporter"
        );
        setTransporters(list);
        if (list.length === 0)
          Alert.alert("Info", "No transporters found. Please try again later.");
      } else {
        setTransporters([]);
        Alert.alert("Error", "Invalid response from server");
      }
    } catch (err) {
      console.error("fetchTransporters error:", err.message);
      Alert.alert(
        "Connection Error",
        `Failed to load transporters.\nServer: ${API_BASE_URL}`,
        [
          { text: "Retry",  onPress: fetchTransporters },
          { text: "Cancel", style: "cancel" },
        ]
      );
      setTransporters([]);
    } finally {
      setFetchingTransporters(false);
    }
  }, []);

  // ── Location ──────────────────────────────────────────
  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      try {
        const res = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        setHomeAddress(
          res.data.status === "OK" && res.data.results.length > 0
            ? res.data.results[0].formatted_address
            : `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
        );
      } catch {
        setHomeAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      }
      setHomeLocation(coords);
      if (errors.location)
        setErrors((prev) => { const e = { ...prev }; delete e.location; return e; });
    } catch {
      Alert.alert("Error", "Failed to get current location.");
    }
  }, [errors.location]);

  const searchLocation = useCallback(async (query) => {
    if (!query || query.trim().length < 3) { setSearchResults([]); return; }
    setSearchingLocation(true);
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:pk`
      );
      setSearchResults(res.data.status === "OK" ? res.data.predictions : []);
    } catch { setSearchResults([]); }
    finally  { setSearchingLocation(false); }
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
        if (errors.location)
          setErrors((prev) => { const e = { ...prev }; delete e.location; return e; });
      }
    } catch { Alert.alert("Error", "Failed to get location details."); }
  }, [errors.location]);

  // ── Validation ────────────────────────────────────────
  const validateForm = useCallback(() => {
    const e = {};
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneReg = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

    if (!formData.fullName.trim()  || formData.fullName.trim().length < 3)  e.fullName    = "Full name must be at least 3 characters.";
    if (!formData.email.trim()     || !emailReg.test(formData.email.trim())) e.email       = "Please enter a valid email address.";
    if (!formData.phone.trim()     || !phoneReg.test(formData.phone.trim())) e.phone       = "Please enter a valid phone number (e.g. +92 3XX XXXXXXX).";
    if (!formData.password.trim()  || formData.password.trim().length < 6)  e.password    = "Password must be at least 6 characters.";
    if (!formData.license.trim()   || formData.license.trim().length < 4)   e.license     = "Please enter a valid license number.";
    if (!formData.vehicleNo.trim() || formData.vehicleNo.trim().length < 3) e.vehicleNo   = "Please enter a valid vehicle number.";
    if (!formData.vehicleType)                                               e.vehicleType = "Please select your vehicle type.";
    if (!homeLocation)                                                       e.location    = "Please select your home / pickup location.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [formData, homeLocation]);

  // ── Form Handlers ─────────────────────────────────────
  const updateFormField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  }, [errors]);

  const handleNextStep = useCallback(() => {
    Keyboard.dismiss();
    if (!validateForm()) return;
    fetchTransporters();
    setSelectedTransporter(null);
    setStep("transporter");
  }, [validateForm, fetchTransporters]);

  // ✅ FIX: handleSendRequest now sends capacity & vehicleType correctly
  const handleSendRequest = useCallback(async () => {
    if (!selectedTransporter) {
      Alert.alert("Select a Transporter", "Please choose a transporter to continue.");
      return;
    }
    setSubmitting(true);
    try {
      // ✅ Capacity derived from vehicle type
      const vehicleCapacity = VEHICLE_CAPACITY[formData.vehicleType] || 4;

      const requestData = {
        fullName:        formData.fullName.trim(),
        email:           formData.email.trim().toLowerCase(),
        phone:           formData.phone.trim(),
        password:        formData.password.trim(),
        license:         formData.license.trim().toUpperCase(),
        vehicleNo:       formData.vehicleNo.trim().toUpperCase(),
        vehicleType:     formData.vehicleType,       // "car" | "van" | "bus"
        vehicle:         formData.vehicleType,       // backend compat
        capacity:        vehicleCapacity,            // ✅ 4 / 12 / 30
        address:         homeAddress,
        location: {
          type:        "Point",
          coordinates: [homeLocation.longitude, homeLocation.latitude],
          address:     homeAddress,
        },
        latitude:        homeLocation.latitude,
        longitude:       homeLocation.longitude,
        transporterId:   selectedTransporter._id,
        transporterName:
          selectedTransporter.name ||
          selectedTransporter.fullName ||
          selectedTransporter.company ||
          "Transporter",
      };

      console.log("📤 Sending driver request:", JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        `${API_BASE_URL}/api/driver-requests`,
        requestData,
        { timeout: 15000, headers: { "Content-Type": "application/json" } }
      );

      console.log("📥 Server response:", JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        Alert.alert(
          "Request Sent Successfully! ✓",
          `Your driver request has been sent to ${
            selectedTransporter.name || selectedTransporter.company || "Transporter"
          }.\n\nVehicle: ${selectedVehicleInfo?.label} (capacity: ${vehicleCapacity} passengers)\n\nYou'll be notified at ${formData.email.trim().toLowerCase()} once approved.`,
          [
            {
              text: "Go to Login",
              onPress: () => {
                setFormData({ fullName: "", email: "", phone: "", password: "", license: "", vehicleNo: "", vehicleType: "" });
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
      console.error("handleSendRequest error:", err);
      if (err.response) {
        Alert.alert(
          "Registration Failed",
          err.response.data?.message || err.response.data?.error || "Failed to send request."
        );
      } else if (err.request) {
        Alert.alert(
          "Network Error",
          `Cannot connect to server.\n\nIP: ${API_BASE_URL}\n\nMake sure the server is running.`,
          [
            { text: "Retry",  onPress: handleSendRequest },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        Alert.alert("Error", err.message || "Failed to send request.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedTransporter, formData, homeAddress, homeLocation, selectedVehicleInfo, navigation]);

  // ══════════════════════════════════════════════════════
  // SUB-COMPONENTS
  // ══════════════════════════════════════════════════════
  const InputField = useCallback(({
    label, value, onChange, placeholder,
    keyboardType, autoCapitalize, errorKey,
    secureTextEntry, returnKeyType = "next", onSubmitEditing,
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
        enablesReturnKeyAutomatically
        onSubmitEditing={onSubmitEditing}
      />
      {errors[errorKey] ? (
        <Text style={styles.errorText}>{errors[errorKey]}</Text>
      ) : null}
    </View>
  ), [errors]);

  // ── Vehicle Type Picker ───────────────────────────────
  const VehicleTypePicker = useCallback(() => (
    <View style={styles.fieldWrapper}>
      <Text style={styles.label}>
        Vehicle Type <Text style={{ color: COLORS.error }}>*</Text>
      </Text>
      <Text style={styles.vehicleHint}>
        Capacity limits are enforced — passengers won't exceed your vehicle's max.
      </Text>
      <View style={styles.vehicleRow}>
        {VEHICLE_TYPES.map((vt) => {
          const selected = formData.vehicleType === vt.id;
          return (
            <TouchableOpacity
              key={vt.id}
              activeOpacity={0.8}
              onPress={() => updateFormField("vehicleType", vt.id)}
              style={[styles.vehicleCard, selected && styles.vehicleCardSelected]}
            >
              <Text style={styles.vehicleIcon}>{vt.icon}</Text>
              <Text style={[styles.vehicleLabel, selected && styles.vehicleLabelSelected]}>
                {vt.label}
              </Text>
              {/* ✅ Capacity badge */}
              <View style={[styles.capBadge, selected && styles.capBadgeSelected]}>
                <Text style={[styles.capBadgeTxt, selected && styles.capBadgeTxtSelected]}>
                  max {vt.capacity}
                </Text>
              </View>
              <Text style={[styles.vehicleDesc, selected && styles.vehicleDescSelected]}>
                {vt.desc}
              </Text>
              {selected && <Text style={styles.vehicleCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.vehicleType ? (
        <Text style={styles.errorText}>{errors.vehicleType}</Text>
      ) : null}
    </View>
  ), [formData.vehicleType, errors.vehicleType, updateFormField]);

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
  // RENDER
  // ══════════════════════════════════════════════════════

  if (!serverConnected) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📡</Text>
        <Text style={styles.errorTitle}>Connection Failed</Text>
        <Text style={styles.errorMessage}>
          Cannot connect to server at:{"\n"}{API_BASE_URL}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkServerConnection}>
          <Text style={styles.retryTxt}>🔄 Retry Connection</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: "#6b7280", marginTop: 12 }]}
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

              {/* ── Personal Details ─────────────────────── */}
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <InputField
                label="Full Name"
                value={formData.fullName}
                onChange={(v) => updateFormField("fullName", v)}
                placeholder="e.g. Ahmed Raza"
                errorKey="fullName"
                returnKeyType="next"
              />
              <InputField
                label="Email Address"
                value={formData.email}
                onChange={(v) => updateFormField("email", v)}
                placeholder="driver@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                errorKey="email"
                returnKeyType="next"
              />
              <InputField
                label="Phone Number"
                value={formData.phone}
                onChange={(v) => updateFormField("phone", v)}
                placeholder="+92 3XX XXXXXXX"
                keyboardType="phone-pad"
                autoCapitalize="none"
                errorKey="phone"
                returnKeyType="next"
              />
              <InputField
                label="Password"
                value={formData.password}
                onChange={(v) => updateFormField("password", v)}
                placeholder="Minimum 6 characters"
                autoCapitalize="none"
                errorKey="password"
                secureTextEntry
                returnKeyType="next"
              />

              {/* ── Vehicle Details ──────────────────────── */}
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <InputField
                label="License Number"
                value={formData.license}
                onChange={(v) => updateFormField("license", v)}
                placeholder="e.g. LHR-12345"
                autoCapitalize="characters"
                errorKey="license"
                returnKeyType="next"
              />
              <InputField
                label="Vehicle Number"
                value={formData.vehicleNo}
                onChange={(v) => updateFormField("vehicleNo", v)}
                placeholder="e.g. LEA-1234"
                autoCapitalize="characters"
                errorKey="vehicleNo"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              {/* ── Vehicle Type Picker ──────────────────── */}
              <VehicleTypePicker />

              {/* ── Home / Pickup Location ───────────────── */}
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
                      <Image source={{ uri: homeMapUrl }} style={styles.miniMap} resizeMode="cover" />
                    )}
                  </View>
                ) : null}

                {errors.location ? (
                  <Text style={[styles.errorText, { marginBottom: 6 }]}>{errors.location}</Text>
                ) : null}

                <View style={styles.locationButtons}>
                  <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation}>
                    <Text style={styles.locationBtnIcon}>🧭</Text>
                    <Text style={styles.locationBtnText}>Current Location</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.locationBtn} onPress={() => setSearchModalVisible(true)}>
                    <Text style={styles.locationBtnIcon}>🔍</Text>
                    <Text style={styles.locationBtnText}>Search Area</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Approval Note ─────────────────────────── */}
              <View style={styles.approvalNote}>
                <Text style={styles.approvalNoteText}>
                  📝 Your registration will be reviewed by the transporter. You'll be notified via email once approved.
                </Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep}>
                <Text style={styles.primaryBtnTxt}>Next → Select Transporter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate("DriverLogin")}
              >
                <Text style={styles.linkTxt}>
                  Already registered? <Text style={styles.linkHL}>Login here</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>Safe. Reliable. Professional Raahi Service.</Text>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Location Search Modal ──────────────────────── */}
        <Modal visible={searchModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.searchModal}>
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
                  placeholder="Search area, street or landmark..."
                  placeholderTextColor={COLORS.textLighter}
                  value={searchQuery}
                  onChangeText={(t) => { setSearchQuery(t); searchLocation(t); }}
                  autoFocus
                />
                {searchingLocation && <ActivityIndicator size="small" color={COLORS.brand} />}
              </View>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => selectSearchResult(item.place_id, item.description)}
                  >
                    <Text style={styles.searchResultIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultMain}>
                        {item.structured_formatting.main_text}
                      </Text>
                      <Text style={styles.searchResultSub}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchQuery.length > 0
                        ? "No results found"
                        : "Type to search for a location"}
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
          <Text style={styles.cardTitle}>Select Transporter</Text>
          <Text style={styles.cardDesc}>
            Choose the transporter you want to work with.
          </Text>

          <StepBar />

          {/* ✅ Selected vehicle + capacity summary */}
          {selectedVehicleInfo && (
            <View style={styles.vehicleSummaryCard}>
              <Text style={styles.vehicleSummaryIcon}>{selectedVehicleInfo.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleSummaryTitle}>
                  {selectedVehicleInfo.label} Selected
                </Text>
                <Text style={styles.vehicleSummaryDesc}>
                  Max capacity:{" "}
                  <Text style={{ fontWeight: "800", color: COLORS.brandDark }}>
                    {selectedVehicleInfo.capacity} passengers
                  </Text>
                  {" "}— Smart Routes will never assign more than this.
                </Text>
              </View>
            </View>
          )}

          {fetchingTransporters ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.brand} />
              <Text style={styles.loadingTxt}>Loading transporters...</Text>
            </View>
          ) : transporters.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyTitle}>No Transporters Found</Text>
              <Text style={styles.emptySub}>Please try again later or contact support.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={fetchTransporters}>
                <Text style={styles.primaryBtnTxt}>🔄 Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            transporters.map((item) => {
              const isSelected = selectedTransporter?._id === item._id;
              return (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.transporterCard, isSelected && styles.transporterCardSelected]}
                  onPress={() => setSelectedTransporter(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.transporterRow}>
                    <View style={[styles.transporterAvatar, isSelected && styles.transporterAvatarSelected]}>
                      <Text style={styles.transporterAvatarIcon}>🏢</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.transporterNameRow}>
                        <Text style={styles.transporterName}>
                          {item.name || item.fullName}
                        </Text>
                        {isSelected && (
                          <Text style={styles.transporterCheck}>✓</Text>
                        )}
                      </View>
                      {item.company && (
                        <Text style={styles.transporterCompany}>🏢 {item.company}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.transporterDetails}>
                    {item.email && (
                      <Text style={styles.transporterDetail}>✉️  {item.email}</Text>
                    )}
                    {item.phone && (
                      <Text style={styles.transporterDetail}>📞  {item.phone}</Text>
                    )}
                    {(item.zone || item.city || item.address) && (
                      <Text style={[styles.transporterDetail, { color: COLORS.brandDark }]}>
                        📍  Service Area: {item.zone || item.city || item.address}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep("form")}>
              <Text style={styles.backBtnTxt}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { flex: 1 },
                (!selectedTransporter || submitting) && styles.primaryBtnDisabled,
              ]}
              onPress={handleSendRequest}
              disabled={!selectedTransporter || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryBtnTxt}>Send Request ✓</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate("DriverLogin")}
          >
            <Text style={styles.linkTxt}>
              Already registered? <Text style={styles.linkHL}>Login here</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Safe. Reliable. Professional Raahi Service.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  formScroll:     { padding: 20, paddingBottom: 40 },

  // Error screen
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, backgroundColor: COLORS.background },
  errorIcon:      { fontSize: 56, marginBottom: 16 },
  errorTitle:     { fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  errorMessage:   { fontSize: 14, color: COLORS.textLight, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  retryBtn:       { backgroundColor: COLORS.brand, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  retryTxt:       { color: COLORS.white, fontWeight: "700", fontSize: 15 },

  // Logo
  logoWrap:       { alignItems: "center", marginBottom: 20, marginTop: 10 },
  logoCircle:     { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4, marginBottom: 10 },
  logoImg:        { width: 56, height: 56 },
  brand:          { fontSize: 26, fontWeight: "800", color: COLORS.brandDark, letterSpacing: 2 },
  brandSub:       { fontSize: 13, color: COLORS.textLight, marginTop: 3 },

  // Card
  card:           { backgroundColor: COLORS.white, borderRadius: 20, padding: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardTitle:      { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  cardDesc:       { fontSize: 13, color: COLORS.textLight, lineHeight: 20, marginBottom: 20 },

  // Steps
  stepWrap:       { marginBottom: 24 },
  stepRow:        { flexDirection: "row", alignItems: "center" },
  stepDot:        { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.border },
  stepActive:     { backgroundColor: COLORS.brand, width: 20, height: 20, borderRadius: 10 },
  stepDone:       { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  stepDoneText:   { color: COLORS.white, fontSize: 11, fontWeight: "700" },
  stepLine:       { flex: 1, height: 3, backgroundColor: COLORS.border, marginHorizontal: 8 },
  stepLabelRow:   { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  stepLabel:      { fontSize: 12, fontWeight: "600" },

  // Section
  sectionTitle:   { fontSize: 14, fontWeight: "700", color: COLORS.brandDark, marginBottom: 12, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },

  // Input
  fieldWrapper:   { marginBottom: 14 },
  label:          { fontSize: 13, fontWeight: "600", color: COLORS.textLight, marginBottom: 6 },
  input:          { backgroundColor: COLORS.inputBg, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: COLORS.text },
  inputError:     { borderColor: COLORS.error },
  errorText:      { color: COLORS.error, fontSize: 12, marginTop: 4 },

  // Vehicle Type Picker
  vehicleHint:          { fontSize: 12, color: COLORS.textLighter, marginBottom: 10, lineHeight: 17 },
  vehicleRow:           { flexDirection: "row", gap: 10, marginBottom: 2 },
  vehicleCard:          { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, position: "relative" },
  vehicleCardSelected:  { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  vehicleIcon:          { fontSize: 28, marginBottom: 4 },
  vehicleLabel:         { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  vehicleLabelSelected: { color: COLORS.brandDark },
  // ✅ Capacity badge styles
  capBadge:             { backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  capBadgeSelected:     { backgroundColor: COLORS.brand },
  capBadgeTxt:          { fontSize: 10, fontWeight: "700", color: COLORS.textLight },
  capBadgeTxtSelected:  { color: COLORS.white },
  vehicleDesc:          { fontSize: 10, color: COLORS.textLighter, textAlign: "center", lineHeight: 14 },
  vehicleDescSelected:  { color: COLORS.brandDark },
  vehicleCheck:         { position: "absolute", top: 6, right: 8, fontSize: 13, color: COLORS.brand, fontWeight: "800" },

  // Vehicle summary card (step 2)
  vehicleSummaryCard:   { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.brandLight, borderRadius: 14, padding: 13, marginBottom: 18, borderWidth: 1.5, borderColor: COLORS.brand, gap: 12 },
  vehicleSummaryIcon:   { fontSize: 34 },
  vehicleSummaryTitle:  { fontSize: 14, fontWeight: "800", color: COLORS.brandDark, marginBottom: 3 },
  vehicleSummaryDesc:   { fontSize: 12, color: COLORS.textLight, lineHeight: 17 },

  // Location
  locationCard:          { backgroundColor: COLORS.inputBg, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: COLORS.border },
  locationHeader:        { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  locationDot:           { fontSize: 18, marginRight: 8 },
  locationLabel:         { fontSize: 14, fontWeight: "600", color: COLORS.text },
  selectedLocation:      { marginBottom: 10 },
  selectedLocationText:  { fontSize: 13, color: COLORS.textLight, marginBottom: 8 },
  miniMap:               { width: "100%", height: 110, borderRadius: 10 },
  locationButtons:       { flexDirection: "row", gap: 10 },
  locationBtn:           { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.brand, gap: 6 },
  locationBtnIcon:       { fontSize: 16 },
  locationBtnText:       { fontSize: 13, color: COLORS.brandDark, fontWeight: "600" },

  // Approval note
  approvalNote:     { backgroundColor: "#fffbeb", borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#fde68a" },
  approvalNoteText: { fontSize: 13, color: "#92400e", lineHeight: 20 },

  // Buttons
  primaryBtn:         { backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 14 },
  primaryBtnDisabled: { backgroundColor: COLORS.border },
  primaryBtnTxt:      { color: COLORS.white, fontWeight: "800", fontSize: 16 },
  backBtn:            { backgroundColor: COLORS.inputBg, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, alignItems: "center", marginRight: 10, borderWidth: 1.5, borderColor: COLORS.border },
  backBtnTxt:         { color: COLORS.textLight, fontWeight: "700", fontSize: 15 },
  btnRow:             { flexDirection: "row", marginBottom: 14 },

  linkRow:            { alignItems: "center", marginBottom: 4 },
  linkTxt:            { fontSize: 14, color: COLORS.textLight },
  linkHL:             { color: COLORS.brandDark, fontWeight: "700" },
  footer:             { textAlign: "center", color: COLORS.textLighter, fontSize: 12, marginTop: 16 },

  // Transporter cards
  loadingWrap:             { alignItems: "center", paddingVertical: 40 },
  loadingTxt:              { marginTop: 12, color: COLORS.textLight, fontSize: 14 },
  emptyWrap:               { alignItems: "center", paddingVertical: 40 },
  emptyIcon:               { fontSize: 52, marginBottom: 12 },
  emptyTitle:              { fontSize: 17, fontWeight: "700", color: COLORS.textLight },
  emptySub:                { fontSize: 13, color: COLORS.textLighter, marginTop: 6, textAlign: "center" },
  transporterCard:         { backgroundColor: COLORS.inputBg, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: COLORS.border },
  transporterCardSelected: { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  transporterRow:          { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  transporterAvatar:       { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.border, justifyContent: "center", alignItems: "center", marginRight: 12 },
  transporterAvatarSelected: { backgroundColor: COLORS.brand },
  transporterAvatarIcon:   { fontSize: 22 },
  transporterNameRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  transporterName:         { fontSize: 16, fontWeight: "700", color: COLORS.text },
  transporterCheck:        { fontSize: 16, color: COLORS.brand, fontWeight: "800" },
  transporterCompany:      { fontSize: 13, color: COLORS.textLight, marginTop: 3 },
  transporterDetails:      { gap: 5 },
  transporterDetail:       { fontSize: 13, color: COLORS.textLight },

  // Search Modal
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  searchModal:      { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle:       { fontSize: 18, fontWeight: "700", color: COLORS.text },
  modalClose:       { fontSize: 20, color: COLORS.textLight, padding: 4 },
  searchInputWrap:  { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 12 },
  searchInputIcon:  { fontSize: 18, marginRight: 10 },
  searchInput:      { flex: 1, paddingVertical: 13, fontSize: 15, color: COLORS.text },
  searchResultItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchResultIcon: { fontSize: 18, marginRight: 10 },
  searchResultMain: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  searchResultSub:  { fontSize: 12, color: COLORS.textLighter, marginTop: 2 },
  emptySearch:      { alignItems: "center", paddingVertical: 40 },
  emptySearchText:  { fontSize: 14, color: COLORS.textLighter },
});