# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

智慧三棱鏡 (Wisdom Prism) is a bilingual (Chinese/English) interactive Biblical wisdom literature course exploring Proverbs, Ecclesiastes, and Job through 24 modules organized in 4 learning cycles. The application features:

- **Dual Interface Architecture**: Separate student learning interface (`/`) and admin CMS (`/admin/*`)
- **Three-Perspective Framework**: Each module presents wisdom through Proverbs (order), Ecclesiastes (vanity), and Job (collapse)
- **AI-Powered Learning**: Integrated Google Gemini and OpenAI for personalized feedback and "Michael" AI teaching assistant
- **Full-Stack TypeScript**: React 19 frontend with Supabase PostgreSQL backend

## Development Commands

### Essential Commands

```bash
# Development server (runs on port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Database Management

Connect to Supabase PostgreSQL (credentials in `.env`):

```bash
# Using environment variables from .env
PGPASSWORD='ChxyEgqtUK6qgrhV' /opt/homebrew/opt/postgresql@15/bin/psql \
  "postgresql://postgres:ChxyEgqtUK6qgrhV@db.bxyqjzxvloxpyuxijewh.supabase.co:5432/postgres"
```

**SQL Migration Files** (run in order):
1. `sql/000_create_base_tables.sql` - Base users, responses, user_progress
2. `sql/001_create_tables.sql` - CMS tables (cycles, modules, life_questions, perspectives, discussion_prompts)
3. `sql/002_create_rls_policies.sql` - Row-Level Security policies (DEPRECATED - use 004 instead)
4. `sql/003_create_ai_conversations.sql` - Michael AI chat functionality
5. `sql/004_fix_rls_for_custom_auth.sql` - **REQUIRED** - Fixes RLS for custom auth system
6. `sql/005_create_discussion_groups.sql` - Group discussion feature (3-5 members per module)
7. `sql/006_fix_ai_conversations_rls.sql` - **REQUIRED** - Fixes Michael AI RLS for custom auth

### Git Configuration

This repository uses the following git user configuration:
```bash
git config user.name "HKKoho"
git config user.email "hkkoho@users.noreply.github.com"
```

## Architecture Overview

### Routing & Access Control

**Two Distinct User Experiences:**
- **Student Routes** (`/`): Learning interface with module player, voice input, AI feedback
- **Admin Routes** (`/admin/*`): Complete CMS for content management, analytics, user administration

**Authentication Flow:**
- `useAuth` hook (`src/hooks/useAuth.tsx`) manages authentication state
- `ProtectedRoute` component guards admin routes
- User role stored in `users.role` column (`student` | `admin`)
- Session persists via localStorage with Supabase sync

### Frontend Structure

```
src/
├── components/
│   ├── admin/              # Admin-only components
│   │   ├── AdminLayout.tsx       # Sidebar navigation, top bar
│   │   ├── ModuleTable.tsx       # Sortable data table
│   │   ├── PerspectiveEditor.tsx # 3-column biblical perspective editor
│   │   ├── RichTextEditor.tsx    # WYSIWYG content editing
│   │   ├── DynamicList.tsx       # Add/remove/reorder lists
│   │   ├── StatusBadge.tsx       # Draft/Published/Archived indicators
│   │   ├── ConfirmDialog.tsx     # Modal confirmations
│   │   └── Toast.tsx             # Notification system (replaces alerts)
│   ├── ErrorBoundary.tsx   # Global error handling
│   └── [legacy]/           # Root-level components for student interface
│       ├── BibleBooklist.tsx    # Module selection grid
│       ├── BibleBookPlayer.tsx  # Interactive module content delivery
│       ├── SpeechInputButton.tsx # Web Speech API voice input
│       ├── AudioNarration.tsx   # Text-to-speech playback
│       ├── MichaelChat.tsx        # OpenAI-powered teaching assistant
│       ├── WordCloud.tsx        # Peer response visualization
│       └── ClassInsight.tsx     # Aggregated learning analytics
│
├── pages/
│   ├── admin/
│   │   ├── AdminDashboard.tsx   # Metrics, quick actions, system status
│   │   ├── ModulesManager.tsx   # Module CRUD with filtering/sorting
│   │   ├── ModuleEditor.tsx     # Multi-tabbed rich editor with auto-save
│   │   ├── CyclesManager.tsx    # Learning cycle organization
│   │   ├── UsersManager.tsx     # User role management
│   │   ├── AnalyticsView.tsx    # Learning engagement metrics
│   │   └── MigrationPage.tsx    # Data import/export tools
│   └── student/
│       └── StudentHome.tsx      # Wrapper for BibleBooklist + BibleBookPlayer
│
├── services/               # Business logic layer
│   ├── supabaseClient.ts        # Database client initialization
│   ├── moduleService.ts         # Module CRUD operations
│   ├── progressService.ts       # User progress tracking
│   ├── userService.ts           # User management & authentication
│   ├── responseService.ts       # Response storage & retrieval
│   ├── analyticsService.ts      # Data analysis & reporting
│   ├── geminiService.ts         # Google Gemini AI integration
│   ├── openaiService.ts         # OpenAI API (Michael assistant)
│   └── migrationService.ts      # Data migration utilities
│
├── routes/
│   ├── StudentRoutes.tsx   # Student route configuration
│   ├── AdminRoutes.tsx     # Admin route configuration
│   └── ProtectedRoute.tsx  # Role-based route protection
│
├── hooks/
│   └── useAuth.tsx         # Centralized authentication state
│
├── types.ts                # Shared TypeScript definitions
└── constants.ts            # Legacy static data (being migrated to DB)
```

### Database Schema

**Core Content Tables:**
- `cycles` - Learning cycles (4 total)
- `modules` - Individual lessons (24 total)
- `life_questions` - Reflection questions per module
- `perspectives` - Three biblical viewpoints (Proverbs, Ecclesiastes, Job)
- `discussion_prompts` - Group discussion questions

**User & Progress Tables:**
- `users` - Student and admin accounts with `role` column
- `user_progress` - Module completion tracking
- `responses` - Student answers with AI feedback
- `ai_conversations` - Michael assistant chat history

**Security:**
- Row-Level Security (RLS) enforced on all tables
- Students can only view `published` content
- Admins can view/edit all content including `draft` and `archived`
- Users can only modify their own progress and responses

### Key Implementation Patterns

**1. Admin CMS Workflow**
- Modules have status: `draft` → `published` → `archived`
- Auto-save every 3 seconds while editing (only for existing modules)
- Rich text editor for content, 3-column perspective editor
- Toast notifications instead of alerts for better UX

**2. Student Learning Flow**
1. Login → Select module → View perspectives
2. Reflect on life questions → Submit voice/text responses
3. Receive AI feedback from Gemini
4. Engage with Michael AI teaching assistant
5. View peer responses via word clouds
6. Mark module complete → Progress saved to Supabase

**3. AI Integration**
- **Gemini API** (`geminiService.ts`): Personalized feedback on student responses
- **OpenAI API** (`openaiService.ts`): Michael AI teaching assistant with conversation history
- **Web Speech API** (`SpeechInputButton.tsx`): Browser-native speech-to-text
- **Speech Synthesis API** (`AudioNarration.tsx`): Text-to-speech narration

**4. State Management**
- No global state library (Redux/MobX)
- `useAuth` hook for authentication context
- Service layer pattern for business logic
- React Router for navigation state
- Local storage for offline fallback

## Environment Variables

Required in `.env.local` (development) and Vercel (production):

```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini (Required for AI feedback)
VITE_GEMINI_API_KEY=AIzaSyXXXXXX

# OpenAI (Required for Michael AI assistant)
VITE_OPENAI_API_KEY=sk-proj-XXXXX
```

**Critical:** All Vite environment variables must be prefixed with `VITE_`

## Common Development Tasks

### Creating a New Admin Component

1. Place in `src/components/admin/`
2. Import in `AdminLayout.tsx` or relevant page
3. Use `Toast` for notifications (never `alert()`)
4. Follow existing slate/gray theme for admin UI

### Adding a New Service Function

1. Create function in appropriate service file (`services/`)
2. Use Supabase client from `supabaseClient.ts`
3. Handle errors gracefully with try/catch
4. Return typed objects matching `types.ts` interfaces

### Modifying Database Schema

1. Create new migration in `sql/` directory with incremented number
2. Test locally via psql connection
3. Update RLS policies if adding new tables (`002_create_rls_policies.sql`)
4. Update TypeScript types in `types.ts`
5. Run migration in Supabase dashboard SQL Editor

### Adding a New Module Property

1. Update `Module` interface in `types.ts`
2. Update database schema in `sql/001_create_tables.sql`
3. Modify `ModuleEditor.tsx` to include new field
4. Update `moduleService.ts` CRUD functions
5. Update `BibleBookPlayer.tsx` if shown to students

## Important Constraints

### Code Organization
- **NEVER** create new files in root `/components` - migrate to `/src/components`
- Admin components MUST be in `/src/components/admin/`
- All new TypeScript files go in `/src/` directory

### UI/UX Guidelines
- Use **Toast notifications** instead of `alert()` calls
- Admin interface uses **slate/gray** color scheme
- Student interface uses **warm/inviting** colors
- All text must support **Chinese and English**
- Forms require validation before submission

### Database Best Practices
- Check user role before admin operations (enforced at application level)
- Use transactions for multi-table updates
- Index foreign keys and frequently queried columns

**Important Note on RLS:**
- This app uses custom authentication (name-based login), NOT Supabase Auth
- RLS policies allow all operations via anon key for content tables (cycles, modules, etc.)
- Security is enforced at application level by checking `user.role === 'admin'`
- User data (users, responses, progress) is still protected by RLS
- If you need stricter database-level security, implement Supabase Auth

### Security Considerations
- Validate user permissions in service layer
- Sanitize user input before database queries
- Never expose service role key in frontend
- Use parameterized queries via Supabase client

## Migration Status

**Current State:**
- Admin CMS is **fully functional** (Phases 1-5, 7 complete)
- Student interface still uses `constants.ts` for static data
- Phase 6 (Data Migration) is pending - when ready:
  1. Run migration script via `MigrationPage.tsx`
  2. Update `BibleBooklist.tsx` to fetch from database
  3. Test student interface thoroughly

**Implementation Status:** See `IMPLEMENTATION_STATUS.md` for detailed phase-by-phase progress.

## Deployment

**Target Platform:** Vercel

**Deployment Process:**
1. Ensure all environment variables are set in Vercel dashboard
2. Push to GitHub main branch (auto-deploys if connected)
3. Or use: `vercel --prod` via CLI
4. Verify admin access at `https://your-app.vercel.app/admin`

**Configuration:**
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite
- SPA rewrites handled in `vercel.json`

See `DEPLOYMENT.md` for comprehensive deployment guide.

## Additional Documentation

- **SUPABASE_SETUP.md** - Complete database setup walkthrough
- **IMPLEMENTATION_STATUS.md** - Admin CMS development progress
- **DEPLOYMENT.md** - Vercel deployment instructions
- **README.md** - Project overview and features

## TypeScript Configuration

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json` and `vite.config.ts`)
- Prefer explicit imports over aliases for better IDE support

**Key Compiler Options:**
- Target: ES2022
- JSX: react-jsx (React 19)
- Module resolution: bundler (Vite)
- Experimental decorators enabled (for future use)

## Testing & Debugging

**No formal test suite yet** - manual testing workflow:

1. **Admin CMS Testing:**
   - Create/edit/delete modules as admin user
   - Verify status transitions (draft → published)
   - Check RLS policies by switching to student account
   - Validate auto-save functionality

2. **Student Interface Testing:**
   - Login as student
   - Complete module flow end-to-end
   - Test voice input on supported browsers (Chrome, Edge)
   - Verify progress persistence across sessions
   - Test Michael AI assistant conversations

3. **Database Testing:**
   - Use psql connection to verify data integrity
   - Check RLS policies with different user roles
   - Monitor Supabase dashboard for errors

**Debugging Tools:**
- Browser DevTools (React DevTools recommended)
- Supabase dashboard for database queries
- Vite dev server error overlay
- Console logs (use sparingly in production)
