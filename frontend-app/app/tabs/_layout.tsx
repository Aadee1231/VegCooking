import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { Image } from "react-native";
import { theme } from "../../src/ui/theme";


export default function TabsLayout() {
  return (
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
          const s = size ?? 22;

          if (route.name === "flavurai") {
            return (
              <Image
                source={require("../../assets/FlavurNavIcon.png")}
                style={{
                  width: 26,
                  height: 26,
                  backgroundColor: "transparent",
                }}
                resizeMode="contain"
              />
            );
          }

          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            feed: focused ? "compass" : "compass-outline",
            create: focused ? "add-circle" : "add-circle-outline",
            mealplan: focused ? "calendar" : "calendar-outline",
            me: focused ? "person" : "person-outline",
          };

          const name = map[route.name] ?? "ellipse-outline";
          return <Ionicons name={name} size={s} color={color} />;
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
  );
}
