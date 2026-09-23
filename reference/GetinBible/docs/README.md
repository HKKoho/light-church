<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 智慧三棱鏡：人生課題，箴言，約伯記，傳道書

A comprehensive interactive course exploring wisdom from Proverbs, Ecclesiastes, and Job through three distinct perspectives, featuring both student learning interface and complete administrative content management system.

**View your app in AI Studio:** https://ai.studio/apps/drive/1uFP0xO8FIAcowLL-0v-TPRH0vKwvOJgm

## 📖 About the Course

This application delivers an interactive wisdom literature curriculum consisting of **24 modules** organized into **4 learning cycles**:

1. **第一循環：世界是否值得信任？** - Exploring causality, effort, and justice
2. **第二循環：人如何活在有限中？** - Understanding limits of time, speech, wealth, and success
3. **第三循環：當人生開始崩塌** - Facing pain, silence, and theological collapse
4. **第四循環：成熟的信仰如何整合？** - Wisdom discernment, correction, and life positioning

Each module presents wisdom through three biblical perspectives:
- **箴言 (Proverbs)**: How life should be ordered
- **傳道書 (Ecclesiastes)**: How life actually often is
- **約伯記 (Job)**: How life sometimes completely collapses

## ✨ Features

- 📚 **Interactive Curriculum**: 24 structured modules with life questions and discussion prompts
- 🤖 **AI-Powered Feedback**: Google Gemini integration for personalized responses
- 🗣️ **Speech-to-Text Input**: Voice responses with real-time transcription
- 🔊 **Text-to-Speech Narration**: Audio narration for accessibility
- 📊 **Peer Response Aggregation**: Word clouds showing community insights
- 💾 **Auto-Save Progress**: Supabase backend with offline fallback
- ✅ **Progress Tracking**: Cross-session completion tracking
- 🔐 **User Management**: Multi-user support with login system
- 🛠️ **Comprehensive Admin CMS**: Full content management system with:
  - **Module Management**: Create, edit, publish, and archive course modules
  - **Rich Content Editor**: Multi-tabbed editor with perspective management
  - **User Administration**: Role-based access control and user management
  - **Analytics Dashboard**: Learning engagement and completion metrics
  - **Data Migration Tools**: Import/export functionality for content management
  - **Cycle Organization**: Manage learning cycles and module grouping

## 🏗️ Application Architecture

