import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import styles from "../styles/OnboardingStyles";

const slides = [
  {
    id: 1,
    title: "Carpooling Reinvented",
    subtitle:
      "Welcome to Raahi! We connect drivers and passengers for economical and friendly journeys.",
    image:
      "https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcRq4KRd5ejqsp0TzN6ICmojGUlBlJIH53z6sz_Da5Mpa4nrwNXi",
  },
  {
    id: 2,
    title: "Find or Publish a Trip",
    subtitle:
      "Search routes by entering your departure, destination, and date or publish your own route so others can join.",
    image:
      "https://assets.isu.pub/document-structure/240501104036-20d008535a46339c2bd73f69e9affcc8/v1/9032b539ca5af15bf8591e0f03f688fe.jpeg",
  },
  {
    id: 3,
    title: "Book with Ease",
    subtitle:
      "Once you’ve found your route, finalize your ride details and enjoy secure payment and low fares.",
    image:
      "https://cdn.prod.website-files.com/66a7a451e7a3d53c26040949/66a7cef9b350f8c3d9b2b6f3_illustration-2%402x.png",
  },
];

export default function Onboarding({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // ✅ Last slide → DashboardRegister screen
      navigation.replace("DashboardRegister");
    }
  };

  const handleSkip = () => {
    navigation.replace("DashboardRegister");
  };

  const { title, subtitle, image } = slides[currentIndex];

  return (
    <View style={styles.container}>
      {/* Skip Button - Top Right */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButtonTop} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Image */}
      <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Next / Get Started Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>
          {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
        </Text>
      </TouchableOpacity>

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { opacity: index === currentIndex ? 1 : 0.3 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}
