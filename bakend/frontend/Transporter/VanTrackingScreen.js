import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
  Modal,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Constants
const COLORS = {
  primary: "#afd826",
  primaryDark: "#8fb320",
  success: "#28a745",
  warning: "#f39c12",
  danger: "#dc3545",
  white: "#ffffff",
  black: "#111111",
  gray: "#6c757d",
  lightGray: "#f8f9fa",
  border: "#dee2e6",
  background: "#f8f9fa",
};

export default function VanTrackingScreen({ navigation, route }) {
  const { drivers: assignedDrivers } = route.params || {};
  const [vans, setVans] = useState([]);
  const [selectedVan, setSelectedVan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 33.6844,
    longitude: 73.0479,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedDriverForRoute, setSelectedDriverForRoute] = useState(null);

  const mapRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Riphah University coordinates
  const RIPHAH_UNIVERSITY = useMemo(() => ({
    latitude: 33.6462,
    longitude: 72.9834,
    name: "Riphah University",
    address: "Al-Mizan II, I-14, Islamabad"
  }), []);

  // Initialize vans from assigned drivers - Fixed with proper data handling
  useEffect(() => {
    console.log("Received drivers data:", assignedDrivers);
    
    if (assignedDrivers && assignedDrivers.length > 0) {
      const initializedVans = assignedDrivers.map(driver => {
        // Ensure all required fields are present
        const assignedPassengers = driver.assignedPassengers || [];
        const currentLocation = driver.currentLocation || driver.startLocation || { 
          latitude: 33.6844, 
          longitude: 73.0479 
        };
        
        return {
          id: driver.id,
          driver: driver.name,
          licensePlate: `ISB-${Math.floor(1000 + Math.random() * 9000)}`,
          contact: driver.contact || "+92-300-0000000",
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          timeAtSpot: "0 mins",
          status: "active",
          capacity: driver.capacity || 4,
          currentPassengers: assignedPassengers.length,
          color: driver.color || "#3498DB",
          routeColor: driver.routeColor || "#3498DB",
          routeSector: driver.routeSector || "Unknown Sector",
          vehicle: driver.vehicle || "Unknown Vehicle",
          rating: driver.rating || 4.5,
          assignedPassengers: assignedPassengers,
          startLocation: driver.startLocation || { latitude: 33.6844, longitude: 73.0479 },
          passengers: assignedPassengers.map((passenger, index) => ({
            id: passenger.id || `passenger-${index}`,
            name: passenger.name || "Unknown Passenger",
            status: index === 0 ? "pending" : "pending",
            pickupTime: passenger.pickupTime || "8:00 AM",
            estimatedTime: `${(index + 1) * 5} min`,
            coordinates: passenger.coordinates || { latitude: 33.6844, longitude: 73.0479 },
          }))
        };
      });
      
      setVans(initializedVans);
      setSelectedVan(initializedVans[0]);
      
      // Set initial map region to first driver
      if (initializedVans.length > 0 && initializedVans[0].latitude) {
        setMapRegion({
          latitude: initializedVans[0].latitude,
          longitude: initializedVans[0].longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
    } else {
      // Fallback data if no drivers provided
      console.log("No drivers data provided, using fallback");
      const fallbackVans = [
        {
          id: "fallback-1",
          driver: "Demo Driver",
          licensePlate: "ISB-1234",
          contact: "+92-300-0000000",
          latitude: 33.6844,
          longitude: 73.0479,
          timeAtSpot: "5 mins",
          status: "active",
          capacity: 4,
          currentPassengers: 2,
          color: "#3498DB",
          routeColor: "#3498DB",
          routeSector: "Demo Sector",
          vehicle: "Demo Vehicle",
          rating: 4.5,
          assignedPassengers: [],
          startLocation: { latitude: 33.6844, longitude: 73.0479 },
          passengers: [
            {
              id: "demo-passenger-1",
              name: "Demo Passenger 1",
              status: "pending",
              pickupTime: "8:00 AM",
              estimatedTime: "5 min",
              coordinates: { latitude: 33.6900, longitude: 73.0500 },
            },
            {
              id: "demo-passenger-2",
              name: "Demo Passenger 2",
              status: "pending",
              pickupTime: "8:15 AM",
              estimatedTime: "10 min",
              coordinates: { latitude: 33.6800, longitude: 73.0450 },
            }
          ]
        }
      ];
      setVans(fallbackVans);
      setSelectedVan(fallbackVans[0]);
    }
  }, [assignedDrivers]);

  // Fake live update with more realistic movement
  useEffect(() => {
    if (vans.length === 0) return;
    
    const interval = setInterval(() => {
      setVans((prev) =>
        prev.map((van) => ({
          ...van,
          latitude: van.latitude + (Math.random() - 0.5) * 0.0001,
          longitude: van.longitude + (Math.random() - 0.5) * 0.0001,
          timeAtSpot: `${Math.floor(Math.random() * 10) + 1} mins`,
        }))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [vans.length]);

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSelectVan = useCallback((van) => {
    setSelectedVan(van);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: van.latitude,
          longitude: van.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    }
  }, []);

  const handleViewDriverRoute = useCallback((van) => {
    setSelectedDriverForRoute(van);
    setShowRouteModal(true);
  }, []);

  const handleCloseRouteModal = useCallback(() => {
    setShowRouteModal(false);
    setTimeout(() => {
      setSelectedDriverForRoute(null);
    }, 100);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case "active": return COLORS.success;
      case "inactive": return COLORS.gray;
      case "maintenance": return COLORS.danger;
      default: return COLORS.warning;
    }
  }, []);

  const getDriverRoute = useCallback((van) => {
    if (!van || !van.assignedPassengers || van.assignedPassengers.length === 0) {
      // Return a default route if no passengers
      return van && van.startLocation ? [van.startLocation, RIPHAH_UNIVERSITY] : [];
    }
    
    const route = [van.startLocation];
    van.assignedPassengers.forEach(passenger => {
      if (passenger.coordinates) {
        route.push(passenger.coordinates);
      }
    });
    route.push(RIPHAH_UNIVERSITY);
    
    return route;
  }, [RIPHAH_UNIVERSITY]);

  const renderVanSelector = useCallback(({ item }) => (
    <TouchableOpacity
      style={[
        styles.vanSelectorItem,
        selectedVan?.id === item.id && styles.vanSelectorItemSelected,
      ]}
      onPress={() => handleSelectVan(item)}
    >
      <View style={styles.vanSelectorContent}>
        <View style={styles.vanSelectorInfo}>
          <Text style={[
            styles.vanSelectorText,
            selectedVan?.id === item.id && styles.vanSelectorTextSelected,
          ]}>
            {item.driver}
          </Text>
          <Text style={[
            styles.vanSelectorSector,
            selectedVan?.id === item.id && styles.vanSelectorTextSelected,
          ]}>
            {item.routeSector}
          </Text>
        </View>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(item.status) }
        ]} />
      </View>
    </TouchableOpacity>
  ), [selectedVan, handleSelectVan, getStatusColor]);

  const renderPassengerItem = useCallback(({ item }) => (
    <View style={[
      styles.passengerItem,
      item.status === "done" && styles.passengerItemPicked,
    ]}>
      <View style={styles.passengerInfo}>
        <Text style={styles.passengerName}>{item.name}</Text>
        <Text style={styles.passengerTime}>
          {item.status === "done" ? `Picked at ${item.pickupTime}` : `ETA: ${item.estimatedTime}`}
        </Text>
      </View>
      <View style={[
        styles.statusBadge,
        item.status === "done" ? styles.statusBadgeSuccess : styles.statusBadgePending,
      ]}>
        <Ionicons
          name={item.status === "done" ? "checkmark-circle" : "time"}
          size={16}
          color={COLORS.white}
        />
        <Text style={styles.statusBadgeText}>
          {item.status === "done" ? "Picked" : "Pending"}
        </Text>
      </View>
    </View>
  ), []);

  // Driver Route Modal - Fixed with stable reference
  const DriverRouteModal = useCallback(() => (
    <Modal
      visible={showRouteModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCloseRouteModal}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleCloseRouteModal}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {selectedDriverForRoute?.driver}'s Live Route
          </Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            showsUserLocation={false}
          >
            {/* Destination Marker */}
            <Marker
              coordinate={RIPHAH_UNIVERSITY}
              title="Riphah University"
              description="Final Destination"
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="school" size={20} color="#fff" />
              </View>
            </Marker>

            {/* Driver Route */}
            {selectedDriverForRoute && (
              <>
                <Polyline
                  coordinates={getDriverRoute(selectedDriverForRoute)}
                  strokeColor={selectedDriverForRoute.routeColor}
                  strokeWidth={5}
                  lineDashPattern={[10, 10]}
                />
                
                {/* Start Point */}
                <Marker
                  key={`start-${selectedDriverForRoute.id}`}
                  coordinate={selectedDriverForRoute.startLocation}
                  title="Start Point"
                  description={`${selectedDriverForRoute.driver}'s starting location`}
                >
                  <View style={[styles.startMarker, { backgroundColor: selectedDriverForRoute.color }]}>
                    <Ionicons name="play" size={16} color="#fff" />
                  </View>
                </Marker>

                {/* Passenger Stops */}
                {selectedDriverForRoute.assignedPassengers?.map((passenger, index) => (
                  <Marker
                    key={`route-stop-${selectedDriverForRoute.id}-${passenger.id}-${index}`}
                    coordinate={passenger.coordinates}
                    title={`Stop ${index + 1}: ${passenger.name}`}
                    description={`Pickup: ${passenger.pickupTime}`}
                  >
                    <View style={[styles.stopMarker, { backgroundColor: selectedDriverForRoute.color }]}>
                      <Text style={styles.stopNumber}>{index + 1}</Text>
                    </View>
                  </Marker>
                ))}

                {/* Current Van Location */}
                <Marker
                  key={`current-${selectedDriverForRoute.id}`}
                  coordinate={{
                    latitude: selectedDriverForRoute.latitude,
                    longitude: selectedDriverForRoute.longitude
                  }}
                  title={`${selectedDriverForRoute.driver} - Current Location`}
                  description={`Heading to next stop • ${selectedDriverForRoute.timeAtSpot}`}
                >
                  <View style={[styles.driverMarker, { backgroundColor: selectedDriverForRoute.color }]}>
                    <Ionicons name="car-sport" size={16} color="#fff" />
                  </View>
                </Marker>
              </>
            )}
          </MapView>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.routeDetails}>
            <Text style={styles.routeSectionTitle}>Live Route Information</Text>
            <View style={styles.routeInfo}>
              <View style={styles.routeInfoItem}>
                <Ionicons name="car" size={20} color="#3498DB" />
                <Text style={styles.routeInfoText}>
                  {selectedDriverForRoute?.vehicle}
                </Text>
              </View>
              <View style={styles.routeInfoItem}>
                <Ionicons name="people" size={20} color="#27AE60" />
                <Text style={styles.routeInfoText}>
                  {selectedDriverForRoute?.currentPassengers}/{selectedDriverForRoute?.capacity}
                </Text>
              </View>
              <View style={styles.routeInfoItem}>
                <Ionicons name="navigate" size={20} color="#F39C12" />
                <Text style={styles.routeInfoText}>
                  {selectedDriverForRoute?.timeAtSpot}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.stopsList}>
            <Text style={styles.routeSectionTitle}>Route Progress</Text>
            <View style={styles.stopItem}>
              <View style={[styles.stopNumber, styles.startStop]}>
                <Ionicons name="play" size={16} color="#fff" />
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>Start Point</Text>
                <Text style={styles.stopAddress}>{selectedDriverForRoute?.routeSector}</Text>
                <Text style={styles.stopTime}>🕒 Started</Text>
              </View>
            </View>

            {selectedDriverForRoute?.assignedPassengers?.map((passenger, index) => (
              <View key={`stop-item-${passenger.id}-${index}`} style={styles.stopItem}>
                <View style={[styles.stopNumber, { backgroundColor: selectedDriverForRoute?.color }]}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{passenger.name}</Text>
                  <Text style={styles.stopAddress}>{passenger.area}</Text>
                  <Text style={styles.stopTime}>🕒 {passenger.pickupTime}</Text>
                </View>
                <View style={[
                  styles.routeStatus,
                  index === 0 ? styles.routeStatusCurrent : styles.routeStatusPending
                ]}>
                  <Text style={styles.routeStatusText}>
                    {index === 0 ? 'Current' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.stopItem}>
              <View style={[styles.stopNumber, styles.endStop]}>
                <Ionicons name="school" size={16} color="#fff" />
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>Riphah University</Text>
                <Text style={styles.stopAddress}>Final Destination</Text>
                <Text style={styles.stopTime}>🕒 ~9:00 AM</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  ), [showRouteModal, selectedDriverForRoute, mapRegion, getDriverRoute, handleCloseRouteModal]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primaryDark} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Live Transport Tracking</Text>
          <Text style={styles.headerSubtitle}>Real-time vehicle monitoring</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Van Selector */}
      <Animated.View
        style={[
          styles.vanSelectorContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>Active Vehicles ({vans.length})</Text>
        <FlatList
          data={vans}
          horizontal
          keyExtractor={(item) => `van-selector-${item.id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vanSelectorList}
          renderItem={renderVanSelector}
          extraData={selectedVan}
        />
      </Animated.View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={false}
          showsCompass={true}
          showsTraffic={false}
        >
          {/* Destination Marker */}
          <Marker
            coordinate={RIPHAH_UNIVERSITY}
            title="Riphah University"
            description="Final Destination"
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="school" size={20} color="#fff" />
            </View>
          </Marker>

          {/* Van Routes and Markers */}
          {vans.map((van) => (
            <View key={`van-container-${van.id}`}>
              {/* Route Line */}
              {getDriverRoute(van).length > 1 && (
                <Polyline
                  key={`route-line-${van.id}`}
                  coordinates={getDriverRoute(van)}
                  strokeColor={van.routeColor}
                  strokeWidth={4}
                  lineDashPattern={[10, 10]}
                />
              )}
              
              {/* Van Marker */}
              <Marker
                key={`van-marker-${van.id}`}
                coordinate={{ latitude: van.latitude, longitude: van.longitude }}
                title={van.driver}
                description={`License: ${van.licensePlate}`}
                onPress={() => handleSelectVan(van)}
              >
                <View style={[
                  styles.markerContainer,
                  selectedVan?.id === van.id && styles.markerContainerSelected,
                ]}>
                  <Ionicons
                    name="car"
                    size={20}
                    color={selectedVan?.id === van.id ? COLORS.white : van.color}
                  />
                  <View style={[
                    styles.markerBadge,
                    { backgroundColor: selectedVan?.id === van.id ? COLORS.white : van.color }
                  ]}>
                    <Text style={[
                      styles.markerBadgeText,
                      { color: selectedVan?.id === van.id ? van.color : COLORS.white }
                    ]}>
                      {van.currentPassengers}/{van.capacity}
                    </Text>
                  </View>
                </View>
              </Marker>

              {/* Passenger Stops */}
              {van.assignedPassengers?.map((passenger, index) => (
                <Marker
                  key={`passenger-stop-${van.id}-${passenger.id}-${index}`}
                  coordinate={passenger.coordinates}
                  title={`Stop ${index + 1}: ${passenger.name}`}
                  description={`Pickup: ${passenger.pickupTime}`}
                >
                  <View style={[styles.stopMarker, { backgroundColor: van.color }]}>
                    <Text style={styles.stopNumber}>{index + 1}</Text>
                  </View>
                </Marker>
              ))}
            </View>
          ))}
        </MapView>
      </View>

      {/* Info Panel */}
      {selectedVan && (
        <Animated.View
          style={[
            styles.infoPanel,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.infoPanelHeader}>
            <View>
              <Text style={styles.infoPanelTitle}>{selectedVan.driver}</Text>
              <Text style={styles.infoPanelSubtitle}>
                {selectedVan.routeSector} • {selectedVan.licensePlate}
              </Text>
            </View>
            <View style={styles.infoPanelActions}>
              <TouchableOpacity 
                style={styles.routeButton}
                onPress={() => handleViewDriverRoute(selectedVan)}
              >
                <Ionicons name="map" size={16} color={COLORS.white} />
                <Text style={styles.routeButtonText}>View Route</Text>
              </TouchableOpacity>
              <View style={[
                styles.vanStatus,
                { backgroundColor: getStatusColor(selectedVan.status) }
              ]}>
                <Text style={styles.vanStatusText}>
                  {selectedVan.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {selectedVan.passengers.filter(p => p.status === "done").length}
              </Text>
              <Text style={styles.statLabel}>Picked Up</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {selectedVan.passengers.filter(p => p.status === "pending").length}
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{selectedVan.timeAtSpot}</Text>
              <Text style={styles.statLabel}>Current Stop</Text>
            </View>
          </View>

          <View style={styles.passengersHeader}>
            <Text style={styles.passengersTitle}>Passenger List</Text>
            <Text style={styles.passengersCount}>
              {selectedVan.currentPassengers}/{selectedVan.capacity}
            </Text>
          </View>
          <FlatList
            data={selectedVan.passengers}
            keyExtractor={(item) => `passenger-${item.id}`}
            renderItem={renderPassengerItem}
            showsVerticalScrollIndicator={false}
            style={styles.passengersList}
            contentContainerStyle={styles.passengersListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        </Animated.View>
      )}

      <DriverRouteModal />
    </SafeAreaView>
  );
}

// Styles remain exactly the same as your original VanTrackingScreen styles...
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerButton: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
  },
  vanSelectorContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray,
    marginLeft: 16,
    marginBottom: 8,
  },
  vanSelectorList: {
    paddingHorizontal: 16,
  },
  vanSelectorItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vanSelectorItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  vanSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 120,
  },
  vanSelectorInfo: {
    flex: 1,
  },
  vanSelectorText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.black,
  },
  vanSelectorTextSelected: {
    color: COLORS.white,
  },
  vanSelectorSector: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  markerContainerSelected: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.1 }],
  },
  markerBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  markerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  destinationMarker: {
    backgroundColor: '#E74C3C',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  startMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  infoPanel: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  infoPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 4,
  },
  infoPanelSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
  },
  infoPanelActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  routeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  routeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
  },
  vanStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vanStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.white,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  passengersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  passengersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.black,
  },
  passengersCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  passengersList: {
    flex: 1,
  },
  passengersListContent: {
    paddingBottom: 8,
  },
  passengerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  passengerItemPicked: {
    backgroundColor: "#e8f5e8",
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.black,
    marginBottom: 2,
  },
  passengerTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeSuccess: {
    backgroundColor: COLORS.success,
  },
  statusBadgePending: {
    backgroundColor: COLORS.warning,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.white,
    marginLeft: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    flex: 1,
  },
  routeDetails: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeInfoItem: {
    alignItems: 'center',
    gap: 8,
  },
  routeInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  stopsList: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 16,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startStop: {
    backgroundColor: '#27AE60',
  },
  endStop: {
    backgroundColor: '#E74C3C',
  },
  stopNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  stopTime: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '500',
  },
  routeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeStatusCurrent: {
    backgroundColor: '#3498DB',
  },
  routeStatusPending: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  routeStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  headerButton: {
    width: 40,
  },
});