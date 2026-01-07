import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

const BRAND = "#2E7D32";
const BRAND_DARK = "#1B5E20";
const BG = "#F6F7F8";
const CARD = "#FFFFFF";
const TEXT = "#101828";
const SUBTEXT = "#667085";
const BORDER = "#E5E7EB";

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const sections = [
    {
      title: "Welcome to Flavur",
      subtitle: "The Future of Cooking",
      icon: "restaurant-outline",
      content: [
        "",
        "Flavur is a modern cooking and meal-planning app built to match how people actually cook today. From discovering recipes on social media to planning meals and generating grocery lists automatically, Flavur brings everything together in one clean, easy-to-use space.",
        "Whether you're cooking every day or just trying to stay organized, Flavur helps you spend less time managing food and more time enjoying it."
      ],
      color: "#2E7D32"
    },
    {
      title: "Getting Started",
      subtitle: "Create Your Account",
      icon: "person-add-outline",
      content: [
        "",
        "Sign up using your email or username to create your Flavur profile. Once you're logged in, you'll have access to your personal recipe library, meal planner, grocery list, and feed—all synced automatically."
      ],
      color: "#1976D2"
    },
    {
      title: "🍽 Creating & Managing Recipes",
      subtitle: "Build Recipes Your Way",
      icon: "create-outline",
      content: [
        "",
        "Flavur gives you full control over how your recipes are created and saved.",
        "You can:",
        "• Add a title, caption, and full description",
        "• Include ingredients with quantities and units",
        "• Write clear step-by-step instructions",
        "• Add prep time, cook time, servings, and difficulty",
        "• Upload or link a cover image",
        "• Tag recipes for easier searching and organization",
        "",
        "Recipes can be kept private or shared publicly for others to discover.",
        "",
        "Edit Anytime",
        "Recipes aren't locked in. You can update ingredients, steps, images, or visibility whenever you want—everything saves instantly."
      ],
      color: "#7B1FA2"
    },
    {
      title: "📲 Magic Import",
      subtitle: "From Social Media to Recipe",
      icon: "download-outline",
      content: [
        "",
        "Flavur is built for how people actually find recipes now—on TikTok, Instagram, YouTube, and the web.",
        "",
        "With Magic Import, you can:",
        "• Paste a video or post link",
        "• Upload a video or image",
        "• Let Flavur extract ingredients and steps automatically",
        "• Review and edit before saving",
        "",
        "No more screenshots or messy notes. Flavur turns content into clean, usable recipes you can actually cook from."
      ],
      color: "#F57C00"
    },
    {
      title: "📰 The Feed",
      subtitle: "Discover What Others Are Cooking",
      icon: "compass-outline",
      content: [
        "",
        "The Feed is where recipes come to life.",
        "",
        "Here you can:",
        "• Browse recipes shared by the community",
        "• See new and trending dishes",
        "• Discover creators and cooking styles you like",
        "• Save recipes directly to your library",
        "",
        "Each recipe in the Feed includes clear details, images, and creator information, making it easy to explore without feeling overwhelmed.",
        "",
        "Interact & Save",
        "If you find something you like, you can save it instantly and come back to it later. The Feed is designed to be simple, fast, and inspiring—without clutter or distractions."
      ],
      color: "#C2185B"
    },
    {
      title: "🗓 Meal Planning",
      subtitle: "Plan Your Week with Ease",
      icon: "calendar-outline",
      content: [
        "",
        "Flavur's Meal Planner lets you assign recipes to specific days so you always know what's coming up.",
        "",
        "• Add recipes to any day of the week",
        "• Reuse favorites or mix in new dishes",
        "• Swap or remove meals at any time",
        "",
        "Your meal plan stays flexible and easy to update."
      ],
      color: "#00796B"
    },
    {
      title: "🛒 Smart Grocery List",
      subtitle: "Automatically Generated",
      icon: "cart-outline",
      content: [
        "",
        "Your grocery list updates based on your meal plan:",
        "• Ingredients are grouped and combined",
        "• Duplicate items are merged",
        "• Each item knows which recipe it came from",
        "",
        "This keeps your list clean and accurate.",
        "",
        "Manual Additions",
        "Need something extra? Add custom items anytime. These stay on your list and won't be affected when your meal plan changes.",
        "",
        "Always in Sync",
        "When you update your meal plan:",
        "• Added recipes add ingredients",
        "• Removed recipes remove ingredients",
        "• Custom items stay untouched",
        "",
        "Everything stays up to date automatically."
      ],
      color: "#388E3C"
    },
    {
      title: "🔍 Search & Organization",
      subtitle: "Find What You Need Fast",
      icon: "search-outline",
      content: [
        "",
        "Ingredient Search",
        "Adding ingredients is fast and clean, with a searchable dropdown designed to stay readable and easy to use.",
        "",
        "Tags & Filters",
        "Filter and organize recipes by:",
        "• Tags",
        "• Difficulty",
        "• Prep time",
        "• Creator",
        "",
        "Finding what you need takes seconds."
      ],
      color: "#0288D1"
    },
    {
      title: "👤 Your Profile & Library",
      subtitle: "Your Personal Cooking Hub",
      icon: "person-outline",
      content: [
        "",
        "Your profile is your personal cooking hub.",
        "",
        "It includes:",
        "• Recipes you've created",
        "• Recipes you've saved",
        "• Public recipes you've shared",
        "• Your profile picture and bio",
        "",
        "Everything you care about lives in one place."
      ],
      color: "#5E35B1"
    },
    {
      title: "🔐 Privacy & Control",
      subtitle: "You're Always in Control",
      icon: "shield-checkmark-outline",
      content: [
        "",
        "• Choose which recipes are public or private",
        "• Change visibility at any time",
        "• Your data stays secure and synced across devices",
        "",
        "You're always in control."
      ],
      color: "#D32F2F"
    },
    {
      title: "Built for Real Life",
      subtitle: "Fast, Clean, and Useful",
      icon: "flash-outline",
      content: [
        "",
        "Flavur is designed to be:",
        "• Fast and responsive",
        "• Clean and easy to navigate",
        "• Useful on both mobile and web",
        "",
        "No clutter. No unnecessary steps. Just tools that actually help."
      ],
      color: "#F57C00"
    },
    {
      title: "Why Flavur?",
      subtitle: "More Than Just Recipes",
      icon: "star-outline",
      content: [
        "",
        "Flavur isn't just a place to store recipes, it's a system for discovering, organizing, and cooking food in a way that fits modern life.",
        "",
        "From social media imports to smart grocery lists, Flavur helps cooking feel less stressful and more enjoyable."
      ],
      color: "#2E7D32"
    }
  ];

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const renderSection = (section: typeof sections[0], index: number) => (
    <View key={index} style={styles.sectionContainer}>
      <LinearGradient
        colors={[section.color, `${section.color}DD`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sectionHeader}
      >
        <View style={styles.sectionHeaderContent}>
          <Ionicons name={section.icon as any} size={32} color="white" />
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
          </View>
        </View>
      </LinearGradient>
      
      <View style={styles.sectionContent}>
        {section.content.map((paragraph, pIndex) => (
          <Text key={pIndex} style={styles.sectionText}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[BRAND, BRAND_DARK]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>How-To Guide</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => renderSection(section, index))}
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Happy Cooking! 🥗</Text>
          <Text style={styles.footerSubtext}>The Flavur Team</Text>
        </View>
      </ScrollView>

      {/* Scroll to Top Button */}
      <Pressable
        onPress={scrollToTop}
        style={styles.scrollToTopButton}
      >
        <Ionicons name="chevron-up" size={24} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionHeader: {
    padding: 20,
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  sectionContent: {
    padding: 20,
    paddingTop: 0,
  },
  sectionText: {
    fontSize: 15,
    color: TEXT,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
    marginTop: 20,
  },
  footerText: {
    fontSize: 24,
    fontWeight: "900",
    color: BRAND,
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 16,
    color: SUBTEXT,
    fontWeight: "600",
  },
  scrollToTopButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
