import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import styles from "../../styles/SettingScreenStyle";

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    notifications: true,
    location: true,
    biometric: false,
    autoUpdate: true,
    darkMode: false,
    wifiOnly: true,
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const settingItems = [
    {
      id: 1,
      icon: "notifications-outline",
      title: "Push Notifications",
      subtitle: "Receive ride updates and alerts",
      type: "switch",
      key: "notifications",
      color: "#A1D826"
    },
    {
      id: 2,
      icon: "location-outline",
      title: "Location Services",
      subtitle: "Share location for better ride matching",
      type: "switch",
      key: "location",
      color: "#FF6B6B"
    },
    {
      id: 3,
      icon: "finger-print-outline",
      title: "Biometric Login",
      subtitle: "Use fingerprint or face ID for login",
      type: "switch",
      key: "biometric",
      color: "#4ECDC4"
    },
    {
      id: 4,
      icon: "refresh-circle-outline",
      title: "Auto Update",
      subtitle: "Automatically update app when available",
      type: "switch",
      key: "autoUpdate",
      color: "#45B7D1"
    },
    {
      id: 5,
      icon: "moon-outline",
      title: "Dark Mode",
      subtitle: "Switch to dark theme",
      type: "switch",
      key: "darkMode",
      color: "#AC92EC"
    },
    {
      id: 6,
      icon: "wifi-outline",
      title: "Wi-Fi Only Downloads",
      subtitle: "Download updates only on Wi-Fi",
      type: "switch",
      key: "wifiOnly",
      color: "#A0D468"
    },
  ];

  const actionItems = [
    {
      id: 1,
      icon: "shield-checkmark-outline",
      title: "Privacy Policy",
      subtitle: "How we protect your data",
      action: () => Alert.alert("Privacy Policy", "Privacy policy screen would open here"),
      color: "#4FC1E9"
    },
    {
      id: 2,
      icon: "document-text-outline",
      title: "Terms of Service",
      subtitle: "User agreement and policies",
      action: () => navigation.navigate('TermsConditions'),
      color: "#FFCE54"
    },
    {
      id: 3,
      icon: "trash-outline",
      title: "Clear Cache",
      subtitle: "Free up storage space",
      action: () => handleClearCache(),
      color: "#ED5565"
    },
    {
      id: 4,
      icon: "download-outline",
      title: "Data Usage",
      subtitle: "Manage your data consumption",
      action: () => Alert.alert("Data Usage", "Data usage screen would open here"),
      color: "#48CFAD"
    },
  ];

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will remove all temporary files and free up storage. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Cache cleared successfully!");
          }
        }
      ]
    );
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
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'PassengerLogin' }],
          })
        }
      ]
    );
  };

  const renderSettingItem = (item) => (
    <View key={item.id} style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
          <Icon name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      
      {item.type === "switch" ? (
        <Switch
          value={settings[item.key]}
          onValueChange={() => toggleSetting(item.key)}
          trackColor={{ false: "#f0f0f0", true: "#A1D826" }}
          thumbColor={settings[item.key] ? "#fff" : "#f4f3f4"}
        />
      ) : (
        <TouchableOpacity onPress={item.action}>
          <Icon name="chevron-forward" size={22} color="#ccc" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActionItem = (item) => (
    <TouchableOpacity key={item.id} style={styles.actionItem} onPress={item.action}>
      <View style={styles.actionLeft}>
        <View style={[styles.actionIcon, { backgroundColor: `${item.color}20` }]}>
          <Icon name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{item.title}</Text>
          <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={22} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollContainer}>
        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP SETTINGS</Text>
          <View style={styles.sectionCard}>
            {settingItems.map(renderSettingItem)}
          </View>
        </View>

        {/* Privacy & Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY & DATA</Text>
          <View style={styles.sectionCard}>
            {actionItems.map(renderActionItem)}
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP INFORMATION</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.2.4</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build Number</Text>
              <Text style={styles.infoValue}>2024.12.1</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>Dec 1, 2024</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LinearGradient
            colors={['#FF6B6B', '#EE5A52']}
            style={styles.logoutButtonGradient}
          >
            <Icon name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Van Pooling © 2024. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}