import React, { useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentsScreen({ navigation }) {
  const [payments, setPayments] = useState([
    {
      id: 1,
      type: "passenger",
      name: "Ahmed Raza",
      amount: "₨ 1,500",
      paymentStatus: true,
      date: "15 Dec 2023",
      paymentMethod: "Cash"
    },
    {
      id: 2,
      type: "driver",
      name: "Ali Khan",
      amount: "₨ 1,200",
      paymentStatus: false,
      date: "14 Dec 2023",
      paymentMethod: "Bank Transfer"
    },
    {
      id: 3,
      type: "passenger",
      name: "Sara Khan",
      amount: "₨ 1,800",
      paymentStatus: true,
      date: "14 Dec 2023",
      paymentMethod: "JazzCash"
    },
    {
      id: 4,
      type: "driver",
      name: "Zara Iqbal",
      amount: "₨ 1,300",
      paymentStatus: false,
      date: "13 Dec 2023",
      paymentMethod: "EasyPaisa"
    },
    {
      id: 5,
      type: "passenger",
      name: "Bilal Hussain",
      amount: "₨ 1,600",
      paymentStatus: true,
      date: "13 Dec 2023",
      paymentMethod: "Cash"
    },
    {
      id: 6,
      type: "driver",
      name: "Ahmed Raza",
      amount: "₨ 1,400",
      paymentStatus: true,
      date: "12 Dec 2023",
      paymentMethod: "Bank Transfer"
    },
  ]);

  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");

  // Filter options
  const typeOptions = ["all", "passenger", "driver"];
  const statusOptions = ["all", "paid", "pending"];
  const methodOptions = ["all", "Cash", "JazzCash", "EasyPaisa", "Bank Transfer"];

  // Mark payment as paid
  const markAsPaid = (id) => {
    setPayments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, paymentStatus: true } : item
      )
    );
  };

  // Check if filters are active
  const isFilterActive = selectedType !== "all" || selectedStatus !== "all" || selectedMethod !== "all";

  // Clear all filters
  const clearFilters = () => {
    setSelectedType("all");
    setSelectedStatus("all");
    setSelectedMethod("all");
  };

  // Filter payments based on active filters
  const filteredPayments = payments.filter((item) => {
    // Type filter
    const matchesType = selectedType === "all" || item.type === selectedType;
    
    // Status filter
    const matchesStatus = 
      selectedStatus === "all" || 
      (selectedStatus === "paid" && item.paymentStatus) ||
      (selectedStatus === "pending" && !item.paymentStatus);
    
    // Method filter
    const matchesMethod = selectedMethod === "all" || item.paymentMethod === selectedMethod;

    // Active tab filter
    const matchesActiveTab = 
      activeFilter === "all" ||
      (activeFilter === "paid" && item.paymentStatus) ||
      (activeFilter === "pending" && !item.paymentStatus);

    return matchesType && matchesStatus && matchesMethod && matchesActiveTab;
  });

  // Calculate stats
  const totalPayments = payments.length;
  const paidPayments = payments.filter(p => p.paymentStatus).length;
  const pendingPayments = payments.filter(p => !p.paymentStatus).length;
  const passengerPayments = payments.filter(p => p.type === "passenger").length;
  const driverPayments = payments.filter(p => p.type === "driver").length;

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
            <Text style={styles.modalTitle}>Filter Payments</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.filterOptions}>
              {typeOptions.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    selectedType === type && styles.selectedFilterOption
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedType === type && styles.selectedFilterOptionText
                  ]}>
                    {type === "all" ? "All Types" : 
                     type === "passenger" ? "Passengers" : "Drivers"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
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
                     status === "paid" ? "Paid" : "Pending"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Method Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Payment Method</Text>
            <View style={styles.filterOptions}>
              {methodOptions.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.filterOption,
                    selectedMethod === method && styles.selectedFilterOption
                  ]}
                  onPress={() => setSelectedMethod(method)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedMethod === method && styles.selectedFilterOptionText
                  ]}>
                    {method === "all" ? "All Methods" : method}
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments Management</Text>
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
          <Text style={styles.statNumber}>{totalPayments}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{paidPayments}</Text>
          <Text style={styles.statLabel}>Paid</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pendingPayments}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Active Filters */}
      {isFilterActive && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>Filters:</Text>
          {selectedType !== "all" && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>
                {selectedType === "passenger" ? "Passengers" : "Drivers"}
              </Text>
              <TouchableOpacity onPress={() => setSelectedType("all")}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {selectedStatus !== "all" && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>
                {selectedStatus === "paid" ? "Paid" : "Pending"}
              </Text>
              <TouchableOpacity onPress={() => setSelectedStatus("all")}>
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {selectedMethod !== "all" && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>{selectedMethod}</Text>
              <TouchableOpacity onPress={() => setSelectedMethod("all")}>
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
          style={[styles.tab, activeFilter === "all" && styles.activeTab]}
          onPress={() => setActiveFilter("all")}
        >
          <Text style={[styles.tabText, activeFilter === "all" && styles.activeTabText]}>
            All ({totalPayments})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeFilter === "paid" && styles.activeTab]}
          onPress={() => setActiveFilter("paid")}
        >
          <Text style={[styles.tabText, activeFilter === "paid" && styles.activeTabText]}>
            Paid ({paidPayments})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeFilter === "pending" && styles.activeTab]}
          onPress={() => setActiveFilter("pending")}
        >
          <Text style={[styles.tabText, activeFilter === "pending" && styles.activeTabText]}>
            Pending ({pendingPayments})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payments List */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {filteredPayments.map((item) => (
          <View key={item.id} style={[
            styles.card,
            item.paymentStatus && styles.paidCard
          ]}>

            {/* Payment Info */}
            <View style={styles.paymentInfo}>
              <View style={styles.avatarContainer}>
                <Ionicons 
                  name={item.type === "passenger" ? "person" : "car"} 
                  size={24} 
                  color="#fff" 
                />
              </View>
              <View style={styles.paymentDetails}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.paymentMeta}>
                  <Text style={styles.amount}>{item.amount}</Text>
                  <Text style={styles.date}>{item.date}</Text>
                </View>
                <Text style={styles.method}>{item.paymentMethod}</Text>
              </View>
            </View>

            {/* Payment Status */}
            <View style={styles.statusContainer}>
              {item.paymentStatus ? (
                <View style={styles.paidStatus}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.paidText}>Paid</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pendingButton}
                  onPress={() => markAsPaid(item.id)}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.pendingButtonText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {filteredPayments.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="card-outline"
              size={64}
              color="#ccc"
            />
            <Text style={styles.emptyTitle}>
              No payments found
            </Text>
            <Text style={styles.emptyText}>
              {isFilterActive 
                ? "Try adjusting your filters"
                : "No payments available at the moment"
              }
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
    justifyContent: "space-between",
    backgroundColor: "#afd826",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
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
    justifyContent: "center",
    paddingVertical: 12,
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
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
    justifyContent: "space-between",
  },
  paidCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#afd826",
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#afd826",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  paymentMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#afd826",
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  method: {
    fontSize: 12,
    color: "#888",
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  paidStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  paidText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
  },
  pendingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#afd826",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  pendingButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
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
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
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
    paddingVertical: 12,
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
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#afd826",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});