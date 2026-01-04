import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function Index() {
  // ✅ Hooks always run, every render, in the same order
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;

    // Wrap async in a function (don’t make the effect callback async)
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setSignedIn(!!data.session);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ✅ Only render logic AFTER hooks
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return signedIn ? <Redirect href="/tabs/feed" /> : <Redirect href="/auth" />;
}
