# Subscription Calendar

A visual calendar application that helps you track and manage your recurring subscriptions.

## Features

- Monthly calendar view of subscription payments
- Integration with Google Sheets to store your subscription data
- Dark/light mode toggle
- Detailed view of each subscription
- Localization support
- Monthly spending summary

## Getting Started

### Prerequisites

- Node.js (v14.x or later)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/subscription-calendar.git
cd subscription-calendar
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## Google Sheets Integration

To use your own subscription data:

1. Create a Google Sheet with the following columns:
   - name: The subscription name (e.g., Netflix)
   - amount: The cost of the subscription
   - currency: The currency symbol (e.g., €)
   - frequency: How often the subscription renews (e.g., monthly)
   - dayOfMonth: The day of the month when payment is due
   - color: The brand color in hex format (e.g., #E50914)
   - logo: A letter or short text to represent the logo
   - startDate: When you first subscribed (YYYY-MM-DD format)

2. Follow the setup instructions in the application to connect to your Google Sheet

## Technologies Used

- Next.js / React
- TypeScript
- Tailwind CSS
- Google Sheets API

## Disclaimer

Parts of this project were developed with the assistance of AI tools, including GitHub Copilot and Claude 3.7 Sonnet (Preview).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
