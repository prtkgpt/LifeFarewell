# LifeFarewell

AI-agent based funeral planning agency. A concierge that handles vendor discovery, outreach, quote gathering, and comparison — so bereaved families can focus on what matters.

## Tech Stack

- **Framework**: Next.js 14+ App Router (TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL (Neon) via Prisma ORM
- **Auth**: Auth.js (NextAuth v5) with Credentials provider
- **Validation**: Zod + React Hook Form
- **Email**: Resend
- **SMS/Calls**: Twilio
- **Voice TTS**: ElevenLabs
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret (min 32 chars) |
| `RESEND_API_KEY` | Resend API key for email |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `SANDBOX_MODE` | Set to `"true"` for dev (no real comms sent) |

### 3. Set up database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing the Flow

### 1. Create an account
- Go to `/auth` and sign up

### 2. Create a case
- Go to `/onboarding`
- Select "I'm handling arrangements for someone who passed away"
- Fill in details (try Livermore, CA for seeded vendors)
- Set communication preferences and approval level
- Submit to create your case

### 3. Use the Concierge Console
- Click **"Discover Vendors"** to find local funeral homes
- Click **"Start Outreach"** to draft emails/SMS to vendors
- Go to **Approvals** to review and approve outbound messages
- Messages are marked as `SIMULATED` in sandbox mode

### 4. Run background jobs
- Go to the **Trigger Run** page for your case
- Click **"Run Jobs Now"** to process enqueued agent tasks
- Or call `POST /api/jobs/run` directly

### 5. View communications
- Check the **Communications** page for all outbound activity
- See the **Activity Feed** in the Concierge Console for audit logs

### 6. Compare quotes
- After vendors respond (simulated), check the **Compare** page
- View normalized line items and flagged fees

## Sandbox Mode

Sandbox mode is **ON by default** in development. When enabled:

- No real emails, SMS, or calls are sent
- All communications are marked as `SIMULATED`
- Full records and audit logs are still created
- Toggle in case settings or via `SANDBOX_MODE` env var

## Key Concepts

### Approval Levels

| Level | Behavior |
|-------|----------|
| **Review All** | User approves every outbound message |
| **Auto Outreach** | Initial outreach auto-sent; bookings/payments need approval |
| **Auto Execute** (disabled in MVP) | Limited autonomous operation |

### Disclosure

All outbound communications include mandatory disclosure:

- **Full**: "I'm an assistant from LifeFarewell, contacting you on behalf of [Name]..."
- **Minimal**: "I'm assisting the family coordinating arrangements."

The system never pretends to be the user. Disclosure text cannot be removed from messages.

### Agent System

| Agent | Purpose |
|-------|---------|
| Orchestrator | Manages pipeline stage and dispatches tasks |
| Vendor Discovery | Finds matching vendors by location/needs |
| Outreach | Drafts and sends emails/SMS with disclosure |
| Calling | Generates call scripts and TTS audio |
| Negotiation | Follow-ups and price clarification |
| Quote Normalization | Parses quotes into structured line items |
| Recommendation | Scores and ranks options |
| Trigger | Simulates event verification |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── app/               # Authenticated app pages
│   │   ├── case/[caseId]/ # Case sub-pages
│   │   └── plan/[planId]/ # Plan sub-pages
│   ├── auth/              # Authentication
│   └── onboarding/        # Onboarding flow
├── agents/                # Agent modules
├── components/            # React components
│   ├── concierge/        # Concierge Console
│   ├── layout/           # App shell, sidebar
│   └── ui/               # shadcn/ui components
├── lib/                   # Shared utilities
│   ├── actions/          # Server actions
│   ├── comms/            # Resend, Twilio, ElevenLabs
│   ├── disclosure/       # Disclosure templates
│   └── validations/      # Zod schemas
└── __tests__/            # Unit tests
```

## Running Tests

```bash
npm test
```

Tests cover:
- Disclosure enforcement (templates always include required text)
- Approval gating (LEVEL_1 blocks send, LEVEL_2 auto-sends outreach)
- Quote normalization (parsing, categorization, flag detection)

## License

MIT