### Project Structure
```
wisdominbible/
├── src/                          # Main source directory
│   ├── components/               # Shared React components
│   │   ├── admin/                # Admin-specific components
│   │   │   ├── AdminLayout.tsx       # Admin interface layout
│   │   │   ├── ConfirmDialog.tsx     # Confirmation dialogs
│   │   │   ├── DynamicList.tsx       # Dynamic list components
│   │   │   ├── ModuleTable.tsx       # Module data tables
│   │   │   ├── PerspectiveEditor.tsx # Perspective editing
│   │   │   ├── RichTextEditor.tsx    # Rich text editing
│   │   │   ├── StatusBadge.tsx       # Status indicators
│   │   │   └── Toast.tsx             # Notification system
│   │   ├── ErrorBoundary.tsx     # Error handling component
│   │   └── ...
│   ├── hooks/                    # Custom React hooks
│   │   └── useAuth.tsx           # Authentication hook
│   ├── pages/                    # Page components
│   │   ├── admin/                # Admin pages
│   │   │   ├── AdminDashboard.tsx    # Admin dashboard
│   │   │   ├── AnalyticsView.tsx     # Analytics and insights
│   │   │   ├── CyclesManager.tsx     # Learning cycles management
│   │   │   ├── MigrationPage.tsx     # Data migration tools
│   │   │   ├── ModuleEditor.tsx      # Module content editor
│   │   │   ├── ModulesManager.tsx    # Module management
│   │   │   └── UsersManager.tsx      # User management
│   │   └── student/              # Student pages
│   │       └── StudentHome.tsx       # Student learning interface
│   └── routes/                   # Route configurations
│       ├── AdminRoutes.tsx       # Admin route definitions
│       ├── ProtectedRoute.tsx    # Route protection
│       └── StudentRoutes.tsx     # Student route definitions
├── components/                   # Legacy components (being migrated)
│   ├── AudioNarration.tsx        # Text-to-speech functionality
│   ├── ClassInsight.tsx          # Peer response aggregation
│   ├── Layout.tsx               # Main app layout
│   ├── Login.tsx                # User authentication
│   ├── BibleBooklist.tsx        # Module selection interface
│   ├── BibleBookPlayer.tsx      # Interactive module content
│   ├── SpeechInputButton.tsx    # Voice input component
│   └── WordCloud.tsx            # Visualization component
├── services/                    # Business logic and API integration
│   ├── analyticsService.ts      # Analytics and reporting
│   ├── geminiService.ts         # Google Gemini AI integration
│   ├── migrationService.ts      # Database migration utilities
│   ├── moduleService.ts         # Module data management
│   ├── progressService.ts       # User progress management
│   ├── responseService.ts       # Response handling
│   ├── supabaseClient.ts        # Database client
│   └── userService.ts           # User management
├── sql/                        # Database migration scripts
│   ├── 001_create_tables.sql   # Table creation
│   └── 002_create_rls_policies.sql # Security policies
├── App.tsx                     # Main application component
├── types.ts                    # TypeScript type definitions
├── constants.ts                # Application constants and data
├── index.tsx                   # Application entry point
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
├── vercel.json                 # Vercel deployment config
└── metadata.json               # App metadata
```

### Architecture Overview

The application follows a modern React architecture with clear separation of concerns:

#### **Frontend Architecture**
- **React 19** with TypeScript for type safety
- **React Router** for client-side routing
- **Custom Hooks** for state management and side effects
- **Component-based architecture** with shared and role-specific components

#### **Routing & Access Control**
- **Student Routes** (`/`): Learning interface for course participants
- **Admin Routes** (`/admin/*`): Content management system
- **Protected Routes**: Role-based access control for admin features
- **Authentication**: Supabase-based user management with role assignment

#### **State Management**
- **useAuth Hook**: Centralized authentication state
- **Service Layer**: Business logic abstraction
- **Local Storage**: Offline fallback for user sessions

#### **Backend Integration**
- **Supabase**: PostgreSQL database with real-time features
- **Google Gemini AI**: Intelligent feedback and analysis
- **Row-Level Security**: Database-level access control

### Admin CMS Overview

The application includes a comprehensive Content Management System (CMS) accessible at `/admin` for administrators to manage all course content, users, and analytics without affecting the student learning experience.

#### **Core CMS Features**
- **Module Management**: Full CRUD operations for course modules with draft/publish workflow
- **Rich Content Editing**: Multi-tabbed editor with specialized components for:
  - Biblical perspective management (Proverbs, Ecclesiastes, Job)
  - Dynamic question and prompt lists
  - Rich text formatting and media integration
- **User Administration**: Role-based access control with admin/student user management
- **Analytics & Reporting**: Learning engagement metrics and completion tracking
- **Data Migration**: Tools for importing/exporting course content and user data

#### **Admin User Experience**
- **Professional Interface**: Clean, intuitive admin dashboard with sidebar navigation
- **Bulk Operations**: Efficient management of multiple modules and users
- **Real-time Collaboration**: Database-backed content management with conflict resolution
- **Audit Trail**: Complete tracking of content changes and user actions
- **Responsive Design**: Works seamlessly across desktop and tablet devices

#### **Implementation Status**
The admin CMS is fully functional with implemented components including:
- ✅ Complete module CRUD operations
- ✅ Rich text editing and perspective management
- ✅ User role management and access control
- ✅ Analytics dashboard with learning metrics
- ✅ Data migration and import/export tools

### Key Components

