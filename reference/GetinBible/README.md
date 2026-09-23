# 讀經獎勵計劃 (GetinBible)

A Bible study platform focused o

## Overview

GetinBible is an interactive learning platform that guides students through bible reading.

## Features

### Student Experience
- **Seasonal Learning Cycles** - Four seasons (春夏秋冬) with 6 lessons each
- **Multi-perspective Scripture Study** - Each lesson explores the same theme through Proverbs, Ecclesiastes, and Job
- **Life Questions** - Reflective questions connecting ancient wisdom to modern life
- **Discussion Prompts** - Guided discussion questions for deeper engagement
- **Michael AI Assistant** - AI-powered teaching assistant for personalized Q&A with voice support
- **Progress Tracking** - Track completion across modules and cycles
- **Learning Reflections** - Personal reflection summaries and AI-generated insights

### Admin Features
- **Module Management** - Create, edit, and publish lesson content
- **Cycle Management** - Organize modules into seasonal cycles
- **User Management** - Manage students and administrators
- **Analytics Dashboard** - View learning progress and statistics
- **Michael Digital Twin** - Configure AI assistant personality and responses
- **Data Migration** - Tools for migrating static content to database

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Routing**: React Router v7
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **AI Services**:
  - OpenAI GPT-4 (Michael AI assistant)
  - OpenAI TTS (Text-to-speech)
  - Google Gemini (Analysis generation)
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- OpenAI API key
- Google AI (Gemini) API key (optional, for analysis features)

### Environment Variables

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
GetinBible/
├── components/           # Shared React components
│   ├── BibleBookPlayer.tsx    # Main lesson player
│   ├── MichaelChat.tsx        # AI assistant chat interface
│   ├── SeasonalReadingGuide.tsx
│   ├── GroupDiscussion.tsx
│   └── ...
├── services/             # Backend service integrations
│   ├── supabaseClient.ts      # Supabase connection
│   ├── openaiService.ts       # OpenAI API integration
│   ├── geminiService.ts       # Google Gemini integration
│   ├── moduleService.ts       # Module CRUD operations
│   ├── responseService.ts     # User response handling
│   ├── analysisService.ts     # Learning analysis generation
│   └── ...
├── src/
│   ├── components/admin/      # Admin-specific components
│   ├── pages/
│   │   ├── admin/            # Admin pages
│   │   └── student/          # Student pages
│   ├── routes/               # Route definitions
│   └── hooks/                # Custom React hooks
├── types.ts              # TypeScript type definitions
├── constants.ts          # Static module data (seed data)
└── App.tsx               # Application root
```

## Key Concepts

### Learning Cycles

Content is organized into four seasonal cycles:
- **春 (Spring)** - Foundations: Causality, effort, and righteousness
- **夏 (Summer)** - Limitations: Time, words, wealth, and success
- **秋 (Autumn)** - Crisis: Pain, silence, and theological collapse
- **冬 (Winter)** - Integration: Discernment, correction, and life positioning

### Michael AI Assistant

Michael is an AI teaching assistant powered by OpenAI that:
- Answers questions about lesson content
- Remembers student's previous responses for context
- Provides voice responses via text-to-speech
- Supports voice input for questions

## Documentation

Additional documentation is available in the `/docs` directory:
- `CLAUDE.md` - Development guidelines
- `CODE_REVIEW_SUMMARY.md` - Code quality notes
- `MICHAEL_DIGITAL_TWIN_*.md` - AI assistant configuration

## License

Private project - All rights reserved.
