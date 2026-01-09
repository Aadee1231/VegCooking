import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../src/ui/theme';

const { width: screenWidth } = Dimensions.get('window');

interface SupportButtonProps {
  onPress: () => void;
  style?: any;
}

export function SupportButton({ onPress, style }: SupportButtonProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));
  const [sparkleAnim] = useState(new Animated.Value(0));
  const [isPressed, setIsPressed] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Continuous pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Glow animation
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Sparkle animation on press
    Animated.sequence([
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sparkleAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    setClickCount(prev => prev + 1);
    
    // Easter egg: special effects after 5 clicks
    if (clickCount >= 4) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onPress();
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 215, 0, 0)', 'rgba(255, 215, 0, 0.6)'],
  });

  const sparkleScale = sparkleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.5, 0.8],
  });

  const sparkleRotation = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, style]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: glowColor,
          },
        ]}
      />

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [
              { scale: pulseAnim },
              { scale: isPressed ? 0.95 : 1 },
            ],
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          style={styles.pressable}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: false }}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53', '#FFA726', '#FFD54F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Sparkle effects */}
            {clickCount >= 5 && (
              <>
                <Animated.View
                  style={[
                    styles.sparkle,
                    {
                      transform: [
                        { scale: sparkleScale },
                        { rotate: sparkleRotation },
                      ],
                      top: 5,
                      left: 5,
                    },
                  ]}
                >
                  <Ionicons name="star" size={12} color="#FFD700" />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.sparkle,
                    {
                      transform: [
                        { scale: sparkleScale },
                        { rotate: sparkleRotation },
                      ],
                      top: 5,
                      right: 5,
                    },
                  ]}
                >
                  <Ionicons name="star" size={12} color="#FFD700" />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.sparkle,
                    {
                      transform: [
                        { scale: sparkleScale },
                        { rotate: sparkleRotation },
                      ],
                      bottom: 5,
                      left: 5,
                    },
                  ]}
                >
                  <Ionicons name="star" size={12} color="#FFD700" />
                </Animated.View>
              </>
            )}

            <View style={styles.content}>
              <Ionicons 
                name="heart" 
                size={18} 
                color="#FFFFFF" 
                style={styles.icon}
              />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Floating particles removed - they looked bad */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    zIndex: -1,
  },
  buttonContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pressable: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  gradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sparkle: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particles: {
    position: 'absolute',
    top: -10,
    flexDirection: 'row',
  },
  particle: {
    position: 'absolute',
    opacity: 0.6,
  },
});
