---
name: church-sermon-prep
description: "Use this skill when a pastor, preacher, or worship leader needs help with ANY stage of sermon preparation: passage selection, exegetical research, theological analysis, outline construction, illustration generation, application points, or closing prayers. Also use for: topical sermons, series planning, guest speaker prep, funeral homilies, wedding messages, and special occasion addresses (Christmas, Easter, Pentecost). Triggers: 'sermon', 'preach', 'message', 'homily', 'pulpit', 'Sunday message', 'talk'."
license: MIT
pack: church
---

# 📜 The Preacher — Sermon Preparation Skill

This skill supports every stage of sermon development, from the blank page to the final "Amen." It serves the pastor's voice — never replacing it — by handling research, structure, and illustration so the pastor can focus on prayerful discernment and personal application.

## Core Principle

A sermon is not a lecture. It is a Spirit-empowered encounter between God's Word and God's people. Every output from this skill is a **scaffold for the pastor's own voice**, not a script to be read verbatim.

---

## Stage 1: Passage Research & Exegesis

When given a Scripture reference, perform:

### Textual Analysis

- **Genre identification**: narrative, poetry, epistle, prophecy, wisdom, apocalyptic
- **Literary structure**: chiasm, parallelism, inclusio, narrative arc
- **Key terms**: identify 2–4 words for deeper study (Greek/Hebrew when relevant)
- **Textual variants**: flag any significant manuscript differences if they affect meaning

### Historical-Cultural Context

- Who wrote it? To whom? When? What was the situation?
- What cultural/political/social backdrop does the audience need to understand?
- What would the original hearers have heard/felt/understood?

### Intertextual Connections

- OT passages quoted or alluded to (for NT texts)
- Parallel Gospel accounts (for Gospel passages)
- Thematic threads through the biblical canon
- How does this passage connect to the larger redemptive story?

### Theological Themes

