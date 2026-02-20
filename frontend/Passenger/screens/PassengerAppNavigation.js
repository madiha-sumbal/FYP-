import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, StatusBar } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import PassengerDashboard from './PassengerDashboard';
import NotificationsScreen from './NotificationsScreen';
import RideHistoryScreen from './RideHistoryScreen';
import PassengerPaymentScreen from './PassengerPaymentScreen';
import ProfileScreen from './ProfileScreen';
import SettingScreen from './SettingScreen';
import HelpSupportScreen from './HelpSupportScreen';
import AlertScreen from './AlertScreen';
import ContactSupportScreen from './ContactSupportScreen';
import TermsConditionsScreen from './TermsConditionsScreen';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// API Configuration
const API_BASE_URL = "http://192.168.10.14:3000/api";

// Dashboard Stack
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={PassengerDashboard} />
      <Stack.Screen name="AlertScreen" component={AlertScreen} />
    </Stack.Navigator>
  );
}

// Custom Drawer Content Component
function CustomDrawerContent({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedRole = await AsyncStorage.getItem('userRole');
      
      console.log('📦 Loading stored data...');
      console.log('🎭 Stored role:', storedRole);

      if (storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        console.log('✅ User data loaded:', parsedData.fullName || parsedData.name);
        setUserData(parsedData);
      } else {
        console.log('⚠️ No stored user data found');
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const menuItems = [
    { icon: "grid-outline", name: "Dashboard", screen: "Dashboard" },
    { icon: "notifications-outline", name: "Notifications", screen: "Notifications" },
    { icon: "time-outline", name: "Ride History", screen: "RideHistory" },
    { icon: "card-outline", name: "Payments", screen: "Payments" },
    { icon: "person-outline", name: "Profile", screen: "Profile" },
    { icon: "settings-outline", name: "Settings", screen: "Settings" },
    { icon: "help-circle-outline", name: "Help & Support", screen: "HelpSupport" },
  ];

  const supportItems = [
    { icon: "headset-outline", name: "Contact Support", screen: "ContactSupport" },
    { icon: "document-text-outline", name: "Terms & Conditions", screen: "TermsConditions" },
  ];

  const handleMenuNavigation = (screen) => {
    console.log("Navigating to:", screen);
    navigation.navigate(screen);
    navigation.closeDrawer();
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
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              await AsyncStorage.removeItem('userRole');
              
              console.log("✅ Logged out successfully");
              
              // Reset navigation to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'PassengerLogin' }],
              });
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to logout properly');
            }
          }
        }
      ]
    );
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (userData?.fullName) {
      return userData.fullName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userData?.name) {
      return userData.name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'PK';
  };

  // Helper function to get display name
  const getDisplayName = () => {
    if (userData?.fullName) {
      return userData.fullName;
    }
    if (userData?.name) {
      return userData.name;
    }
    return 'Passenger User';
  };

  // Helper function to get email
  const getEmail = () => {
    if (userData?.email) {
      return userData.email;
    }
    return 'user@email.com';
  };

  // Helper function to get member status
  const getMemberStatus = () => {
    if (userData?.status === 'approved') {
      return 'Approved Member';
    }
    if (userData?.isVerified) {
      return 'Verified Member';
    }
    return 'Member';
  };

  return (
    <View style={styles.drawerContainer}>
      <StatusBar backgroundColor="#8BC220" barStyle="light-content" />
      
      {/* Drawer Header */}
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.drawerHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {getUserInitials()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {loading ? 'Loading...' : getDisplayName()}
              </Text>
              <Text style={styles.userEmail}>
                {getEmail()}
              </Text>
              <View style={styles.memberBadge}>
                <Icon name="star" size={12} color="#FFD700" />
                <Text style={styles.memberText}>
                  {getMemberStatus()}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.closeDrawer()}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Menu Items */}
      <ScrollView 
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>MAIN MENU</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.menuItem}
              onPress={() => handleMenuNavigation(item.screen)} 
            >
              <View style={styles.menuIconContainer}>
                <Icon name={item.icon} size={22} color="#A1D826" />
              </View>
              <Text style={styles.menuText}>{item.name}</Text>
              <Icon name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          {supportItems.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.menuItem}
              onPress={() => handleMenuNavigation(item.screen)} 
            >
              <View style={styles.menuIconContainer}>
                <Icon name={item.icon} size={22} color="#A1D826" />
              </View>
              <Text style={styles.menuText}>{item.name}</Text>
              <Icon name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <View style={styles.logoutIconContainer}>
            <Icon name="log-out-outline" size={22} color="#FF6B6B" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

// Main Passenger Drawer Navigator
function PassengerAppNavigation() {
  return (
    <Drawer.Navigator 
      initialRouteName="Dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: 'transparent',
          width: 320,
        },
        swipeEnabled: true,
        drawerType: 'front',
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardStack}
      />
      <Drawer.Screen 
        name="Notifications" 
        component={NotificationsScreen}
      />
      <Drawer.Screen 
        name="RideHistory" 
        component={RideHistoryScreen}
      />
      <Drawer.Screen 
        name="Payments" 
        component={PassengerPaymentScreen}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingScreen}
      />
      <Drawer.Screen 
        name="HelpSupport" 
        component={HelpSupportScreen}
      />
      <Drawer.Screen 
        name="ContactSupport" 
        component={ContactSupportScreen}
      />
      <Drawer.Screen 
        name="TermsConditions" 
        component={TermsConditionsScreen}
      />
    </Drawer.Navigator>
  );
}

// Enhanced Styles
const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerHeader: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  userInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 6,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  memberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    marginBottom: 12,
    marginLeft: 25,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 25,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(161, 216, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    padding: 25,
    paddingBottom: 35,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});

export default PassengerAppNavigation;