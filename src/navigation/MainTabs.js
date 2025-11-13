import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ChatAIScreen from '../screens/ChatAIScreen';
import CameraScreen from '../screens/CameraScreen';
import TreatmentScreen from '../screens/TreatmentScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function CameraTabButton({ children, onPress }) {
  return (
    <View style={styles.cameraWrapper}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.cameraBtn}>
        {children}
      </TouchableOpacity>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'ChatAI',
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#166534',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { height: 84, paddingBottom: 8, paddingTop: 8 },
        tabBarIcon: ({ color, size, focused }) => {
          let icon = 'home-outline';
          if (route.name === 'Home') icon = focused ? 'home' : 'home-outline';
          if (route.name === 'ChatAI') icon = focused ? 'chatbubbles' : 'chatbubbles-outline';
          if (route.name === 'Camera') icon = focused ? 'camera' : 'camera-outline';
          if (route.name === 'Treatment') icon = focused ? 'leaf' : 'leaf-outline';
          if (route.name === 'Profile') icon = focused ? 'person' : 'person-outline';
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Trang chủ', title: 'Trang chủ' }} />
      <Tab.Screen name="ChatAI" component={ChatAIScreen} options={{ tabBarLabel: 'Chat AI', headerShown: false }} />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarLabel: 'Chụp Ảnh',
          tabBarIcon: ({ color }) => <Ionicons name="camera" size={28} color="#fff" />,
          tabBarButton: (props) => <CameraTabButton {...props} />,
        }}
      />
      <Tab.Screen name="Treatment" component={TreatmentScreen} options={{ tabBarLabel: 'Liệu Trình', title: 'Liệu Trình' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', title: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  cameraWrapper: {
    alignItems: 'center',
    top: -20, // 👉 đẩy nút nổi lên
  },
  cameraBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  cameraLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#000000ff',
    fontWeight: '600',
  },
});
