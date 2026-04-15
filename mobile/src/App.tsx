import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, Clock, CreditCard, User, ShieldAlert } from 'lucide-react-native';

// --- Imports des Écrans ---
import OnboardingScreen from './screens/OnboardingScreen';
import EmailLoginScreen from './screens/EmailLoginScreen';
import OTPVerificationScreen from './screens/OTPVerificationScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import CardVirtualScreen from './screens/CardVirtualScreen';
import ProfileScreen from './screens/ProfileScreen';
import VerificationScreen from './screens/VerificationScreen';
import CardPaymentScreen from './screens/CardPaymentScreen';
import RiskGaugeScreen from './screens/RiskGaugeScreen';
import InteroperabilityScreen from './screens/InteroperabilityScreen';
import TransferSuccessScreen from './screens/TransferSuccessScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ReceiveScreen from './screens/ReceiveScreen';
import DepositScreen from './screens/DepositScreen';
import DepositSuccessScreen from './screens/DepositSuccessScreen';
import SupportChatScreen from './screens/SupportChatScreen';
import InterCampusTransferScreen from './screens/InterCampusTransferScreen';
import TermsScreen from './screens/TermsScreen';
import PrivacyScreen from './screens/PrivacyScreen';

// --- Imports Écrans Analyste ---
import AnalystDashboardScreen from './screens/analyst/AnalystDashboardScreen';
import AnalystAlertsScreen from './screens/analyst/AnalystAlertsScreen';
import AlertDetailScreen from './screens/analyst/AlertDetailScreen';
import AnalystProfileScreen from './screens/analyst/AnalystProfileScreen';
import AnalystNotificationsScreen from './screens/analyst/AnalystNotificationsScreen';
import WeeklyRecapScreen from './screens/analyst/WeeklyRecapScreen';
import { AnalystNotificationsProvider } from './contexts/AnalystNotificationsContext';

// --- Définition des Types de Navigation ---

export type RootStackParamList = {
  // Flux d'Auth
  Onboarding: undefined;
  EmailLogin: undefined;
  OTPVerification: { email: string };

  // Légal
  Terms: undefined;
  Privacy: undefined;

  // Flux Principal (Étudiant)
  Main: undefined;

  // Flux Principal (Analyste)
  AnalystMain: undefined;

  // Écrans Fonctionnels
  CardPayment: undefined;
  Receive: undefined;
  Deposit: undefined;
  TransactionDetail: { id: string };
  Notifications: undefined;
  Interoperability: undefined;
  InterCampusTransfer: undefined;

  // Flux de Virement
  TransferSuccess: { amount: string; recipient: string; transactionId: string };

  // Flux de Dépôt
  DepositSuccess: { amount: string; transactionId: string };

  // Support
  SupportChat: { initialNodeId?: string } | undefined;

  // Flux de Sécurité
  Verification: { transactionId: string };
  Explicability: { transactionId: string; reasons: string[] };
  RiskGauge: undefined;

  // Analyste - Écrans de flux
  AlertDetail: { transactionId: string };
  AnalystNotifications: undefined;
  WeeklyRecap: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  CardVirtual: undefined;
  Profile: undefined;
};

export type AnalystTabParamList = {
  AnalystDashboard: undefined;
  AnalystAlerts: { initialDecision?: 'review' | 'block' | 'approve' | 'all'; initialPeriod?: 'today' | 'week' | 'month' | 'all' } | undefined;
  AnalystProfile: undefined;
};

// --- Configuration des Navigateurs ---

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const AnalystTab = createBottomTabNavigator<AnalystTabParamList>();

// --- Tab Bar Style (partagé) ---

const TAB_BAR_STYLE = {
  backgroundColor: '#FFFFFF',
  borderTopColor: '#E5E5EA',
  borderTopWidth: 0.5,
  height: Platform.OS === 'ios' ? 85 : 70,
  paddingTop: 8,
  paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  ...Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
} as const;

// --- Student Tab Bar Navigator ---
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#86868B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Home size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color, focused }) => (
            <Clock size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tab.Screen
        name="CardVirtual"
        component={CardVirtualScreen}
        options={{
          tabBarLabel: 'Carte',
          tabBarIcon: ({ color, focused }) => (
            <CreditCard size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <User size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// --- Analyst Tab Bar Navigator ---
function AnalystTabNavigatorContent() {
  return (
    <AnalystTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#86868B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <AnalystTab.Screen
        name="AnalystDashboard"
        component={AnalystDashboardScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Home size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <AnalystTab.Screen
        name="AnalystAlerts"
        component={AnalystAlertsScreen}
        options={{
          tabBarLabel: 'Alertes',
          tabBarIcon: ({ color, focused }) => (
            <ShieldAlert size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <AnalystTab.Screen
        name="AnalystProfile"
        component={AnalystProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <User size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </AnalystTab.Navigator>
  );
}

function AnalystTabNavigator() {
  return (
    <AnalystNotificationsProvider>
      <AnalystTabNavigatorContent />
    </AnalystNotificationsProvider>
  );
}

// --- Main Stack Navigator ---
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />

        <Stack.Navigator
          initialRouteName="Onboarding"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F5F5F7' },
            animation: 'fade_from_bottom',
          }}
        >
          {/* Groupe 1 : Authentification */}
          <Stack.Group
            screenOptions={{
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
          </Stack.Group>

          {/* Groupe 2 : Application Principale (Étudiant) */}
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{
              animation: 'fade',
            }}
          />

          {/* Groupe 2b : Application Principale (Analyste) */}
          <Stack.Screen
            name="AnalystMain"
            component={AnalystTabNavigator}
            options={{
              animation: 'fade',
            }}
          />

          {/* Groupe 3 : Écrans de Flux */}
          <Stack.Group
            screenOptions={{
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="CardPayment" component={CardPaymentScreen} />
            <Stack.Screen name="Receive" component={ReceiveScreen} />
            <Stack.Screen name="Deposit" component={DepositScreen} />
            <Stack.Screen name="DepositSuccess" component={DepositSuccessScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="TransferSuccess" component={TransferSuccessScreen} />
            <Stack.Screen name="RiskGauge" component={RiskGaugeScreen} />
            <Stack.Screen name="Interoperability" component={InteroperabilityScreen} />
            <Stack.Screen name="InterCampusTransfer" component={InterCampusTransferScreen} />
            <Stack.Screen name="SupportChat" component={SupportChatScreen} />
            <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
            <Stack.Screen name="AnalystNotifications" component={AnalystNotificationsScreen} />
            <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} />
          </Stack.Group>

          {/* Groupe 4 : Modales */}
          <Stack.Group
            screenOptions={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          >
            <Stack.Screen name="Verification" component={VerificationScreen} />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
