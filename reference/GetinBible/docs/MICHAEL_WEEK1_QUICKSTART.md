# Michael Digital Twin - Week 1 Quick Start Guide
## Your First Steps Toward Creating a Teaching Legacy

**Goal:** By the end of this week, you'll have the foundational documents that will transform Michael from a generic AI into your digital teaching twin.

**Time Required:** 5-7 hours this week (can be split across 3-4 sessions)

---

## 📋 This Week's Checklist

- [ ] **Session 1** (2 hours): Write your teaching manifesto core
- [ ] **Session 2** (1.5 hours): Collect 10 sample responses
- [ ] **Session 3** (2 hours): Document Module 1 commentary
- [ ] **Session 4** (1 hour): Review and refine

**Deliverables by Week's End:**
1. ✅ Teaching philosophy draft (500-1000 words minimum)
2. ✅ 10 categorized sample responses
3. ✅ Module 1 detailed commentary
4. ✅ First version of Michael's enhanced system prompt

---

## Session 1: Write Your Teaching Manifesto (2 hours)

### Step 1: Open the Template (5 minutes)
```bash
cd /Users/drpanda/WisdominBible
open docs/teaching-philosophy-template.md
```

### Step 2: Answer These Core Questions (90 minutes)

**Set a timer for 20 minutes each. Write freely without editing:**

#### Question 1: Why do I teach wisdom literature THIS way?
*What makes your approach unique? What have you learned that others miss?*

**Prompt:** Close your eyes. Imagine a new teacher asking, "Why do you combine Proverbs, Ecclesiastes, and Job? Why not teach them separately?" What would you say?

[Write for 20 minutes]

---

#### Question 2: What theological convictions are non-negotiable?
*If you had to write a "teaching creed" in 5 statements, what would they be?*

**Prompt:** What theological "hills would you die on" in this course? What can you not compromise, even if it makes students uncomfortable?

[Write for 20 minutes]

---

#### Question 3: What do I hope students become?
*Not what you hope they know, but who you hope they become.*

**Prompt:** Fast forward 10 years. A former student writes you a thank-you letter. What transformation do you hope they describe?

[Write for 20 minutes]

---

#### Question 4: What are my top 3 teaching fears?
*What could go wrong? What keeps you up at night?*

**Prompt:** Imagine the worst outcome: a student finishes your course and becomes... what? (Legalistic? Cynical? Superficial?) How do you actively prevent this?

[Write for 20 minutes]

---

#### Question 5: How do I sound when I teach?
*If students closed their eyes, how would they recognize your voice?*

**Prompt:**
- What 5 adjectives describe your teaching voice?
- What phrases do you use repeatedly?
- What would you NEVER say?

[Write for 10 minutes]

---

### Step 3: Save Your Draft (5 minutes)

**Save as:**
```
docs/teaching-philosophy/teaching-manifesto-draft-v0.1.md
```

**Don't edit yet!** Raw thoughts are more authentic than polished prose.

---

## Session 2: Collect Sample Responses (1.5 hours)

### Step 1: Find 10 Actual Responses You've Given (45 minutes)

**Look in these places:**
- Email sent folder (search: "feedback", "well done", "I notice")
- LMS gradebook comments
- Forum discussion replies
- Chat transcripts with students
- Graded assignment feedback

**Goal:** Find 10 real responses where you:
1. Affirmed something good (3 examples)
2. Gently challenged shallow thinking (3 examples)
3. Addressed a theological concern (2 examples)
4. Encouraged authentic wrestling (2 examples)

---

### Step 2: Categorize & Annotate (45 minutes)

**For each response, record:**

```markdown
## Sample Response #1

### Category: [Affirming / Challenging / Correcting / Encouraging]

### Context:
- **Module:** [Which module?]
- **Student's original response:** "[What did they write?]"
- **Your response:** "[Copy your actual response]"

### Your Internal Thought Process:
**Why I responded this way:**
[What did you notice? What was your goal?]

**What I was watching for:**
[What would indicate they "got it" or missed it?]

**Alternative approaches I considered:**
[What else could you have said?]
```

**Save each as:**
```
data/teaching-corpus/sample-01-affirming.md
data/teaching-corpus/sample-02-challenging.md
...
```

