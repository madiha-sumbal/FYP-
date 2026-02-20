import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DriverPerformance({ navigation }) {
  const driversPerformance = [
    {
      id: 1,
      name: "Ali Khan",
      completedRoutes: 45,
      totalRoutes: 50,
      onTimeDeliveries: 42,
      lateDeliveries: 3,
      rating: 4.7,
      completedPercentage: 90,
      onTimePercentage: 84,
      avatar: "https://ui-avatars.com/api/?name=Ali+Khan&background=afd826&color=fff&size=100"
    },
    {
      id: 2,
      name: "Zara Iqbal",
      completedRoutes: 48,
      totalRoutes: 50,
      onTimeDeliveries: 47,
      lateDeliveries: 1,
      rating: 3.7,
      completedPercentage: 96,
      onTimePercentage: 94,
      avatar: "https://ui-avatars.com/api/?name=Zara+Iqbal&background=afd826&color=fff&size=100"
    },
    {
      id: 3,
      name: "Ahmed Raza",
      completedRoutes: 40,
      totalRoutes: 50,
      onTimeDeliveries: 38,
      lateDeliveries: 2,
      rating: 2.5,
      completedPercentage: 80,
      onTimePercentage: 76,
      avatar: "https://ui-avatars.com/api/?name=Ahmed+Raza&background=afd826&color=fff&size=100"
    },
    {
      id: 4,
      name: "Bilal Hussain",
      completedRoutes: 49,
      totalRoutes: 50,
      onTimeDeliveries: 48,
      lateDeliveries: 1,
      rating: 4.9,
      completedPercentage: 98,
      onTimePercentage: 96,
      avatar: "https://ui-avatars.com/api/?name=Bilal+Hussain&background=afd826&color=fff&size=100"
    },
  ];

  const getProgressWidth = (percentage) => `${percentage}%`;

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`full-${i}`} name="star" size={16} color="#FFD700" />);
    }
    if (halfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFD700" />);
    }
    while (stars.length < 5) {
      stars.push(<Ionicons key={`empty-${stars.length}`} name="star-outline" size={16} color="#FFD700" />);
    }
    return stars;
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return "#4CAF50";
    if (percentage >= 80) return "#FFA726";
    if (percentage >= 70) return "#FF9800";
    return "#FF6B6B";
  };

  const getPerformanceText = (percentage) => {
    if (percentage >= 90) return "Excellent";
    if (percentage >= 80) return "Good";
    if (percentage >= 70) return "Average";
    return "Needs Improvement";
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
          <Text style={styles.headerTitle}>Driver Performance</Text>
          <Text style={styles.headerSubtitle}>{driversPerformance.length} drivers analyzed</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="stats-chart" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Performance Overview */}
      <View style={styles.overviewContainer}>
        <View style={styles.overviewItem}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.overviewNumber}>
            {driversPerformance.reduce((sum, driver) => sum + driver.completedRoutes, 0)}
          </Text>
          <Text style={styles.overviewLabel}>Completed Routes</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Ionicons name="time" size={24} color="#FFA726" />
          <Text style={styles.overviewNumber}>
            {driversPerformance.reduce((sum, driver) => sum + driver.onTimeDeliveries, 0)}
          </Text>
          <Text style={styles.overviewLabel}>On-time Deliveries</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Ionicons name="trending-up" size={24} color="#afd826" />
          <Text style={styles.overviewNumber}>
            {(driversPerformance.reduce((sum, driver) => sum + driver.rating, 0) / driversPerformance.length).toFixed(1)}
          </Text>
          <Text style={styles.overviewLabel}>Avg Rating</Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {driversPerformance.map((driver) => (
          <View key={driver.id} style={styles.card}>
            {/* Driver Header */}
            <View style={styles.cardHeader}>
              <View style={styles.driverInfo}>
                <Image
                  source={{ uri: driver.avatar }}
                  style={styles.avatar}
                />
                <View style={styles.nameContainer}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <View style={styles.ratingContainer}>
                    {renderStars(driver.rating)}
                    <Text style={styles.ratingText}>{driver.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </View>

              <View style={[
                styles.performanceBadge,
                { backgroundColor: getPerformanceColor(driver.completedPercentage) }
              ]}>
                <Text style={styles.performanceText}>
                  {getPerformanceText(driver.completedPercentage)}
                </Text>
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.metricsContainer}>

              {/* Completion Rate */}
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Completion Rate</Text>
                  <Text style={styles.metricPercentage}>{driver.completedPercentage}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: getProgressWidth(driver.completedPercentage),
                        backgroundColor: getPerformanceColor(driver.completedPercentage)
                      }
                    ]}
                  />
                </View>
                <Text style={styles.metricValue}>
                  {driver.completedRoutes} / {driver.totalRoutes} routes
                </Text>
              </View>

              {/* On-time Performance */}
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>On-time Performance</Text>
                  <Text style={styles.metricPercentage}>{driver.onTimePercentage}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: getProgressWidth(driver.onTimePercentage),
                        backgroundColor: getPerformanceColor(driver.onTimePercentage)
                      }
                    ]}
                  />
                </View>
                <Text style={styles.metricValue}>
                  {driver.onTimeDeliveries} on-time • {driver.lateDeliveries} late
                </Text>
              </View>

              {/* Performance Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
                  <Text style={styles.statNumber}>{driver.completedRoutes}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="time" size={16} color="#FFA726" />
                  <Text style={styles.statNumber}>{driver.onTimeDeliveries}</Text>
                  <Text style={styles.statLabel}>On Time</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="warning" size={16} color="#FF6B6B" />
                  <Text style={styles.statNumber}>{driver.lateDeliveries}</Text>
                  <Text style={styles.statLabel}>Late</Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsButtonText}>View Detailed Report</Text>
              <Ionicons name="chevron-forward" size={16} color="#afd826" />
            </TouchableOpacity>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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

  // Overview Container
  overviewContainer: {
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
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#afd826",
    marginTop: 8,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  overviewDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Container
  container: {
    flex: 1,
    padding: 16,
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
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  // Card Header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
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
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 4,
  },
  performanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  // Metrics Container
  metricsContainer: {
    marginBottom: 16,
  },
  metricItem: {
    marginBottom: 20,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  metricPercentage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  progressBarBackground: {
    height: 8,
    width: "100%",
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 6,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },

  // Details Button
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#afd826",
    gap: 6,
  },
  detailsButtonText: {
    color: "#afd826",
    fontWeight: "600",
    fontSize: 14,
  },
});