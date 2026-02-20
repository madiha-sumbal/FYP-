import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import Onboarding from "./frontend/screens/Onboarding";
import WelcomeScreen from "./frontend/screens/WelcomeScreen";
import LoginScreen from "./frontend/screens/LoginScreen";
import DashboardRegisterScreen from "./frontend/screens/DashboardRegisterScreen";
import TransporterRegisterScreen from "./frontend/screens/TransporterRegisterScreen";
import TransporterLoginScreen from "./frontend/screens/TransporterLoginScreen";

// Passenger Screens
import PassengerAppNavigation from "./frontend/Passenger/screens/PassengerAppNavigation";
import PassengerLoginScreen from "./frontend/Passenger/screens/PassengerLoginScreen";
import PassengerRequestScreen from "./frontend/Passenger/screens/PassengerRequestScreen";
import AlertScreen from './frontend/Passenger/screens/AlertScreen';

// Transporter Screens
import TransporterDashboardScreen from "./frontend/Transporter/TransporterDashboard";
import PassengerList from "./frontend/Transporter/PassengerList";
import DriverList from "./frontend/Transporter/DriverList";
import AddDriverScreen from "./frontend/Transporter/AddDriverScreen";
import AddPassengerScreen from "./frontend/Transporter/AddPassengerScreen";
import PaymentsScreen from "./frontend/Transporter/PaymentsScreen";
import VanTrackingScreen from "./frontend/Transporter/VanTrackingScreen";
import AlertsScreen from "./frontend/Transporter/AlertsScreen";
import DriverPerformance from "./frontend/Transporter/DriverPerformance";
import PassengerPerformance from "./frontend/Transporter/PassengerPerformance";
import RouteAssignment from "./frontend/Transporter/RouteAssignment";
import SmartScheduling from "./frontend/Transporter/SmartScheduling";
import CreateDailyPoll from "./frontend/Transporter/CreateDailyPoll";
import AssignRoutesScreen from "./frontend/Transporter/AssignRoutesScreen";
import DriverProfile from "./frontend/Transporter/DriverProfile";
import ProfileScreen from "./frontend/Transporter/ProfileScreen";
import ViewResponces from "./frontend/Transporter/ViewResponces";
import PassengerDataList from "./frontend/Transporter/PassengerDataList";

// Driver Screens
import DriverDashboardScreen from "./frontend/Driver/DriverDashboardScreen";
import DriverAssignedRoutesScreen from "./frontend/Driver/DriverAssignedRoutesScreen";
import DriverPaymentsScreen from "./frontend/Driver/DriverPaymentsScreen";
import DriverTripHistoryScreen from "./frontend/Driver/DriverTripHistoryScreen";
import DriverRegistrationScreen from "./frontend/Driver/DriverRegistrationScreen";
import DriverLoginScreen from "./frontend/Driver/DriverLoginScreen";

// Context
import { AuthProvider } from './frontend/context/AuthContext';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// --- Transporter & Driver Drawers (Same as before) ---
function TransporterDrawer() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false, drawerType: "slide", drawerStyle: { backgroundColor: "#fff", width: 240 } }}>
      <Drawer.Screen name="TransporterDashboard" component={TransporterDashboardScreen} options={{ title: "Dashboard" }} />
      <Drawer.Screen name="TransporterPassengerList" component={PassengerList} options={{ title: "Passenger List" }} />
      <Drawer.Screen name="TransporterDriverList" component={DriverList} options={{ title: "Driver List" }} />
      <Drawer.Screen name="TransporterPayments" component={PaymentsScreen} options={{ title: "Payments" }} />
      <Drawer.Screen name="TransporterAlerts" component={AlertsScreen} options={{ title: "Alerts" }} />
    </Drawer.Navigator>
  );
}

