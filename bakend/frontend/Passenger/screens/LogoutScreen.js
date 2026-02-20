import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function Logout({ navigation }) {
  const handleLogout = () => {
    // Clear any stored user data if needed

    // Reset navigation and go to login
    navigation.reset({
      index: 0,
      routes: [{ name: "PassengerLoginScreen" }],
    });
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Are you sure you want to log out?
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: "#FFD60A",
          padding: 10,
          borderRadius: 8,
        }}
        onPress={handleLogout}
      >
        <Text style={{ color: "#000", fontWeight: "bold" }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
