import { StyleSheet } from 'react-native';

export const driverStyles = StyleSheet.create({
  // Container & Layout
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5"
  },

  scrollContent: {
    flex: 1
  },

  contentPadding: {
    padding: 20
  },

  // Header Styles
  header: {
    paddingVertical: 20,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: "#A1D826",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10
  },

  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },

  headerCenter: {
    flex: 1,
    alignItems: "center"
  },

  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold"
  },

  headerSubtitle: {
    color: "#F0F9D9",
    fontSize: 12,
    marginTop: 2
  },

  // Sidebar Styles
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 999
  },

  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#fff",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10
  },

  sidebarHeader: {
    backgroundColor: "#A1D826",
    padding: 30,
    paddingTop: 60
  },

  sidebarHeaderText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff"
  },

  sidebarHeaderSubtext: {
    fontSize: 14,
    color: "#F0F9D9",
    marginTop: 4
  },

  sidebarMenu: {
    flex: 1,
    paddingTop: 10
  },

  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    paddingLeft: 24
  },

  sidebarItemActive: {
    backgroundColor: "#F0F9D9",
    borderLeftWidth: 4,
    borderLeftColor: "#A1D826"
  },

  sidebarItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginLeft: 16
  },

  sidebarItemTextActive: {
    color: "#A1D826"
  },

  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0"
  },

  logoutButton: {
    backgroundColor: "#f44336",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center"
  },

  logoutButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },

  // Card Styles
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12
  },

  cardText: {
    color: "#666",
    fontSize: 14,
    lineHeight: 20
  },

  // Availability Styles
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },

  statusBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10
  },

  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center"
  },

  // Route Info Styles
  routeInfo: {
    marginTop: 12,
    gap: 12
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },

  infoIcon: {
    marginRight: 12,
    width: 24,
    alignItems: "center"
  },

  // Button Styles
  button: {
    backgroundColor: "#A1D826",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#A1D826",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'center'
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15
  },

  actionButton: {
    backgroundColor: "#A1D826",
    paddingVertical: 16,
    borderRadius: 15,
    marginTop: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center"
  },

  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8
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
    elevation: 5
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10
  },

  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#A1D826",
    marginTop: 8
  },

  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 6,
    textAlign: "center"
  },

  // Section Title
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
    marginTop: 10
  },

  // Menu Card
  menuCard: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  menuCardText: {
    fontWeight: "600",
    color: "#374151",
    fontSize: 15
  },

  // Map Styles
  mapContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8
  },

  mapView: {
    width: "100%",
    height: 250
  },

  mapOverlay: {
    position: "absolute",
    top: 10,
    right: 10
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
    elevation: 3
  },

  mapButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4
  },

  // Progress Bar
  progressContainer: {
    backgroundColor: "#fff",
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },

  progressTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333"
  },

  progressText: {
    fontSize: 14,
    color: "#A1D826",
    fontWeight: "600"
  },

  progressBarBg: {
    height: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    overflow: "hidden"
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#A1D826",
    borderRadius: 10
  },

  // Stop Card Styles
  stopCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3
  },

  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },

  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F9D9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },

  stopNumberText: {
    color: "#A1D826",
    fontWeight: "700",
    fontSize: 14
  },

  stopName: {
    fontWeight: "600",
    color: "#333",
    fontSize: 16,
    flex: 1
  },

  stopPassenger: {
    color: "#666",
    fontSize: 14,
    marginTop: 6
  },

  stopTime: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },

  stopTimeText: {
    color: "#999",
    fontSize: 13,
    marginLeft: 6
  },

  stopFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5"
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center"
  },

  // Search & Filter
  searchContainer: {
    backgroundColor: "#fff",
    marginBottom: 15,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
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
    marginVertical: 15,
    gap: 8
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#e8e8e8",
    alignItems: "center"
  },

  tabActive: {
    backgroundColor: "#A1D826"
  },

  tabText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 13
  },

  tabTextActive: {
    color: "#fff",
    fontWeight: "700"
  },

  // Trip Card Styles
  tripCard: {
    backgroundColor: "#fff",
    marginVertical: 6,
    padding: 18,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },

  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },

  routeText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10
  },

  dateText: {
    color: "#666",
    marginTop: 4,
    fontSize: 13
  },

  tripDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0"
  },

  tripDetailItem: {
    flexDirection: "row",
    alignItems: "center"
  },

  tripDetailText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6
  },

  fareText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#A1D826",
    marginTop: 8
  },

  // Notification Card
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
    elevation: 3
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

  // Payment Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 25
  },

  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },

  summaryMonth: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333"
  },

  summaryBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 15
  },

  summaryBadgeText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "600"
  },

  amountSection: {
    alignItems: "center",
    paddingVertical: 16
  },

  amountLabel: {
    color: "#999",
    fontSize: 14,
    marginBottom: 6
  },

  amountValue: {
    fontSize: 42,
    fontWeight: "800",
    color: "#A1D826"
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0"
  },

  statItem: {
    alignItems: "center",
    flex: 1
  },

  // Payment Card
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },

  paymentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },

  paymentMonth: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333"
  },

  paymentAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#A1D826"
  },

  paymentCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5"
  },

  paymentDate: {
    flexDirection: "row",
    alignItems: "center",
    color: "#999",
    fontSize: 12
  },

  paymentStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50"
  },

  // Status Colors
  statusColors: {
    Completed: "#4CAF50",
    Pending: "#FF9800",
    Cancelled: "#F44336",
    Upcoming: "#FF9800",
    Transferred: "#4CAF50",
    Resolved: "#4CAF50"
  },

  statusBgColors: {
    Completed: "#E8F5E9",
    Pending: "#FFF3E0",
    Cancelled: "#FFEBEE",
    Upcoming: "#FFF3E0",
    Transferred: "#E8F5E9",
    Resolved: "#E8F5E9"
  },

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
    elevation: 15
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

  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333"
  },

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
    marginBottom: 15
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10
  },

  detailLabel: {
    color: "#666",
    fontSize: 14
  },

  detailValue: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "right"
  },

  detailHighlight: {
    color: "#A1D826",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right"
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  }
});