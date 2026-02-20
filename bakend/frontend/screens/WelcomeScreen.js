// frontend/screens/WelcomeScreen.js
import React, { useEffect } from "react";
import { View, Text, Image } from "react-native";
import styles from "../styles/OnboardingStyles";

export default function WelcomeScreen({ navigation }) {
  // ⏳ Timer for 5 seconds, then go to Onboarding
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Onboarding"); // replace so user can't go back
    }, 5000);

    return () => clearTimeout(timer); // cleanup timer on unmount
  }, [navigation]);

  return (
    <View style={styles.welcomeContainer}>
      {/* Logo */}
      <Image
        source={require("./Raahi_Logo.png")}
        style={styles.welcomeLogo}
        resizeMode="contain"
      />

      {/* Title */}
      <Text style={styles.welcomeTitle}>Welcome to Raahi</Text>
    </View>
  );
}
