import React, { useState } from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function DriverList({ navigation }) {
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all");
  const [search, setSearch] = useState("");

  const [drivers] = useState([
    {
      id: 1,
      name: "Ali Khan",
      availability: "09:00 - 17:00",
      isAvailableToday: true,
      vehicle: "Honda Civic 2020",
      rating: "4.8",
      completedRides: 127,
      experience: "3 years",
      mobile: "0300-1234567",
      vehicleType: "Sedan"
    },
    {
      id: 2,
      name: "Zara Iqbal",
      availability: "10:00 - 18:00",
      isAvailableToday: false,
      vehicle: "Toyota Corolla 2019",
      rating: "4.9",
      completedRides: 89,
      experience: "2 years",
      mobile: "0312-9876543",
      vehicleType: "Sedan"
    },
    {
      id: 3,
      name: "Ahmed Raza",
      availability: "08:00 - 16:00",
      isAvailableToday: true,
      vehicle: "Suzuki Cultus 2021",
      rating: "4.7",
      completedRides: 156,
      experience: "4 years",
      mobile: "0333-1234567",
      vehicleType: "Hatchback"
    },
    {
      id: 4,
      name: "Bilal Hussain",
      availability: "07:00 - 15:00",
      isAvailableToday: true,
      vehicle: "Toyota Prius 2022",
      rating: "4.6",
      completedRides: 67,
      experience: "1 year",
      mobile: "0300-5551234",
      vehicleType: "Hybrid"
    },
  ]);

  // Filter options
  const statusOptions = ["all", "available", "offline"];
  const ratingOptions = ["all", "4.5+", "4.7+", "4.8+"];
  const vehicleTypes = ["all", "Sedan", "Hatchback", "SUV", "Hybrid"];

  // Check if filters are active
  const isFilterActive = selectedStatus !== "all" || selectedRating !== "all";

  // Clear all filters
  const clearFilters = () => {
    setSelectedStatus("all");
    setSelectedRating("all");
    setSearch("");
  };

  // Filter drivers
  const filteredDrivers = drivers.filter((driver) => {
    // Search filter
    const matchesSearch =
      search === "" ||
      driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      driver.mobile.includes(search);

    // Status filter
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "available" && driver.isAvailableToday) ||
      (selectedStatus === "offline" && !driver.isAvailableToday);

    // Rating filter
    const matchesRating =
      selectedRating === "all" ||
      (selectedRating === "4.5+" && parseFloat(driver.rating) >= 4.5) ||
      (selectedRating === "4.7+" && parseFloat(driver.rating) >= 4.7) ||
      (selectedRating === "4.8+" && parseFloat(driver.rating) >= 4.8);

    return matchesSearch && matchesStatus && matchesRating;
  });

  const toggleDriver = (driverId) => {
    setExpandedDriver(expandedDriver === driverId ? null : driverId);
  };

  const getVehicleIcon = (vehicleType) => {
    switch (vehicleType?.toLowerCase()) {
      case 'sedan': return 'car-sedan';
      case 'hatchback': return 'car-hatchback';
      case 'suv': return 'car-suv';
      case 'hybrid': return 'car-electric';
      default: return 'car';
    }
  };

  // Filter Modal Component
  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Drivers</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>📊 Status</Text>
            <View style={styles.filterOptions}>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    selectedStatus === status && styles.selectedFilterOption
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedStatus === status && styles.selectedFilterOptionText
                  ]}>
                    {status === "all" ? "All Status" : 
                     status === "available" ? "🟢 Available" : "🔴 Offline"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>⭐ Rating</Text>
            <View style={styles.filterOptions}>
              {ratingOptions.map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.filterOption,
                    selectedRating === rating && styles.selectedFilterOption
                  ]}
                  onPress={() => setSelectedRating(rating)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedRating === rating && styles.selectedFilterOptionText
                  ]}>
                    {rating === "all" ? "All Ratings" : rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
          <Text style={styles.headerTitle}>Drivers Management</Text>
          <Text style={styles.headerSubtitle}>{filteredDrivers.length} drivers found</Text>
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, isFilterActive && styles.activeFilterButton]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options" size={20} color={isFilterActive ? "#afd826" : "#fff"} />
          {isFilterActive && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{drivers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {drivers.filter(d => d.isAvailableToday).length}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {drivers.filter(d => !d.isAvailableToday).length}
          </Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drivers by name, vehicle..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters */}
      {isFilterActive && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>Filters:</Text>
          {selectedStatus !== "all" && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>
                {selectedStatus === "available" ? "🟢 Available" : "🔴 Offline"}
              </Text>
              <TouchableOpacity onPress={() => setSelectedStatus("all")}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {selectedRating !== "all" && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>⭐ {selectedRating}</Text>
              <TouchableOpacity onPress={() => setSelectedRating("all")}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={clearFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {filteredDrivers.map((driver) => (
          <TouchableOpacity
            key={driver.id}
            style={[
              styles.card,
              expandedDriver === driver.id && styles.expandedCard
            ]}
            activeOpacity={0.8}
            onPress={() => toggleDriver(driver.id)}
          >
            {/* Driver Header */}
            <View style={styles.cardHeader}>
              <View style={styles.driverInfo}>
                <Image
                  source={{
                    uri: "https://ui-avatars.com/api/?name=" + encodeURIComponent(driver.name) + "&background=afd826&color=fff&size=100&bold=true",
                  }}
                  style={styles.avatar}
                />
                <View style={styles.nameContainer}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.rating}>{driver.rating}</Text>
                    <Text style={styles.rides}>({driver.completedRides} rides)</Text>
                  </View>
                </View>
              </View>

              <View style={[
                styles.availabilityBadge,
                driver.isAvailableToday ? styles.availableBadge : styles.offlineBadge
              ]}>
                <Ionicons
                  name={driver.isAvailableToday ? "checkmark-circle" : "time"}
                  size={12}
                  color="#fff"
                />
                <Text style={styles.availabilityText}>
                  {driver.isAvailableToday ? "Available" : "Offline"}
                </Text>
              </View>
            </View>

            {/* Basic Info */}
            <View style={styles.basicInfo}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <MaterialIcons name={getVehicleIcon(driver.vehicleType)} size={16} color="#666" />
                  <Text style={styles.infoText}>{driver.vehicle}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>{driver.availability}</Text>
                </View>
              </View>
            </View>

            {/* Expanded Details */}
            {expandedDriver === driver.id && (
              <View style={styles.expandedSection}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Experience</Text>
                    <Text style={styles.detailValue}>{driver.experience}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Mobile</Text>
                    <Text style={styles.detailValue}>{driver.mobile}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Vehicle Type</Text>
                    <Text style={styles.detailValue}>{driver.vehicleType}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Total Rides</Text>
                    <Text style={styles.detailValue}>{driver.completedRides}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.contactButton}>
                    <Ionicons name="call-outline" size={16} color="#fff" />
                    <Text style={styles.contactButtonText}>Call Driver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.messageButton}>
                    <Ionicons name="chatbubble-outline" size={16} color="#afd826" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Expand/Collapse Icon */}
            <View style={styles.expandIcon}>
              <Ionicons
                name={expandedDriver === driver.id ? "chevron-up" : "chevron-down"}
                size={20}
                color="#afd826"
              />
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty State */}
        {filteredDrivers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No Drivers Found</Text>
            <Text style={styles.emptyText}>
              {search || isFilterActive ? "Try adjusting your search or filters" : "No drivers available"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f9fb"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#afd826",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    position: "relative",
  },
  activeFilterButton: {
    backgroundColor: "#fff",
  },
  filterIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#afd826",
  },
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  activeFiltersContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  activeFiltersText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#afd826",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ff6b6b",
    borderRadius: 16,
  },
  clearAllText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    padding: 16,
  },
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
  expandedCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#afd826",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#afd826",
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 4,
    marginRight: 8,
  },
  rides: {
    fontSize: 12,
    color: "#6B7280",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  availableBadge: {
    backgroundColor: "#4CAF50",
  },
  offlineBadge: {
    backgroundColor: "#FF6B6B",
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  basicInfo: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#afd826",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  messageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#afd826",
    gap: 6,
  },
  messageButtonText: {
    color: "#afd826",
    fontWeight: "600",
    fontSize: 14,
  },
  expandIcon: {
    alignItems: "center",
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  selectedFilterOption: {
    backgroundColor: "#afd826",
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  selectedFilterOptionText: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  applyButton: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#afd826",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