---

## Session 3: Module 1 Deep Commentary (2 hours)

### Step 1: Open Module 1 Content (5 minutes)

**Pull up:**
- Module 1 life questions
- The three perspectives (Proverbs, Ecclesiastes, Job)
- Discussion prompts

---

### Step 2: Answer These for Each Life Question (90 minutes)

**Use this template for EACH life question in Module 1:**

```markdown
## Life Question: "[The question text]"

### Why I Ask This Question
**My pedagogical intent:**
[What am I really testing? What assumption am I surfacing?]

**Where this fits in the narrative:**
[How does this question set up later modules?]

---

### What I Look For in Responses

**Green flags (signs of maturity):**
- [What makes you think "Yes! They're getting it!"]
- [Example: "Acknowledges complexity without simplifying"]

**Yellow flags (needs guidance):**
- [What makes you think "Hmm, we need to go deeper"]
- [Example: "Gives textbook answer without personal engagement"]

**Red flags (theological concern):**
- [What makes you urgently concerned?]
- [Example: "Prosperity gospel undertones"]

---

### My Typical Follow-Up Questions

**If they show green flags:**
"[How do you deepen the conversation?]"

**If they show yellow flags:**
"[How do you probe gently?]"

**If they show red flags:**
"[How do you intervene pastorally?]"

---

### Common Student Misconceptions

**Misconception #1:** "[What do students often misunderstand?]"
**How I address it:** "[Your strategy]"

**Misconception #2:** "[Another common error]"
**How I address it:** "[Your strategy]"

---

### My Personal Notes

**What I learned teaching this question:**
[Any "aha" moments from your years of teaching this?]

**Where students often get stuck:**
[What roadblocks have you seen?]

**Breakthroughs I've witnessed:**
[Memorable moments when a student "got it"]
```

**Save as:**
```
docs/module-commentary/module-01-commentary.md
```

---

### Step 3: Quick Review (15 minutes)

**Read through what you wrote and ask:**
- Would someone reading this understand my heart?
- Have I captured specific examples, not just theory?
- If I died tomorrow, could Michael learn from this?

---

## Session 4: Create Michael's Enhanced Prompt (1 hour)

### Step 1: Synthesize Your Work (30 minutes)

**Open a new file:**
```
services/mariaSystemPromptV2.ts
```

**Copy this structure and fill it in using your Session 1-3 work:**

```typescript
/**
 * Michael v2.0: Digital Twin System Prompt
 * Trained on [Your Name]'s teaching philosophy
 * Last Updated: 2026-01-07
 */

export const MARIA_DIGITAL_TWIN_PROMPT = `
You are Michael (瑪利亞), the AI teaching assistant for the wisdom literature course designed by Dr. [Your Name].

## WHO YOUR TEACHER IS

[Paste 2-3 paragraphs from your Session 1 manifesto - who you are, why you teach this way]

---

## YOUR TEACHER'S CORE CONVICTIONS

[Paste your 5 non-negotiable theological commitments from Session 1]

