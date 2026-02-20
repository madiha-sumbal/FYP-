import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  Image,
  StyleSheet 
} from "react-native";
import * as Location from "expo-location";
import Icon from "react-native-vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import axios from "axios";

const API_BASE_URL = "http://192.168.10.7:3000/api";
const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

// ─── Vehicle preference options ───────────────────────────────────────────────
const VEHICLE_OPTIONS = [
  { id: "car",  label: "Car",  icon: "car",       description: "Comfortable sedan / hatchback" },
  { id: "van",  label: "Van",  icon: "bus",        description: "Spacious van / minibus" },
  { id: "bus",  label: "Bus",  icon: "trail-sign", description: "Large bus / coach" },
];

export default function PassengerRequestScreen({ navigation }) {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);

  // ── NEW: vehicle preference ──────────────────────────────────────────────────
  const [vehiclePreference, setVehiclePreference] = useState(null); // "car" | "van" | "bus"

  // Modals
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [transporterModalVisible, setTransporterModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [searchType, setSearchType] = useState("pickup");
  
  // Data
  const [transporters, setTransporters] = useState([]);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchingTransporters, setFetchingTransporters] = useState(false);

  useEffect(() => {
    fetchTransporters();
  }, []);

  const fetchTransporters = async () => {
    setFetchingTransporters(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users`);
      if (res.data.success && res.data.users) {
        const transporterUsers = res.data.users.filter(u => u.role === "transporter");
        setTransporters(transporterUsers);
        if (transporterUsers.length === 0)
          Alert.alert("Info", "No transporters found. Please try again later.");
      } else {
        setTransporters([]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load transporters. Please check your connection.");
      setTransporters([]);
    } finally {
      setFetchingTransporters(false);
    }
  };

  const getCurrentLocation = async (type) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow location access to continue");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const coordinates = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      try {
        const res = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.coords.latitude},${loc.coords.longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        if (res.data.status === "OK" && res.data.results.length > 0) {
          const address = res.data.results[0].formatted_address;
          if (type === "pickup") { setPickupAddress(address); setPickupLocation(coordinates); }
          else { setDropoffAddress(address); setDropoffLocation(coordinates); }
        }
      } catch {
        const address = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
        if (type === "pickup") { setPickupAddress(address); setPickupLocation(coordinates); }
        else { setDropoffAddress(address); setDropoffLocation(coordinates); }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to get current location");
    }
  };

  const searchLocation = async (query) => {
    if (!query || query.trim().length < 3) { setSearchResults([]); return; }
    setSearchingLocation(true);
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:pk`
      );
      setSearchResults(res.data.status === "OK" ? res.data.predictions : []);
    } catch { setSearchResults([]); }
    finally { setSearchingLocation(false); }
  };

  const selectSearchResult = async (placeId, description) => {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      if (res.data.status === "OK") {
        const { lat, lng } = res.data.result.geometry.location;
        const coordinates = { latitude: lat, longitude: lng };
        if (searchType === "pickup") { setPickupAddress(description); setPickupLocation(coordinates); }
        else { setDropoffAddress(description); setDropoffLocation(coordinates); }
        setSearchModalVisible(false); setSearchQuery(""); setSearchResults([]);
      }
    } catch { Alert.alert("Error", "Failed to get location details"); }
  };

  const openSearchModal = (type) => { setSearchType(type); setSearchModalVisible(true); };

  const handleRegisterInitial = () => {
    if (!fullName.trim())      return Alert.alert("Validation Error", "Please enter your full name");
    if (!email.trim())         return Alert.alert("Validation Error", "Please enter your email");
    if (!phone.trim())         return Alert.alert("Validation Error", "Please enter your phone number");
    if (!password.trim())      return Alert.alert("Validation Error", "Please enter a password");
    if (!pickupLocation)       return Alert.alert("Validation Error", "Please select your pickup location");
    if (!dropoffLocation)      return Alert.alert("Validation Error", "Please select your drop-off location");
    // ── NEW validation ──────────────────────────────────────────────────────────
    if (!vehiclePreference)    return Alert.alert("Validation Error", "Please select your vehicle preference");

    setRegisterModalVisible(false);
    setTransporterModalVisible(true);
  };

  const handleFinalRegistration = async () => {
    if (!selectedTransporter) return Alert.alert("Error", "Please select a transporter");
    setLoading(true);
    try {
      const requestData = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        address: pickupAddress,
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        destination: dropoffAddress,
        destinationLatitude: dropoffLocation.latitude,
        destinationLongitude: dropoffLocation.longitude,
        transporterId: selectedTransporter._id,
        // ── NEW field sent to backend ───────────────────────────────────────────
        vehiclePreference: vehiclePreference,
      };

      const res = await axios.post(`${API_BASE_URL}/passenger/request`, requestData);

      if (res.data.success) {
        setTransporterModalVisible(false);
        Alert.alert(
          "Request Sent Successfully! ✅",
          "Your request has been sent to the transporter. You will be notified once approved.",
          [{ text: "OK", onPress: () => pollApproval(res.data.requestId) }]
        );
        // Reset form
        setFullName(""); setEmail(""); setPhone(""); setPassword("");
        setPickupAddress(""); setDropoffAddress("");
        setPickupLocation(null); setDropoffLocation(null);
        setSelectedTransporter(null);
        setVehiclePreference(null); // ── reset preference too
      } else {
        Alert.alert("Error", res.data.message || "Failed to send request");
      }
    } catch (err) {
      if (err.response) Alert.alert("Error", err.response.data.message || "Failed to send request");
      else if (err.request) Alert.alert("Network Error", "Cannot connect to server.");
      else Alert.alert("Error", "Failed to send request");
    } finally { setLoading(false); }
  };

  const pollApproval = (requestId) => {
    let pollCount = 0;
    const maxPolls = 60;
    const interval = setInterval(async () => {
      pollCount++;
      try {
        const res = await axios.get(`${API_BASE_URL}/passenger/request-status/${requestId}`);
        if (res.data.approved) {
          clearInterval(interval);
          Alert.alert("Congratulations! 🎉", "Your request has been approved! You can now login.",
            [{ text: "Go to Login", onPress: () => navigation.navigate("PassengerLogin") }]);
        } else if (res.data.status === "rejected") {
          clearInterval(interval);
          Alert.alert("Request Rejected", "Your request was rejected. Please try another transporter.");
        } else if (pollCount >= maxPolls) {
          clearInterval(interval);
          Alert.alert("Still Pending", "Your request is still pending approval.");
        }
      } catch { if (pollCount >= maxPolls) clearInterval(interval); }
    }, 3000);
  };

  const pickupMapUrl = pickupLocation
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${pickupLocation.latitude},${pickupLocation.longitude}&zoom=15&size=600x200&markers=color:green%7Clabel:P%7C${pickupLocation.latitude},${pickupLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`
    : null;

  const dropoffMapUrl = dropoffLocation
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${dropoffLocation.latitude},${dropoffLocation.longitude}&zoom=15&size=600x200&markers=color:red%7Clabel:D%7C${dropoffLocation.latitude},${dropoffLocation.longitude}&key=${GOOGLE_MAPS_API_KEY}`
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#A1D826', '#8BC220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Passenger Registration</Text>
          <Text style={styles.headerSubtitle}>Join our transport service</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Icon name="information-circle" size={24} color="#A1D826" />
          <Text style={styles.infoText}>
            Complete the registration form and select your preferred transporter to get started.
          </Text>
        </View>
        <TouchableOpacity style={styles.registerButton} onPress={() => setRegisterModalVisible(true)}>
          <LinearGradient colors={['#A1D826', '#8BC220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.registerButtonGradient}>
            <Icon name="person-add" size={24} color="#fff" />
            <Text style={styles.registerButtonText}>Start Registration</Text>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════
          REGISTER MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={registerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register as Passenger</Text>
              <TouchableOpacity onPress={() => setRegisterModalVisible(false)}>
                <Icon name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Personal Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.inputGroup}>
                  <Icon name="person" size={20} color="#A1D826" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} placeholderTextColor="#999" />
                </View>
                <View style={styles.inputGroup}>
                  <Icon name="mail" size={20} color="#A1D826" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" />
                </View>
                <View style={styles.inputGroup}>
                  <Icon name="call" size={20} color="#A1D826" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#999" />
                </View>
                <View style={styles.inputGroup}>
                  <Icon name="lock-closed" size={20} color="#A1D826" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} placeholderTextColor="#999" />
                </View>
              </View>

              {/* ── NEW: Vehicle Preference Section ─────────────────────────────── */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vehicle Preference</Text>
                <Text style={styles.sectionSubtitle}>
                  Select the type of vehicle you'd like to travel in
                </Text>
                <View style={styles.vehicleOptionsRow}>
                  {VEHICLE_OPTIONS.map((opt) => {
                    const isSelected = vehiclePreference === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                        onPress={() => setVehiclePreference(opt.id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.vehicleIconCircle, isSelected && styles.vehicleIconCircleSelected]}>
                          <Icon name={opt.icon} size={28} color={isSelected ? "#fff" : "#A1D826"} />
                        </View>
                        <Text style={[styles.vehicleCardLabel, isSelected && styles.vehicleCardLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={[styles.vehicleCardDesc, isSelected && styles.vehicleCardDescSelected]}>
                          {opt.description}
                        </Text>
                        {isSelected && (
                          <View style={styles.vehicleCheckmark}>
                            <Icon name="checkmark-circle" size={18} color="#A1D826" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {/* ───────────────────────────────────────────────────────────────── */}

              {/* Travel Route */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Travel Route</Text>

                {/* Pickup */}
                <View style={styles.locationCard}>
                  <View style={styles.locationHeader}>
                    <Icon name="location" size={20} color="#4CAF50" />
                    <Text style={styles.locationLabel}>Pickup Location</Text>
                  </View>
                  {pickupAddress ? (
                    <View style={styles.selectedLocation}>
                      <Text style={styles.selectedLocationText}>{pickupAddress}</Text>
                      {pickupMapUrl && <Image source={{ uri: pickupMapUrl }} style={styles.miniMap} resizeMode="cover" />}
                    </View>
                  ) : null}
                  <View style={styles.locationButtons}>
                    <TouchableOpacity style={styles.locationActionBtn} onPress={() => getCurrentLocation("pickup")}>
                      <Icon name="navigate" size={18} color="#A1D826" />
                      <Text style={styles.locationActionText}>Current Location</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.locationActionBtn} onPress={() => openSearchModal("pickup")}>
                      <Icon name="search" size={18} color="#A1D826" />
                      <Text style={styles.locationActionText}>Search Area</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Dropoff */}
                <View style={styles.locationCard}>
                  <View style={styles.locationHeader}>
                    <Icon name="flag" size={20} color="#FF5722" />
                    <Text style={styles.sectionTitle}>Drop-off Location</Text>
                  </View>
                  {dropoffAddress ? (
                    <View style={styles.selectedLocation}>
                      <Text style={styles.selectedLocationText}>{dropoffAddress}</Text>
                      {dropoffMapUrl && <Image source={{ uri: dropoffMapUrl }} style={styles.miniMap} resizeMode="cover" />}
                    </View>
                  ) : null}
                  <View style={styles.locationButtons}>
                    <TouchableOpacity style={styles.locationActionBtn} onPress={() => getCurrentLocation("dropoff")}>
                      <Icon name="navigate" size={18} color="#A1D826" />
                      <Text style={styles.locationActionText}>Current Location</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.locationActionBtn} onPress={() => openSearchModal("dropoff")}>
                      <Icon name="search" size={18} color="#A1D826" />
                      <Text style={styles.locationActionText}>Search Area</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setRegisterModalVisible(false)}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalNextButton} onPress={handleRegisterInitial}>
                  <LinearGradient colors={['#A1D826', '#8BC220']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalNextButtonGradient}>
                    <Text style={styles.modalNextButtonText}>Next</Text>
                    <Icon name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          LOCATION SEARCH MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={searchModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search {searchType === "pickup" ? "Pickup" : "Drop-off"} Location</Text>
              <TouchableOpacity onPress={() => { setSearchModalVisible(false); setSearchQuery(""); setSearchResults([]); }}>
                <Icon name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for area, street, or landmark..."
                value={searchQuery}
                onChangeText={(text) => { setSearchQuery(text); searchLocation(text); }}
                autoFocus
                placeholderTextColor="#999"
              />
              {searchingLocation && <ActivityIndicator size="small" color="#A1D826" />}
            </View>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id}
              style={styles.searchResults}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.searchResultItem} onPress={() => selectSearchResult(item.place_id, item.description)}>
                  <Icon name="location-outline" size={20} color="#A1D826" />
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultMain}>{item.structured_formatting.main_text}</Text>
                    <Text style={styles.searchResultSecondary}>{item.structured_formatting.secondary_text}</Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color="#999" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Icon name="search-outline" size={48} color="#ddd" />
                  <Text style={styles.emptySearchText}>{searchQuery ? "No results found" : "Type to search for location"}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          TRANSPORTER SELECTION MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={transporterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Transporter</Text>
              <TouchableOpacity onPress={() => { setTransporterModalVisible(false); setRegisterModalVisible(true); }}>
                <Icon name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {/* ── show selected preference badge ─────────────────────────────── */}
            {vehiclePreference && (
              <View style={styles.preferenceBadge}>
                <Icon name={VEHICLE_OPTIONS.find(v => v.id === vehiclePreference)?.icon} size={16} color="#fff" />
                <Text style={styles.preferenceBadgeText}>
                  Preference: {VEHICLE_OPTIONS.find(v => v.id === vehiclePreference)?.label}
                </Text>
              </View>
            )}

            {fetchingTransporters ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#A1D826" />
                <Text style={styles.loadingText}>Loading transporters...</Text>
              </View>
            ) : transporters.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="business-outline" size={64} color="#ddd" />
                <Text style={styles.emptyText}>No transporters available</Text>
                <Text style={styles.emptySubtext}>Please try again later or contact support</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchTransporters}>
                  <Icon name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={transporters}
                keyExtractor={(item) => item._id}
                style={styles.transporterList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.transporterCard, selectedTransporter?._id === item._id && styles.selectedTransporterCard]}
                    onPress={() => setSelectedTransporter(item)}
                  >
                    <View style={styles.transporterCardHeader}>
                      <View style={styles.transporterAvatar}>
                        <Icon name="business" size={24} color={selectedTransporter?._id === item._id ? "#A1D826" : "#666"} />
                      </View>
                      <View style={styles.transporterInfo}>
                        <View style={styles.transporterNameRow}>
                          <Text style={styles.transporterName}>{item.name}</Text>
                          {selectedTransporter?._id === item._id && <Icon name="checkmark-circle" size={20} color="#A1D826" />}
                        </View>
                        {item.company && <Text style={styles.transporterCompany}>🏢 {item.company}</Text>}
                      </View>
                    </View>
                    <View style={styles.transporterDetails}>
                      {item.email && (
                        <View style={styles.transporterDetailRow}>
                          <Icon name="mail" size={16} color="#666" />
                          <Text style={styles.transporterDetailText}>{item.email}</Text>
                        </View>
                      )}
                      {item.phone && (
                        <View style={styles.transporterDetailRow}>
                          <Icon name="call" size={16} color="#666" />
                          <Text style={styles.transporterDetailText}>{item.phone}</Text>
                        </View>
                      )}
                      {(item.city || item.zone || item.address) && (
                        <View style={styles.transporterDetailRow}>
                          <Icon name="location" size={16} color="#A1D826" />
                          <Text style={styles.transporterAreaText}>Service Area: {item.zone || item.city || item.address}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setTransporterModalVisible(false); setRegisterModalVisible(true); }}>
                <Icon name="arrow-back" size={18} color="#666" />
                <Text style={styles.modalCancelButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalNextButton, (!selectedTransporter || loading) && styles.disabledButton]}
                onPress={handleFinalRegistration}
                disabled={!selectedTransporter || loading}
              >
                <LinearGradient
                  colors={!selectedTransporter || loading ? ['#ccc', '#ccc'] : ['#A1D826', '#8BC220']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.modalNextButtonGradient}
                >
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Text style={styles.modalNextButtonText}>Send Request</Text>
                      <Icon name="send" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  content: { flex: 1, padding: 20 },
  infoCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  infoText: { flex: 1, marginLeft: 12, fontSize: 14, color: '#666', lineHeight: 20 },
  registerButton: { borderRadius: 12, overflow: 'hidden', shadowColor: '#A1D826', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  registerButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 12 },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  searchModalContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#999', marginBottom: 12 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 15, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#333' },

  // ── Vehicle preference styles ───────────────────────────────────────────────
  vehicleOptionsRow: { flexDirection: 'row', gap: 10 },
  vehicleCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, borderWidth: 2, borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    position: 'relative',
  },
  vehicleCardSelected: { borderColor: '#A1D826', backgroundColor: '#f4fce8' },
  vehicleIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#f0f9e6', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  vehicleIconCircleSelected: { backgroundColor: '#A1D826' },
  vehicleCardLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  vehicleCardLabelSelected: { color: '#5a7a0a' },
  vehicleCardDesc: { fontSize: 11, color: '#aaa', textAlign: 'center', lineHeight: 15 },
  vehicleCardDescSelected: { color: '#7ab020' },
  vehicleCheckmark: { position: 'absolute', top: 8, right: 8 },

  // ── Preference badge in transporter modal ───────────────────────────────────
  preferenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#A1D826', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 14,
  },
  preferenceBadgeText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  locationCard: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  locationLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginLeft: 8 },
  selectedLocation: { marginBottom: 10 },
  selectedLocationText: { fontSize: 14, color: '#666', marginBottom: 10 },
  miniMap: { width: '100%', height: 120, borderRadius: 8 },
  locationButtons: { flexDirection: 'row', gap: 10 },
  locationActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A1D826', gap: 6 },
  locationActionText: { fontSize: 13, color: '#A1D826', fontWeight: '500' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#333' },
  searchResults: { maxHeight: 400 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  searchResultText: { flex: 1, marginLeft: 12 },
  searchResultMain: { fontSize: 15, fontWeight: '500', color: '#333' },
  searchResultSecondary: { fontSize: 13, color: '#666', marginTop: 2 },
  emptySearch: { alignItems: 'center', padding: 40 },
  emptySearchText: { fontSize: 14, color: '#999', marginTop: 10 },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', padding: 14, borderRadius: 12, gap: 6 },
  modalCancelButtonText: { color: '#666', fontSize: 15, fontWeight: '600' },
  modalNextButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalNextButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 6 },
  modalNextButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  transporterList: { maxHeight: 400 },
  transporterCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 2, borderColor: '#e0e0e0' },
  selectedTransporterCard: { borderColor: '#A1D826', backgroundColor: '#f0f9e6' },
  transporterCardHeader: { flexDirection: 'row', marginBottom: 12 },
  transporterAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transporterInfo: { flex: 1 },
  transporterNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transporterName: { fontSize: 16, fontWeight: '600', color: '#333' },
  transporterCompany: { fontSize: 13, color: '#666', marginTop: 4 },
  transporterDetails: { gap: 8 },
  transporterDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transporterDetailText: { fontSize: 13, color: '#666' },
  transporterAreaText: { fontSize: 13, color: '#A1D826', fontWeight: '500' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 8, textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#A1D826', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 15, gap: 6 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});