import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import FindSpaceScreen from './screens/FindSpaceScreen';
import ExistingGardensScreen from './screens/ExistingGardensScreen';
import ManageGardenScreen from './screens/ManageGardenScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#2D5A27',
  accent: '#7CB87A',
  background: '#F5F0E8',
  tabBar: '#1C3A18',
  inactive: '#7A9178',
  white: '#FFFFFF',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Find Space') {
                iconName = focused ? 'search' : 'search-outline';
              } else if (route.name === 'Gardens') {
                iconName = focused ? 'leaf' : 'leaf-outline';
              } else if (route.name === 'My Garden') {
                iconName = focused ? 'grid' : 'grid-outline';
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.inactive,
            tabBarStyle: {
              backgroundColor: COLORS.tabBar,
              borderTopWidth: 0,
              paddingBottom: 8,
              paddingTop: 6,
              height: 64,
            },
            tabBarLabelStyle: {
              fontFamily: 'System',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.5,
            },
            headerStyle: {
              backgroundColor: COLORS.primary,
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTintColor: COLORS.white,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
              letterSpacing: 0.5,
            },
          })}
        >
          <Tab.Screen
            name="Find Space"
            component={FindSpaceScreen}
            options={{ title: 'Find a Space', headerTitle: '🌱 Find a Space' }}
          />
          <Tab.Screen
            name="Gardens"
            component={ExistingGardensScreen}
            options={{ title: 'Gardens', headerTitle: '🗺️ Community Gardens' }}
          />
          <Tab.Screen
            name="My Garden"
            component={ManageGardenScreen}
            options={{ title: 'My Garden', headerTitle: '🌿 Manage My Garden' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}