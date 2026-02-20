import React, { useState } from "react";
import { 
  View, Text, StyleSheet, SafeAreaView, StatusBar, Platform, 
  ScrollView, TouchableOpacity, TextInput 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function RouteAssignment({ navigation }) {
  const [routes, setRoutes] = useState([]);
  const [routeName, setRouteName] = useState("");
  const [stopPassenger, setStopPassenger] = useState("");
  const [stopPickup, setStopPickup] = useState("");
  const [stopDrop, setStopDrop] = useState("");
  const [currentStops, setCurrentStops] = useState([]);

  const addStop = () => {
    if (stopPassenger && stopPickup && stopDrop) {
      setCurrentStops([...currentStops, { passenger: stopPassenger, pickup: stopPickup, drop: stopDrop }]);
      setStopPassenger("");
      setStopPickup("");
      setStopDrop("");
    }
  };

  const addRoute = () => {
    if (routeName && currentStops.length > 0) {
      setRoutes([...routes, { id: Date.now(), routeName, stops: currentStops }]);
      setRouteName("");
      setCurrentStops([]);
      alert("✅ Route created successfully!");
    }
  };

  const removeStop = (index) => {
    const newStops = currentStops.filter((_, i) => i !== index);
    setCurrentStops(newStops);
  };

  const deleteRoute = (routeId) => {
    setRoutes(routes.filter(route => route.id !== routeId));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#afd826" barStyle="light-content" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Management</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => {
            if (routes.length > 0) {
              alert("✅ All routes saved successfully!");
            } else {
              alert("ℹ️ No routes to save!");
            }
          }}
        >
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{routes.length}</Text>
            <Text style={styles.statLabel}>Total Routes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentStops.length}</Text>
            <Text style={styles.statLabel}>Current Stops</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {routes.reduce((total, route) => total + route.stops.length, 0)}
            </Text>
            <Text style={styles.statLabel}>All Stops</Text>
          </View>
        </View>

        {/* Route Input Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="add-circle" size={20} color="#afd826" />
            <Text style={styles.sectionTitle}>Create New Route</Text>
          </View>
          <TextInput
            placeholder="Enter route name (e.g., Morning Route, Downtown Loop)"
            placeholderTextColor="#A0AEC0"
            value={routeName}
            onChangeText={setRouteName}
            style={styles.input}
          />
        </View>

        {/* Stops Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#afd826" />
            <Text style={styles.sectionTitle}>Add Stops to Route</Text>
          </View>
          
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="Passenger Name" 
              placeholderTextColor="#A0AEC0"
              value={stopPassenger} 
              onChangeText={setStopPassenger} 
              style={[styles.input, styles.flexInput]} 
            />
          </View>

          <View style={styles.inputRow}>
            <TextInput 
              placeholder="Pickup Location" 
              placeholderTextColor="#A0AEC0"
              value={stopPickup} 
              onChangeText={setStopPickup} 
              style={[styles.input, styles.flexInput]} 
            />
            <Ionicons name="arrow-forward" size={20} color="#afd826" style={styles.arrowIcon} />
            <TextInput 
              placeholder="Drop Location" 
              placeholderTextColor="#A0AEC0"
              value={stopDrop} 
              onChangeText={setStopDrop} 
              style={[styles.input, styles.flexInput]} 
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.addButton]} 
            onPress={addStop}
            disabled={!stopPassenger || !stopPickup || !stopDrop}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.buttonText}>Add Stop to Route</Text>
          </TouchableOpacity>

          {/* Current Stops List */}
          {currentStops.length > 0 && (
            <View style={styles.currentStopsContainer}>
              <View style={styles.stopsHeader}>
                <Text style={styles.stopsSubtitle}>Current Stops ({currentStops.length})</Text>
                <TouchableOpacity onPress={() => setCurrentStops([])}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {currentStops.map((stop, index) => (
                <View key={index} style={styles.stopItem}>
                  <View style={styles.stopHeader}>
                    <View style={styles.stopIndicator}>
                      <Text style={styles.stopNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.passengerName}>{stop.passenger}</Text>
                    <TouchableOpacity 
                      style={styles.removeStopButton}
                      onPress={() => removeStop(index)}
                    >
                      <Ionicons name="close" size={16} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.routePath}>
                    <View style={styles.locationBox}>
                      <Ionicons name="navigate" size={14} color="#afd826" />
                      <Text style={styles.locationText}>Pickup: {stop.pickup}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#afd826" />
                    <View style={styles.locationBox}>
                      <Ionicons name="flag" size={14} color="#afd826" />
                      <Text style={styles.locationText}>Drop: {stop.drop}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Create Route Button */}
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.createRouteButton,
            (!routeName || currentStops.length === 0) && styles.disabledButton
          ]} 
          onPress={addRoute}
          disabled={!routeName || currentStops.length === 0}
        >
          <Ionicons name="map" size={20} color="#fff" />
          <Text style={styles.buttonText}>Create Route</Text>
        </TouchableOpacity>

        {/* Existing Routes */}
        {routes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={20} color="#afd826" />
              <Text style={styles.sectionTitle}>Existing Routes ({routes.length})</Text>
            </View>
            {routes.map((route) => (
              <View key={route.id} style={styles.routeCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.routeInfo}>
                    <Ionicons name="bus" size={24} color="#afd826" />
                    <View style={styles.routeDetails}>
                      <Text style={styles.routeName}>{route.routeName}</Text>
                      <Text style={styles.routeStops}>{route.stops.length} stops</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => deleteRoute(route.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cardContent}>
                  {route.stops.map((stop, idx) => (
                    <View key={idx} style={styles.routeStop}>
                      <View style={styles.stopDot} />
                      <View style={styles.stopContent}>
                        <Text style={styles.stopPassenger}>{stop.passenger}</Text>
                        <View style={styles.stopRoute}>
                          <Text style={styles.stopLocation}>{stop.pickup}</Text>
                          <Ionicons name="arrow-forward" size={12} color="#afd826" />
                          <Text style={styles.stopLocation}>{stop.drop}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.routeDistance}>Estimated: {route.stops.length * 5} km</Text>
                  <Text style={styles.routeTime}>~{route.stops.length * 10} mins</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {routes.length === 0 && currentStops.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No Routes Created</Text>
            <Text style={styles.emptyText}>
              Start by creating your first route above
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#afd826",
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  backButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  container: {
    padding: 16,
    paddingBottom: 30,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D3748",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#2D3748",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  flexInput: {
    flex: 1,
  },
  arrowIcon: {
    marginHorizontal: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  addButton: {
    backgroundColor: "#afd826",
    marginTop: 8,
  },
  createRouteButton: {
    backgroundColor: "#2D3748",
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#CBD5E0",
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  currentStopsContainer: {
    marginTop: 16,
  },
  stopsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopsSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
  },
  clearText: {
    fontSize: 14,
    color: "#ff6b6b",
    fontWeight: '500',
  },
  stopItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#afd826",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  stopIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#afd826",
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumber: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  passengerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    flex: 1,
  },
  removeStopButton: {
    padding: 4,
  },
  routePath: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    backgroundColor: '#F7FAFC',
    padding: 8,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#4A5568",
    fontWeight: '500',
    flex: 1,
  },
  routeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F7FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  routeDetails: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 2,
  },
  routeStops: {
    fontSize: 14,
    color: "#718096",
  },
  deleteButton: {
    padding: 8,
  },
  cardContent: {
    padding: 16,
  },
  routeStop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#afd826",
    marginTop: 6,
    marginRight: 12,
  },
  stopContent: {
    flex: 1,
  },
  stopPassenger: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 2,
  },
  stopRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stopLocation: {
    fontSize: 12,
    color: "#718096",
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F7FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  routeDistance: {
    fontSize: 12,
    color: "#718096",
    fontWeight: '500',
  },
  routeTime: {
    fontSize: 12,
    color: "#afd826",
    fontWeight: '600',
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
});