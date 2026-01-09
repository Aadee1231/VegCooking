import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../src/ui/theme';
import { inAppPurchaseService } from '../src/services/in-app-purchases';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DonationTier {
  id: string;
  name: string;
  price: string;
  priceNumber: number;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: readonly [string, string];
  benefits: string[];
  popular?: boolean;
}

const donationTiers: DonationTier[] = [
  {
    id: 'coffee',
    name: 'Coffee',
    price: '$0.99',
    priceNumber: 0.99,
    description: 'Buy me a coffee!',
    icon: 'cafe',
    color: ['#8B4513', '#D2691E'] as const,
    benefits: ['☕ One coffee', '🙏 Thank you note', '✨ Good vibes'],
  },
  {
    id: 'lunch',
    name: 'Lunch',
    price: '$4.99',
    priceNumber: 4.99,
    description: 'Fuel my creativity!',
    icon: 'restaurant',
    color: ['#FF6B6B', '#FF8E53'] as const,
    benefits: ['🍔 One lunch', '📧 Thank you email', '🌟 Supporter recognition'],
  },
  {
    id: 'dinner',
    name: 'Dinner',
    price: '$9.99',
    priceNumber: 9.99,
    description: 'Keep me going!',
    icon: 'pizza',
    color: ['#9C27B0', '#E91E63'] as const,
    benefits: ['🍕 One dinner', '📧 Thank you email', '� Supporter recognition'],
    popular: true,
  },
  {
    id: 'groceries',
    name: 'Groceries',
    price: '$19.99',
    priceNumber: 19.99,
    description: 'Stock the kitchen!',
    icon: 'cart',
    color: ['#2196F3', '#00BCD4'] as const,
    benefits: ['🛒 Weekly groceries', '� Thank you email', '💎 Supporter recognition'],
  },
  {
    id: 'feast',
    name: 'Feast',
    price: '$49.99',
    priceNumber: 49.99,
    description: 'Ultimate support!',
    icon: 'trophy',
    color: ['#FFD700', '#FFA500'] as const,
    benefits: ['🎉 Monthly feast', '� Thank you email', '� Supporter recognition', '📱 Personal thank you'],
  },
];

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTier: (tier: DonationTier) => void;
  loading?: boolean;
}

export function DonationModal({ visible, onClose, onSelectTier, loading }: DonationModalProps) {
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Check if we're in development mode (Expo Go)
    setIsDevelopmentMode(!inAppPurchaseService.isPurchasesAvailable());
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setSelectedTier(null);
  };

  const handleTierSelect = (tier: DonationTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTier(tier.id);
    
    // Easter egg: trigger confetti for highest tier
    if (tier.id === 'feast') {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2000);
    }
    
    setTimeout(() => {
      onSelectTier(tier);
    }, 200);
  };

  const renderTier = (tier: DonationTier, index: number) => {
    const isSelected = selectedTier === tier.id;
    const scaleAnim = new Animated.Value(1);
    
    const handlePressIn = () => {
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }).start();
    };
    
    const handlePressOut = () => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        key={tier.id}
        style={[
          styles.tierContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => handleTierSelect(tier)}
          style={[
          styles.tierPressable,
          isSelected && styles.selectedTier,
          tier.popular && styles.popularTier,
        ]}
        >
          {/* Popular badge */}
          {tier.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
          )}

          <LinearGradient
            colors={tier.color}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tierGradient}
          >
            <View style={styles.tierContent}>
              <View style={styles.tierHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name={tier.icon} size={28} color="#FFFFFF" />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierPrice}>{tier.price}</Text>
                </View>
              </View>
              
              <Text style={styles.tierDescription}>{tier.description}</Text>
              
              <View style={styles.benefitsContainer}>
                {tier.benefits.map((benefit, i) => (
                  <Text key={i} style={styles.benefit}>• {benefit}</Text>
                ))}
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>

      {/* Confetti effect for feast tier */}
      {confetti && (
        <View style={styles.confettiContainer}>
          {[...Array(20)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.confettiPiece,
                {
                  left: Math.random() * screenWidth,
                  backgroundColor: ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#32CD32'][Math.floor(Math.random() * 5)],
                  transform: [
                    {
                      translateY: new Animated.Value(-50).interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, screenHeight + 50],
                      }),
                    },
                    {
                      rotate: new Animated.Value(0).interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '720deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Modal content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <View style={styles.headerContent}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53', '#FFA726']}
              style={styles.headerGradient}
            >
              <Ionicons name="heart" size={24} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Support Development</Text>
              <Text style={styles.headerSubtitle}>Your support means the world! 🌍</Text>
              
              {isDevelopmentMode && (
                <View style={styles.devModeBadge}>
                  <Ionicons name="flask" size={12} color="#FFF" />
                  <Text style={styles.devModeText}>Demo Mode</Text>
                </View>
              )}
            </LinearGradient>
          </View>
          
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#666" />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.tiersContainer}>
            {donationTiers.map((tier, index) => renderTier(tier, index))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              💝 All donations help me keep building amazing features for you!
            </Text>
            <Text style={styles.secureText}>
              🔒 Secure payments via App Store & Google Play
            </Text>
            
            {isDevelopmentMode && (
              <View style={styles.devModeFooter}>
                <Ionicons name="information-circle" size={14} color="#FF6B6B" />
                <Text style={styles.devModeFooterText}>
                  Demo Mode: Purchases are simulated for testing
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.85,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    position: 'relative',
  },
  headerContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  devModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  devModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  tiersContainer: {
    gap: 16,
  },
  tierContainer: {
    marginBottom: 4,
  },
  tierPressable: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  selectedTier: {
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  popularTier: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
  tierGradient: {
    padding: 20,
  },
  tierContent: {
    gap: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tierPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  benefitsContainer: {
    gap: 4,
  },
  benefit: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  footer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  secureText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  devModeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  devModeFooterText: {
    fontSize: 11,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '500',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
