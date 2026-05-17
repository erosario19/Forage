import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { View, ActivityIndicator } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import FindSpaceScreen from './screens/FindSpaceScreen';
import ExistingGardensScreen from './screens/ExistingGardensScreen';
import ManageGardenScreen from './screens/ManageGardenScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#2D5A27',
  accent: '#7CB87A',
  tabBar: '#1C3A18',
  inactive: '#7A9178',
  white: '#FFFFFF',
};

const TABS = [
  { name: 'Home',       component: HomeScreen,            icon: 'home',   header: ' Forage' },
  { name: 'Find Space', component: FindSpaceScreen,       icon: 'flag',   header: ' Start an Initiative' },
  { name: 'Gardens',    component: ExistingGardensScreen, icon: 'search', header: ' Find a Garden' },
  { name: 'My Garden',  component: ManageGardenScreen,    icon: 'leaf',   header: ' My Gardens' },
];

export default function App() {
  const [fontsLoaded] = useFonts({ DancingScript_700Bold });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D5A27' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              const tab = TABS.find(t => t.name === route.name);
              return (
                <Ionicons
                  name={focused ? tab.icon : `${tab.icon}-outline`}
                  size={size}
                  color={color}
                />
              );
            },
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.inactive,
            tabBarStyle: {
              backgroundColor: COLORS.tabBar,
              borderTopWidth: 0,
              paddingBottom: 30,
              paddingTop: 10,
              height: 90,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
            headerStyle: { backgroundColor: COLORS.primary, shadowColor: 'transparent', elevation: 0 },
            headerTintColor: COLORS.white,
            headerTitleStyle: { fontWeight: '700', fontSize: 18, letterSpacing: 0.5 },
          })}
        >
          {TABS.map(tab => (
            <Tab.Screen
              key={tab.name}
              name={tab.name}
              component={tab.component}
              options={{
                headerTitle: tab.header,
                headerShown: tab.name !== 'Home',
              }}
            />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}