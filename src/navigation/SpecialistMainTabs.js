import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SpecialistSessionsScreen from '../screens/specialist/SpecialistSessionsScreen';
import SpecialistProfileScreen from '../screens/specialist/SpecialistProfileScreen';

const Tab = createBottomTabNavigator();

export default function SpecialistMainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Sessions"
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { 
          height: Platform.OS === 'ios' ? 90 : 70, 
          paddingBottom: Platform.OS === 'ios' ? 20 : 8, 
          paddingTop: 8,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let icon = 'chatbubbles-outline';
          if (route.name === 'Sessions') icon = focused ? 'chatbubbles' : 'chatbubbles-outline';
          if (route.name === 'Profile') icon = focused ? 'person' : 'person-outline';
          return <Ionicons name={icon} size={size} color={color} />;
        },
        headerStyle: {
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: '#111827',
        },
      })}
    >
      <Tab.Screen 
        name="Sessions" 
        component={SpecialistSessionsScreen} 
        options={{ 
          tabBarLabel: 'Phiên chat', 
          title: 'Quản lý phiên chat',
          headerTitle: 'Quản lý phiên chat',
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={SpecialistProfileScreen} 
        options={{ 
          tabBarLabel: 'Hồ sơ', 
          title: 'Hồ sơ chuyên viên',
          headerTitle: 'Hồ sơ chuyên viên',
        }} 
      />
    </Tab.Navigator>
  );
}

