import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  StyleSheet, 
  Platform, 
  Dimensions,
  Animated
} from 'react-native';
import { BlurView } from 'expo-blur';
import { 
  ShieldAlert, 
  X, 
  AlertTriangle, 
  ChevronRight,
  HelpCircle
} from 'lucide-react-native';

// --- Types ---

interface ExplicabilityModalProps {
  visible: boolean;
  onClose: () => void;
  reasons: string[]; // Codes d'erreur (ex: ['AMOUNT_HIGH', 'NEW_DEVICE'])
}

// --- Logic & Mapping (Source A: .md) ---

const REASON_MAPPING: Record<string, string> = {
  AMOUNT_HIGH: 'Montant inhabituel pour votre profil',
  TIME_SUSPICIOUS: 'Transaction à une heure inhabituelle',
  LOCATION_CHANGE: 'Localisation différente de vos habitudes',
  VELOCITY_HIGH: 'Plusieurs transactions rapides détectées',
  NEW_DEVICE: 'Nouvel appareil non reconnu',
  IP_GEO_MISMATCH: 'Position différente de l\'adresse IP',
};

export default function ExplicabilityModal({ visible, onClose, reasons }: ExplicabilityModalProps) {
  
  // Animation d'entrée simple
  const scaleValue = new Animated.Value(0.9);
  const opacityValue = new Animated.Value(0);

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
        })
      ]).start();
    } else {
      scaleValue.setValue(0.9);
      opacityValue.setValue(0);
    }
  }, [visible]);

  // --- Handlers ---
  
  const handleContest = () => {
    // Logique de contestation ici
    onClose();
    // navigation.navigate('ContestForm');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 1. Full Screen Blur Overlay (Source B: Design System) */}
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <Pressable style={styles.overlay} onPress={onClose}>
          
          {/* 2. Background Alert Banner (Source B: Layering Effect) */}
          {/* Cette bannière apparaît "derrière" la modale pour donner du contexte */}
          <View style={styles.backgroundBanner}>
            <View className="w-14 h-14 bg-red-100 rounded-xl items-center justify-center mr-4">
              <AlertTriangle size={32} color="#EF4444" />
            </View>
            <View className="flex-1">
              <Text className="text-white/90 font-bold text-lg mb-1">Vérification requise</Text>
              <Text className="text-white/80 text-sm leading-5">
                Une activité suspecte a été détectée sur votre compte.
              </Text>
            </View>
          </View>

          {/* 3. Main Modal Content */}
          <Pressable onPress={(e) => e.stopPropagation()}> 
            <Animated.View 
              style={[
                styles.modalContainer,
                { opacity: opacityValue, transform: [{ scale: scaleValue }] }
              ]}
            >
              {/* Close Button */}
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color="#6B7280" />
              </Pressable>

              <View className="px-6 pt-2 pb-6 items-center">
                
                {/* Shield Icon (Source B: Orange Warning Style) */}
                <View className="w-20 h-20 rounded-full bg-amber-50 items-center justify-center mb-5 border-[3px] border-amber-100">
                  <ShieldAlert size={48} color="#F59E0B" />
                </View>

                <Text className="text-[28px] font-bold text-gray-900 text-center mb-3">
                  Raison du blocage
                </Text>

                <Text className="text-gray-500 text-center text-[16px] leading-6 mb-6">
                  Pour votre sécurité, notre système a bloqué cette transaction suite à la détection des éléments suivants :
                </Text>

                {/* Reasons List (Source A: Dynamic Mapping) */}
                <View className="w-full bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6">
                  {reasons.map((code, index) => (
                    <View 
                      key={code} 
                      className={`flex-row items-center py-3 gap-4 ${index !== reasons.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <View className="w-9 h-9 rounded-lg bg-amber-100 items-center justify-center">
                        <AlertTriangle size={20} color="#F59E0B" />
                      </View>
                      <Text className="text-gray-900 font-medium text-[15px] flex-1">
                        {REASON_MAPPING[code] || 'Activité inhabituelle'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Action Button (Source B: Contest vs Understand) */}
                <Pressable
                  onPress={handleContest}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                >
                  <Text className="text-white font-bold text-[17px]">
                    Contester le blocage
                  </Text>
                </Pressable>

              </View>
            </Animated.View>
          </Pressable>

          {/* Support Link (Source B: Footer) */}
          <Pressable style={styles.supportLink}>
            <HelpCircle size={20} color="#ffffff" />
            <Text className="text-white font-semibold ml-2">Contacter le support</Text>
          </Pressable>

        </Pressable>
      </BlurView>
    </Modal>
  );
}

// Styles précis pour le Glassmorphism et Layout
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.3)', // Teinte bleue légère sur le blur
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundBanner: {
    position: 'absolute',
    top: 100, // Visible au-dessus de la modale visuellement
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glass effect
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  supportLink: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.9,
  }
});