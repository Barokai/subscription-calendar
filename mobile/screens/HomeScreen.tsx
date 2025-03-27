import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Import shared logic
import { useSubscriptions, groupSubscriptionsByMonth, calculateTotalSpending } from '@subscription-calendar/shared';

// Import platform-specific components
import SubscriptionCard from '../components/SubscriptionCard';
import MonthPicker from '../components/MonthPicker';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { subscriptions, loading, error } = useSubscriptions();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Calculate totals using shared logic
  const totals = calculateTotalSpending(subscriptions);
  
  // Group subscriptions by month using shared logic
  const groupedSubscriptions = groupSubscriptionsByMonth(subscriptions);
  
  // Get current month's subscriptions
  const currentMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const currentMonthSubscriptions = groupedSubscriptions[currentMonthKey] || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading your subscriptions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month selector */}
      <MonthPicker
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />
      
      {/* Totals summary */}
      <View style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>Subscription Totals</Text>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Monthly:</Text>
          <Text style={styles.totalsValue}>${totals.monthly.toFixed(2)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Yearly:</Text>
          <Text style={styles.totalsValue}>${totals.yearly.toFixed(2)}</Text>
        </View>
      </View>
      
      {/* Subscription list */}
      <FlatList
        data={currentMonthSubscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard 
            subscription={item} 
            onPress={() => navigation.navigate('EditSubscription', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No subscriptions for this month</Text>
          </View>
        }
      />
      
      {/* Add button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Text style={styles.addButtonText}>+ Add Subscription</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  totalsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  totalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalsValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
