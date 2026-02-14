import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import styles from "../styles/DashboardStyles";

export default function DashboardRegisterScreen({ navigation }) {
  const [role, setRole] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleNext = () => {
    // Validate role selection
    if (!role) {
      setErrorMsg("Please select a valid user role.");
      return;
    }
    
    setErrorMsg(""); // Clear any existing error messages

    // ✅ FIXED: Navigate to LOGIN screens, not dashboards
    switch (role) {
      case "Driver":
        console.log("📍 Navigating to DriverLogin");
        navigation.navigate("DriverLogin");
        break;
      case "Transporter":
        console.log("📍 Navigating to TransporterLogin");
        navigation.navigate("TransporterLogin");
        break;
      case "Passenger":
        console.log("📍 Navigating to PassengerLoginScreen");
        // ✅ FIXED: Changed from PassengerLogin to PassengerLoginScreen
        navigation.navigate("PassengerLoginScreen");
        break;
      default:
        // Fallback for unexpected values
        setErrorMsg("Invalid role selected. Please try again.");
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.centerBox}>
        {/* Logo */}
        <Image
          source={{
            uri: "https://cdn.prod.website-files.com/6846c2be8f3d7d1f31b5c7e3/6846e5d971c7bbaa7308cb70_img.webp",
          }}
          style={styles.logo}
          resizeMode="contain"
          onError={() => console.log("Failed to load logo")}
        />

        <Text style={styles.title}>Select Your Role</Text>
        <Text style={styles.subtitle}>Choose your role to continue</Text>

        {/* Role Picker */}
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={role}
            onValueChange={(itemValue) => {
              setRole(itemValue);
              setErrorMsg(""); // Clear error when role is selected
            }}
            testID="role-picker"
          >
            <Picker.Item label="Select Role" value="" />
            <Picker.Item label="🚶 Passenger" value="Passenger" />
            <Picker.Item label="🚗 Driver" value="Driver" />
            <Picker.Item label="🏢 Transporter" value="Transporter" />
          </Picker>
        </View>

        {/* Error Message */}
        {errorMsg ? (
          <Text style={styles.error} testID="error-message">
            {errorMsg}
          </Text>
        ) : null}

        {/* Next Button */}
        <TouchableOpacity 
          style={[
            styles.submitBtn, 
            !role && styles.submitBtnDisabled
          ]} 
          onPress={handleNext}
          disabled={!role}
          testID="next-button"
        >
          <Text style={styles.submitText}>Continue to Login →</Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          {role === "Driver" && "You'll be directed to Driver Login"}
          {role === "Transporter" && "You'll be directed to Transporter Login"}
          {role === "Passenger" && "You'll be directed to Passenger Login"}
          {!role && "Select your role to proceed"}
        </Text>
      </View>
    </View>
  );
}