import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Image,
    Modal,
    TextInput,
    Alert,
    Switch,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get("window");

export default function ProfileScreen() {
    const navigation = useNavigation();

    const [managerProfile, setManagerProfile] = useState({
        name: "Ali Ahmed",
        role: "Van Operations Manager",
        phone: "+92 300 1234567",
        email: "ali.ahmed@raahi.com",
        experience: "5 years",
        rating: 4.8,
        totalVans: 15,
        activeRoutes: 8,
        teamSize: 12,
        joinedDate: "March 2019",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        address: "Office 45, Commercial Area, Islamabad",
        employeeId: "VM001234",
        department: "Transport Operations",
        managedZones: ["Blue Area", "Gulberg", "DHA", "Model Town"]
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ ...managerProfile });
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [loading, setLoading] = useState(false);

    // Notification settings for manager
    const [notificationSettings, setNotificationSettings] = useState({
        routeUpdates: true,
        driverAlerts: true,
        maintenanceAlerts: true,
        passengerComplaints: true,
        systemReports: true,
        paymentAlerts: false
    });

    // Privacy settings
    const [privacySettings, setPrivacySettings] = useState({
        shareLocation: true,
        showInDirectory: true,
        profileVisibility: "team",
        dataAnalytics: true
    });

    // Change password states
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const toggleNotification = (setting) => {
        setNotificationSettings(prev => ({
            ...prev,
            [setting]: !prev[setting]
        }));
    };

    const togglePrivacy = (setting) => {
        setPrivacySettings(prev => ({
            ...prev,
            [setting]: !prev[setting]
        }));
    };

    const handleSaveProfile = () => {
        setLoading(true);
        setTimeout(() => {
            setManagerProfile(editForm);
            setIsEditing(false);
            setLoading(false);
            Alert.alert("Success", "Profile updated successfully!");
        }, 1000);
    };

    const handleChangePassword = () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            Alert.alert("Error", "Please fill all password fields.");
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            Alert.alert("Error", "New passwords do not match.");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setShowChangePassword(false);
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            Alert.alert("Success", "Password changed successfully!");
        }, 1500);
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Sorry, we need camera roll permissions to make this work!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setEditForm({
                ...editForm,
                avatar: result.assets[0].uri
            });
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Logout", 
                    style: "destructive",
                    onPress: () => {
                        navigation.navigate("TransporterLogin");
                    }
                }
            ]
        );
    };

    const ChangePasswordModal = () => (
        <Modal visible={showChangePassword} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Current Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter current password"
                            secureTextEntry
                            value={passwordForm.currentPassword}
                            onChangeText={(text) => setPasswordForm({...passwordForm, currentPassword: text})}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter new password"
                            secureTextEntry
                            value={passwordForm.newPassword}
                            onChangeText={(text) => setPasswordForm({...passwordForm, newPassword: text})}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm new password"
                            secureTextEntry
                            value={passwordForm.confirmPassword}
                            onChangeText={(text) => setPasswordForm({...passwordForm, confirmPassword: text})}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.saveButton, loading && { opacity: 0.7 }]}
                        onPress={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Ionicons name="lock-closed" size={20} color="#fff" />
                        )}
                        <Text style={styles.saveButtonText}>
                            {loading ? "Updating..." : "Change Password"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const NotificationsModal = () => (
        <Modal visible={showNotifications} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Manager Notifications</Text>
                        <TouchableOpacity onPress={() => setShowNotifications(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {Object.entries(notificationSettings).map(([key, value]) => (
                        <View key={key} style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>
                                    {key.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </Text>
                                <Text style={styles.settingDescription}>
                                    {key === 'routeUpdates' ? 'Get updates about route changes and schedules' :
                                     key === 'driverAlerts' ? 'Alerts for driver issues and emergencies' :
                                     key === 'maintenanceAlerts' ? 'Van maintenance and service reminders' :
                                     key === 'passengerComplaints' ? 'Passenger feedback and complaints' :
                                     key === 'systemReports' ? 'Daily system performance reports' :
                                     'Payment and billing alerts'}
                                </Text>
                            </View>
                            <Switch
                                value={value}
                                onValueChange={() => toggleNotification(key)}
                                trackColor={{ false: "#f0f0f0", true: "#afd826" }}
                                thumbColor={value ? "#fff" : "#f4f3f4"}
                            />
                        </View>
                    ))}
                </View>
            </View>
        </Modal>
    );

    const PrivacyModal = () => (
        <Modal visible={showPrivacy} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Privacy & Security</Text>
                        <TouchableOpacity onPress={() => setShowPrivacy(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {Object.entries(privacySettings).map(([key, value]) => (
                        <View key={key} style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>
                                    {key.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </Text>
                                <Text style={styles.settingDescription}>
                                    {key === 'shareLocation' ? 'Share location for operational management' :
                                     key === 'showInDirectory' ? 'Display profile in company directory' :
                                     key === 'profileVisibility' ? 'Control team visibility settings' :
                                     'Allow data analytics for operations improvement'}
                                </Text>
                            </View>
                            {typeof value === 'boolean' ? (
                                <Switch
                                    value={value}
                                    onValueChange={() => togglePrivacy(key)}
                                    trackColor={{ false: "#f0f0f0", true: "#afd826" }}
                                    thumbColor={value ? "#fff" : "#f4f3f4"}
                                />
                            ) : (
                                <Text style={styles.settingValue}>{value}</Text>
                            )}
                        </View>
                    ))}
                </View>
            </View>
        </Modal>
    );

    const HelpModal = () => (
        <Modal visible={showHelp} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Manager Support</Text>
                        <TouchableOpacity onPress={() => setShowHelp(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.helpSection}>
                        <Text style={styles.helpTitle}>Operations Support</Text>
                        <Text style={styles.helpText}>Email: operations@raahi.com</Text>
                        <Text style={styles.helpText}>Phone: +92 51 1234567 (Ext. 101)</Text>
                        <Text style={styles.helpText}>Available: Mon-Sat, 8AM-6PM</Text>
                    </View>

                    <View style={styles.helpSection}>
                        <Text style={styles.helpTitle}>Manager Resources</Text>
                        <Text style={styles.helpText}>• Driver Management Guide</Text>
                        <Text style={styles.helpText}>• Route Optimization Tools</Text>
                        <Text style={styles.helpText}>• Performance Analytics</Text>
                        <Text style={styles.helpText}>• Team Scheduling</Text>
                    </View>

                    <View style={styles.helpSection}>
                        <Text style={styles.helpTitle}>Emergency Contacts</Text>
                        <Text style={styles.helpText}>Technical Support: +92 300 7654321</Text>
                        <Text style={styles.helpText}>HR Department: +92 51 7654321</Text>
                    </View>

                    <TouchableOpacity style={styles.contactButton}>
                        <Ionicons name="headset" size={20} color="#fff" />
                        <Text style={styles.contactButtonText}>Manager Support Line</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#afd826" barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manager Profile</Text>
                <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => setIsEditing(!isEditing)}
                >
                    <Ionicons 
                        name={isEditing ? "close-outline" : "create-outline"} 
                        size={24} 
                        color="#fff" 
                    />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <TouchableOpacity onPress={isEditing ? pickImage : null}>
                        <Image
                            source={{ uri: isEditing ? editForm.avatar : managerProfile.avatar }}
                            style={styles.avatar}
                        />
                        {isEditing && (
                            <View style={styles.editPhotoBadge}>
                                <Ionicons name="camera" size={16} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    {isEditing ? (
                        <View style={styles.editNameContainer}>
                            <TextInput
                                style={styles.editNameInput}
                                value={editForm.name}
                                onChangeText={(text) => setEditForm({...editForm, name: text})}
                                placeholder="Manager Name"
                            />
                            <TextInput
                                style={styles.editRoleInput}
                                value={editForm.role}
                                onChangeText={(text) => setEditForm({...editForm, role: text})}
                                placeholder="Manager Role"
                            />
                        </View>
                    ) : (
                        <>
                            <Text style={styles.name}>{managerProfile.name}</Text>
                            <Text style={styles.role}>{managerProfile.role}</Text>
                        </>
                    )}
                    
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={20} color="#F39C12" />
                        <Text style={styles.rating}>{managerProfile.rating}</Text>
                        <Text style={styles.ratingText}>Performance</Text>
                    </View>

                    {isEditing && (
                        <TouchableOpacity 
                            style={[styles.saveButton, loading && { opacity: 0.7 }]}
                            onPress={handleSaveProfile}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Ionicons name="checkmark" size={20} color="#fff" />
                            )}
                            <Text style={styles.saveButtonText}>
                                {loading ? "Saving..." : "Save Changes"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Manager Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="bus" size={24} color="#3498DB" />
                        <Text style={styles.statNumber}>{managerProfile.totalVans}</Text>
                        <Text style={styles.statLabel}>Total Vans</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="map" size={24} color="#27AE60" />
                        <Text style={styles.statNumber}>{managerProfile.activeRoutes}</Text>
                        <Text style={styles.statLabel}>Active Routes</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={24} color="#F39C12" />
                        <Text style={styles.statNumber}>{managerProfile.teamSize}</Text>
                        <Text style={styles.statLabel}>Team Size</Text>
                    </View>
                </View>

                {/* Manager Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Manager Information</Text>
                    <View style={styles.infoCard}>
                        {[
                            { icon: "call-outline", label: "Phone", value: "phone", editable: true },
                            { icon: "mail-outline", label: "Email", value: "email", editable: true },
                            { icon: "id-card-outline", label: "Employee ID", value: "employeeId", editable: false },
                            { icon: "business-outline", label: "Department", value: "department", editable: true },
                            { icon: "location-outline", label: "Office Address", value: "address", editable: true },
                            { icon: "calendar-outline", label: "Joined", value: "joinedDate", editable: false },
                            { icon: "time-outline", label: "Experience", value: "experience", editable: true },
                        ].map((item, index) => (
                            <View key={index} style={styles.infoItem}>
                                <Ionicons name={item.icon} size={20} color="#7F8C8D" />
                                <Text style={styles.infoLabel}>{item.label}</Text>
                                {isEditing && item.editable ? (
                                    <TextInput
                                        style={styles.editInfoInput}
                                        value={editForm[item.value]}
                                        onChangeText={(text) => setEditForm({...editForm, [item.value]: text})}
                                        placeholder={`Enter ${item.label.toLowerCase()}`}
                                    />
                                ) : (
                                    <Text style={styles.infoValue}>
                                        {isEditing ? editForm[item.value] : managerProfile[item.value]}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Managed Zones */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Managed Zones</Text>
                    <View style={styles.zonesCard}>
                        <View style={styles.zonesContainer}>
                            {managerProfile.managedZones.map((zone, index) => (
                                <View key={index} style={styles.zoneChip}>
                                    <Ionicons name="location" size={14} color="#afd826" />
                                    <Text style={styles.zoneText}>{zone}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.zonesNote}>
                            {managerProfile.managedZones.length} zones under management
                        </Text>
                    </View>
                </View>

                {/* Manager Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Manager Settings</Text>
                    <View style={styles.actionsCard}>
                        {[
                            { icon: "lock-closed-outline", label: "Change Password", color: "#E74C3C", action: () => setShowChangePassword(true) },
                            { icon: "notifications-outline", label: "Manager Alerts", color: "#3498DB", action: () => setShowNotifications(true) },
                            { icon: "shield-checkmark-outline", label: "Privacy & Security", color: "#27AE60", action: () => setShowPrivacy(true) },
                            { icon: "bar-chart-outline", label: "Performance Reports", color: "#9B59B6", action: () => navigation.navigate("PerformanceReports") },
                            { icon: "people-outline", label: "Team Management", color: "#E67E22", action: () => navigation.navigate("TeamManagement") },
                            { icon: "help-circle-outline", label: "Manager Support", color: "#F39C12", action: () => setShowHelp(true) },
                            { icon: "log-out-outline", label: "Logout", color: "#95a5a6", action: handleLogout },
                        ].map((action, index) => (
                            <TouchableOpacity key={index} style={styles.actionItem} onPress={action.action}>
                                <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                                    <Ionicons name={action.icon} size={20} color={action.color} />
                                </View>
                                <Text style={styles.actionText}>{action.label}</Text>
                                <Ionicons name="chevron-forward" size={18} color="#7F8C8D" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Modals */}
            <ChangePasswordModal />
            <NotificationsModal />
            <PrivacyModal />
            <HelpModal />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        backgroundColor: "#afd826",
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        elevation: 4,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
    },
    editButton: {
        padding: 8,
    },
    scrollContent: {
        flex: 1,
        padding: 16,
    },
    profileHeader: {
        alignItems: "center",
        marginBottom: 24,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
        borderWidth: 3,
        borderColor: "#afd826",
    },
    editPhotoBadge: {
        position: 'absolute',
        bottom: 10,
        right: -5,
        backgroundColor: '#afd826',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: "700",
        color: "#2C3E50",
        marginBottom: 4,
    },
    role: {
        fontSize: 16,
        color: "#7F8C8D",
        marginBottom: 8,
    },
    editNameContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    editNameInput: {
        fontSize: 24,
        fontWeight: "700",
        color: "#2C3E50",
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#afd826',
        marginBottom: 4,
        paddingHorizontal: 8,
    },
    editRoleInput: {
        fontSize: 16,
        color: "#7F8C8D",
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#afd826',
        paddingHorizontal: 8,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF9E7",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    rating: {
        fontSize: 14,
        fontWeight: "700",
        color: "#F39C12",
    },
    ratingText: {
        fontSize: 12,
        color: "#F39C12",
        fontWeight: "500",
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#afd826',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 12,
        gap: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginHorizontal: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#ECF0F1",
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2C3E50",
        marginVertical: 8,
    },
    statLabel: {
        fontSize: 12,
        color: "#7F8C8D",
        fontWeight: "500",
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#2C3E50",
        marginBottom: 16,
    },
    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#ECF0F1",
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F8F9FA",
    },
    infoLabel: {
        fontSize: 14,
        color: "#7F8C8D",
        marginLeft: 12,
        marginRight: 'auto',
        width: 100,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "500",
        color: "#2C3E50",
    },
    editInfoInput: {
        fontSize: 14,
        fontWeight: "500",
        color: "#2C3E50",
        borderBottomWidth: 1,
        borderBottomColor: '#afd826',
        paddingVertical: 4,
        flex: 1,
        textAlign: 'right',
    },
    zonesCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#ECF0F1",
    },
    zonesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    zoneChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f0f9f0",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    zoneText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#27AE60",
    },
    zonesNote: {
        fontSize: 12,
        color: "#7F8C8D",
        fontStyle: "italic",
        textAlign: "center",
    },
    actionsCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#ECF0F1",
    },
    actionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F8F9FA",
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "500",
        color: "#2C3E50",
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2C3E50",
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2C3E50",
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        color: "#7F8C8D",
    },
    settingValue: {
        fontSize: 14,
        color: "#afd826",
        fontWeight: "600",
    },
    helpSection: {
        marginBottom: 20,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#2C3E50",
        marginBottom: 8,
    },
    helpText: {
        fontSize: 14,
        color: "#7F8C8D",
        marginBottom: 4,
    },
    contactButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#afd826",
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 16,
    },
    contactButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
});