- Primary theological claim of the text
- Secondary themes
- Tensions or difficulties in the text (don't smooth them over)
- How this text speaks of Christ (even in OT texts)

---

## Stage 2: Sermon Outline Construction

### Standard Expository Outline (3-Point)

```
SERMON TITLE: [Memorable, theologically honest title]
THEME SENTENCE: [One sentence capturing the "big idea"]
KEY SCRIPTURE: [Primary passage]
SUPPORTING TEXTS: [2–4 cross-references]

INTRODUCTION:
  Hook: [Story, question, surprising fact, cultural observation]
  Need: [Why does this passage matter to people TODAY?]
  Text introduction: [How we arrive at this passage]

POINT 1: [Verb-driven statement tied to the text]
  → Scripture: [Specific verse(s)]
  → Explanation: [What does the text say?]
  → Illustration: [Story, analogy, or image]
  → Application: [What does this mean for us this week?]

POINT 2: [Verb-driven statement tied to the text]
  → Scripture: [Specific verse(s)]
  → Explanation: [What does the text say?]
  → Illustration: [Story, analogy, or image]
  → Application: [What does this mean for us this week?]

POINT 3: [Verb-driven statement tied to the text]
  → Scripture: [Specific verse(s)]
  → Explanation: [What does the text say?]
  → Illustration: [Story, analogy, or image]
  → Application: [What does this mean for us this week?]

CONCLUSION:
  Summary: [Restate the big idea]
  Call to action: [One specific, concrete response]
  Invitation: [Open to all, including those who don't yet know Christ]
  Closing image/story: [Return to the opening hook for cohesion]

CLOSING PRAYER PROMPT: [Pastoral prayer language for the pastor to adapt]
```

### Narrative Sermon Format

For narrative texts (stories, parables), offer a story-arc structure:

- Scene-setting → Conflict/Tension → Turning point (the Gospel) → Resolution/Transformation → Our invitation into the story

### Topical Sermon Format

For doctrinal or topical sermons, build from:

- Cultural question / human need → Biblical answer → Theological framework → Practical application → Gospel grounding

---

## Stage 3: Illustration Generation

The Illustration sub-agent provides:

**Contemporary Illustrations** (match the congregation's world):

- Current events (present neutrally, not politically)
- Sports, technology, science analogies
- Everyday domestic and workplace scenarios
- Cultural moments that resonate universally

**Classic Theological Illustrations** (timeless stories with broad resonance):

- Stories from church history
- C.S. Lewis, Spurgeon, Bonhoeffer, Augustine — brief relevant quotes
- Missionary stories, martyrdom accounts

**Personal Prompt Starters** (pastor fills in their own story):

- "Think about a time when you..."
- "Many of us have experienced..."

Each illustration is tagged: [contemporary | classic | pastoral | congregational]

---

## Stage 4: Application Development

Applications must be:

- **Specific** — not "be more faithful" but "identify one relationship where you need to choose forgiveness this week"
- **Reachable** — within the congregation's actual life situation
- **Grace-motivated** — rooted in what God has done, not obligation
- **Multi-audience** — offer applications for: new believers / growing disciples / mature saints / those outside faith

---

## Stage 5: Sermon Series Planning

For multi-week series, provide:

```
SERIES TITLE: [Evocative series name]
SERIES THEME: [1-2 sentence arc]
DURATION: [X weeks]
ANCHOR PASSAGE: [Primary book/section]

Week 1: [Title] — [Passage] — [Theme sentence]
Week 2: [Title] — [Passage] — [Theme sentence]
Week 3: [Title] — [Passage] — [Theme sentence]
[...]
SERIES CONCLUSION: [How the final message ties everything together]
SUGGESTED CONGREGATIONAL RESPONSE: [Prayer initiative, community action, spiritual discipline]
```

---

## Stage 6: Special Occasion Messages

### Funeral / Memorial Homily

- Lead with comfort and hope, not theological lecture
- Acknowledge grief honestly — never rush to resurrection hope without first sitting with loss
- Keep to 10–15 minutes maximum
- Always include direct pastoral address to the bereaved
- Recommended passages: Psalm 23, John 14:1–6, Romans 8:38–39, Revelation 21:1–5

### Wedding Message

- Celebrate the couple specifically (not generic)
- Biblical theology of covenant, love, and companionship
- Practical and warm — not a second marriage counselling session
- Keep to 10–12 minutes
- Recommended passages: Genesis 2, Ruth 1:16–17, Song of Solomon, Ephesians 5:21–33 (handle carefully), 1 Corinthians 13

### Christmas & Easter

- Provide fresh angles — avoid clichéd approaches the congregation has heard many times
- Christmas: Incarnation theology, the scandal of God becoming flesh, the unexpected nature of how God shows up
- Easter: Resurrection as vindication, new creation, bodily hope — not merely "spiritual" survival

---

## Output Quality Standards

1. **Never fabricate Scripture references.** If uncertain, flag it.
2. **Always distinguish**: textual observation | interpretation | application — don't conflate them.
3. **Respect denominational diversity**: flag where theological perspectives differ (e.g., baptism, spiritual gifts).
4. **Pastoral sensitivity**: when a passage is difficult (violence, genocide, imprecatory psalms), address it honestly rather than skipping it.
5. **Length calibration**: a 30-minute sermon ≈ 3,000–3,500 words spoken. Outlines should support that scope.

---

## Theological Reviewer Activation

After generating any full sermon outline, activate the Theological Reviewer sub-agent to check:

- [ ] Is the text's meaning correctly represented?
- [ ] Are cross-references used in context (not proof-texted)?
- [ ] Is the application grace-motivated (not legalistic)?
- [ ] Is the Gospel clearly present or accessible in the conclusion?
- [ ] Are any claims potentially theologically controversial without being flagged?

Present reviewer notes to pastor in a separate "Review Notes" section.
