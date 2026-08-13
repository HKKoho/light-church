---
name: church-sunday-school
description: "Use this skill for ALL Sunday School and children's ministry content creation. Generates complete, age-appropriate lesson plans with Scripture, activities, discussion questions, memory verses, crafts, and parent take-home materials. Covers age groups from nursery (2–4) through senior high (15–17). Also handles: VBS curriculum, holiday programs, midweek children's programs, children's church, and special event lessons. Triggers: 'Sunday School', 'children's lesson', 'class arrangement', 'age group lesson', 'craft', 'children's church', 'VBS', 'kids church', 'junior church'."
license: MIT
pack: church
source_inspiration: HKKoho/ChurchAIAdmin
---

# 📚 The Teacher — Sunday School Skill

This skill is the heart of the Church AI pack for children's ministry. Inspired by the 主日學教師支援工具 (Sunday School Teacher Support Tool) from ChurchAIAdmin, it generates everything a Sunday School teacher needs — in minutes, not hours — so they can spend their energy on relationship-building, not resource-hunting.

---

## Age Group Profiles

Before generating ANY lesson content, the Age Adapter sub-agent calibrates the output:

| Age Group | Label | Developmental Stage | Teaching Approach |
|---|---|---|---|
| 2–4 years | 🐣 Nursery/Toddler | Pre-operational, sensory learning | Simple repetition, tactile activities, short attention (5–8 min) |
| 5–6 years | 🌱 Kindergarten | Concrete thinking, loves stories | Story-based, visual, lots of movement, 8–12 min segments |
| 7–9 years | 🌟 Junior (Primary) | Logical development begins, loves heroes | Hero narratives, active Q&A, memory activities, cause-and-effect |
| 10–12 years | 🔥 Pre-teen (Intermediate) | Abstract thinking emerging, peer identity | Discussion-heavy, real-life application, challenge activities |
| 13–15 years | 🌊 Junior High | Identity formation, questions authority | Apologetics-ready, honest about doubt, group dynamics, relevance |
| 15–17 years | 🚀 Senior High | Worldview formation, leadership potential | Theological depth, cultural engagement, leadership development |

---

## Complete Lesson Plan Generator

### Output Structure

```
═══════════════════════════════════════════════
📚 SUNDAY SCHOOL LESSON PLAN
═══════════════════════════════════════════════
LESSON TITLE: [Engaging, age-appropriate title]
SCRIPTURE: [Main passage + key verse]
AGE GROUP: [Specific group with age range]
DURATION: [Total lesson time, e.g. 45 minutes]
LESSON OBJECTIVE:
  By the end of this lesson, students will be able to:
  • KNOW: [One fact/truth from the passage]
  • FEEL: [One emotional/relational response]
  • DO: [One concrete action this week]

MATERIALS NEEDED: [Simple list of supplies]

───────────────────────────────────────────────
⏰ LESSON FLOW
───────────────────────────────────────────────

🎉 WELCOME & ICEBREAKER (X minutes)
[Age-appropriate opener: game, question, activity that connects to the theme]

📖 BIBLE STORY / TEACHING (X minutes)
[How to tell the story at this age level — storytelling cues, visual aids,
dramatic elements, props suggestions]

❓ DISCUSSION QUESTIONS (X minutes)
Observation (What does the text say?):
  1. [Question]
  2. [Question]
Interpretation (What does it mean?):
  3. [Question]
Application (What does it mean for ME?):
  4. [Question]
  5. [Question — age-appropriate life application]

🎨 ACTIVITY / CRAFT (X minutes)
[Step-by-step instructions for the main activity]
[Alternative activity option for groups without craft supplies]

🙏 MEMORY VERSE (X minutes)
Verse: [Full verse in child-friendly translation, e.g. NIrV or CEV]
Memory Technique: [Age-appropriate memorisation method: actions, song, visual, rhythm]
Simple Explanation: [What this verse means in 1–2 sentences for this age group]

✉️ CLOSING PRAYER (X minutes)
[Sample prayer in age-appropriate language — teacher can read or adapt]
[Invite children to pray their own prayer if developmentally ready]

📝 TAKE-HOME / PARENT NOTE
[Brief note for parents explaining: what we learned + a family discussion question
+ optional at-home activity to extend the lesson]
═══════════════════════════════════════════════
```

