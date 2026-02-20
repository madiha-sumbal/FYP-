import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DriverTripHistoryScreen = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const trips = [
    { 
      id: "1", 
      date: "2025-10-10", 
      route: "City A → City B", 
      status: "Completed",
      time: "08:30 AM - 12:45 PM",
      duration: "4h 15m",
      distance: "235 km",
      fare: 2500,
      passengers: 3,
      rating: 4.8,
      vehicle: "Coaster - ABC 123"
    },
    { 
      id: "2", 
      date: "2025-10-12", 
      route: "City C → City D", 
      status: "Cancelled",
      time: "06:00 AM - 10:30 AM",
      duration: "4h 30m",
      distance: "280 km",
      fare: 2800,
      passengers: 4,
      rating: null,
      vehicle: "Coaster - ABC 123",
      cancellationReason: "Vehicle maintenance required"
    },
    { 
      id: "3", 
      date: "2025-10-18", 
      route: "City E → City F", 
      status: "Upcoming",
      time: "07:00 AM - 11:30 AM",
      duration: "4h 30m",
      distance: "265 km",
      fare: 2700,
      passengers: 5,
      rating: null,
      vehicle: "Coaster - ABC 123"
    },
    { 
      id: "4", 
      date: "2025-10-19", 
      route: "City A → City C", 
      status: "Completed",
      time: "09:00 AM - 01:15 PM",
      duration: "4h 15m",
      distance: "245 km",
      fare: 2600,
      passengers: 4,
      rating: 4.9,
      vehicle: "Coaster - ABC 123"
    },
    { 
      id: "5", 
      date: "2025-10-08", 
      route: "City B → City E", 
      status: "Completed",
      time: "10:30 AM - 02:45 PM",
      duration: "4h 15m",
      distance: "240 km",
      fare: 2550,
      passengers: 3,
      rating: 5.0,
      vehicle: "Coaster - ABC 123"
    },
  ];

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.route.toLowerCase().includes(search.toLowerCase()) ||
      trip.date.includes(search);
    const matchesFilter =
      filter === "All" ? true : trip.status === filter;
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const completedTrips = trips.filter(t => t.status === "Completed").length;
  const totalEarnings = trips
    .filter(t => t.status === "Completed")
    .reduce((sum, t) => sum + t.fare, 0);
  const avgRating = trips
    .filter(t => t.rating)
    .reduce((sum, t, _, arr) => sum + t.rating / arr.length, 0)
    .toFixed(1);

  const openDetails = (trip) => {
    setSelectedTrip(trip);
    setDetailsVisible(true);
  };

  const styles = {
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: {
      backgroundColor: "#A1D826",
      paddingVertical: 25,
      paddingTop: 50,
      alignItems: "center",
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },
    headerTitle: { color: "#fff", fontSize: 28, fontWeight: "bold" },
    headerSubtitle: { color: "#F0F9D9", fontSize: 14, marginTop: 4 },

    // Statistics Cards
    statsContainer: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: "#fff",
      padding: 15,
      borderRadius: 15,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 3,
    },
    statValue: { fontSize: 24, fontWeight: "bold", color: "#A1D826", marginTop: 5 },
    statLabel: { fontSize: 11, color: "#666", marginTop: 4, textAlign: "center" },

    searchContainer: {
      backgroundColor: "#fff",
      marginHorizontal: 20,
      marginTop: 15,
      borderRadius: 15,
      paddingHorizontal: 15,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    searchInput: { 
      fontSize: 15, 
      color: "#333",
      flex: 1,
      marginLeft: 10
    },

    tabContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginHorizontal: 20,
      marginVertical: 15,
      gap: 8,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: "#e8e8e8",
      alignItems: "center",
    },
    tabActive: { backgroundColor: "#A1D826" },
    tabText: { color: "#666", fontWeight: "600", fontSize: 13 },
    tabTextActive: { color: "#fff", fontWeight: "700" },

    tripCard: {
      backgroundColor: "#fff",
      marginHorizontal: 20,
      marginVertical: 6,
      padding: 18,
      borderRadius: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    tripHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    routeText: { 
      fontSize: 17, 
      fontWeight: "bold", 
      color: "#333",
      flex: 1,
      marginRight: 10
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      minWidth: 85,
      alignItems: "center",
    },
    statusText: {
      fontSize: 12,
      fontWeight: "700",
    },
    tripDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#f0f0f0",
    },
    tripDetailItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    tripDetailText: {
      fontSize: 13,
      color: "#666",
      marginLeft: 6,
    },
    dateText: { 
      color: "#666", 
      marginTop: 4,
      fontSize: 13
    },
    fareText: {
      fontSize: 20,
      fontWeight: "700",
      color: "#A1D826",
      marginTop: 8,
    },
    
    // Status colors
    statusColors: {
      Completed: "#4CAF50",
      Cancelled: "#F44336",
      Upcoming: "#FF9800",
    },
    statusBgColors: {
      Completed: "#E8F5E9",
      Cancelled: "#FFEBEE",
      Upcoming: "#FFF3E0",
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
      maxHeight: "85%",
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
    modalTitle: { fontSize: 24, fontWeight: "700", color: "#333" },
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
      alignItems: "center",
      paddingVertical: 10,
    },
    detailLabel: { color: "#666", fontSize: 14 },
    detailValue: { color: "#333", fontSize: 15, fontWeight: "600" },
    detailHighlight: { color: "#A1D826", fontSize: 18, fontWeight: "700" },
    
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFF8E1",
      padding: 12,
      borderRadius: 12,
      marginTop: 10,
    },
    ratingText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#F57C00",
      marginLeft: 8,
    },

    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: "#999",
      marginTop: 15,
      textAlign: "center",
    },
  };

  const StatusBadge = ({ status }) => (
    <View style={[
      styles.statusBadge, 
      { backgroundColor: styles.statusBgColors[status] }
    ]}>
      <Text style={[
        styles.statusText,
        { color: styles.statusColors[status] }
      ]}>
        {status}
      </Text>
    </View>
  );

  const renderTrip = ({ item }) => (
    <TouchableOpacity 
      style={styles.tripCard}
      onPress={() => openDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.routeText}>{item.route}</Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="calendar-outline" size={14} color="#999" />
        <Text style={styles.dateText}> {item.date}</Text>
        <Ionicons name="time-outline" size={14} color="#999" style={{ marginLeft: 15 }} />
        <Text style={styles.dateText}> {item.time}</Text>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.tripDetailItem}>
          <Ionicons name="speedometer-outline" size={16} color="#A1D826" />
          <Text style={styles.tripDetailText}>{item.distance}</Text>
        </View>
        <View style={styles.tripDetailItem}>
          <Ionicons name="hourglass-outline" size={16} color="#A1D826" />
          <Text style={styles.tripDetailText}>{item.duration}</Text>
        </View>
        <View style={styles.tripDetailItem}>
          <Ionicons name="people-outline" size={16} color="#A1D826" />
          <Text style={styles.tripDetailText}>{item.passengers} pax</Text>
        </View>
      </View>

      {item.status === "Completed" && (
        <Text style={styles.fareText}>Rs {item.fare.toLocaleString()}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
        <Text style={styles.headerSubtitle}>Track your journey records</Text>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#A1D826" />
          <Text style={styles.statValue}>{completedTrips}</Text>
          <Text style={styles.statLabel}>Completed Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color="#A1D826" />
          <Text style={styles.statValue}>{(totalEarnings / 1000).toFixed(0)}k</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={24} color="#A1D826" />
          <Text style={styles.statValue}>{avgRating}</Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          placeholder="Search by route or date..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          placeholderTextColor="#999"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {["All", "Completed", "Cancelled", "Upcoming"].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tab, filter === item && styles.tabActive]}
            onPress={() => setFilter(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === item && styles.tabTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trip List */}
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={renderTrip}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={60} color="#ddd" />
            <Text style={styles.emptyText}>No trips found</Text>
          </View>
        }
      />

      {/* Trip Details Modal */}
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
              <Text style={styles.modalTitle}>Trip Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setDetailsVisible(false)}
              >
                <Ionicons name="close" size={26} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedTrip && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Route & Status */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Route</Text>
                    <Text style={styles.detailValue}>{selectedTrip.route}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <StatusBadge status={selectedTrip.status} />
                  </View>
                </View>

                {/* Date & Time */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{selectedTrip.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{selectedTrip.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedTrip.duration}</Text>
                  </View>
                </View>

                {/* Trip Info */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{selectedTrip.distance}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Passengers</Text>
                    <Text style={styles.detailValue}>{selectedTrip.passengers} passengers</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vehicle</Text>
                    <Text style={styles.detailValue}>{selectedTrip.vehicle}</Text>
                  </View>
                  {selectedTrip.status === "Completed" && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fare</Text>
                      <Text style={styles.detailHighlight}>
                        Rs {selectedTrip.fare.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Rating */}
                {selectedTrip.rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={24} color="#F57C00" />
                    <Text style={styles.ratingText}>
                      {selectedTrip.rating} / 5.0 Rating
                    </Text>
                  </View>
                )}

                {/* Cancellation Reason */}
                {selectedTrip.cancellationReason && (
                  <View style={[styles.detailSection, { backgroundColor: "#FFEBEE" }]}>
                    <Text style={[styles.detailLabel, { marginBottom: 8 }]}>
                      Cancellation Reason
                    </Text>
                    <Text style={[styles.detailValue, { color: "#F44336" }]}>
                      {selectedTrip.cancellationReason}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={{
                    backgroundColor: "#A1D826",
                    paddingVertical: 16,
                    borderRadius: 15,
                    marginTop: 20,
                    alignItems: "center",
                  }}
                  onPress={() => setDetailsVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DriverTripHistoryScreen;