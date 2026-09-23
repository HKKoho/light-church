# YouTube Video Feature for Life Questions
## Feature Documentation

**Date Implemented:** January 7, 2026
**Feature:** Optional YouTube video clips for life questions
**Purpose:** Enrich student reflection by providing short video content before answering life questions

---

## Overview

Instructors can now add optional YouTube videos (recommended < 5 minutes) to any life question (人生問題) in Step 1 of the module learning flow. When a video is provided, students will see it displayed before the question text, helping them refresh their mind and prepare to answer thoughtfully.

---

## For Administrators: How to Add YouTube Videos

### Step 1: Edit a Module

1. Go to **Admin Dashboard** → **Modules Manager**
2. Click "編輯" (Edit) on any module
3. Navigate to **Tab 2: 人生問題 (Life Questions)**

### Step 2: Add YouTube URL

For each life question, you'll now see a new field:

```
YouTube 影片連結（選填） - 建議5分鐘內短片
```

**Supported URL formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

**Example:**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Step 3: Save Module

Click "儲存模組" (Save Module) to save your changes. The YouTube video will now appear for students when they reach that life question.

---

## For Students: Video Display

When a life question has an associated video:

1. **Video appears first** with a 🎬 icon and message:
   ```
   先觀看短片，幫助你思考這個問題
   (Watch the video first to help you think about this question)
   ```

2. **Responsive video player** - Works on desktop and mobile

3. **Question appears below** the video for immediate reflection

4. **Standard input methods** remain available:
   - Text input for open questions
   - Multiple choice for selection questions
   - Voice input (microphone button)

---

## Implementation Details

### Database Schema Change

**Migration:** `sql/010_add_youtube_url_to_life_questions.sql`

```sql
ALTER TABLE life_questions
ADD COLUMN youtube_url TEXT;
```

**To apply this migration:**
1. Open Supabase SQL Editor
2. Copy and paste the SQL from `sql/010_add_youtube_url_to_life_questions.sql`
3. Execute the query

### Files Modified

1. **Types** (`types.ts`)
   - Added `youtube_url?: string` to `LifeQuestion` interface
   - Added `youtube_url?: string` to `LifeQuestionInput` interface

2. **Admin Editor** (`src/components/admin/LifeQuestionEditor.tsx`)
   - Added YouTube URL input field with helpful placeholder
   - Added handler `handleYouTubeUrlChange`
   - Field appears between "Question Type" and "Options"

3. **Student Interface** (`components/BibleBookPlayer.tsx`)
   - Imported `YouTubeEmbed` component
   - Added conditional video display before each life question
   - Video only shows if `youtube_url` is provided

4. **YouTube Component** (`src/components/YouTubeEmbed.tsx`) - NEW
   - Extracts video ID from various YouTube URL formats
   - Displays responsive 16:9 video player
   - Shows error message for invalid URLs
   - Lazy loading for better performance

5. **Module Service** (`services/moduleService.ts`)
   - Updated `insertLifeQuestions` to include `youtube_url`

6. **Module Editor** (`src/pages/admin/ModuleEditor.tsx`)
   - Updated module loading to preserve `youtube_url` when editing

---

## Validation & Error Handling

### Valid YouTube URLs

The system accepts these formats:
- ✅ `https://www.youtube.com/watch?v=VIDEO_ID`
- ✅ `https://youtu.be/VIDEO_ID`
- ✅ `https://www.youtube.com/embed/VIDEO_ID`

### Invalid URLs

If an invalid YouTube URL is entered, students will see:
```
⚠️ 無效的 YouTube 連結 / Invalid YouTube URL
請使用正確的 YouTube 連結格式 / Please use a valid YouTube URL
```

### Empty Field

If no YouTube URL is provided (field left blank), no video section appears. This is completely optional.

---

## Best Practices

### Video Length
- **Recommended:** < 5 minutes
- **Maximum:** No hard limit, but shorter is better
- **Why:** Keep students focused and avoid overwhelming them

### Video Content
- **Relevant:** Directly related to the life question
- **Thought-provoking:** Encourages reflection, not just entertainment
- **Language:** Consider providing bilingual options (Chinese/English) when possible

### Example Use Cases

**Module 1: Proverbs on Order**
- Life Question: "你認為世界是有秩序的嗎？為什麼？"
- Video: 3-minute TED-Ed video on patterns in nature
- Purpose: Help students visualize order before reflecting

**Module 8: Ecclesiastes on Vanity**
- Life Question: "你曾經覺得生活失去意義嗎？什麼時候？"
- Video: 4-minute short film about daily routines and meaning
- Purpose: Create emotional connection before personal sharing

**Module 15: Job on Suffering**
- Life Question: "為什麼好人會遭遇不幸？"
- Video: 5-minute documentary clip on resilience
- Purpose: Frame the theological question with real-world context

---

## Testing Checklist

### Admin Interface
- [ ] Can add YouTube URL to new life question
- [ ] Can edit YouTube URL in existing life question
- [ ] Can remove YouTube URL (clear field)
- [ ] URL field shows helpful placeholder and hint text
- [ ] Save/update module preserves YouTube URL

