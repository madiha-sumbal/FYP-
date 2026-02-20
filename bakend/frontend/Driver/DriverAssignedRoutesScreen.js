import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

const { width, height } = Dimensions.get("window");

const DriverAssignedRoutesScreen = ({ navigation }) => {
  const [routeStarted, setRouteStarted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(0); // Current stop index
  const [mapExpanded, setMapExpanded] = useState(false);
  const [routeStops, setRouteStops] = useState([
    { 
      id: 1, 
      name: "Stop 1 - DHA Phase 5", 
      passenger: "Ali Khan", 
      status: "Pending", 
      time: "7:30 AM", 
      phone: "+92 300 1234567",
      coordinate: { latitude: 24.8125, longitude: 67.0611 }
    },
    { 
      id: 2, 
      name: "Stop 2 - SMCHS", 
      passenger: "Sara Malik", 
      status: "Pending", 
      time: "7:45 AM", 
      phone: "+92 301 2345678",
      coordinate: { latitude: 24.8235, longitude: 67.0725 }
    },
    { 
      id: 3, 
      name: "Stop 3 - Saddar", 
      passenger: "Bilal Ahmed", 
      status: "Pending", 
      time: "8:00 AM", 
      phone: "+92 302 3456789",
      coordinate: { latitude: 24.8520, longitude: 67.0180 }
    },
    { 
      id: 4, 
      name: "Stop 4 - Clifton Block 2", 
      passenger: "Hina Shah", 
      status: "Pending", 
      time: "8:15 AM", 
      phone: "+92 303 4567890",
      coordinate: { latitude: 24.8138, longitude: 67.0300 }
    },
    { 
      id: 5, 
      name: "Final Stop - Karachi Grammar School", 
      passenger: "Multiple", 
      status: "Pending", 
      time: "8:30 AM", 
      phone: "N/A",
      coordinate: { latitude: 24.8607, longitude: 67.0011 }
    },
  ]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const routeData = {
    routeName: "Morning Pickup Route",
    date: "19 Oct 2025",
    vehicleNumber: "LEA-4567",
    vehicleType: "Coaster",
    pickupTime: "7:30 AM",
    estimatedArrival: "9:00 AM",
    totalStops: 5,
    totalDistance: "25 km",
    estimatedDuration: "1h 30m",
  };

  // Simulate vehicle movement
  useEffect(() => {
    if (routeStarted && currentLocation < routeStops.length) {
      const timer = setTimeout(() => {
        setCurrentLocation(prev => prev + 1);
      }, 5000); // Move to next stop every 5 seconds
      return () => clearTimeout(timer);
    }
  }, [routeStarted, currentLocation]);

  const handleStartRoute = () => {
    Alert.alert(
      "Start Route",
      "Are you ready to start this route?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Start", 
          onPress: () => {
            setRouteStarted(true);
            setCurrentLocation(0);
          }
        }
      ]
    );
  };

  const handleEndRoute = () => {
    const allCompleted = routeStops.every(stop => stop.status === "Completed");
    if (!allCompleted) {
      Alert.alert(
        "Incomplete Route",
        "Some stops are still pending. Are you sure you want to end the route?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "End Anyway", 
            style: "destructive",
            onPress: () => {
              setRouteStarted(false);
              setCurrentLocation(0);
              Alert.alert("Success", "Route ended successfully!");
            }
          }
        ]
      );
    } else {
      setRouteStarted(false);
      setCurrentLocation(0);
      Alert.alert("Success", "Route completed successfully!");
    }
  };

  const toggleStopStatus = (stopId) => {
    if (!routeStarted) {
      Alert.alert("Route Not Started", "Please start the route first before marking stops.");
      return;
    }

    setRouteStops(routeStops.map(stop => 
      stop.id === stopId 
        ? { ...stop, status: stop.status === "Pending" ? "Completed" : "Pending" }
        : stop
    ));
  };

  const openStopDetails = (stop) => {
    setSelectedStop(stop);
    setDetailsVisible(true);
  };

  const completedStops = routeStops.filter(s => s.status === "Completed").length;
  const progress = (completedStops / routeStops.length) * 100;

  // Get route coordinates for polyline
  const routeCoordinates = routeStops.map(stop => stop.coordinate);

  // Current vehicle position (interpolate between stops if needed)
  const vehiclePosition = routeStarted && currentLocation > 0 
    ? routeStops[Math.min(currentLocation - 1, routeStops.length - 1)].coordinate
    : routeStops[0].coordinate;

  const styles = {
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: { 
      paddingVertical: 25,
      paddingTop: 50,
      alignItems: "center",
      backgroundColor: "#A1D826",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
      zIndex: 10,
    },
    headerTitle: { color: "#fff", fontSize: 28, fontWeight: "bold" },
    headerSubtitle: { color: "#F0F9D9", fontSize: 14, marginTop: 4 },

    // Map Container
    mapContainer: {
      marginHorizontal: 20,
      marginTop: 20,
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 8,
    },
    mapView: {
      width: "100%",
      height: mapExpanded ? height * 0.6 : 250,
    },
    mapOverlay: {
      position: "absolute",
      top: 10,
      right: 10,
      flexDirection: "row",
      gap: 8,
    },
    mapButton: {
      backgroundColor: "rgba(255,255,255,0.95)",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 3,
    },
    mapButtonText: {
      color: "#333",
      fontWeight: "600",
      fontSize: 12,
      marginLeft: 4,
    },

    // Progress Bar
    progressContainer: {
      backgroundColor: "#fff",
      marginHorizontal: 20,
      marginTop: 20,
      padding: 20,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    progressTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
    progressText: { fontSize: 14, color: "#A1D826", fontWeight: "600" },
    progressBarBg: {
      height: 12,
      backgroundColor: "#E8F5E9",
      borderRadius: 10,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: "#A1D826",
      borderRadius: 10,
    },

    card: {
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: 22,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      marginBottom: 20,
    },
    cardTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 16 },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    infoIcon: { marginRight: 12, width: 24, alignItems: "center" },
    cardText: { color: "#555", fontSize: 15, flex: 1 },

    sectionTitle: { 
      fontSize: 20, 
      fontWeight: "700", 
      color: "#333", 
      marginBottom: 15,
      marginTop: 10
    },

    stopCard: {
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    stopHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    stopNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#F0F9D9",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    stopNumberText: { color: "#A1D826", fontWeight: "700", fontSize: 14 },
    stopName: { fontWeight: "600", color: "#333", fontSize: 16, flex: 1 },
    stopPassenger: { 
      color: "#666", 
      fontSize: 14,
      marginTop: 6,
      marginLeft: 44
    },
    stopTime: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginLeft: 44,
    },
    stopTimeText: { color: "#999", fontSize: 13, marginLeft: 6 },
    stopFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#f5f5f5",
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      minWidth: 90,
      alignItems: "center",
    },
    stopStatus: { fontWeight: "600", fontSize: 12 },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#f5f5f5",
      alignItems: "center",
      justifyContent: "center",
    },
    
    startButton: { 
      paddingVertical: 16, 
      borderRadius: 15, 
      alignItems: "center",
      marginTop: 20,
      marginBottom: 30,
      flexDirection: "row",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    startButtonText: { color: "#fff", fontWeight: "700", fontSize: 17, marginLeft: 8 },
    
    statusColors: { 
      Completed: "#4CAF50", 
      Pending: "#FF9800",
      "In Progress": "#2196F3"
    },
    statusBgColors: {
      Completed: "#E8F5E9",
      Pending: "#FFF3E0",
      "In Progress": "#E3F2FD"
    },

    // Modal styles
    modalOverlay: { 
      flex: 1, 
      backgroundColor: "rgba(0,0,0,0.6)", 
      justifyContent: "flex-end"
    },
    modalContent: { 
      backgroundColor: "#fff", 
      borderTopLeftRadius: 30, 
      borderTopRightRadius: 30,
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 30,
      maxHeight: "70%",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 15,
    },
    modalHeader: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0"
    },
    modalTitle: { fontSize: 22, fontWeight: "700", color: "#333" },
    closeButton: { 
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#f5f5f5",
      alignItems: "center",
      justifyContent: "center"
    },
    detailSection: {
      backgroundColor: "#f9f9f9",
      padding: 16,
      borderRadius: 15,
      marginBottom: 15,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    detailLabel: { color: "#666", fontSize: 14 },
    detailValue: { color: "#333", fontSize: 15, fontWeight: "600", flex: 1, textAlign: "right" },
    
    actionButton: {
      backgroundColor: "#A1D826",
      paddingVertical: 16,
      borderRadius: 15,
      marginTop: 10,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    actionButtonText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },
  };

  const StatusBadge = ({ status }) => (
    <View style={[
      styles.statusBadge, 
      { backgroundColor: styles.statusBgColors[status] }
    ]}>
      <Text style={[
        styles.stopStatus,
        { color: styles.statusColors[status] }
      ]}>
        {status}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assigned Route</Text>
        <Text style={styles.headerSubtitle}>Manage your route stops</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapView}
            initialRegion={{
              latitude: 24.8300,
              longitude: 67.0400,
              latitudeDelta: 0.15,
              longitudeDelta: 0.15,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {/* Route Line */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#A1D826"
              strokeWidth={4}
              lineDashPattern={[1]}
            />

            {/* Stop Markers */}
            {routeStops.map((stop, index) => (
              <Marker
                key={stop.id}
                coordinate={stop.coordinate}
                title={stop.name}
                description={stop.passenger}
                onPress={() => openStopDetails(stop)}
              >
                <View style={{
                  backgroundColor: stop.status === "Completed" ? "#4CAF50" : "#FF9800",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: "#fff",
                  shadowColor: "#000",
                  shadowOpacity: 0.3,
                  shadowRadius: 5,
                  elevation: 5,
                }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                    {index + 1}
                  </Text>
                </View>
              </Marker>
            ))}

            {/* Vehicle Marker (Only show when route started) */}
            {routeStarted && (
              <Marker
                coordinate={vehiclePosition}
                title="Your Vehicle"
                description={routeData.vehicleNumber}
              >
                <View style={{
                  backgroundColor: "#2196F3",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: "#fff",
                  shadowColor: "#000",
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 8,
                }}>
                  <Ionicons name="car" size={20} color="#fff" />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Map Controls Overlay */}
          <View style={styles.mapOverlay}>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => setMapExpanded(!mapExpanded)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={mapExpanded ? "contract" : "expand"} 
                size={16} 
                color="#A1D826" 
              />
              <Text style={styles.mapButtonText}>
                {mapExpanded ? "Collapse" : "Expand"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          {/* Progress Indicator */}
          {routeStarted && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Route Progress</Text>
                <Text style={styles.progressText}>
                  {completedStops} / {routeStops.length} stops
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}

          {/* Route Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{routeData.routeName}</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar" size={20} color="#A1D826" />
              </View>
              <Text style={styles.cardText}>{routeData.date}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="bus" size={20} color="#A1D826" />
              </View>
              <Text style={styles.cardText}>
                {routeData.vehicleType} - {routeData.vehicleNumber}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="time" size={20} color="#A1D826" />
              </View>
              <Text style={styles.cardText}>
                {routeData.pickupTime} - {routeData.estimatedArrival}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="navigate" size={20} color="#A1D826" />
              </View>
              <Text style={styles.cardText}>
                {routeData.totalDistance} • {routeData.estimatedDuration}
              </Text>
            </View>
          </View>

          {/* Route Stops */}
          <Text style={styles.sectionTitle}>Route Stops</Text>

          {routeStops.map((stop, index) => (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={styles.stopNumber}>
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stopName}>{stop.name}</Text>
                </View>
                <StatusBadge status={stop.status} />
              </View>

              <Text style={styles.stopPassenger}>
                <Ionicons name="person" size={14} color="#999" /> {stop.passenger}
              </Text>

              <View style={styles.stopTime}>
                <Ionicons name="time-outline" size={14} color="#999" />
                <Text style={styles.stopTimeText}>{stop.time}</Text>
              </View>

              <View style={styles.stopFooter}>
                <TouchableOpacity
                  style={[styles.actionButton, { flex: 1, marginRight: 8 }]}
                  onPress={() => toggleStopStatus(stop.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={stop.status === "Completed" ? "checkmark-circle" : "checkmark-circle-outline"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.actionButtonText}>
                    {stop.status === "Completed" ? "Pending" : "Complete"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => openStopDetails(stop)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={20} color="#A1D826" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Start / End Route Button */}
          <TouchableOpacity
            onPress={routeStarted ? handleEndRoute : handleStartRoute}
            style={[
              styles.startButton,
              { backgroundColor: routeStarted ? "#F44336" : "#A1D826" }
            ]}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={routeStarted ? "stop-circle" : "play-circle"} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.startButtonText}>
              {routeStarted ? "End Route" : "Start Route"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Stop Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1}
            onPress={() => setDetailsVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stop Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setDetailsVisible(false)}
              >
                <Ionicons name="close" size={26} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedStop && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stop Name</Text>
                    <Text style={styles.detailValue}>{selectedStop.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Passenger</Text>
                    <Text style={styles.detailValue}>{selectedStop.passenger}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pickup Time</Text>
                    <Text style={styles.detailValue}>{selectedStop.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedStop.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <StatusBadge status={selectedStop.status} />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, { marginBottom: 10 }]}
                  onPress={() => {
                    Alert.alert("Call Passenger", `Calling ${selectedStop.passenger}...`);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Call Passenger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
                  onPress={() => {
                    Alert.alert("Navigate", "Opening navigation...");
                    setDetailsVisible(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Navigate to Stop</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DriverAssignedRoutesScreen;