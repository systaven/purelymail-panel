# PurelyMail Management Panel

A comprehensive web-based management panel for the PurelyMail API, built with Next.js. It runs on Vercel, Appwrite Sites (with SSR enabled) or Docker.

## Features

- 🏠 **Dashboard Overview** - View account statistics and quick actions
- 🌐 **Domain Management** - Add, remove, and manage email domains
- 📧 **User Management** - Create and manage email users with password reset functionality  
- 🔀 **Routing Rules** - Configure email routing and forwarding rules
- ⚙️ **Account Settings** - Manage account information and view usage statistics
- ✉️ **Webmail** - Read, search, organize and send mail from any mailbox in the account (see [Webmail](#webmail))
- 👥 **Guest accounts** - People sign up with Clerk and manage their own mailboxes within limits you set (see [Guest accounts](#guest-accounts))
- 🎨 **Modern UI** - Light and dark themes (follows the system, or pick one), works on phones and tablets; Mail switches to one pane at a time on small screens
- 🔐 **Secure API** - Server-side API key management
- ☁️ **Deploy anywhere** - Vercel, Appwrite Sites or Docker

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 22+ (on Appwrite Sites, pick a Node 22 runtime)
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
│   ├── AccountSettings.tsx   # Account settings page
│   └── mail/                 # Webmail UI (folders, message list, reader, composer)
├── lib/                  # Utility libraries
│   ├── purelymail.ts        # PurelyMail API client
│   └── mail/                # IMAP/SMTP access, app password storage, HTML sanitizing
├── pages/                # Next.js pages
│   ├── api/                 # API routes
│   │   ├── account.ts           # Account management endpoints
│   │   ├── domains.ts           # Domain management endpoints
│   │   ├── routing-rules.ts     # Routing rules endpoints
│   │   ├── users.ts             # User management endpoints
│   │   ├── mail/                # Webmail endpoints
│   │   └── users/
│   │       └── reset-password.ts # Password reset endpoint
│   ├── _app.tsx             # Next.js app configuration
│   ├── index.tsx            # Dashboard page
│   ├── domains.tsx          # Domains page
│   ├── routing-rules.tsx    # Routing rules page
│   ├── users.tsx            # Users page
│   ├── mail.tsx             # Webmail page
│   └── settings.tsx         # Settings page
├── styles/               # Global styles
│   └── globals.css          # Tailwind CSS and custom styles
├── supabase/             # SQL for the webmail credentials table
└── Dockerfile            # Standalone Docker image
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
| `SUPABASE_URL` | Supabase project URL, for webmail | For webmail |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_...`) or legacy service role key, server-side only. `SUPABASE_SERVICE_ROLE_KEY` also works | For webmail and guests |
| `MAIL_CREDENTIALS_KEY` | Random secret that encrypts stored app passwords (e.g. `openssl rand -base64 32`) | For webmail |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk keys; turn on guest sign-up and sign-in | For guests |
| `CLERK_JWT_KEY` | Clerk's JWT public key, to verify sessions without a network call | No |
| `MAIL_IMAP_HOST` / `MAIL_IMAP_PORT` / `MAIL_SMTP_HOST` / `MAIL_SMTP_PORT` / `MAIL_SMTP_SECURE` | Override the mail servers (default `imap.purelymail.com:993`, `smtp.purelymail.com:465` with implicit TLS; STARTTLS is used for ports 587 and 25 unless `MAIL_SMTP_SECURE=true`) | No |

### Using a hashed admin password

Generate a bcrypt hash and use it as `ADMIN_PASSWORD`:

```bash
node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" 'your-password'
```

In `.env.local`, escape each `$` in the hash as `\$`, because Next.js expands `$` in env files. In the Vercel dashboard, paste the hash as is.

## Webmail

The **Mail** page lets the admin open any mailbox in the account without knowing its password:

1. The first time a mailbox is opened, the panel creates a PurelyMail **app password** for it through the API (named "PurelyMail Panel webmail").
2. The app password is encrypted with `MAIL_CREDENTIALS_KEY` (AES-256-GCM) and stored in Supabase, then reused for IMAP and SMTP logins.
3. **Reset access** on the Mail page deletes the app password in both PurelyMail and Supabase. If a stored password stops working (for example it was deleted in PurelyMail), a new one is created automatically.

The mailbox's owner can see this app password in their PurelyMail settings. If `MAIL_CREDENTIALS_KEY` changes, stored passwords can no longer be decrypted: the panel creates new ones automatically, but the old ones stay in PurelyMail until deleted there.

### Setup

1. In your Supabase project, run [`supabase/mailbox_credentials.sql`](supabase/mailbox_credentials.sql) in the SQL editor.
2. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `MAIL_CREDENTIALS_KEY` in your deployment's environment variables.

### Limitations

- New mail is found by polling every 30 seconds while the page is open; there is no push.
- Each request opens its own IMAP connection, so actions take a moment longer than in a desktop client.
- Attachments are limited to 10 MB per message when sending. Your host may impose a lower request size limit.
- Forwarding includes the original text but not its attachments.
- Messages are composed as plain text.
- On Appwrite Sites, requests time out after 15 seconds by default. Raising the site timeout (Settings → Timeout, up to 30 seconds) helps with large mailboxes and searches.

## Guest accounts

With Clerk configured, the login page offers **Sign in** and **Create an account** next to the admin password.

- **Guests** (everyone who signs up) see only **My mailboxes** and **Mail**. They can create or request mailboxes on the domains you open to them, up to their limit, and for their own mailboxes: read and send mail, set the password used by mail apps, set forwarding, and delete them.
- **Admins**: the admin password always works. On **My account**, the password admin can link a Clerk account, which makes it an admin; on **Guests** you can also promote any Clerk user.
- **Guests page** (admin): approve or reject requests, set the defaults (mailbox limit, whether approval is needed, domains open to all guests), adjust any user (role, disabled, limit, approval, extra domains), assign existing mailboxes to a user or take them back, and see the activity log.

Rules guests can't get around, enforced on the server:
- Only their own mailboxes are reachable, in every API including webmail.
- Forwarding is one exact-address rule for their own mailbox; no prefix or catch-all rules.
- Role addresses such as `admin`, `postmaster`, `abuse` and `noreply` are reserved.
- Pending requests count toward the limit, and an address can only be requested by one person at a time.

### Setup

1. Run [`supabase/panel_accounts.sql`](supabase/panel_accounts.sql) in the Supabase SQL editor (after `mailbox_credentials.sql`).
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, then redeploy (the publishable key is built into the page).
3. A Clerk production instance only works on its own domain and subdomains (e.g. an instance for `example.com` works on `mail.example.com`, not on `*.appwrite.network`).
4. Open **Guests**, choose the domains open to guests, and adjust the defaults.

## Docker

```bash
docker build -t purelymail-panel .
docker run -p 3000:3000 --env-file .env.local purelymail-panel
```

With Clerk, pass the publishable key when building (it's built into the page) and the rest at runtime:

```bash
docker build --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... -t purelymail-panel .
```

The image runs Next.js in standalone mode on port 3000. When passing a bcrypt `ADMIN_PASSWORD` through `--env-file`, don't escape the `$` characters (Docker doesn't expand them).

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