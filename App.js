import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SpecialistSessionsScreen from './src/screens/SpecialistSessionsScreen';
import SessionChatScreen from './src/screens/SessionChatScreen';
import MainTabs from './src/navigation/MainTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="SpecialistSessions" component={SpecialistSessionsScreen} options={{ title: 'Phiên chuyên viên' }} />
        <Stack.Screen name="SessionChat" component={SessionChatScreen} options={{ title: 'Chat phiên' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
