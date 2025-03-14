import { Subscription } from '../components/google-sheets-service';

/**
 * Mock subscription data for demo mode or when no Google Sheets connection is available
 */
export const mockSubscriptions: Subscription[] = [
  {
    id: 1,
    name: 'Netflix',
    amount: 4.33,
    currency: '€',
    frequency: 'monthly',
    dayOfMonth: 7,
    color: '#E50914',
    logo: 'N',
    startDate: '2021-01-01'
  },
  {
    id: 2,
    name: 'Spotify',
    amount: 9.99,
    currency: '€',
    frequency: 'monthly',
    dayOfMonth: 12,
    color: '#1DB954',
    logo: 'S',
    startDate: '2022-03-15'
  },
  {
    id: 3,
    name: 'Amazon Prime',
    amount: 7.99,
    currency: '€',
    frequency: 'monthly',
    dayOfMonth: 30,
    color: '#FF9900',
    logo: 'a',
    startDate: '2021-11-20'
  },
  {
    id: 4,
    name: 'LinkedIn',
    amount: 29.99,
    currency: '€',
    frequency: 'monthly',
    dayOfMonth: 24,
    color: '#0077B5',
    logo: 'in',
    startDate: '2023-05-01',
    endDate: '2023-11-01' // Example of a subscription with an end date
  },
  {
    id: 5,
    name: 'Airbnb',
    amount: 12.99,
    currency: '€',
    frequency: 'monthly',
    dayOfMonth: 7,
    color: '#FF5A5F',
    logo: 'A',
    startDate: '2022-07-12'
  }
];
