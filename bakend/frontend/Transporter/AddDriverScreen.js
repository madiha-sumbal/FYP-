import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

export default function AddDriverSearch({ navigation }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all");

  const [drivers, setDrivers] = useState([
    {
      id: "1",
      name: "Ali Khan",
      mobile: "0300-1234567",
      location: "Lahore",
      status: "pending",
      experience: "3 years",
      vehicle: "Honda Civic 2020",
      rating: "4.5",
      completedRides: 127,
      joinDate: "15 Jan 2024",
      vehicleType: "Sedan"
    },
    {
      id: "2",
      name: "Zara Iqbal",
      mobile: "0312-1234567",
      location: "Karachi",
      status: "accepted",
      experience: "2 years",
      vehicle: "Toyota Corolla 2019",
      rating: "4.8",
      completedRides: 89,
      joinDate: "20 Feb 2024",
      vehicleType: "Sedan"
    },
    {
      id: "3",
      name: "Ahmed Raza",
      mobile: "0333-1234567",
      location: "Islamabad",
      status: "pending",
      experience: "4 years",
      vehicle: "Suzuki Cultus 2021",
      rating: "4.3",
      completedRides: 156,
      joinDate: "10 Mar 2024",
      vehicleType: "Hatchback"
    },
    {
      id: "4",
      name: "Bilal Hussain",
      mobile: "0302-9876543",
      location: "Faisalabad",
      status: "pending",
      experience: "1 year",
      vehicle: "Toyota Prius 2022",
      rating: "4.6",
      completedRides: 67,
      joinDate: "05 Apr 2024",
      vehicleType: "Hybrid"
    },
    {
      id: "5",
      name: "Saima Noor",
      mobile: "0321-9876543",
      location: "Multan",
      status: "accepted",
      experience: "5 years",
      vehicle: "Honda City 2020",
      rating: "4.9",
      completedRides: 203,
      joinDate: "12 Jan 2024",
      vehicleType: "Sedan"
    },
  ]);

  // Simple filter options
  const cities = ["all", "Lahore", "Karachi", "Islamabad", "Faisalabad", "Multan"];
  const ratings = ["all", "4.0+", "4.5+", "4.8+"];

  // Accept driver request
  const handleAccept = (id) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "accepted" } : d
      )
    );
  };

  // Delete driver request
  const handleDelete = (id) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  };

  // Check if filters are active
  const isFilterActive = selectedCity !== "all" || selectedRating !== "all";

  // Clear all filters
  const clearFilters = () => {
    setSelectedCity("all");
    setSelectedRating("all");
  };

  // Filter drivers
  const filteredDrivers = drivers.filter((d) => {
    // Search filter
    const matchesSearch =
      search === "" ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.mobile.includes(search) ||
      d.location.toLowerCase().includes(search.toLowerCase());

    // Tab filter
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && d.status === "pending") ||
      (activeTab === "accepted" && d.status === "accepted");

    // City filter
    const matchesCity = selectedCity === "all" || d.location === selectedCity;

    // Rating filter
    const matchesRating = 
      selectedRating === "all" ||
      (selectedRating === "4.0+" && parseFloat(d.rating) >= 4.0) ||
      (selectedRating === "4.5+" && parseFloat(d.rating) >= 4.5) ||
      (selectedRating === "4.8+" && parseFloat(d.rating) >= 4.8);

    return matchesSearch && matchesTab && matchesCity && matchesRating;
  });

  const getVehicleIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'sedan': return 'car-sedan';
      case 'hatchback': return 'car-hatchback';
      case 'suv': return 'car-suv';
      case 'hybrid': return 'car-electric';
      default: return 'car';
    }
  };

  // Simple Filter Modal
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
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* City Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>📍 City</Text>
            <View style={styles.filterOptions}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.filterOption,
                    selectedCity === city && styles.selectedFilterOption
                  ]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedCity === city && styles.selectedFilterOptionText
                  ]}>
                    {city === "all" ? "All Cities" : city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rating Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>⭐ Rating</Text>
            <View style={styles.filterOptions}>
              {ratings.map((rating) => (
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
              <Text style={styles.clearButtonText}>Clear</Text>
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

  const renderDriver = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.status === "accepted" && styles.acceptedCard
      ]}
      onPress={() => navigation.navigate("DriverProfile", { driver: item })}
      activeOpacity={0.8}
    >
      {/* Driver Header */}
      <View style={styles.cardHeader}>
        <View style={styles.driverInfo}>
          <Image
            source={{
              uri: "https://ui-avatars.com/api/?name=" + encodeURIComponent(item.name) + "&background=afd826&color=fff&size=100&bold=true",
            }}
            style={styles.avatar}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{item.rating}</Text>
              <Text style={styles.rides}>({item.completedRides} rides)</Text>
            </View>
          </View>
        </View>

        <View style={[
          styles.statusBadge,
          item.status === "accepted" ? styles.acceptedBadge : styles.pendingBadge
        ]}>
          <Text style={styles.statusText}>
            {item.status === "accepted" ? "Approved" : "Pending"}
          </Text>
        </View>
      </View>

      {/* Driver Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.mobile}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <MaterialIcons name={getVehicleIcon(item.vehicleType)} size={16} color="#666" />
            <Text style={styles.detailText}>{item.vehicle}</Text>
          </View>
          <View style={styles.detailItem}>
            <FontAwesome5 name="user-clock" size={14} color="#666" />
            <Text style={styles.detailText}>{item.experience}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {item.status === "pending" ? (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept(item.id)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.acceptButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.approvedContainer}>
          <Ionicons name="checkmark-done-circle" size={20} color="#afd826" />
          <Text style={styles.approvedText}>Driver Approved</Text>
        </View>
      )}
    </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Driver Management</Text>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search drivers..."
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
          {selectedCity !== "all" && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>📍 {selectedCity}</Text>
              <TouchableOpacity onPress={() => setSelectedCity("all")}>
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

      {/* Tab Filters */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>
            All ({drivers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <Text style={[styles.tabText, activeTab === "pending" && styles.activeTabText]}>
            Pending ({drivers.filter(d => d.status === "pending").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "accepted" && styles.activeTab]}
          onPress={() => setActiveTab("accepted")}
        >
          <Text style={[styles.tabText, activeTab === "accepted" && styles.activeTabText]}>
            Approved ({drivers.filter(d => d.status === "accepted").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Driver List */}
      <FlatList
        data={filteredDrivers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderDriver}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No drivers found</Text>
            <Text style={styles.emptyText}>
              {search || isFilterActive ? "Try different search or clear filters" : "No drivers available"}
            </Text>
          </View>
        }
      />

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
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#afd826",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  acceptedCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#afd826",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
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
  name: {
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: "#FFF9C4",
  },
  acceptedBadge: {
    backgroundColor: "#E8F5E8",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 8,
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#afd826",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ff6b6b",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  rejectButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  approvedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2ffe6",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#afd826",
    gap: 8,
  },
  approvedText: {
    color: "#2E7D32",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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