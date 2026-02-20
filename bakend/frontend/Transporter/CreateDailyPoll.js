import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Alert,
    Animated,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateDailyPoll({ navigation }) {
    const [step, setStep] = useState(1);
    const [progress] = useState(new Animated.Value(25));

    // States
    const [pollDate, setPollDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pollMessage, setPollMessage] = useState(
        "Please select your preferred time slot for tomorrow's transportation."
    );
    const [timeSlots, setTimeSlots] = useState([
        { 
            id: 1, 
            type: "Morning Slot", 
            start: "09:00 AM", 
            end: "11:00 AM", 
            max: 50,
            startTime: "09:00",
            endTime: "11:00"
        },
    ]);
    const [networks, setNetworks] = useState([
        { id: 1, name: "Blue Area", passengers: 156, selected: false },
        { id: 2, name: "Gulberg", passengers: 132, selected: false },
        { id: 3, name: "DHA", passengers: 98, selected: false },
        { id: 4, name: "Johar Town", passengers: 87, selected: false },
    ]);

    // Progress Animation
    const updateProgress = (newStep) => {
        Animated.timing(progress, {
            toValue: (newStep / 4) * 100,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleNext = (nextStep) => {
        setStep(nextStep);
        updateProgress(nextStep);
    };

    const handlePrevious = (prevStep) => {
        setStep(prevStep);
        updateProgress(prevStep);
    };

    // Date formatting
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    };

    // Add new time slot
    const addNewTimeSlot = () => {
        const newSlot = {
            id: Date.now(),
            type: "New Slot",
            start: "12:00 PM",
            end: "02:00 PM",
            max: 50,
            startTime: "12:00",
            endTime: "14:00"
        };
        setTimeSlots([...timeSlots, newSlot]);
    };

    // Remove time slot
    const removeTimeSlot = (id) => {
        if (timeSlots.length > 1) {
            setTimeSlots(timeSlots.filter(slot => slot.id !== id));
        } else {
            Alert.alert("Cannot Remove", "At least one time slot is required.");
        }
    };

    // Update time slot
    const updateTimeSlot = (id, field, value) => {
        setTimeSlots(timeSlots.map(slot => 
            slot.id === id ? { ...slot, [field]: value } : slot
        ));
    };

    // Toggle network selection
    const toggleNetwork = (id) => {
        setNetworks(networks.map(net => 
            net.id === id ? { ...net, selected: !net.selected } : net
        ));
    };

    // Select all networks
    const selectAllNetworks = () => {
        setNetworks(networks.map(net => ({ ...net, selected: true })));
    };

    // Deselect all networks
    const deselectAllNetworks = () => {
        setNetworks(networks.map(net => ({ ...net, selected: false })));
    };

    // Generate realistic mock responses based on poll data
    const generateMockResponses = (pollData) => {
        const responses = [];
        const names = [
            "Ali Ahmed", "Sara Khan", "Usman Malik", "Fatima Noor", 
            "Bilal Raza", "Ayesha Siddiqui", "Omar Farooq", "Zainab Ali",
            "Ahmed Raza", "Sana Khan", "Muhammad Ali", "Hina Shah",
            "Kamran Ahmed", "Nadia Malik", "Faisal Iqbal", "Sadia Noor"
        ];
        
        const selectedNetworks = pollData.networks;
        const timeSlots = pollData.timeSlots;
        
        // Generate responses proportional to network size
        selectedNetworks.forEach(network => {
            // Calculate response count based on network size (30-70% response rate)
            const responseCount = Math.floor((network.passengers * (0.3 + Math.random() * 0.4)));
            
            for (let i = 0; i < responseCount; i++) {
                const randomTimeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
                
                // More realistic status distribution
                const rand = Math.random();
                let status;
                if (rand > 0.7) {
                    status = 'confirmed';
                } else if (rand > 0.4) {
                    status = 'pending';
                } else {
                    status = 'cancelled';
                }
                
                const randomName = names[Math.floor(Math.random() * names.length)];
                
                // Generate realistic response time (within last 24 hours)
                const responseTime = new Date();
                responseTime.setHours(responseTime.getHours() - Math.floor(Math.random() * 24));
                responseTime.setMinutes(Math.floor(Math.random() * 60));
                
                responses.push({
                    id: `${network.id}-${i}-${Date.now()}`,
                    passengerName: randomName,
                    network: network.name,
                    timeSlot: randomTimeSlot.type,
                    responseTime: responseTime,
                    status: status
                });
            }
        });
        
        return responses;
    };

    // Submit poll and navigate to View Response
    const submitPoll = () => {
        const selectedNetworks = networks.filter(net => net.selected);
        
        if (selectedNetworks.length === 0) {
            Alert.alert("No Networks Selected", "Please select at least one network.");
            return;
        }

        if (timeSlots.length === 0) {
            Alert.alert("No Time Slots", "Please add at least one time slot.");
            return;
        }

        // Prepare poll data to send to View Response screen
        const pollData = {
            id: Date.now().toString(),
            date: pollDate.toISOString(), // Convert to string for safe navigation
            message: pollMessage,
            timeSlots: timeSlots,
            networks: selectedNetworks,
            totalPassengers: selectedNetworks.reduce((sum, net) => sum + net.passengers, 0),
            totalCapacity: timeSlots.reduce((sum, slot) => sum + slot.max, 0),
            createdAt: new Date().toISOString(),
            status: "active"
        };

        // Generate realistic mock responses
        const passengerResponses = generateMockResponses(pollData);

        Alert.alert(
            "Confirm Poll",
            `Send this poll to ${selectedNetworks.length} networks with ${pollData.totalPassengers} total passengers?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Send Poll", 
                    onPress: () => {
                        console.log("Poll Data:", pollData);
                        console.log("Responses Count:", passengerResponses.length);
                        
                        navigation.navigate('ViewResponse', { 
                            pollData: pollData,
                            passengerResponses: passengerResponses,
                            isNewPoll: true 
                        });
                    }
                }
            ]
        );
    };

    // Custom Header
    const Header = ({ title }) => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={styles.menuButton}
                >
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{title}</Text>
                </View>
                <View style={styles.menuButton} />
            </View>
        </View>
    );

    // Progress Bar
    const ProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
                <Text style={[styles.progressText, step >= 1 && styles.progressTextActive]}>Basic Info</Text>
                <Text style={[styles.progressText, step >= 2 && styles.progressTextActive]}>Time Slots</Text>
                <Text style={[styles.progressText, step >= 3 && styles.progressTextActive]}>Networks</Text>
                <Text style={[styles.progressText, step >= 4 && styles.progressTextActive]}>Summary</Text>
            </View>
            <View style={styles.progressBar}>
                <Animated.View 
                    style={[
                        styles.progressFill,
                        { width: progress.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                        }) }
                    ]} 
                />
            </View>
        </View>
    );

    // Step 1: Basic Information
    const renderBasicInfo = () => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Poll Information</Text>
                <Text style={styles.cardSubtitle}>Set up basic poll details</Text>
            </View>
            
            <Text style={styles.label}>Poll Date</Text>
            <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
            >
                <Text style={styles.dateText}>{formatDate(pollDate)}</Text>
                <Ionicons name="calendar" size={20} color="#666" />
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={pollDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setPollDate(selectedDate);
                    }}
                    minimumDate={new Date()}
                />
            )}

            <Text style={styles.label}>Poll Message</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                value={pollMessage}
                onChangeText={setPollMessage}
                placeholder="Enter your poll message here..."
                placeholderTextColor="#999"
            />

            <TouchableOpacity 
                style={[styles.btn, styles.btnPrimary]} 
                onPress={() => handleNext(2)}
            >
                <Text style={styles.btnText}>Next: Time Slots</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    // Step 2: Time Slots
    const renderTimeSlots = () => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Time Slots Configuration</Text>
                <Text style={styles.cardSubtitle}>Configure available time slots</Text>
            </View>
            
            <View style={styles.slotsContainer}>
                {timeSlots.map((slot) => (
                    <View key={slot.id} style={styles.slotCard}>
                        <View style={styles.slotHeader}>
                            <Text style={styles.slotTitle}>Time Slot</Text>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => removeTimeSlot(slot.id)}
                            >
                                <Ionicons name="trash" size={20} color="#E74C3C" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.slotLabel}>Slot Name</Text>
                        <TextInput
                            style={styles.input}
                            value={slot.type}
                            onChangeText={(text) => updateTimeSlot(slot.id, 'type', text)}
                            placeholder="e.g., Morning Slot, Evening Slot"
                            placeholderTextColor="#999"
                        />

                        <View style={styles.timeRow}>
                            <View style={styles.timeInputContainer}>
                                <Text style={styles.slotLabel}>Start Time</Text>
                                <TextInput
                                    style={styles.input}
                                    value={slot.start}
                                    onChangeText={(text) => updateTimeSlot(slot.id, 'start', text)}
                                    placeholder="09:00 AM"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View style={styles.timeInputContainer}>
                                <Text style={styles.slotLabel}>End Time</Text>
                                <TextInput
                                    style={styles.input}
                                    value={slot.end}
                                    onChangeText={(text) => updateTimeSlot(slot.id, 'end', text)}
                                    placeholder="11:00 AM"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        <Text style={styles.slotLabel}>Maximum Passengers</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(slot.max)}
                            onChangeText={(text) => updateTimeSlot(slot.id, 'max', parseInt(text) || 0)}
                            placeholder="50"
                            placeholderTextColor="#999"
                        />
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={styles.addButton}
                onPress={addNewTimeSlot}
            >
                <Ionicons name="add-circle" size={20} color="#afd826" />
                <Text style={styles.addButtonText}>Add Another Time Slot</Text>
            </TouchableOpacity>

            <View style={styles.navigationRow}>
                <TouchableOpacity
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={() => handlePrevious(1)}
                >
                    <Ionicons name="arrow-back" size={20} color="#666" />
                    <Text style={styles.btnTextSecondary}>Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.btn, styles.btnPrimary]} 
                    onPress={() => handleNext(3)}
                >
                    <Text style={styles.btnText}>Next: Networks</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Step 3: Networks
    const renderNetworks = () => {
        const selectedCount = networks.filter(net => net.selected).length;
        const totalPassengers = networks.filter(net => net.selected).reduce((sum, net) => sum + net.passengers, 0);
        
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Select Networks</Text>
                    <Text style={styles.cardSubtitle}>Choose networks for this poll</Text>
                </View>
                
                <View style={styles.networkHeader}>
                    <View>
                        <Text style={styles.networkSubtitle}>
                            {selectedCount} of {networks.length} networks selected
                        </Text>
                        <Text style={styles.passengerCount}>
                            {totalPassengers} total passengers
                        </Text>
                    </View>
                    <View style={styles.networkActions}>
                        <TouchableOpacity 
                            style={styles.networkActionBtn}
                            onPress={selectAllNetworks}
                        >
                            <Text style={styles.networkActionText}>Select All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.networkActionBtn}
                            onPress={deselectAllNetworks}
                        >
                            <Text style={styles.networkActionText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.networksList}>
                    {networks.map((network) => (
                        <TouchableOpacity
                            key={network.id}
                            style={[
                                styles.networkItem,
                                network.selected && styles.networkItemSelected
                            ]}
                            onPress={() => toggleNetwork(network.id)}
                        >
                            <View style={styles.networkInfo}>
                                <Text style={styles.networkName}>{network.name}</Text>
                                <Text style={styles.networkPassengers}>
                                    {network.passengers} passengers
                                </Text>
                            </View>
                            <View style={[
                                styles.checkbox,
                                network.selected && styles.checkboxSelected
                            ]}>
                                {network.selected && (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.navigationRow}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnSecondary]}
                        onPress={() => handlePrevious(2)}
                    >
                        <Ionicons name="arrow-back" size={20} color="#666" />
                        <Text style={styles.btnTextSecondary}>Previous</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.btn, styles.btnPrimary]} 
                        onPress={() => handleNext(4)}
                    >
                        <Text style={styles.btnText}>Next: Summary</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Step 4: Summary
    const renderSummary = () => {
        const selectedNetworks = networks.filter(net => net.selected);
        const totalPassengers = selectedNetworks.reduce((sum, net) => sum + net.passengers, 0);
        const totalCapacity = timeSlots.reduce((sum, slot) => sum + slot.max, 0);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Poll Summary</Text>
                    <Text style={styles.cardSubtitle}>Review and confirm poll details</Text>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{selectedNetworks.length}</Text>
                        <Text style={styles.statLabel}>Networks</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{totalPassengers}</Text>
                        <Text style={styles.statLabel}>Passengers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{timeSlots.length}</Text>
                        <Text style={styles.statLabel}>Time Slots</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{totalCapacity}</Text>
                        <Text style={styles.statLabel}>Total Capacity</Text>
                    </View>
                </View>

                {/* Poll Details */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>📅 Poll Date</Text>
                    <Text style={styles.summaryContent}>{formatDate(pollDate)}</Text>
                </View>

                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>💬 Poll Message</Text>
                    <Text style={styles.summaryContent}>{pollMessage}</Text>
                </View>

                {/* Selected Networks */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>🌐 Selected Networks</Text>
                    {selectedNetworks.length === 0 ? (
                        <Text style={styles.noSelection}>No networks selected</Text>
                    ) : (
                        selectedNetworks.map((network) => (
                            <View key={network.id} style={styles.networkSummaryItem}>
                                <Text style={styles.networkSummaryName}>{network.name}</Text>
                                <Text style={styles.networkSummaryPassengers}>
                                    {network.passengers} passengers
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Time Slots */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>⏰ Time Slots</Text>
                    {timeSlots.map((slot, index) => (
                        <View key={slot.id} style={styles.timeSlotSummary}>
                            <Text style={styles.timeSlotName}>{slot.type}</Text>
                            <Text style={styles.timeSlotTime}>
                                {slot.start} - {slot.end}
                            </Text>
                            <Text style={styles.timeSlotCapacity}>
                                Capacity: {slot.max} passengers
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Navigation */}
                <View style={styles.navigationRow}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnSecondary]}
                        onPress={() => handlePrevious(3)}
                    >
                        <Ionicons name="arrow-back" size={20} color="#666" />
                        <Text style={styles.btnTextSecondary}>Previous</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.btn, styles.btnSuccess]} 
                        onPress={submitPoll}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                        <Text style={styles.btnTextSuccess}>Send Poll & View Response</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#afd826" barStyle="light-content" />
            <Header title="Create Daily Poll" />
            <ProgressBar />
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {step === 1 && renderBasicInfo()}
                {step === 2 && renderTimeSlots()}
                {step === 3 && renderNetworks()}
                {step === 4 && renderSummary()}
            </ScrollView>
        </SafeAreaView>
    );
}

// Styles remain exactly the same...
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#afd826" },
    scrollView: { flex: 1, backgroundColor: "#F9FAFB" },
    scrollContent: { padding: 16, flexGrow: 1 },

    // Header - Aligned with Dashboard
    header: {
        backgroundColor: "#afd826",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    menuButton: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#fff",
        textAlign: "center",
    },

    // Progress Bar
    progressContainer: {
        backgroundColor: "#fff",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    progressLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    progressText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#7F8C8D",
        textAlign: "center",
        flex: 1,
    },
    progressTextActive: {
        color: "#afd826",
        fontWeight: "700",
    },
    progressBar: {
        height: 6,
        backgroundColor: "#ECF0F1",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#afd826",
        borderRadius: 3,
    },

    // Cards & Layout - Aligned with Dashboard
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    cardHeader: {
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#2C3E50",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#7F8C8D",
        fontWeight: "500",
    },

    // Inputs
    label: {
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
        color: "#2C3E50",
        fontSize: 14,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E1E8ED",
        borderRadius: 12,
        padding: 16,
        backgroundColor: "#F8F9FA",
        fontSize: 16,
        color: "#2C3E50",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    dateInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E1E8ED",
        borderRadius: 12,
        padding: 16,
        backgroundColor: "#F8F9FA",
    },
    dateText: {
        fontSize: 16,
        color: "#2C3E50",
        fontWeight: "500",
    },

    // Buttons - Aligned with Dashboard
    btn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        flex: 1,
        marginHorizontal: 6,
    },
    btnPrimary: {
        backgroundColor: "#afd826",
    },
    btnSecondary: {
        backgroundColor: "#F8F9FA",
        borderWidth: 1,
        borderColor: "#E1E8ED",
    },
    btnSuccess: {
        backgroundColor: "#27AE60",
    },
    btnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
        marginRight: 8,
    },
    btnTextSecondary: {
        color: "#7F8C8D",
        fontWeight: "600",
        fontSize: 16,
        marginLeft: 8,
    },
    btnTextSuccess: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
        marginLeft: 8,
    },

    // Time Slots
    slotsContainer: {
        marginBottom: 20,
    },
    slotCard: {
        borderWidth: 1,
        borderColor: "#E1E8ED",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        backgroundColor: "#F8F9FA",
    },
    slotHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    slotTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#2C3E50",
    },
    deleteBtn: {
        padding: 8,
    },
    timeRow: {
        flexDirection: "row",
        gap: 12,
    },
    timeInputContainer: {
        flex: 1,
    },
    slotLabel: {
        fontWeight: "600",
        marginTop: 12,
        marginBottom: 6,
        color: "#2C3E50",
        fontSize: 14,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0F9FF",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E1F5FE",
        borderStyle: "dashed",
    },
    addButtonText: {
        color: "#afd826",
        fontWeight: "600",
        fontSize: 16,
        marginLeft: 8,
    },

    // Networks
    networkHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    networkSubtitle: {
        fontSize: 14,
        color: "#7F8C8D",
        fontWeight: "500",
    },
    passengerCount: {
        fontSize: 12,
        color: "#afd826",
        fontWeight: "600",
        marginTop: 2,
    },
    networkActions: {
        flexDirection: "row",
        gap: 16,
    },
    networkActionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    networkActionText: {
        color: "#afd826",
        fontWeight: "600",
        fontSize: 14,
    },
    networksList: {
        gap: 12,
    },
    networkItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E1E8ED",
        backgroundColor: "#F8F9FA",
    },
    networkItemSelected: {
        backgroundColor: "#F2FFE0",
        borderColor: "#afd826",
    },
    networkInfo: {
        flex: 1,
    },
    networkName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: 4,
    },
    networkPassengers: {
        fontSize: 14,
        color: "#7F8C8D",
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#BDC3C7",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxSelected: {
        backgroundColor: "#afd826",
        borderColor: "#afd826",
    },

    // Summary
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "800",
        color: "#afd826",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: "#7F8C8D",
        textAlign: "center",
        fontWeight: "500",
    },
    summarySection: {
        marginBottom: 24,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#2C3E50",
        marginBottom: 8,
    },
    summaryContent: {
        fontSize: 15,
        color: "#7F8C8D",
        lineHeight: 20,
    },
    noSelection: {
        color: "#95A5A6",
        fontStyle: "italic",
    },
    networkSummaryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#ECF0F1",
    },
    networkSummaryName: {
        fontSize: 15,
        color: "#2C3E50",
        fontWeight: "500",
    },
    networkSummaryPassengers: {
        fontSize: 14,
        color: "#7F8C8D",
    },
    timeSlotSummary: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#ECF0F1",
    },
    timeSlotName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: 2,
    },
    timeSlotTime: {
        fontSize: 14,
        color: "#7F8C8D",
        marginBottom: 2,
    },
    timeSlotCapacity: {
        fontSize: 13,
        color: "#95A5A6",
    },

    // Navigation
    navigationRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
});
