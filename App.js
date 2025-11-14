import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SessionChatScreen from './src/screens/SessionChatScreen';
import MainTabs from './src/navigation/MainTabs';

// Specialist screens (riêng biệt, không đụng tới user flow)
import SpecialistMainTabs from './src/navigation/SpecialistMainTabs';
import SpecialistChatScreen from './src/screens/specialist/SpecialistChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {/* Login chung cho cả User và Specialist - tự động detect role */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Đăng nhập', headerShown: false }} 
        />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
        
        {/* User Flow */}
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="SessionChat" component={SessionChatScreen} options={{ title: 'Chat phiên' }} />
        
        {/* Specialist Flow - hoàn toàn riêng biệt */}
        <Stack.Screen 
          name="SpecialistMain" 
          component={SpecialistMainTabs} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="SpecialistChat" 
          component={SpecialistChatScreen} 
          options={{ title: 'Chat phiên', headerShown: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
