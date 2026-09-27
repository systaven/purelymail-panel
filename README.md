# PurelyMail Management Panel

A comprehensive web-based management panel for the PurelyMail API, built with Next.js and designed for Vercel deployment.

## Features

- 🏠 **Dashboard Overview** - View account statistics and quick actions
- 🌐 **Domain Management** - Add, remove, and manage email domains
- 📧 **User Management** - Create and manage email users with password reset functionality  
- 🔀 **Routing Rules** - Configure email routing and forwarding rules
- ⚙️ **Account Settings** - Manage account information and view usage statistics
- 🎨 **Modern UI** - Responsive design with Tailwind CSS
- 🔐 **Secure API** - Server-side API key management
- ☁️ **Vercel Ready** - Optimized for easy Vercel deployment

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A PurelyMail account with API access
- Vercel account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd purelymail-management-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and fill in the required values:
   ```env
   PURELYMAIL_API_KEY=your_actual_api_key_here
   ADMIN_PASSWORD=choose_a_strong_password
   JWT_SECRET=output_of_openssl_rand_base64_32
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Vercel Deployment

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   
   **Option A: Using Vercel CLI**
   ```bash
   vercel
   ```
   
   **Option B: Using Vercel Dashboard**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect it's a Next.js project

3. **Set Environment Variables**
   
   In your Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `PURELYMAIL_API_KEY`, `ADMIN_PASSWORD` and `JWT_SECRET` (see [Environment Variables](#environment-variables))
   - Make sure it's available for all environments (Production, Preview, Development)

4. **Deploy**
   ```bash
   vercel --prod
   ```

## Project Structure

```
├── components/           # React components
│   ├── Layout.tsx           # Main layout with navigation
│   ├── DashboardOverview.tsx # Dashboard homepage
│   ├── DomainManagement.tsx  # Domain management interface
│   ├── RoutingRulesManagement.tsx # Email routing rules
│   ├── UserManagement.tsx    # User account management
│   └── AccountSettings.tsx   # Account settings page
├── lib/                  # Utility libraries
│   └── purelymail.ts        # PurelyMail API client
├── pages/                # Next.js pages
│   ├── api/                 # API routes
│   │   ├── account.ts           # Account management endpoints
│   │   ├── domains.ts           # Domain management endpoints
│   │   ├── routing-rules.ts     # Routing rules endpoints
│   │   ├── users.ts             # User management endpoints
│   │   └── users/
│   │       └── reset-password.ts # Password reset endpoint
│   ├── _app.tsx             # Next.js app configuration
│   ├── index.tsx            # Dashboard page
│   ├── domains.tsx          # Domains page
│   ├── routing-rules.tsx    # Routing rules page
│   ├── users.tsx            # Users page
│   └── settings.tsx         # Settings page
├── styles/               # Global styles
│   └── globals.css          # Tailwind CSS and custom styles
└── public/               # Static assets
```

## API Integration

The application integrates with the following PurelyMail API endpoints:

- **Account Management**
  - `GET /getAccountInfo` - Retrieve account information
  - `POST /setAccountInfo` - Update account information

- **Domain Management**  
  - `GET /listDomains` - List all domains
  - `POST /addDomain` - Add a new domain
  - `POST /deleteDomain` - Remove a domain
  - `POST /checkDomainOwnership` - Verify domain ownership

- **User Management**
  - `GET /listUsers` - List all users
  - `POST /createUser` - Create a new user
  - `POST /modifyUser` - Update user information
  - `POST /deleteUser` - Delete a user
  - `POST /resetUserPassword` - Reset user password

- **Routing Rules**
  - `GET /listRoutingRules` - List all routing rules
  - `POST /addRoutingRule` - Add a routing rule
  - `POST /modifyRoutingRule` - Update a routing rule
  - `POST /deleteRoutingRule` - Delete a routing rule

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PURELYMAIL_API_KEY` | Your PurelyMail API key | Yes |
| `ADMIN_PASSWORD` | Password used to log in to the panel. A bcrypt hash is recommended (see below); plain text also works. | Yes |
| `JWT_SECRET` | Random secret for signing session tokens (e.g. `openssl rand -base64 32`). Login fails if it is not set. | Yes |

### Using a hashed admin password

Generate a bcrypt hash and use it as `ADMIN_PASSWORD`:

```bash
node -e "require('bcrypt').hash(process.argv[1], 12).then(console.log)" 'your-password'
```

In `.env.local`, escape each `$` in the hash as `\$`, because Next.js expands `$` in env files. In the Vercel dashboard, paste the hash as is.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- API keys are stored as environment variables and never exposed to the client
- All API calls are made server-side through Next.js API routes
- Every `/api/*` route except `/api/auth/*` requires a valid login session (enforced in `middleware.ts`)
- Input validation is implemented on both client and server sides
- CORS is handled automatically by Next.js

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues related to:
- **This management panel**: Open an issue on GitHub
- **PurelyMail API**: Contact PurelyMail support
- **Vercel deployment**: Check Vercel documentation

## Roadmap

- [ ] Email template management
- [ ] Advanced filtering and search
- [ ] Bulk operations for users and domains
- [ ] Email analytics and reporting
- [ ] Two-factor authentication setup
- [ ] API rate limiting and caching
- [ ] Dark mode support