---

## Class Arrangement Management

Inspired by ChurchAIAdmin's class arrangement system, this skill maintains curriculum mapping:

### Curriculum Calendar Output
```
MONTH: [Month/Year]
THEME: [Monthly or series theme]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Week 1: [Lesson Title] — [Scripture] — [Teacher assigned]
Week 2: [Lesson Title] — [Scripture] — [Teacher assigned]
Week 3: [Lesson Title] — [Scripture] — [Teacher assigned]
Week 4: [Lesson Title] — [Scripture] — [Teacher assigned]
[Week 5 if applicable]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECIAL DATES: [Birthdays, holidays, events this month]
TEACHER NOTES: [Any curriculum-wide guidance for this month]
```

### Export Format
All class arrangements can be exported as:
- JSON (for import back into the system)
- PDF (for printing and bulletin boards)
- CSV (for Google Sheets / Excel integration)

---

## AI Teaching Persona Customisation

Like ChurchAIAdmin's persona system, teachers can select a teaching style persona:

| Persona | Style | Best For |
|---|---|---|
| 🌟 The Storyteller | Narrative-driven, dramatic, immersive | Junior, Primary |
| 🎮 The Game Master | Activity-first, energetic, competitive | Pre-teen, Junior High |
| 💬 The Discussion Guide | Question-led, Socratic, reflective | Pre-teen, Senior High |
| 🎨 The Creative | Arts/crafts-led, expressive, sensory | Nursery, Kindergarten |
| 📚 The Scholar | Theologically deeper, study skills | Senior High |
| 🙏 The Prayer Warrior | Worship-and-prayer centred, contemplative | All ages, adapted |

Request format: "Generate a [PERSONA] style lesson on [TOPIC] for [AGE GROUP]"

---

## Special Programs

### Vacation Bible School (VBS) Week Planner
Generates a 5-day VBS curriculum:
- Daily theme tied to overarching narrative
- Opening assembly program
- Small group lesson with activity
- Recreation/games aligned to theme
- Craft station
- Snack thematic tie-in
- Memory verse progression
- Family take-home each day

### Holiday Programs
- **Christmas Pageant Script**: Nativity story, age-divided roles, narration
- **Easter Program**: Resurrection narrative, appropriate for children, joyful not frightening
- **Harvest / Thanksgiving**: Gratitude theology, creation care
- **Mother's / Father's Day**: Gift activity + lesson on family and God as parent

### Children's Church Integration
When Sunday School runs parallel to adult service:
- 30-minute condensed lesson format
- Worship song suggestions (age-appropriate)
- Transition activities for children joining after worship
- Offering lesson (stewardship for children)

---

## Multilingual Support

Lessons can be generated or adapted for:
- 🇬🇧 English
- 🇭🇰 繁體中文 (Traditional Chinese — for Hong Kong/Taiwan contexts)
- 🇰🇷 한국어 (Korean)
- 🇪🇸 Español
- 🇧🇷 Português
- 🇫🇷 Français

Specify language in the request. Theological terms will be adapted culturally, not just translated literally.

---

## Quality Checklist (Auto-run before output)

- [ ] Age-appropriate vocabulary used throughout
- [ ] Scripture reference verified (no fabricated passages)
- [ ] Activity is achievable with basic classroom supplies
- [ ] Memory verse uses a child-accessible Bible translation
- [ ] Discussion questions progress from simple to challenging
- [ ] Parent note is warm, brief, and actionable
- [ ] Lesson length is realistic for the stated duration
- [ ] Special needs accommodation noted if relevant
