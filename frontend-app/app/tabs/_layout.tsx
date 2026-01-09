import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { Image, View, StyleSheet } from "react-native";
import { theme } from "../../src/ui/theme";

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: theme.colors.green,
          tabBarInactiveTintColor: "#8A93A3",
          tabBarStyle: {
            height: 64,
            paddingTop: 8,
            paddingBottom: 10,
            borderTopColor: "transparent",
            backgroundColor: "rgba(11, 15, 20, 0.95)",
            backdropFilter: "blur(20px)",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarIcon: ({ color, size, focused }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'feed') {
              iconName = focused ? 'compass' : 'compass-outline';
            } else if (route.name === 'create') {
              iconName = focused ? 'add-circle' : 'add-circle-outline';
            } else if (route.name === 'mealplan') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'me') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'flavurai') {
              return (
                <Image
                  source={require("../../assets/FlavurLogo2.png")}
                  style={{
                    width: 26,
                    height: 26,
                  }}
                  resizeMode="contain"
                />
              );
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tabs.Screen
          name="feed"
          options={{
            title: "Feed",
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.replace(`/tabs/feed?ts=${Date.now()}`);
            },
          }}
        />
        <Tabs.Screen
          name="create"
          options={{ title: "Create" }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.replace(`/tabs/create?ts=${Date.now()}`);
            },
          }}
        />
        <Tabs.Screen
          name="flavurai"
          options={{
            title: "FlavurAI",
            tabBarLabelStyle: { fontWeight: "900" },
          }}
        />
        <Tabs.Screen name="mealplan" options={{ title: "Plan" }} />
        <Tabs.Screen name="me" options={{ title: "Me" }} />

        <Tabs.Screen
          name="grocery"
          options={{
            href: null,
            title: "Grocery",
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
