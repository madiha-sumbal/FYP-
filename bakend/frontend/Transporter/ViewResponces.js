import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Dimensions,
    Alert,
    RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";

const { width: screenWidth } = Dimensions.get("window");

export default function ViewResponse({ navigation, route }) {
    const { pollData, passengerResponses: initialResponses, isNewPoll } = route.params || {};
    
    const [refreshing, setRefreshing] = useState(false);
    const [passengerResponses, setPassengerResponses] = useState([]);
    const [poll, setPoll] = useState(null);

    // Initialize data from route params with proper error handling
    useEffect(() => {
        console.log("Received pollData:", pollData);
        console.log("Received initialResponses:", initialResponses ? initialResponses.length : 0);
        
        if (pollData) {
            try {
                // Safely process poll data
                const processedPollData = {
                    ...pollData,
                    // Ensure date is properly handled
                    date: pollData.date ? new Date(pollData.date) : new Date(),
                    createdAt: pollData.createdAt ? new Date(pollData.createdAt) : new Date(),
                    // Ensure networks array exists
                    networks: pollData.networks || [],
                    // Ensure timeSlots array exists
                    timeSlots: pollData.timeSlots || [],
                    // Ensure numeric values
                    totalPassengers: Number(pollData.totalPassengers) || 0,
                    totalCapacity: Number(pollData.totalCapacity) || 0
                };
                
                setPoll(processedPollData);
                
                if (initialResponses && Array.isArray(initialResponses)) {
                    // Process responses to ensure proper date objects
                    const processedResponses = initialResponses.map(response => ({
                        ...response,
                        responseTime: response.responseTime ? new Date(response.responseTime) : new Date()
                    }));
                    setPassengerResponses(processedResponses);
                } else {
                    generateMockResponses(processedPollData);
                }
            } catch (error) {
                console.error("Error processing poll data:", error);
                // Fallback to default data
                setDefaultPollData();
            }
        } else {
            setDefaultPollData();
        }
    }, [pollData, initialResponses]);

    const setDefaultPollData = () => {
        const defaultPoll = {
            id: "1",
            date: new Date(),
            message: "Please select your preferred time slot for tomorrow's transportation.",
            timeSlots: [
                { id: 1, type: "Morning Slot", start: "09:00 AM", end: "11:00 AM", max: 50 },
                { id: 2, type: "Evening Slot", start: "05:00 PM", end: "07:00 PM", max: 50 },
            ],
            networks: [
                { id: 1, name: "Blue Area", passengers: 156, selected: true },
                { id: 2, name: "Gulberg", passengers: 132, selected: true },
                { id: 3, name: "DHA", passengers: 98, selected: true },
                { id: 4, name: "Johar Town", passengers: 87, selected: true },
            ],
            totalPassengers: 473,
            totalCapacity: 100,
            createdAt: new Date(),
            status: "active"
        };
        setPoll(defaultPoll);
        generateMockResponses(defaultPoll);
    };

    // Generate realistic mock responses based on poll data
    const generateMockResponses = (pollDataToUse) => {
        if (!pollDataToUse) return;

        const responses = [];
        const names = [
            "Ali Ahmed", "Sara Khan", "Usman Malik", "Fatima Noor", 
            "Bilal Raza", "Ayesha Siddiqui", "Omar Farooq", "Zainab Ali",
            "Ahmed Raza", "Sana Khan", "Muhammad Ali", "Hina Shah",
            "Kamran Ahmed", "Nadia Malik", "Faisal Iqbal", "Sadia Noor"
        ];
        
        const selectedNetworks = pollDataToUse.networks || [];
        const timeSlots = pollDataToUse.timeSlots || [];
        
        if (selectedNetworks.length === 0) {
            console.warn("No networks selected for response generation");
            return;
        }

        // Generate responses proportional to network size
        selectedNetworks.forEach(network => {
            if (network.selected) {
                // More realistic response count calculation
                const baseResponseRate = 0.4; // 40% base response rate
                const responseCount = Math.floor(network.passengers * (baseResponseRate + Math.random() * 0.3));
                
                for (let i = 0; i < responseCount; i++) {
                    const randomTimeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
                    
                    // Realistic status distribution
                    const rand = Math.random();
                    let status;
                    if (rand > 0.6) {
                        status = 'confirmed'; // 40% confirmed
                    } else if (rand > 0.3) {
                        status = 'pending'; // 30% pending
                    } else {
                        status = 'cancelled'; // 30% cancelled
                    }
                    
                    const randomName = names[Math.floor(Math.random() * names.length)];
                    
                    // Generate realistic response time (within last 48 hours)
                    const responseTime = new Date();
                    responseTime.setHours(responseTime.getHours() - Math.floor(Math.random() * 48));
                    responseTime.setMinutes(Math.floor(Math.random() * 60));
                    
                    responses.push({
                        id: `response-${network.id}-${i}-${Date.now()}`,
                        passengerName: randomName,
                        network: network.name,
                        timeSlot: randomTimeSlot?.type || "Unknown Slot",
                        responseTime: responseTime,
                        status: status
                    });
                }
            }
        });
        
        setPassengerResponses(responses);
    };

    // Simulate real-time response updates for new polls
    useEffect(() => {
        if (isNewPoll && poll) {
            const interval = setInterval(() => {
                setPassengerResponses(prev => {
                    const targetResponses = Math.floor(poll.totalPassengers * 0.7); // Target 70% response rate
                    if (prev.length >= targetResponses) {
                        clearInterval(interval);
                        return prev;
                    }
                    
                    const newResponse = generateNewResponse(prev.length + 1);
                    return [...prev, newResponse];
                });
            }, 3000); // New response every 3 seconds

            return () => clearInterval(interval);
        }
    }, [isNewPoll, poll]);

    const generateNewResponse = (id) => {
        const names = ["Ahmed Raza", "Sanaullah Khan", "Muhammad Usman", "Fatima Batool", "Bilal Ahmed"];
        const networks = poll.networks.filter(net => net.selected).map(net => net.name);
        const timeSlots = poll.timeSlots.map(ts => ts.type);
        const statuses = ["confirmed", "pending"];
        
        return {
            id: `new-response-${id}-${Date.now()}`,
            passengerName: names[Math.floor(Math.random() * names.length)],
            network: networks[Math.floor(Math.random() * networks.length)],
            timeSlot: timeSlots[Math.floor(Math.random() * timeSlots.length)],
            responseTime: new Date(),
            status: statuses[Math.floor(Math.random() * statuses.length)]
        };
    };

    // Refresh functionality
    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => {
            if (poll) {
                generateMockResponses(poll);
            }
            setRefreshing(false);
            Alert.alert("Refreshed", "Responses updated successfully!");
        }, 1500);
    };

    // Calculate response statistics with safe defaults
    const responseStats = poll ? {
        total: passengerResponses.length,
        confirmed: passengerResponses.filter(r => r.status === 'confirmed').length,
        pending: passengerResponses.filter(r => r.status === 'pending').length,
        cancelled: passengerResponses.filter(r => r.status === 'cancelled').length,
        responseRate: poll.totalPassengers > 0 ? 
            Math.round((passengerResponses.length / poll.totalPassengers) * 100) : 0
    } : {
        total: 0, confirmed: 0, pending: 0, cancelled: 0, responseRate: 0
    };

    // Time slot distribution with safe defaults
    const timeSlotDistribution = poll ? (poll.timeSlots || []).map(slot => ({
        name: slot.type,
        count: passengerResponses.filter(r => r.timeSlot === slot.type).length,
        capacity: slot.max || 0,
        percentage: slot.max ? 
            Math.round((passengerResponses.filter(r => r.timeSlot === slot.type).length / slot.max) * 100) : 0
    })) : [];

    // Network distribution with safe defaults
    const networkDistribution = poll ? (poll.networks || []).filter(net => net.selected).map(network => ({
        name: network.name,
        count: passengerResponses.filter(r => r.network === network.name).length,
        total: network.passengers || 0,
        percentage: network.passengers ? 
            Math.round((passengerResponses.filter(r => r.network === network.name).length / network.passengers) * 100) : 0
    })) : [];

    // Chart data
    const statusChartData = [
        {
            name: "Confirmed",
            population: responseStats.confirmed,
            color: "#4CAF50",
            legendFontColor: "#7F7F7F",
            legendFontSize: 12,
        },
        {
            name: "Pending",
            population: responseStats.pending,
            color: "#FF9800",
            legendFontColor: "#7F7F7F",
            legendFontSize: 12,
        },
        {
            name: "Cancelled",
            population: responseStats.cancelled,
            color: "#F44336",
            legendFontColor: "#7F7F7F",
            legendFontSize: 12,
        }
    ];

        // Navigation to passenger lists
    const navigateToPassengerList = (status, title) => {
        let filteredPassengers = [];
        
        switch (status) {
            case 'all':
                filteredPassengers = passengerResponses;
                break;
            case 'confirmed':
                filteredPassengers = passengerResponses.filter(r => r.status === 'confirmed');
                break;
            case 'pending':
                filteredPassengers = passengerResponses.filter(r => r.status === 'pending');
                break;
            case 'cancelled':
                filteredPassengers = passengerResponses.filter(r => r.status === 'cancelled');
                break;
            default:
                filteredPassengers = passengerResponses;
        }

        // FIXED: Use filteredPassengers instead of passengers
        navigation.navigate('PassengerDataList', {
            passengers: filteredPassengers.map(p => ({
                ...p,
                responseTime: p.responseTime.toISOString() // Convert to string for serialization
            })),
            title: title || "Passenger List",
            poll: poll // Pass the poll data if needed
        });
    };

    // Action handlers
    const handleSendReminder = () => {
        const pendingCount = poll ? Math.max(0, poll.totalPassengers - responseStats.total) : 0;
        Alert.alert(
            "Send Reminder",
            `Send reminder to ${pendingCount} passengers who haven't responded yet?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Send", 
                    onPress: () => {
                        Alert.alert("Success", `Reminders sent to ${pendingCount} passengers!`);
                    }
                }
            ]
        );
    };

    const handleExportData = () => {
        const dataToExport = {
            poll: poll,
            responses: passengerResponses,
            statistics: responseStats,
            generatedAt: new Date().toISOString()
        };
        
        Alert.alert(
            "Export Data", 
            `Export ${passengerResponses.length} responses as CSV?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Export", 
                    onPress: () => {
                        Alert.alert("Success", "Data exported successfully!\nCheck your downloads folder.");
                    }
                }
            ]
        );
    };

    // Enhanced Header with Stats
    const Header = () => (
        <View style={styles.headerBar}>
            <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.headerButton}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Poll Responses</Text>
                <View style={styles.headerStats}>
                    <Text style={styles.headerStat}>
                        📅 {poll && poll.date ? new Date(poll.date).toLocaleDateString() : 'Loading...'}
                    </Text>
                    <Text style={styles.headerStat}>
                        👥 {responseStats.total} responses
                    </Text>
                </View>
            </View>

            <View style={styles.headerActions}>
                <TouchableOpacity 
                    style={styles.headerIconButton}
                    onPress={onRefresh}
                >
                    <Ionicons name="refresh" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.headerIconButton}
                    onPress={() => Alert.alert("Share", "Share responses data")}
                >
                    <Ionicons name="share-outline" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Response Status Badge
    const StatusBadge = ({ status }) => {
        const statusConfig = {
            confirmed: { color: '#4CAF50', label: 'Confirmed' },
            pending: { color: '#FF9800', label: 'Pending' },
            cancelled: { color: '#F44336', label: 'Cancelled' }
        };
        
        const config = statusConfig[status] || statusConfig.pending;
        
        return (
            <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
                <Text style={styles.statusText}>{config.label}</Text>
            </View>
        );
    };

    // Clickable Stat Card Component
    const StatCard = ({ number, label, subtext, color, status }) => (
        <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigateToPassengerList(status, label)}
        >
            <Text style={[styles.statNumber, { color }]}>{number}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statSubtext}>{subtext}</Text>
        </TouchableOpacity>
    );

    if (!poll) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar backgroundColor="#afd826" barStyle="light-content" />
                <Header />
                <View style={styles.loadingContainer}>
                    <Text>Loading poll data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#afd826" barStyle="light-content" />
            <Header />
            
            <ScrollView 
                style={styles.container} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {isNewPoll && (
                    <View style={styles.successBanner}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={styles.successText}>
                            {responseStats.total > 0 
                                ? `Poll active! ${responseStats.total} responses received.` 
                                : "Poll sent successfully! Waiting for passenger responses."
                            }
                        </Text>
                    </View>
                )}

                {/* Quick Stats Overview - Now Clickable */}
                <View style={styles.statsGrid}>
                    <StatCard 
                        number={responseStats.total}
                        label="Total Responses"
                        subtext={`of ${poll.totalPassengers}`}
                        color="#afd826"
                        status="all"
                    />
                    <StatCard 
                        number={responseStats.confirmed}
                        label="Confirmed"
                        subtext={`${responseStats.total > 0 ? Math.round((responseStats.confirmed / responseStats.total) * 100) : 0}%`}
                        color="#4CAF50"
                        status="confirmed"
                    />
                    <StatCard 
                        number={responseStats.pending}
                        label="Pending"
                        subtext={`${responseStats.total > 0 ? Math.round((responseStats.pending / responseStats.total) * 100) : 0}%`}
                        color="#FF9800"
                        status="pending"
                    />
                    <StatCard 
                        number={responseStats.cancelled}
                        label="Cancelled"
                        subtext={`${responseStats.total > 0 ? Math.round((responseStats.cancelled / responseStats.total) * 100) : 0}%`}
                        color="#F44336"
                        status="cancelled"
                    />
                </View>

                {/* Response Status Chart */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Response Status</Text>
                    {responseStats.total > 0 ? (
                        <PieChart
                            data={statusChartData}
                            width={screenWidth - 64}
                            height={160}
                            chartConfig={{
                                backgroundColor: "#ffffff",
                                backgroundGradientFrom: "#ffffff",
                                backgroundGradientTo: "#ffffff",
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            }}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            absolute
                        />
                    ) : (
                        <View style={styles.noDataContainer}>
                            <Ionicons name="stats-chart" size={48} color="#ccc" />
                            <Text style={styles.noDataText}>No responses yet</Text>
                            <Text style={styles.noDataSubtext}>Waiting for passenger responses...</Text>
                        </View>
                    )}
                </View>

                {/* Time Slot Distribution */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Time Slot Distribution</Text>
                    {timeSlotDistribution.map((slot, index) => (
                        <View key={index} style={styles.distributionItem}>
                            <View style={styles.distributionHeader}>
                                <Text style={styles.distributionName}>{slot.name}</Text>
                                <Text style={styles.distributionCount}>
                                    {slot.count}/{slot.capacity} ({slot.percentage}%)
                                </Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View 
                                    style={[
                                        styles.progressFill,
                                        { 
                                            width: `${Math.min(slot.percentage, 100)}%`,
                                            backgroundColor: slot.percentage > 80 ? '#F44336' : 
                                                           slot.percentage > 60 ? '#FF9800' : '#4CAF50'
                                        }
                                    ]} 
                                />
                            </View>
                            <Text style={styles.timeRange}>
                                {poll.timeSlots?.find(ts => ts.type === slot.name)?.start || 'N/A'} - 
                                {poll.timeSlots?.find(ts => ts.type === slot.name)?.end || 'N/A'}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Network Distribution */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Network Responses</Text>
                    {networkDistribution.map((network, index) => (
                        <View key={index} style={styles.networkStats}>
                            <View style={styles.networkInfo}>
                                <Text style={styles.networkName}>{network.name}</Text>
                                <Text style={styles.networkResponse}>
                                    {network.count} / {network.total} passengers ({network.percentage}%)
                                </Text>
                            </View>
                            <View style={styles.responseBar}>
                                <View 
                                    style={[
                                        styles.responseFill,
                                        { width: `${Math.min(network.percentage, 100)}%` }
                                    ]} 
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Quick Actions */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity 
                            style={[styles.quickActionBtn, styles.primaryAction]}
                            onPress={() => navigateToPassengerList('all', 'All Passengers')}
                        >
                            <Ionicons name="people" size={24} color="#fff" />
                            <Text style={styles.quickActionText}>View All Passengers</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.quickActionBtn, styles.successAction]}
                            onPress={() => navigateToPassengerList('confirmed', 'Confirmed Passengers')}
                        >
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                            <Text style={styles.quickActionText}>Confirmed List</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Individual Passenger Responses Preview */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Responses</Text>
                        <TouchableOpacity onPress={() => navigateToPassengerList('all', 'All Passengers')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {passengerResponses.length > 0 ? (
                        passengerResponses.slice(0, 3).map((response) => (
                            <View key={response.id} style={styles.responseItem}>
                                <View style={styles.responseHeader}>
                                    <Text style={styles.passengerName}>{response.passengerName}</Text>
                                    <StatusBadge status={response.status} />
                                </View>
                                <View style={styles.responseDetails}>
                                    <View style={styles.responseDetail}>
                                        <Ionicons name="location-outline" size={14} color="#666" />
                                        <Text style={styles.detailText}>{response.network}</Text>
                                    </View>
                                    <View style={styles.responseDetail}>
                                        <Ionicons name="time-outline" size={14} color="#666" />
                                        <Text style={styles.detailText}>{response.timeSlot}</Text>
                                    </View>
                                    <View style={styles.responseDetail}>
                                        <Ionicons name="calendar-outline" size={14} color="#666" />
                                        <Text style={styles.detailText}>
                                            {response.responseTime.toLocaleDateString()} at {response.responseTime.toLocaleTimeString()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noResponsesContainer}>
                            <Ionicons name="people-outline" size={48} color="#ccc" />
                            <Text style={styles.noResponsesText}>No responses yet</Text>
                            <Text style={styles.noResponsesSubtext}>Passenger responses will appear here</Text>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.primaryBtn]}
                        onPress={handleExportData}
                    >
                        <Ionicons name="download-outline" size={18} color="#fff" />
                        <Text style={styles.primaryBtnText}>Export Data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.secondaryBtn]}
                        onPress={handleSendReminder}
                    >
                        <Ionicons name="notifications-outline" size={18} color="#666" />
                        <Text style={styles.secondaryBtnText}>Send Reminder</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Updated Styles
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#f9f9f9" },
    container: { flex: 1, padding: 16 },
    
    // Header Styles
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
    headerStats: {
        flexDirection: "row",
        gap: 12,
    },
    headerStat: {
        fontSize: 12,
        color: "#fff",
        opacity: 0.9,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    headerIconButton: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
    },
    
    // Loading and No Data States
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    noDataContainer: {
        alignItems: "center",
        padding: 40,
    },
    noDataText: {
        fontSize: 16,
        color: "#666",
        marginTop: 12,
    },
    noDataSubtext: {
        fontSize: 14,
        color: "#999",
        marginTop: 4,
    },
    noResponsesContainer: {
        alignItems: "center",
        padding: 40,
    },
    noResponsesText: {
        fontSize: 16,
        color: "#666",
        marginTop: 12,
    },
    noResponsesSubtext: {
        fontSize: 14,
        color: "#999",
        marginTop: 4,
    },
    
    // Success Banner
    successBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E8",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#4CAF50",
    },
    successText: {
        marginLeft: 8,
        color: "#2E7D32",
        fontWeight: "500",
        flex: 1,
    },
    
    // Stats Grid - Updated for clickable cards
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        fontWeight: "600",
    },
    statSubtext: {
        fontSize: 10,
        color: "#999",
        marginTop: 2,
    },
    
    // Cards
    card: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    responseCount: {
        fontSize: 14,
        color: "#666",
        fontWeight: "500",
    },
    viewAllText: {
        fontSize: 14,
        color: "#afd826",
        fontWeight: "600",
    },
    
    // Quick Actions
    quickActions: {
        flexDirection: "row",
        gap: 12,
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    primaryAction: {
        backgroundColor: "#afd826",
    },
    successAction: {
        backgroundColor: "#4CAF50",
    },
    quickActionText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },
    
    // Distribution Items
    distributionItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    distributionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    distributionName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    distributionCount: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
    },
    timeRange: {
        fontSize: 12,
        color: "#888",
        marginTop: 4,
    },
    
    // Progress Bars
    progressBar: {
        height: 8,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
    },
    
    // Network Stats
    networkStats: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    networkInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    networkName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    networkResponse: {
        fontSize: 14,
        color: "#666",
    },
    responseBar: {
        height: 6,
        backgroundColor: "#f0f0f0",
        borderRadius: 3,
        overflow: "hidden",
    },
    responseFill: {
        height: "100%",
        backgroundColor: "#afd826",
        borderRadius: 3,
    },
    
    // Response Items
    responseItem: {
        backgroundColor: "#fafafa",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#afd826",
    },
    responseHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    passengerName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    responseDetails: {
        gap: 6,
    },
    responseDetail: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        color: "#666",
    },
    
    // Status Badge
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
    },
    
    // Action Buttons
    actionButtons: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        borderRadius: 10,
        gap: 8,
    },
    primaryBtn: {
        backgroundColor: "#afd826",
    },
    secondaryBtn: {
        backgroundColor: "#f8f8f8",
        borderWidth: 1,
        borderColor: "#e1e1e1",
    },
    primaryBtnText: {
        color: "#000",
        fontWeight: "bold",
        fontSize: 14,
    },
    secondaryBtnText: {
        color: "#666",
        fontWeight: "600",
        fontSize: 14,
    },
});