import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DriverPaymentsScreen = () => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const paymentData = [
    { 
      id: 1, 
      month: "October 2025", 
      amount: 30000, 
      status: "Transferred", 
      date: "15 Oct 2025",
      trips: 142,
      totalEarnings: 35000,
      commission: 5000,
      transactionId: "EP2025101512345"
    },
    { 
      id: 2, 
      month: "September 2025", 
      amount: 28500, 
      status: "Transferred", 
      date: "15 Sep 2025",
      trips: 138,
      totalEarnings: 33500,
      commission: 5000,
      transactionId: "EP2025091512234"
    },
    { 
      id: 3, 
      month: "August 2025", 
      amount: 29000, 
      status: "Transferred", 
      date: "15 Aug 2025",
      trips: 140,
      totalEarnings: 34000,
      commission: 5000,
      transactionId: "EP2025081512123"
    },
  ];

  const latestNotification = {
    message: "Your payment for October 2025 has been transferred to your Easypaisa account.",
    time: "15 Oct 2025 - 2:15 PM",
  };

  const currentPayment = paymentData[0];
  const totalEarned = paymentData.reduce((sum, p) => sum + p.amount, 0);

  const openDetails = (payment) => {
    setSelectedPayment(payment);
    setDetailsVisible(true);
  };

  const styles = {
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: { 
      paddingVertical: 30,
      paddingTop: 50,
      alignItems: "center", 
      backgroundColor: "#A1D826",
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
    },
    headerTitle: { color: "#fff", fontSize: 28, fontWeight: "bold" },
    headerSubtitle: { color: "#F0F9D9", fontSize: 14, marginTop: 6 },
    
    scrollContent: { padding: 20 },
    
    notificationCard: {
      backgroundColor: "#F0F9D9",
      borderLeftWidth: 4,
      borderLeftColor: "#A1D826",
      borderRadius: 15,
      padding: 18,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 3,
    },
    notificationHeader: { 
      flexDirection: "row", 
      alignItems: "center",
      marginBottom: 10 
    },
    notificationTitle: { 
      fontWeight: "700", 
      color: "#6B8E23", 
      fontSize: 15,
      marginLeft: 8
    },
    notificationText: { 
      color: "#555", 
      fontSize: 14, 
      lineHeight: 20,
      marginTop: 4
    },
    notificationTime: { 
      color: "#999", 
      fontSize: 12, 
      marginTop: 8,
      fontStyle: "italic"
    },
    
    summaryCard: {
      backgroundColor: "#fff",
      borderRadius: 25,
      padding: 24,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 15,
      elevation: 8,
      marginBottom: 25,
    },
    summaryHeader: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center",
      marginBottom: 20
    },
    summaryMonth: { fontSize: 20, fontWeight: "700", color: "#333" },
    summaryBadge: { 
      backgroundColor: "#E8F5E9", 
      paddingHorizontal: 14, 
      paddingVertical: 8, 
      borderRadius: 15 
    },
    summaryBadgeText: { color: "#2E7D32", fontSize: 12, fontWeight: "600" },
    
    amountSection: { alignItems: "center", paddingVertical: 16 },
    amountLabel: { color: "#999", fontSize: 14, marginBottom: 6 },
    amountValue: { fontSize: 42, fontWeight: "800", color: "#A1D826" },
    
    statsContainer: { 
      flexDirection: "row", 
      justifyContent: "space-around",
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: "#f0f0f0"
    },
    statItem: { alignItems: "center", flex: 1 },
    statValue: { fontSize: 20, fontWeight: "700", color: "#333" },
    statLabel: { fontSize: 11, color: "#999", marginTop: 6, textAlign: "center" },
    
    detailsButton: {
      backgroundColor: "#A1D826",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 15,
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#A1D826",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    detailsButtonText: { 
      color: "#fff", 
      fontWeight: "700", 
      fontSize: 16,
      marginRight: 8
    },
    
    sectionHeader: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center",
      marginBottom: 16
    },
    historyTitle: { fontSize: 22, fontWeight: "700", color: "#333" },
    totalEarned: { fontSize: 14, color: "#A1D826", fontWeight: "600" },
    
    historyCard: {
      backgroundColor: "#fff",
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    historyCardHeader: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center",
      marginBottom: 12
    },
    historyMonth: { fontSize: 17, fontWeight: "600", color: "#333" },
    historyAmount: { fontSize: 22, fontWeight: "700", color: "#A1D826" },
    historyCardFooter: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#f5f5f5"
    },
    historyDate: { 
      flexDirection: "row",
      alignItems: "center",
      color: "#999", 
      fontSize: 12 
    },
    historyStatus: { fontSize: 12, fontWeight: "600", color: "#4CAF50" },
    
    // Modal Styles
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
      marginBottom: 24,
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
    
    detailRow: { 
      flexDirection: "row", 
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#f5f5f5"
    },
    detailLabel: { color: "#666", fontSize: 15, flex: 1 },
    detailValue: { color: "#333", fontSize: 15, fontWeight: "600", textAlign: "right" },
    detailHighlight: { 
      color: "#A1D826", 
      fontSize: 18, 
      fontWeight: "700",
      textAlign: "right"
    },
    detailStatusGreen: { color: "#4CAF50", fontSize: 15, fontWeight: "600" },
    
    transactionCard: { 
      backgroundColor: "#F5F5F5", 
      padding: 18, 
      borderRadius: 15,
      marginTop: 20,
      marginBottom: 10
    },
    transactionTitle: { fontSize: 13, color: "#666", marginBottom: 8 },
    transactionId: { 
      fontSize: 16, 
      fontWeight: "600", 
      color: "#333",
      letterSpacing: 1
    },
    
    closeModalButton: {
      backgroundColor: "#A1D826",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 15,
      marginTop: 20,
      alignItems: "center",
      shadowColor: "#A1D826",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    closeModalButtonText: { 
      color: "#fff", 
      fontWeight: "700", 
      fontSize: 16 
    },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Payments</Text>
        <Text style={styles.headerSubtitle}>Track your earnings & payments</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Latest Notification */}
        <View style={styles.notificationCard}>
          <View style={styles.notificationHeader}>
            <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
            <Text style={styles.notificationTitle}>💰 Latest Update</Text>
          </View>
          <Text style={styles.notificationText}>{latestNotification.message}</Text>
          <Text style={styles.notificationTime}>{latestNotification.time}</Text>
        </View>

        {/* Current Month Payment Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryMonth}>{currentPayment.month}</Text>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>✓ {currentPayment.status}</Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount Received</Text>
            <Text style={styles.amountValue}>Rs {currentPayment.amount.toLocaleString()}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentPayment.trips}</Text>
              <Text style={styles.statLabel}>Trips Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentPayment.totalEarnings.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentPayment.commission.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Commission</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => openDetails(currentPayment)}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsButtonText}>View Full Details</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Payment History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.historyTitle}>Payment History</Text>
          <Text style={styles.totalEarned}>Total: Rs {totalEarned.toLocaleString()}</Text>
        </View>

        {paymentData.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.historyCard}
            onPress={() => openDetails(item)}
            activeOpacity={0.7}
          >
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyMonth}>{item.month}</Text>
              <Text style={styles.historyAmount}>Rs {item.amount.toLocaleString()}</Text>
            </View>
            <View style={styles.historyCardFooter}>
              <View style={styles.historyDate}>
                <Ionicons name="calendar-outline" size={14} color="#999" style={{ marginRight: 6 }} />
                <Text style={{ color: "#999", fontSize: 12 }}>{item.date}</Text>
              </View>
              <Text style={styles.historyStatus}>{item.status} ✓</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Payment Details Modal */}
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
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setDetailsVisible(false)}
              >
                <Ionicons name="close" size={26} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Month</Text>
                  <Text style={styles.detailValue}>{selectedPayment.month}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Date</Text>
                  <Text style={styles.detailValue}>{selectedPayment.date}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Trips</Text>
                  <Text style={styles.detailValue}>{selectedPayment.trips} trips</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Earnings</Text>
                  <Text style={styles.detailValue}>Rs {selectedPayment.totalEarnings.toLocaleString()}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Platform Commission</Text>
                  <Text style={styles.detailValue}>- Rs {selectedPayment.commission.toLocaleString()}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Net Payment</Text>
                  <Text style={styles.detailHighlight}>Rs {selectedPayment.amount.toLocaleString()}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailStatusGreen}>{selectedPayment.status}</Text>
                </View>

                <View style={styles.transactionCard}>
                  <Text style={styles.transactionTitle}>Transaction ID</Text>
                  <Text style={styles.transactionId}>{selectedPayment.transactionId}</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setDetailsVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DriverPaymentsScreen;