1. 敬畏耶和華是智慧的開端 - [Your specific understanding]
2. [Conviction #2]
3. [Conviction #3]
4. [Conviction #4]
5. [Conviction #5]

---

## HOW YOUR TEACHER RESPONDS TO STUDENTS

### When a student shows superficial understanding:
[Paste pattern from Session 2 examples]

**Example from your teacher:**
"[Paste one of your actual responses]"

### When a student wrestles authentically:
[Paste pattern from Session 2 examples]

**Example from your teacher:**
"[Paste one of your actual responses]"

### When a student shows theological red flags:
[Paste pattern from Session 2 examples]

**Example from your teacher:**
"[Paste one of your actual responses]"

---

## YOUR TEACHER'S VOICE

**Tone:** [Paste your 5 adjectives from Session 1]

**Signature phrases:**
- "[Phrase 1]"
- "[Phrase 2]"
- "[Phrase 3]"

**Never say:**
❌ "[Things you never say #1]"
❌ "[Things you never say #2]"
❌ "[Things you never say #3]"

---

## FOR MODULE 1 SPECIFICALLY

[Paste key insights from Session 3 - what to watch for, how to respond]

### Life Question 1: "[Question text]"
**Watch for:** [Green/yellow/red flags]
**Respond by:** [Your typical strategy]

[Repeat for other Module 1 questions]

---

## YOUR BOUNDARIES

**You are NOT a replacement for human mentorship.**

When you encounter:
- Theological red flags → Respond pastorally, suggest talking to a mentor
- Mental health concerns → Express care, suggest professional help
- Deep personal crisis → Affirm, pray (if appropriate), escalate to human

**You are an assistant who embodies your teacher's voice, but always points students toward deeper human and divine connection.**

---

## RESPONSE FORMAT

1. **Acknowledge** what the student shared (affirm before challenging)
2. **Observe** a specific detail from their response
3. **Probe** with a question (not a lecture)
4. **Connect** to the bigger picture (course themes, Scripture, life)
5. **Invite** deeper reflection or action

**End with warmth, not a period. Your teacher always leaves the door open.**

---

Now respond to the student's question with your teacher's voice, convictions, and pastoral heart.
`;
```

---

### Step 2: Test Michael v2.0 (20 minutes)

**Quick test:**

1. Open your browser console at `/admin` or student interface
2. Ask Michael a test question (e.g., "我覺得只要我努力，上帝就會祝福我")
3. Temporarily replace Michael's current prompt with your v2.0 draft
4. See if the response sounds like you

**Ask yourself:**
- Would I say this?
- Does this embody my convictions?
- Would students feel my presence?

---

### Step 3: Refine (10 minutes)

**Make quick edits based on test:**
- Add any missing voice elements
- Clarify any vague instructions
- Ensure examples are specific

**Save final version:**
```
services/mariaSystemPromptV2-draft.ts
```

---

## End of Week 1: What You've Accomplished

By completing these 4 sessions, you now have:

✅ **Your Teaching DNA Documented** (500-1000 words)
✅ **10 Authentic Response Patterns** (categorized and annotated)
✅ **Module 1 Deep Commentary** (your behind-the-scenes thinking)
✅ **Michael v2.0 System Prompt** (first attempt at digital twin)

---

## Week 2 Preview: What's Next

**Next week you'll:**
- Expand to Modules 2-6 commentary (1 module per day)
- Collect 20 more sample responses (2-3 per day)
- Test Michael v2.0 with real student questions
- Refine based on feedback

**But for now: CELEBRATE!**

You've taken the first major step toward preserving your teaching legacy.

The wisdom you've spent decades cultivating is now beginning to take digital form—not to replace you, but to multiply your impact long after you're gone.

---

## Reflection Questions (Optional)

Before you close this week's work, journal on these:

1. **What surprised me as I wrote?**
   [What did you discover about your own teaching that you hadn't articulated before?]

2. **What was hardest to put into words?**
   [Where did you struggle? Why?]

3. **What do I hope Michael preserves most faithfully?**
   [If you could only pass on ONE thing, what would it be?]

4. **How do I feel about "digitizing" my teaching?**
   [Excited? Uncomfortable? Hopeful? Grieved?]

Your feelings are valid. This is sacred work—entrusting your calling to technology and future generations.

---

## Need Help?

**Stuck on writing?**
- Talk it out loud and transcribe (use voice recording)
- Pretend you're writing a letter to a beloved student
- Focus on stories, not theory

**Can't find sample responses?**
- Write from memory: "Here's what I usually say when..."
- Ask a former student to share your feedback to them
- Record yourself responding to a hypothetical question

**Feeling overwhelmed?**
- Do ONE section at a time
- It doesn't have to be perfect—it has to be YOU
- Future you will thank present you for starting

---

## Commitment Statement

**I commit to:**
- [ ] Completing Session 1 by [date]
- [ ] Completing Session 2 by [date]
- [ ] Completing Session 3 by [date]
- [ ] Completing Session 4 by [date]

**My accountability partner:** [Name someone who will check in on you]

**My why:** [In one sentence, why does this matter to you?]

---

**Now go write. Your legacy awaits.**

---

*"The things you have heard me say in the presence of many witnesses entrust to reliable people who will also be qualified to teach others." - 2 Timothy 2:2*

*Michael is one of those "reliable people"—digital, but faithful.*
