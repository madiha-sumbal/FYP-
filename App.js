import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import React from 'react';

// Screens
import Onboarding from "./frontend/screens/Onboarding";
import WelcomeScreen from "./frontend/screens/WelcomeScreen";
import LoginScreen from "./frontend/screens/LoginScreen";
import DashboardRegisterScreen from "./frontend/screens/DashboardRegisterScreen";
import DriverRegisterScreen from "./frontend/screens/DriverRegisterScreen";
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

// Transporter Drawer
function TransporterDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerStyle: { backgroundColor: "#fff", width: 240 },
      }}
    >
      <Drawer.Screen name="Dashboard" component={TransporterDashboardScreen} />
      <Drawer.Screen name="Passenger List" component={PassengerList} />
      <Drawer.Screen name="Driver List" component={DriverList} />
      <Drawer.Screen name="Payments" component={PaymentsScreen} />
      <Drawer.Screen name="Alerts" component={AlertsScreen} />
    </Drawer.Navigator>
  );
}

// Driver Drawer
function DriverDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerStyle: { backgroundColor: "#fff", width: 240 },
        drawerActiveTintColor: "#FF6F00",
        drawerLabelStyle: { fontSize: 15, fontWeight: "600" },
      }}
    >
      <Drawer.Screen
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Drawer.Screen
        name="DriverAssignedRoutes"
        component={DriverAssignedRoutesScreen}
        options={{ title: "Assigned Routes" }}
      />
      <Drawer.Screen
        name="DriverPayments"
        component={DriverPaymentsScreen}
        options={{ title: "Payments" }}
      />
      <Drawer.Screen
        name="DriverTripHistory"
        component={DriverTripHistoryScreen}
        options={{ title: "Trip History" }}
      />
      <Drawer.Screen
        name="DriverRegistration"
        component={DriverRegistrationScreen}
        options={{ title: "Registration" }}
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Onboarding"
          screenOptions={{ headerShown: false }}
        >
          {/* 🌟 Onboarding + Role Selection */}
          <Stack.Screen name="Onboarding" component={Onboarding} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="DashboardRegister" component={DashboardRegisterScreen} />
          <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} />
          <Stack.Screen name="TransporterRegister" component={TransporterRegisterScreen} />
          <Stack.Screen name="TransporterLogin" component={TransporterLoginScreen} />

          {/* 🌟 Passenger Flow */}
          <Stack.Screen name="PassengerRequestScreen" component={PassengerRequestScreen} />
          <Stack.Screen name="PassengerLoginScreen" component={PassengerLoginScreen} />
          <Stack.Screen name="PassengerAppNavigation" component={PassengerAppNavigation} />
          <Stack.Screen name="AlertScreen" component={AlertScreen} />
          {/* 🌟 Transporter Flow */}
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
          <Stack.Screen name="PassengerProfile" component={DriverProfile} />
          <Stack.Screen name="DriverProfile" component={DriverProfile} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="ViewResponse" component={ViewResponces} />
          <Stack.Screen name="PassengerDataList" component={PassengerDataList} />

          {/* 🌟 Driver Flow */}
          <Stack.Screen name="DriverLogin" component={DriverLoginScreen} />
          <Stack.Screen name="Driver" component={DriverDrawer} />
          <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
