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

export default function PassengerProfile({ navigation, route }) {
    const { passenger } = route.params;

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
                <Text style={styles.headerTitle}>Passenger Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <Image
                        source={{
                            uri: "https://ui-avatars.com/api/?name=" + encodeURIComponent(passenger.name) + "&background=afd826&color=fff&size=200",
                        }}
                        style={styles.profileImage}
                    />
                    <Text style={styles.profileName}>{passenger.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(passenger.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(passenger.status)}</Text>
                    </View>
                </View>

                {/* Contact Information */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Mobile:</Text>
                        <Text style={styles.infoValue}>{passenger.mobile}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={20} color="#666" />
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{passenger.email}</Text>
                    </View>
                </View>

                {/* Ride Information */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Current Ride Request</Text>

                    <View style={styles.routeContainer}>
                        <View style={styles.routePoint}>
                            <Ionicons name="location-outline" size={16} color="#28a745" />
                            <View style={styles.routeDetails}>
                                <Text style={styles.routeLabel}>Pickup Location</Text>
                                <Text style={styles.routeValue}>{passenger.pickup}</Text>
                            </View>
                        </View>

                        <View style={styles.routeDivider} />

                        <View style={styles.routePoint}>
                            <Ionicons name="flag-outline" size={16} color="#dc3545" />
                            <View style={styles.routeDetails}>
                                <Text style={styles.routeLabel}>Drop Location</Text>
                                <Text style={styles.routeValue}>{passenger.drop}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Passenger Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Passenger Statistics</Text>

                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{passenger.totalRides}</Text>
                            <Text style={styles.statLabel}>Total Rides</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>4.8</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{passenger.memberSince}</Text>
                            <Text style={styles.statLabel}>Member Since</Text>
                        </View>
                    </View>
                </View>

                {/* Additional Details */}
                <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Additional Information</Text>

                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Passenger ID:</Text>
                        <Text style={styles.detailValue}>{passenger.id}</Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Preferred Payment:</Text>
                        <Text style={styles.detailValue}>Cash & Card</Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Last Ride:</Text>
                        <Text style={styles.detailValue}>3 days ago</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {passenger.status === "pending" && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.acceptButton}>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.acceptButtonText}>Accept Request</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.rejectButton}>
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.rejectButtonText}>Reject Request</Text>
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
        width: 60,
    },

    infoValue: {
        fontSize: 14,
        color: "#111",
        fontWeight: "600",
        flex: 1,
    },

    routeContainer: {
        marginTop: 8,
    },

    routePoint: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
    },

    routeDetails: {
        marginLeft: 12,
        flex: 1,
    },

    routeLabel: {
        fontSize: 12,
        color: "#666",
        marginBottom: 2,
    },

    routeValue: {
        fontSize: 14,
        color: "#111",
        fontWeight: "600",
    },

    routeDivider: {
        width: 2,
        height: 20,
        backgroundColor: "#ddd",
        marginLeft: 7,
        marginBottom: 8,
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