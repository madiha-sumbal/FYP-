import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    FlatList,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PassengerDataList({ navigation, route }) {
    const { passengers, title, poll } = route.params || {};
    
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("name");

    // Helper function to safely parse dates
    const parseDate = (dateValue) => {
        if (dateValue instanceof Date) {
            return dateValue;
        }
        if (typeof dateValue === 'string' || typeof dateValue === 'number') {
            return new Date(dateValue);
        }
        return new Date(); // fallback
    };

    // Process passengers to ensure dates are properly formatted
    const processedPassengers = passengers ? passengers.map(passenger => ({
        ...passenger,
        responseTime: parseDate(passenger.responseTime)
    })) : [];

    // Filter passengers based on search query
    const filteredPassengers = processedPassengers.filter(passenger =>
        passenger.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        passenger.network.toLowerCase().includes(searchQuery.toLowerCase()) ||
        passenger.timeSlot.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort passengers
    const sortedPassengers = [...filteredPassengers].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.passengerName.localeCompare(b.passengerName);
            case 'network':
                return a.network.localeCompare(b.network);
            case 'timeSlot':
                return a.timeSlot.localeCompare(b.timeSlot);
            case 'time':
                return b.responseTime - a.responseTime;
            default:
                return 0;
        }
    });

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return '#4CAF50';
            case 'pending': return '#FF9800';
            case 'cancelled': return '#F44336';
            default: return '#666';
        }
    };

    // Get status text
    const getStatusText = (status) => {
        switch (status) {
            case 'confirmed': return 'Confirmed';
            case 'pending': return 'Pending';
            case 'cancelled': return 'Cancelled';
            default: return 'Unknown';
        }
    };

    // Format date for display
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Format time for display
    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Table Header
    const TableHeader = () => (
        <View style={styles.tableHeader}>
            <View style={[styles.tableCell, styles.serialColumn]}>
                <Text style={styles.tableHeaderText}>#</Text>
            </View>
            <View style={[styles.tableCell, styles.nameColumn]}>
                <Text style={styles.tableHeaderText}>Passenger Name</Text>
            </View>
            <View style={[styles.tableCell, styles.statusColumn]}>
                <Text style={styles.tableHeaderText}>Status</Text>
            </View>
            <View style={[styles.tableCell, styles.networkColumn]}>
                <Text style={styles.tableHeaderText}>Network</Text>
            </View>
            <View style={[styles.tableCell, styles.timeSlotColumn]}>
                <Text style={styles.tableHeaderText}>Time Slot</Text>
            </View>
            <View style={[styles.tableCell, styles.dateColumn]}>
                <Text style={styles.tableHeaderText}>Date</Text>
            </View>
            <View style={[styles.tableCell, styles.timeColumn]}>
                <Text style={styles.tableHeaderText}>Time</Text>
            </View>
        </View>
    );

    // Render passenger row
    const renderPassengerRow = ({ item, index }) => (
        <View style={[
            styles.tableRow,
            index % 2 === 0 ? styles.evenRow : styles.oddRow
        ]}>
            <View style={[styles.tableCell, styles.serialColumn]}>
                <Text style={styles.cellText}>{index + 1}</Text>
            </View>
            <View style={[styles.tableCell, styles.nameColumn]}>
                <Text style={[styles.cellText, styles.nameText]} numberOfLines={1}>
                    {item.passengerName}
                </Text>
            </View>
            <View style={[styles.tableCell, styles.statusColumn]}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                </View>
            </View>
            <View style={[styles.tableCell, styles.networkColumn]}>
                <Text style={styles.cellText} numberOfLines={1}>{item.network}</Text>
            </View>
            <View style={[styles.tableCell, styles.timeSlotColumn]}>
                <Text style={styles.cellText} numberOfLines={1}>{item.timeSlot}</Text>
            </View>
            <View style={[styles.tableCell, styles.dateColumn]}>
                <Text style={styles.cellText}>
                    {formatDate(item.responseTime)}
                </Text>
            </View>
            <View style={[styles.tableCell, styles.timeColumn]}>
                <Text style={styles.cellText}>
                    {formatTime(item.responseTime)}
                </Text>
            </View>
        </View>
    );

    // Header
    const Header = () => (
        <View style={styles.headerBar}>
            <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.headerButton}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>{title || "Passenger List"}</Text>
                <Text style={styles.headerSubtitle}>
                    {sortedPassengers.length} passengers
                </Text>
            </View>

            <View style={styles.headerButton} />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar backgroundColor="#afd826" barStyle="light-content" />
            <Header />
            
            <View style={styles.container}>
                {/* Search and Filter Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#666" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search passengers..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Ionicons name="close-circle" size={20} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <TouchableOpacity style={styles.filterButton}>
                        <Ionicons name="filter" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Sort Options */}
                <View style={styles.sortContainer}>
                    <Text style={styles.sortLabel}>Sort by:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.sortOptions}>
                            <TouchableOpacity 
                                style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive]}
                                onPress={() => setSortBy('name')}
                            >
                                <Text style={[styles.sortOptionText, sortBy === 'name' && styles.sortOptionTextActive]}>
                                    Name
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.sortOption, sortBy === 'network' && styles.sortOptionActive]}
                                onPress={() => setSortBy('network')}
                            >
                                <Text style={[styles.sortOptionText, sortBy === 'network' && styles.sortOptionTextActive]}>
                                    Network
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.sortOption, sortBy === 'timeSlot' && styles.sortOptionActive]}
                                onPress={() => setSortBy('timeSlot')}
                            >
                                <Text style={[styles.sortOptionText, sortBy === 'timeSlot' && styles.sortOptionTextActive]}>
                                    Time Slot
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.sortOption, sortBy === 'time' && styles.sortOptionActive]}
                                onPress={() => setSortBy('time')}
                            >
                                <Text style={[styles.sortOptionText, sortBy === 'time' && styles.sortOptionTextActive]}>
                                    Response Time
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>

                {/* Table View */}
                {sortedPassengers.length > 0 ? (
                    <View style={styles.tableContainer}>
                        <TableHeader />
                        <FlatList
                            data={sortedPassengers}
                            keyExtractor={(item, index) => item.id || `passenger-${index}`}
                            renderItem={renderPassengerRow}
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={styles.tableContent}
                        />
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? 'No passengers found' : 'No passengers available'}
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                            {searchQuery ? 'Try adjusting your search' : 'Passengers will appear here once they respond'}
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#f9f9f9" },
    container: { flex: 1, padding: 16 },
    
    // Header
    headerBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        height: 70,
        backgroundColor: "#afd826",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: { 
        fontSize: 18, 
        fontWeight: "bold", 
        color: "#fff",
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#fff",
        opacity: 0.9,
    },
    
    // Search and Filter
    searchContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#333",
    },
    filterButton: {
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        justifyContent: "center",
        alignItems: "center",
    },
    
    // Sort Options
    sortContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 12,
    },
    sortLabel: {
        fontSize: 14,
        color: "#666",
        fontWeight: "600",
    },
    sortOptions: {
        flexDirection: "row",
        gap: 8,
    },
    sortOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
    },
    sortOptionActive: {
        backgroundColor: "#afd826",
    },
    sortOptionText: {
        fontSize: 12,
        color: "#666",
        fontWeight: "600",
    },
    sortOptionTextActive: {
        color: "#fff",
    },
    
    // Table Styles
    tableContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 12,
        backgroundColor: "#fff",
        overflow: "hidden",
    },
    tableContent: {
        flexGrow: 1,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#afd826",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    tableRow: {
        flexDirection: "row",
        minHeight: 50,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    evenRow: {
        backgroundColor: "#fff",
    },
    oddRow: {
        backgroundColor: "#fafafa",
    },
    tableCell: {
        justifyContent: "center",
        paddingHorizontal: 6,
        paddingVertical: 8,
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#fff",
        textAlign: "center",
    },
    cellText: {
        fontSize: 12,
        color: "#333",
        textAlign: "center",
    },
    nameText: {
        fontWeight: "500",
    },
    
    // Column Widths
    serialColumn: {
        width: '10%',
        minWidth: 40,
    },
    nameColumn: {
        width: '20%',
        flex: 1,
        minWidth: 80,
    },
    statusColumn: {
        width: '15%',
        minWidth: 70,
    },
    networkColumn: {
        width: '15%',
        minWidth: 70,
    },
    timeSlotColumn: {
        width: '15%',
        minWidth: 70,
    },
    dateColumn: {
        width: '15%',
        minWidth: 70,
    },
    timeColumn: {
        width: '10%',
        minWidth: 60,
    },
    
    // Status Badge
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: "center",
    },
    statusText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "bold",
        textAlign: "center",
    },
    
    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyStateText: {
        fontSize: 18,
        color: "#666",
        marginTop: 16,
        textAlign: "center",
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: "#999",
        marginTop: 8,
        textAlign: "center",
    },
});