#### **Student Interface**
- **StudentHome**: Main learning dashboard with module selection
- **BibleBookPlayer**: Interactive content delivery with multimedia features
- **AudioNarration**: Accessibility through text-to-speech
- **SpeechInputButton**: Voice-based response input
- **WordCloud**: Visual representation of peer responses
- **ClassInsight**: Community learning analytics

#### **Admin Interface**
- **AdminDashboard**: Overview with key metrics, quick actions, and system status
- **ModulesManager**: Complete module lifecycle management with filtering, sorting, and bulk operations
- **ModuleEditor**: Advanced multi-tabbed editor featuring:
  - Rich text editing for content creation
  - Three-perspective management (Proverbs, Ecclesiastes, Job)
  - Dynamic list management for questions and prompts
  - Auto-save functionality and draft/publish workflow
- **CyclesManager**: Learning cycle organization and management
- **UsersManager**: User administration with role assignment and access control
- **AnalyticsView**: Comprehensive learning analytics and engagement metrics
- **MigrationPage**: Data migration utilities and content import/export tools

#### **Admin Components**
- **AdminLayout**: Professional admin interface with sidebar navigation and user controls
- **ModuleTable**: Sortable, filterable data table with status indicators and actions
- **PerspectiveEditor**: Specialized three-column editor for biblical perspectives
- **RichTextEditor**: WYSIWYG content editing with formatting controls
- **DynamicList**: Add/remove/reorder interface for questions and prompts
- **StatusBadge**: Visual status indicators for content workflow
- **ConfirmDialog**: Modal dialogs for destructive actions
- **Toast**: Notification system for user feedback

#### **Services Layer**
- **geminiService**: AI-powered feedback generation
- **moduleService**: Module data operations
- **progressService**: Learning progress tracking
- **responseService**: User response management
- **userService**: Authentication and user management
- **analyticsService**: Data analysis and reporting
- **supabaseClient**: Database connectivity

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router DOM v7
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **AI Integration**: Google Gemini API
- **Deployment**: Vercel
- **Database**: PostgreSQL with Row-Level Security
- **Authentication**: Supabase Auth
- **Build Tool**: Vite
- **Type Checking**: TypeScript

## 🚀 Run Locally

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wisdominbible
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Database Setup**

   Follow the detailed setup guide in [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

   Key steps:
   - Create a Supabase project
   - Run SQL migrations from the `sql/` directory
   - Configure Row-Level Security policies
   - Create admin user accounts

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173`

## 📦 Build for Production

```bash
npm run build
npm run preview
```

## 🚀 Deploy to Vercel

1. **Push your code to GitHub**
2. **Import your repository in Vercel**
3. **Add environment variables in Vercel dashboard:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
4. **Deploy!**

## 📚 Usage

### For Students
1. **Login**: Enter your name to start or continue your learning journey
2. **Select Module**: Choose from available modules in the course overview
3. **Engage Content**: Read perspectives, reflect on life questions
4. **Voice Responses**: Use speech input or text to share your thoughts
5. **AI Feedback**: Receive personalized insights from Gemini AI
6. **View Insights**: Explore aggregated peer responses and word clouds
7. **Track Progress**: Monitor your completion across all modules

### For Administrators
1. **Access Admin Panel**: Navigate to `/admin` (requires admin role)
2. **Dashboard Overview**: View system metrics, recent activity, and quick actions
3. **Content Management**: 
   - Create and edit modules using the rich editor
   - Manage three biblical perspectives for each module
   - Organize content into learning cycles
   - Publish content with draft/publish workflow
4. **User Management**: Assign admin roles and manage user access
5. **Analytics**: Monitor learning engagement and completion rates
6. **Data Operations**: Import/export course content and migrate data as needed

## 🤝 Contributing

This project was built with AI Studio and enhanced with Supabase backend integration.

## 📄 License

This project is built with AI Studio and enhanced with Supabase backend integration.
