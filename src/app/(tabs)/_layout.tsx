import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Receipt, PiggyBank, User, Plus } from 'lucide-react-native';
import AddTransactionModal from '../../components/AddTransactionModal';

export default function TabsLayout() {
  const [addModalVisible, setAddModalVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: '#8F9BB3',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color, size }) => <Receipt size={size || 22} color={color} />,
          }}
        />
        
        {/* Custom Central Add Transaction Screen Placeholder */}
        <Tabs.Screen
          name="add-placeholder"
          options={{
            title: '',
            tabBarButton: () => (
              <TouchableOpacity
                onPress={() => setAddModalVisible(true)}
                style={styles.centerAddBtnContainer}
                activeOpacity={0.8}
              >
                <View style={styles.centerAddBtn}>
                  <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            ),
          }}
        />

        <Tabs.Screen
          name="budgets"
          options={{
            title: 'Budgets',
            tabBarIcon: ({ color, size }) => <PiggyBank size={size || 22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size || 22} color={color} />,
          }}
        />
      </Tabs>

      <AddTransactionModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#111322', // Sleek Matte Black / Deep Charcoal
    borderColor: 'rgba(255, 255, 255, 0.14)', // Visible high-contrast border
    borderWidth: 1.5,
    height: Platform.OS === 'ios' ? 74 : 64,
    borderRadius: 28,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 15 : 15,
    
    left: 20, // Clean side spacing
    right: 20, // Clean side spacing
    paddingHorizontal: 18, // Spacing inside for compact layout
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingTop: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  centerAddBtnContainer: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
    height: 68,
  },
  centerAddBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#101223',
  },
});