### Student Interface
- [ ] Video displays correctly with valid URL
- [ ] Video is responsive (works on mobile)
- [ ] Video player allows fullscreen
- [ ] No video section appears when URL is empty
- [ ] Error message shows for invalid URL
- [ ] Question still works normally after watching video

### URL Format Testing
Test these URL formats:
- [ ] `https://www.youtube.com/watch?v=VIDEO_ID`
- [ ] `https://youtu.be/VIDEO_ID`
- [ ] `https://www.youtube.com/embed/VIDEO_ID`
- [ ] Invalid URL shows error message

---

## Deployment Checklist

Before deploying this feature to production:

1. **Database Migration**
   ```sql
   -- Run in Supabase SQL Editor
   ALTER TABLE life_questions ADD COLUMN youtube_url TEXT;
   ```

2. **Build and Test**
   ```bash
   npm run build
   npm run dev # Test locally
   ```

3. **Verify Changes**
   - Check admin editor UI
   - Check student player UI
   - Test with sample YouTube video

4. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "feat: Add YouTube video option to life questions"
   git push origin main
   ```

5. **Post-Deployment Verification**
   - Create test module with YouTube video
   - View as student to verify video displays
   - Test on mobile device

---

## Future Enhancements (Optional)

### Possible Improvements:
1. **Video Analytics:** Track if students watched the video
2. **Multiple Videos:** Allow more than one video per question
3. **Video Timing:** Show video at specific step (before/after question)
4. **Other Platforms:** Support Vimeo, Bilibili, etc.
5. **Thumbnail Preview:** Show video thumbnail in admin editor
6. **Duration Validation:** Warn if video > 5 minutes
7. **Auto-play Control:** Let admin choose if video auto-plays

---

## Technical Notes

### Component Architecture

```
BibleBookPlayer
  └── LifeQuestion (map)
       └── YouTubeEmbed (conditional)
            └── iframe (YouTube embed)
```

### YouTube Embed Security

- Uses `https://www.youtube.com/embed/` for iframe src
- Includes proper iframe sandbox attributes
- Lazy loading enabled for performance
- Responsive 16:9 aspect ratio maintained

### Performance Considerations

- Video player uses lazy loading (`loading="lazy"`)
- Only loads when YouTube URL is present
- Responsive container prevents layout shift
- No external libraries needed (native iframe)

---

## Support & Troubleshooting

### Issue: Video not displaying
**Possible causes:**
- YouTube URL is invalid or malformed
- Video is private or restricted
- Browser blocking iframe embeds
**Solution:** Verify URL format, check video privacy settings

### Issue: Video too small/large on mobile
**Solution:** The embed is responsive and should auto-adjust. If issues persist, check the `YouTubeEmbed.tsx` component's padding-bottom value (currently 56.25% for 16:9 ratio)

### Issue: Video not saving in admin
**Possible causes:**
- Database migration not run
- TypeScript build errors
**Solution:** Run migration SQL, rebuild project: `npm run build`

---

## Migration SQL (Reference)

**File:** `sql/010_add_youtube_url_to_life_questions.sql`

```sql
-- Migration: Add YouTube URL field to life_questions table
-- Purpose: Allow optional video clips (< 5 min) to enrich life questions
-- Date: 2026-01-07

ALTER TABLE life_questions
ADD COLUMN youtube_url TEXT;

COMMENT ON COLUMN life_questions.youtube_url IS
  'Optional YouTube video URL (< 5 min) to help students reflect before answering';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'life_questions'
  AND column_name = 'youtube_url';
```

---

## Changelog

### Version 1.0 (2026-01-07)
- ✅ Added `youtube_url` field to database
- ✅ Created `YouTubeEmbed` component
- ✅ Updated admin `LifeQuestionEditor` with URL input
- ✅ Updated student `BibleBookPlayer` with video display
- ✅ Updated TypeScript types and service layer
- ✅ Build successful, ready for testing

---

## Example Screenshots (Text Description)

### Admin Interface:
```
┌─────────────────────────────────────────────┐
│ 問題內容                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ 你認為世界是有秩序的嗎？為什麼？           │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 問題類型                                      │
│ [開放式問題（文字輸入）▼]                      │
│                                             │
│ YouTube 影片連結（選填）- 建議5分鐘內短片       │
│ ┌─────────────────────────────────────────┐ │
│ │ https://www.youtube.com/watch?v=...    │ │
│ └─────────────────────────────────────────┘ │
│ 💡 提供短片幫助學員在回答問題前思考與準備       │
└─────────────────────────────────────────────┘
```

### Student Interface:
```
┌─────────────────────────────────────────────┐
│ 🎬 先觀看短片，幫助你思考這個問題              │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │        [YouTube Video Player]           │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 你認為世界是有秩序的嗎？為什麼？               │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 在此寫下您的想法 or 點擊上方麥克風...       │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

**Feature Status:** ✅ Implemented and ready for use
**Next Step:** Run database migration and test in production
**Documentation Updated:** January 7, 2026
