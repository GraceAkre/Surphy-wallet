import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { 
  Home, 
  Clock, 
  CreditCard, 
  User, 
  ShieldAlert 
} from 'lucide-react-native';

// --- Imports des Écrans ---
import OnboardingScreen from './screens/OnboardingScreen';
import EmailLoginScreen from './screens/EmailLoginScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import CardVirtualScreen from './screens/CardVirtualScreen';
import ProfileScreen from './screens/ProfileScreen';
import VerificationScreen from './screens/VerificationScreen';
import ExplicabilityModal from './screens/ExplicabilityModal';
import CardPaymentScreen from './screens/CardPaymentScreen';
import RiskGaugeScreen from './screens/RiskGaugeScreen';
import InteroperabilityScreen from './screens/InteroperabilityScreen';

// --- Définition des Types de Navigation (Le "Contrat") ---

export type RootStackParamList = {
  // Flux d'Auth
  Onboarding: undefined;
  EmailLogin: undefined;

  // Flux Principal
  Main: undefined; // Contient le TabNavigator

  // Écrans Fonctionnels
  CardPayment: undefined;
  TransactionDetail: { id: string }; // Requis par History & Home
  Interoperability: undefined; // Inter-campus

  // Flux de Sécurité (Modales)
  Verification: { transactionId: string }; // Requis par Home & RiskGauge
  Explicability: { transactionId: string; reasons: string[] };
  RiskGauge: undefined; // Écran "Admin/Analyste"
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  CardVirtual: undefined;
  Profile: undefined;
};

// --- Configuration des Navigateurs ---

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// --- 1. Le Navigateur d'Onglets (Barre du bas) ---
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 85, // Hauteur confortable (Design System)
          paddingTop: 10,
          paddingBottom: 30, // Espace pour la barre de geste iOS
          elevation: 0, // Enlever l'ombre Android par défaut
          shadowOpacity: 0, // Enlever l'ombre iOS par défaut
        },
        tabBarActiveTintColor: '#3B82F6', // Primary Blue
        tabBarInactiveTintColor: '#9CA3AF', // Text Tertiary
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="CardVirtual" 
        component={CardVirtualScreen} 
        options={{
          tabBarLabel: 'Carte',
          tabBarIcon: ({ color }) => <CreditCard size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// --- 2. Le Navigateur Principal (Stack) ---
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        
        <Stack.Navigator 
          initialRouteName="Onboarding"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F3F4F6' }, // Fond global
          }}
        >
          {/* Groupe 1 : Authentification */}
          <Stack.Group>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
          </Stack.Group>

          {/* Groupe 2 : Application Principale */}
          <Stack.Screen name="Main" component={MainTabNavigator} />
          
          {/* Groupe 3 : Écrans de Flux (Push standard) */}
          <Stack.Screen 
            name="CardPayment" 
            component={CardPaymentScreen} 
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="RiskGauge"
            component={RiskGaugeScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="Interoperability"
            component={InteroperabilityScreen}
            options={{ animation: 'slide_from_right' }}
          />

          {/* Groupe 4 : Modales (S'ouvrent par-dessus) */}
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen 
              name="Verification" 
              component={VerificationScreen} 
              options={{ 
                presentation: 'fullScreenModal', // Pour l'immersion P0 Alert
                animation: 'slide_from_bottom'
              }} 
            />
            {/* TransactionDetail serait ici aussi */}
          </Stack.Group>

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}