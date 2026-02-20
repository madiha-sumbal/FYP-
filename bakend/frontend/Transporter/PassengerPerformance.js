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

export default function PassengerPerformance({ navigation }) {
  const passengersPerformance = [
    {
      id: 1,
      name: "Sara Khan",
      onTimeRides: 46,
      lateRides: 4,
      totalRides: 50,
      avatar: "https://ui-avatars.com/api/?name=Sara+Khan&background=afd826&color=fff&size=100"
    },
    {
      id: 2,
      name: "Ahmed Raza",
      onTimeRides: 42,
      lateRides: 8,
      totalRides: 50,
      avatar: "https://ui-avatars.com/api/?name=Ahmed+Raza&background=afd826&color=fff&size=100"
    },
    {
      id: 3,
      name: "Ali Hassan",
      onTimeRides: 50,
      lateRides: 0,
      totalRides: 50,
      avatar: "https://ui-avatars.com/api/?name=Ali+Hassan&background=afd826&color=fff&size=100"
    },
    {
      id: 4,
      name: "Zara Sheikh",
      onTimeRides: 38,
      lateRides: 12,
      totalRides: 50,
      avatar: "https://ui-avatars.com/api/?name=Zara+Sheikh&background=afd826&color=fff&size=100"
    },
  ];

  const getProgressWidth = (percentage) => `${percentage}%`;

  const getPerformanceColor = (onTimePercentage) => {
    if (onTimePercentage >= 90) return "#4CAF50";
    if (onTimePercentage >= 80) return "#FFA726";
    if (onTimePercentage >= 70) return "#FF9800";
    return "#FF6B6B";
  };

  const getPerformanceText = (onTimePercentage) => {
    if (onTimePercentage >= 90) return "Excellent";
    if (onTimePercentage >= 80) return "Good";
    if (onTimePercentage >= 70) return "Average";
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
          <Text style={styles.headerTitle}>Passenger Performance</Text>
          <Text style={styles.headerSubtitle}>{passengersPerformance.length} passengers</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{passengersPerformance.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {passengersPerformance.filter(p => (p.onTimeRides / p.totalRides) * 100 >= 90).length}
          </Text>
          <Text style={styles.statLabel}>Excellent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {passengersPerformance.filter(p => (p.onTimeRides / p.totalRides) * 100 < 70).length}
          </Text>
          <Text style={styles.statLabel}>Needs Help</Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {passengersPerformance.map((passenger) => {
          const onTimePercentage = ((passenger.onTimeRides / passenger.totalRides) * 100);
          const latePercentage = ((passenger.lateRides / passenger.totalRides) * 100);
          const perfColor = getPerformanceColor(onTimePercentage);
          const perfText = getPerformanceText(onTimePercentage);

          return (
            <View key={passenger.id} style={styles.card}>

              {/* Passenger Header */}
              <View style={styles.cardHeader}>
                <View style={styles.passengerInfo}>
                  <Image
                    source={{ uri: passenger.avatar }}
                    style={styles.avatar}
                  />
                  <View style={styles.nameContainer}>
                    <Text style={styles.name}>{passenger.name}</Text>
                    <Text style={styles.ridesText}>{passenger.totalRides} total rides</Text>
                  </View>
                </View>

                <View style={[styles.performanceBadge, { backgroundColor: perfColor }]}>
                  <Text style={styles.performanceText}>{perfText}</Text>
                </View>
              </View>

              {/* On-time Performance */}
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>On-time Rides</Text>
                  <Text style={styles.metricPercentage}>{onTimePercentage.toFixed(0)}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: getProgressWidth(onTimePercentage),
                        backgroundColor: perfColor
                      }
                    ]}
                  />
                </View>
                <Text style={styles.metricValue}>
                  {passenger.onTimeRides} / {passenger.totalRides} rides
                </Text>
              </View>

              {/* Late Rides */}
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Late Rides</Text>
                  <Text style={styles.metricPercentage}>{latePercentage.toFixed(0)}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: getProgressWidth(latePercentage),
                        backgroundColor: "#FF6B6B"
                      }
                    ]}
                  />
                </View>
                <Text style={styles.metricValue}>
                  {passenger.lateRides} / {passenger.totalRides} rides
                </Text>
              </View>

            </View>
          );
        })}
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

  // Card Header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  passengerInfo: {
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
  ridesText: {
    fontSize: 12,
    color: "#666",
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

  // Metric Items
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
});