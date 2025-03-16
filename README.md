# Subscription Calendar

A visual calendar application that helps you track and manage your recurring subscriptions.

> [!NOTE]
> **Inspiration/Acknowledgement**
> 
> Inspired by a component created by [LN dev](https://github.com/ln-dev7): <https://ui.lndev.me/components/subscriptions-calendar>

## Features

- Monthly calendar view of subscription payments
- Integration with Google Sheets to store your subscription data
- Dark/light mode toggle
- Detailed view of each subscription
- Localization support (minimal)
- Monthly spending summary

## Getting Started

### Prerequisites

- [bun](https://bun.sh/) - Install on Windows (run PowerShell in terminal or in VS Code):

```bash
irm bun.sh/install.ps1 | iex
```

### Development

1. Clone the repository

```bash
git clone https://github.com/yourusername/subscription-calendar.git
cd subscription-calendar
```

2. Install dependencies

```bash
# Install dependencies
bun install
```

3. Run the development server

```bash
# Start development server
bun run dev
```

This tries to use run `next dev` with the `--experimental-https` flag. If you encounter issues, you may need to run the following command before, and try again (or just continue without HTTPS):

```bash
# Grab the path to mkcert from the error message
# ⨯ Failed to generate self-signed certificate. Falling back to http. Error: Command failed: "C:\Users\<yourusername>\AppData\Local\mkcert\mkcert-vx.x.x-windows-amd64.exe" -install"

# open powershell as admin, navigate to the path, and run the command
mkcert -install
```

4. Open [https://localhost](https://localhost:3000) (or [http://localhost:3000](https://localhost:3000)) in your browser to see the application

## Google Sheets Integration

You can connect to Google Sheets in two ways:

### 1. Environment Variables (Recommended for Production)

Set up environment variables for secure, server-side configuration:

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in your values in `.env.local`:

```bash
SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
SHEETS_API_KEY=your_api_key_here
```

Environment variables will be used by default when present. Users can still override these in the settings UI if needed, or revert back to using the environment values.

### 2. User Interface Configuration

To configure directly through the UI:

1. Create a Google Sheet with the following columns:
   - name: The subscription name (e.g., Netflix)
   - amount: The cost of the subscription
   - currency: The currency symbol (e.g., €)
   - frequency: How often the subscription renews (e.g., monthly)
   - dayOfMonth: The day of the month when payment is due
   - color: The brand color in hex format (e.g., #E50914)
   - logo: A letter or short text to represent the logo
   - startDate: When you first subscribed (YYYY-MM-DD format)
   - endDate: When subsription ended (YYYY-MM-DD format) `[unused]`

2. Share your Google Sheet to "anyone with the link"

3. Enable the Google Sheets API:
   - Go to the [Google Developers Console](https://console.developers.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Sheets API
   - Create an API key
   - Copy your API key and spreadsheet ID (the long string in your spreadsheet URL)

4. Enter these credentials in the application's setup page

## Technologies Used

- Next.js / React
- TypeScript
- Tailwind CSS
- Google Sheets API

## Disclaimer

Parts of this project were developed with the assistance of AI tools, including GitHub Copilot and Claude 3.7 Sonnet (Preview).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
