import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function SmartScheduling({ navigation }) {
  const [bookings] = useState([
    {
      id: 1,
      name: "Sara Khan",
      pickup: "Gulberg",
      drop: "Model Town",
      preferredTime: "08:00",
      avatar: "https://ui-avatars.com/api/?name=Sara+Khan&background=afd826&color=fff&size=100"
    },
    {
      id: 2,
      name: "Ahmed Raza",
      pickup: "DHA Phase 5",
      drop: "Gulberg",
      preferredTime: "08:15",
      avatar: "https://ui-avatars.com/api/?name=Ahmed+Raza&background=afd826&color=fff&size=100"
    },
    {
      id: 3,
      name: "Ali Hassan",
      pickup: "Johar Town",
      drop: "DHA Phase 6",
      preferredTime: "08:30",
      avatar: "https://ui-avatars.com/api/?name=Ali+Hassan&background=afd826&color=fff&size=100"
    },
    {
      id: 4,
      name: "Zara Sheikh",
      pickup: "Wapda Town",
      drop: "Gulberg",
      preferredTime: "08:45",
      avatar: "https://ui-avatars.com/api/?name=Zara+Sheikh&background=afd826&color=fff&size=100"
    },
  ]);

  const [drivers] = useState([
    {
      id: 1,
      name: "Ali Khan",
      vehicle: "Honda Civic",
      avatar: "https://ui-avatars.com/api/?name=Ali+Khan&background=4A90E2&color=fff&size=100"
    },
    {
      id: 2,
      name: "Ahmed Raza",
      vehicle: "Toyota Corolla",
      avatar: "https://ui-avatars.com/api/?name=Ahmed+Raza&background=4A90E2&color=fff&size=100"
    },
    {
      id: 3,
      name: "Zara Iqbal",
      vehicle: "Suzuki Cultus",
      avatar: "https://ui-avatars.com/api/?name=Zara+Iqbal&background=4A90E2&color=fff&size=100"
    },
  ]);

  const [suggestedRoutes, setSuggestedRoutes] = useState([]);
  const [confirmedRoutes, setConfirmedRoutes] = useState([]);

  useEffect(() => {
    generateSuggestedRoutes();
  }, []);

  const generateSuggestedRoutes = () => {
    const route1 = {
      id: Date.now() + 1,
      name: "Morning Route 1",
      passengers: bookings.slice(0, 2),
      driver: null,
      estimatedTime: "45 mins",
      distance: "12 km"
    };
    const route2 = {
      id: Date.now() + 2,
      name: "Morning Route 2",
      passengers: bookings.slice(2),
      driver: null,
      estimatedTime: "35 mins",
      distance: "8 km"
    };
    setSuggestedRoutes([route1, route2]);
  };

  const assignDriver = (routeId, driver) => {
    const updatedRoutes = suggestedRoutes.map((route) =>
      route.id === routeId ? { ...route, driver } : route
    );
    setSuggestedRoutes(updatedRoutes);
  };

  const adjustPickupTime = (routeId, passengerId, newTime) => {
    const updatedRoutes = suggestedRoutes.map((route) => {
      if (route.id === routeId) {
        const updatedPassengers = route.passengers.map((p) =>
          p.id === passengerId ? { ...p, preferredTime: newTime } : p
        );
        return { ...route, passengers: updatedPassengers };
      }
      return route;
    });
    setSuggestedRoutes(updatedRoutes);
  };

  const confirmSchedule = (route) => {
    if (!route.driver) {
      Alert.alert("Assign Driver", "Please assign a driver before confirming.");
      return;
    }
    setConfirmedRoutes([...confirmedRoutes, route]);
    setSuggestedRoutes(suggestedRoutes.filter((r) => r.id !== route.id));
    Alert.alert("✅ Schedule Confirmed", `${route.name} confirmed with driver ${route.driver.name}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#afd826" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Smart Scheduling</Text>
          <Text style={styles.headerSubtitle}>Optimize passenger routes</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{suggestedRoutes.length}</Text>
          <Text style={styles.statLabel}>Suggested</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{confirmedRoutes.length}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Suggested Routes Section */}
        <Text style={styles.sectionTitle}>🚐 Suggested Routes</Text>
        {suggestedRoutes.map((route, idx) => (
          <View key={route.id} style={styles.card}>

            {/* Route Header */}
            <View style={styles.cardHeader}>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.name}</Text>
                <View style={styles.routeStats}>
                  <View style={styles.routeStat}>
                    <Ionicons name="time" size={14} color="#666" />
                    <Text style={styles.routeStatText}>{route.estimatedTime}</Text>
                  </View>
                  <View style={styles.routeStat}>
                    <Ionicons name="location" size={14} color="#666" />
                    <Text style={styles.routeStatText}>{route.distance}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.passengerCount}>
                <Ionicons name="people" size={16} color="#afd826" />
                <Text style={styles.passengerCountText}>{route.passengers.length}</Text>
              </View>
            </View>

            {/* Passengers List */}
            <Text style={styles.subTitle}>Passengers</Text>
            {route.passengers.map((passenger) => (
              <View key={passenger.id} style={styles.passengerRow}>
                <Image source={{ uri: passenger.avatar }} style={styles.passengerAvatar} />
                <View style={styles.passengerDetails}>
                  <Text style={styles.passengerName}>{passenger.name}</Text>
                  <Text style={styles.passengerRoute}>{passenger.pickup} → {passenger.drop}</Text>
                </View>
                <TextInput
                  style={styles.timeInput}
                  value={passenger.preferredTime}
                  onChangeText={(text) => adjustPickupTime(route.id, passenger.id, text)}
                  placeholder="HH:MM"
                />
              </View>
            ))}

            {/* Driver Assignment */}
            <Text style={styles.subTitle}>Assign Driver</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.driversContainer}>
              {drivers.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={[
                    styles.driverCard,
                    route.driver?.id === driver.id && styles.selectedDriverCard
                  ]}
                  onPress={() => assignDriver(route.id, driver)}
                >
                  <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />
                  <View style={styles.driverInfo}>
                    <Text style={[
                      styles.driverName,
                      route.driver?.id === driver.id && styles.selectedDriverText
                    ]}>
                      {driver.name}
                    </Text>
                    <Text style={[
                      styles.driverVehicle,
                      route.driver?.id === driver.id && styles.selectedDriverText
                    ]}>
                      {driver.vehicle}
                    </Text>
                  </View>
                  {route.driver?.id === driver.id && (
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !route.driver && styles.disabledButton
              ]}
              onPress={() => confirmSchedule(route)}
              disabled={!route.driver}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.confirmButtonText}>
                {route.driver ? 'Confirm Schedule' : 'Assign Driver First'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Confirmed Routes Section */}
        <Text style={styles.sectionTitle}>✅ Confirmed Routes</Text>
        {confirmedRoutes.map((route) => (
          <View key={route.id} style={[styles.card, styles.confirmedCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.name}</Text>
                <Text style={styles.confirmedText}>Confirmed</Text>
              </View>
              <View style={styles.driverBadge}>
                <Image source={{ uri: route.driver.avatar }} style={styles.driverBadgeAvatar} />
                <Text style={styles.driverBadgeText}>{route.driver.name}</Text>
              </View>
            </View>

            {route.passengers.map((passenger) => (
              <View key={passenger.id} style={styles.confirmedPassenger}>
                <Image source={{ uri: passenger.avatar }} style={styles.passengerAvatar} />
                <View style={styles.passengerDetails}>
                  <Text style={styles.passengerName}>{passenger.name}</Text>
                  <Text style={styles.passengerRoute}>{passenger.pickup} → {passenger.drop}</Text>
                </View>
                <Text style={styles.pickupTime}>{passenger.preferredTime}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f9fb"
  },

  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#afd826",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 4,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  filterButton: {
    padding: 4,
  },

  // Stats Overview
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#afd826",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Container
  container: {
    flex: 1,
    padding: 16,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
    marginTop: 8,
  },

  // Card Styles
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmedCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },

  // Card Header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  routeStats: {
    flexDirection: "row",
    gap: 12,
  },
  routeStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeStatText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  passengerCount: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  passengerCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },

  // Sub Title
  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },

  // Passenger Row
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  passengerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 2,
  },
  passengerRoute: {
    fontSize: 12,
    color: "#666",
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    width: 70,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
  },

  // Drivers Container
  driversContainer: {
    marginBottom: 16,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 160,
  },
  selectedDriverCard: {
    backgroundColor: "#afd826",
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 2,
  },
  driverVehicle: {
    fontSize: 12,
    color: "#666",
  },
  selectedDriverText: {
    color: "#fff",
  },

  // Confirm Button
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#afd826",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: "#E5E7EB",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  // Confirmed Section
  confirmedText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  driverBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  driverBadgeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  driverBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  confirmedPassenger: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickupTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#afd826",
  },
});