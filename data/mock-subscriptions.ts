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
    originalFrequency: 'monthly',
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
    originalFrequency: 'monthly',
    dayOfMonth: 12,
    color: '#1DB954',
    logo: 'S',
    startDate: '2022-03-15'
  },
  {
    id: 3,
    name: 'Amazon Prime',
    amount: 95.88,
    currency: '€',
    frequency: 'yearly',
    originalFrequency: 'yearly',
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
    originalFrequency: 'monthly',
    dayOfMonth: 24,
    color: '#0077B5',
    logo: 'in',
    startDate: '2023-05-01',
    endDate: '2023-11-01'
  },
  {
    id: 5,
    name: 'Disney+',
    amount: 89.90,
    currency: '€',
    frequency: 'yearly',
    originalFrequency: 'yearly',
    dayOfMonth: 7,
    color: '#113CCF',
    logo: 'D',
    startDate: '2022-07-12'
  },
  {
    id: 6,
    name: 'Fitti',
    amount: 60.66,
    currency: '€',
    frequency: 'quarterly',
    originalFrequency: 'quarterly',
    dayOfMonth: 12,
    color: '#BADA55',
    logo: 'D',
    startDate: '2024-12-12'
  }
];
