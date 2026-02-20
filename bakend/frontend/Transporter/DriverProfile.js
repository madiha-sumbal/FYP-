import React from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Image,
    StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DriverProfile({ navigation, route }) {
    const { driver } = route.params;

    const getStatusColor = (status) => {
        return status === "accepted" ? "#28a745" : "#ffc107";
    };

    const getStatusText = (status) => {
        return status === "accepted" ? "Accepted" : "Pending";
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#afd826" barStyle="light-content" />

            {/* Header */}
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Driver Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <Image
                        source={{
                            uri: "https://ui-avatars.com/api/?name=" + encodeURIComponent(driver.name) + "&background=afd826&color=fff&size=200",
                        }}
                        style={styles.profileImage}
                    />
                    <Text style={styles.profileName}>{driver.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(driver.status)}</Text>
                    </View>
                </View>

                {/* Driver Information */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Driver Information</Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Mobile Number:</Text>
                        <Text style={styles.infoValue}>{driver.mobile}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Location:</Text>
                        <Text style={styles.infoValue}>{driver.location}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="car-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Vehicle:</Text>
                        <Text style={styles.infoValue}>{driver.vehicle}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Experience:</Text>
                        <Text style={styles.infoValue}>{driver.experience}</Text>
                    </View>
                </View>

                {/* Performance Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Performance Stats</Text>

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>⭐ {driver.rating}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{driver.completedRides}</Text>
                            <Text style={styles.statLabel}>Completed Rides</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>98%</Text>
                            <Text style={styles.statLabel}>Success Rate</Text>
                        </View>
                    </View>
                </View>

                {/* Additional Details */}
                <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Additional Details</Text>

                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Driver ID:</Text>
                        <Text style={styles.detailValue}>{driver.id}</Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Join Date:</Text>
                        <Text style={styles.detailValue}>January 15, 2024</Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Last Active:</Text>
                        <Text style={styles.detailValue}>2 hours ago</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {driver.status === "pending" && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.acceptButton}>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.acceptButtonText}>Accept Driver</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.rejectButton}>
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.rejectButtonText}>Reject Driver</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#f7f9fb" },

    headerBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#afd826",
        paddingHorizontal: 15,
        height: 58,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff"
    },

    container: {
        flex: 1,
        padding: 16,
    },

    profileHeader: {
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },

    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: "#afd826",
        marginBottom: 12,
    },

    profileName: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111",
        marginBottom: 8,
    },

    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },

    statusText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },

    infoSection: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
        marginBottom: 16,
    },

    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingVertical: 4,
    },

    infoLabel: {
        fontSize: 14,
        color: "#666",
        marginLeft: 8,
        marginRight: 8,
        width: 100,
    },

    infoValue: {
        fontSize: 14,
        color: "#111",
        fontWeight: "600",
        flex: 1,
    },

    statsSection: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },

    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    statCard: {
        alignItems: "center",
        flex: 1,
        padding: 12,
    },

    statValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#afd826",
        marginBottom: 4,
    },

    statLabel: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
    },

    detailsSection: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },

    detailItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },

    detailLabel: {
        fontSize: 14,
        color: "#666",
    },

    detailValue: {
        fontSize: 14,
        color: "#111",
        fontWeight: "600",
    },

    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
    },

    acceptButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#28a745",
        padding: 15,
        borderRadius: 12,
        marginRight: 8,
    },

    rejectButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#dc3545",
        padding: 15,
        borderRadius: 12,
        marginLeft: 8,
    },

    acceptButtonText: {
        color: "#fff",
        fontWeight: "600",
        marginLeft: 8,
    },

    rejectButtonText: {
        color: "#fff",
        fontWeight: "600",
        marginLeft: 8,
    },
});