import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ShieldAlert, X, AlertTriangle, HelpCircle } from 'lucide-react-native';

// Components
import { Button } from '../components/ui';

// Utils
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

interface ExplicabilityModalProps {
  visible: boolean;
  onClose: () => void;
  reasons: string[];
}

// --- Logic & Mapping ---

const REASON_MAPPING: Record<string, string> = {
  AMOUNT_HIGH: 'Montant inhabituel pour votre profil',
  TIME_SUSPICIOUS: 'Transaction à une heure inhabituelle',
  LOCATION_CHANGE: 'Localisation différente de vos habitudes',
  VELOCITY_HIGH: 'Plusieurs transactions rapides détectées',
  NEW_DEVICE: 'Nouvel appareil non reconnu',
  IP_GEO_MISMATCH: "Position différente de l'adresse IP",
};

export default function ExplicabilityModal({
  visible,
  onClose,
  reasons,
}: ExplicabilityModalProps) {
  const { light } = useHaptics();

  // Animation
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleValue.setValue(0.9);
      opacityValue.setValue(0);
    }
  }, [visible]);

  // --- Handlers ---

  const handleContest = () => {
    light();
    onClose();
    // navigation.navigate('ContestForm');
  };

  const handleClose = () => {
    light();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Full Screen Blur Overlay */}
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <Pressable style={styles.overlay} onPress={handleClose}>
          {/* Background Alert Banner */}
          <View style={styles.backgroundBanner}>
            <View className="w-14 h-14 bg-danger-50 rounded-xl items-center justify-center mr-4">
              <AlertTriangle size={32} color="#FF3B30" />
            </View>
            <View className="flex-1">
              <Text className="text-white/90 font-bold text-lg mb-1">Vérification requise</Text>
              <Text className="text-white/80 text-body leading-5">
                Une activité suspecte a été détectée sur votre compte.
              </Text>
            </View>
          </View>

          {/* Main Modal Content */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.modalContainer,
                shadows.modal,
                { opacity: opacityValue, transform: [{ scale: scaleValue }] },
              ]}
            >
              {/* Close Button */}
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={20} color="#6E6E73" />
              </Pressable>

              <View className="px-6 pt-2 pb-6 items-center">
                {/* Shield Icon */}
                <View className="w-20 h-20 rounded-full bg-warning-50 items-center justify-center mb-5 border-[3px] border-warning-50">
                  <ShieldAlert size={48} color="#FF9500" />
                </View>

                <Text className="text-title1 text-ink-primary text-center mb-3">
                  Raison du blocage
                </Text>

                <Text className="text-body text-ink-secondary text-center leading-6 mb-6">
                  Pour votre sécurité, notre système a bloqué cette transaction suite à la détection
                  des éléments suivants :
                </Text>

                {/* Reasons List */}
                <View className="w-full bg-background rounded-2xl border border-separator-opaque p-4 mb-6">
                  {reasons.map((code, index) => (
                    <View
                      key={code}
                      className={`flex-row items-center py-3 gap-4 ${
                        index !== reasons.length - 1 ? 'border-b border-separator-opaque' : ''
                      }`}
                    >
                      <View className="w-9 h-9 rounded-lg bg-warning-50 items-center justify-center">
                        <AlertTriangle size={20} color="#FF9500" />
                      </View>
                      <Text className="text-body text-ink-primary flex-1 font-medium">
                        {REASON_MAPPING[code] || 'Activité inhabituelle'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Action Button */}
                <Button variant="primary" fullWidth onPress={handleContest}>
                  Contester le blocage
                </Button>
              </View>
            </Animated.View>
          </Pressable>

          {/* Support Link */}
          <Pressable
            onPress={() => light()}
            style={styles.supportLink}
            className="flex-row items-center gap-2"
          >
            <HelpCircle size={20} color="#ffffff" />
            <Text className="text-white font-semibold">Contacter le support</Text>
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundBanner: {
    position: 'absolute',
    top: 100,
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalContainer: {
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  supportLink: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.9,
  },
});