function DriverDrawer() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false, drawerType: "slide", drawerStyle: { backgroundColor: "#fff", width: 240 }, drawerActiveTintColor: "#A1D826", drawerLabelStyle: { fontSize: 15, fontWeight: "600" } }}>
      <Drawer.Screen name="DriverDashboard" component={DriverDashboardScreen} options={{ title: "Dashboard", drawerIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }} />
      <Drawer.Screen name="DriverAssignedRoutes" component={DriverAssignedRoutesScreen} options={{ title: "Assigned Routes", drawerIcon: ({ color }) => <Ionicons name="map-outline" size={22} color={color} /> }} />
      <Drawer.Screen name="DriverPayments" component={DriverPaymentsScreen} options={{ title: "Payments", drawerIcon: ({ color }) => <Ionicons name="card-outline" size={22} color={color} /> }} />
      <Drawer.Screen name="DriverTripHistory" component={DriverTripHistoryScreen} options={{ title: "Trip History", drawerIcon: ({ color }) => <Ionicons name="time-outline" size={22} color={color} /> }} />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    // Check if user has already seen onboarding
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem("hasSeenOnboarding");
        if (value === null) {
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (e) {
        setIsFirstLaunch(false);
      }
    };
    checkOnboarding();
  }, []);

  if (isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#afd826" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={isFirstLaunch ? "Onboarding" : "DashboardRegister"}
          screenOptions={{ headerShown: false, gestureEnabled: true }}
        >
          {/* Onboarding & Registration */}
          <Stack.Screen name="Onboarding" component={Onboarding} />
          <Stack.Screen name="DashboardRegister" component={DashboardRegisterScreen} />
          
          {/* Keep all other screens same */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="DriverRegister" component={DriverRegistrationScreen} />
          <Stack.Screen name="TransporterRegister" component={TransporterRegisterScreen} />
          <Stack.Screen name="TransporterLogin" component={TransporterLoginScreen} />
          <Stack.Screen name="PassengerRequestScreen" component={PassengerRequestScreen} />
          <Stack.Screen name="PassengerLoginScreen" component={PassengerLoginScreen} />
          <Stack.Screen name="PassengerAppNavigation" component={PassengerAppNavigation} />
          <Stack.Screen name="AlertScreen" component={AlertScreen} />
          <Stack.Screen name="Transporter" component={TransporterDrawer} />
          <Stack.Screen name="TransporterDashboard" component={TransporterDashboardScreen} />
          <Stack.Screen name="PassengerList" component={PassengerList} />
          <Stack.Screen name="DriverList" component={DriverList} />
          <Stack.Screen name="AddDriver" component={AddDriverScreen} />
          <Stack.Screen name="AddPassenger" component={AddPassengerScreen} />
          <Stack.Screen name="Payments" component={PaymentsScreen} />
          <Stack.Screen name="VanTracking" component={VanTrackingScreen} />
          <Stack.Screen name="Alerts" component={AlertsScreen} />
          <Stack.Screen name="DriverPerformance" component={DriverPerformance} />
          <Stack.Screen name="PassengerPerformance" component={PassengerPerformance} />
          <Stack.Screen name="CreateRoute" component={RouteAssignment} />
          <Stack.Screen name="SmartScheduling" component={SmartScheduling} />
          <Stack.Screen name="CreatePoll" component={CreateDailyPoll} />
          <Stack.Screen name="AssignRoute" component={AssignRoutesScreen} />
          <Stack.Screen name="DriverProfile" component={DriverProfile} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="ViewResponse" component={ViewResponces} />
          <Stack.Screen name="PassengerDataList" component={PassengerDataList} />
          <Stack.Screen name="DriverLogin" component={DriverLoginScreen} />
          <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
          <Stack.Screen name="DriverDashboard" component={DriverDashboardScreen} />
          <Stack.Screen name="DriverAssignedRoutes" component={DriverAssignedRoutesScreen} />
          <Stack.Screen name="DriverPayments" component={DriverPaymentsScreen} />
          <Stack.Screen name="DriverTripHistory" component={DriverTripHistoryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}