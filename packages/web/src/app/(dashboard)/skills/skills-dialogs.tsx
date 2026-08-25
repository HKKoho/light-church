'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';

const NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ------------------------------------------------------------------ //
//  Co-located translations                                            //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    sampleLabels: {
      'create-video-from-images': 'Image → Video (Gemini + Banana API)',
      'create-ppt-from-images': 'Images → PowerPoint Template (python-pptx)',
      'ocr-and-question-answering': 'OCR + Question Answering (pytesseract)',
      'ngo-field-report-compiler': 'NGO Field Report Compiler',
    },
    create: {
      title: 'Create skill',
      descriptionPrefix: 'Scaffolds a new skill under',
      descriptionSuffix: 'in your workspace.',
      nameLabel: 'Skill name',
      namePlaceholder: 'skill-name',
      nameHintPrefix: 'Lowercase, hyphens only, max 64 chars (e.g.',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'What does this skill do, and when should the agent use it?',
      descriptionHint: "This is the agent's trigger — be specific about when to load this skill.",
      useTemplate: 'Use template',
      orLoadExample: 'or load an example:',
      selectExample: 'Select example…',
      contentCustomised: '(customised)',
      contentOptional: '(optional — auto-generated if blank)',
      contentLabelPrefix: 'SKILL.md content',
      contentHelp:
        'Edit the full SKILL.md before creating. Leave blank to use the default scaffold — you can always edit it afterwards.',
      contentPlaceholderDescription: 'What this skill does…',
      cancel: 'Cancel',
      submit: 'Create',
      errInvalidName: 'Name must be lowercase alphanumeric with hyphens.',
      errDescriptionRequired: 'Description is required.',
      errFailed: 'Failed to create skill',
    },
    edit: {
      titlePrefix: 'Edit',
      description:
        'Frontmatter must remain valid (name, description). For more complex edits, use the workspace file editor.',
      cancel: 'Cancel',
      save: 'Save',
      errFailed: 'Failed to save',
    },
    rename: {
      title: 'Rename skill',
      descriptionPrefix: 'The directory and the',
      descriptionSuffix: 'frontmatter field will both be updated.',
      cancel: 'Cancel',
      submit: 'Rename',
      errInvalidName: 'Name must be lowercase alphanumeric with hyphens.',
      errFailed: 'Failed to rename',
    },
    del: {
      title: 'Delete skill',
      confirmPrefix: 'Permanently deletes',
      confirmSuffix: 'and all its files. This cannot be undone.',
      cancel: 'Cancel',
      submit: 'Delete',
      errFailed: 'Failed to delete',
    },
  },
  'zh-TW': {
    sampleLabels: {
      'create-video-from-images': '圖片 → 影片（Gemini + Banana API）',
      'create-ppt-from-images': '圖片 → PowerPoint 範本（python-pptx）',
      'ocr-and-question-answering': 'OCR + 問答（pytesseract）',
      'ngo-field-report-compiler': 'NGO 現場報告編製器',
    },
    create: {
      title: '建立技能',
      descriptionPrefix: '在您的工作區下建立新技能，路徑為',
      descriptionSuffix: '。',
      nameLabel: '技能名稱',
      namePlaceholder: 'skill-name',
      nameHintPrefix: '僅限小寫字母與連字號，最多 64 個字元（例如',
      descriptionLabel: '描述',
      descriptionPlaceholder: '這個技能的用途是什麼？代理應在什麼情況下使用它？',
      descriptionHint: '這是代理的觸發條件——請明確說明何時應載入此技能。',
      useTemplate: '使用範本',
      orLoadExample: '或載入範例：',
      selectExample: '選擇範例…',
      contentCustomised: '（已自訂）',
      contentOptional: '（選填——留空則自動產生）',
      contentLabelPrefix: 'SKILL.md 內容',
      contentHelp: '在建立前編輯完整的 SKILL.md。留空則使用預設範本——您之後仍可隨時編輯。',
      contentPlaceholderDescription: '這個技能的用途…',
      cancel: '取消',
      submit: '建立',
      errInvalidName: '名稱必須為小寫英數字並以連字號分隔。',
      errDescriptionRequired: '描述為必填。',
      errFailed: '建立技能失敗',
    },
    edit: {
      titlePrefix: '編輯',
      description: 'Frontmatter 必須維持有效（name、description）。如需更複雜的編輯，請使用工作區檔案編輯器。',
      cancel: '取消',
      save: '儲存',
      errFailed: '儲存失敗',
    },
    rename: {
      title: '重新命名技能',
      descriptionPrefix: '目錄與',
      descriptionSuffix: 'frontmatter 欄位都會一併更新。',
      cancel: '取消',
      submit: '重新命名',
      errInvalidName: '名稱必須為小寫英數字並以連字號分隔。',
      errFailed: '重新命名失敗',
    },
    del: {
      title: '刪除技能',
      confirmPrefix: '永久刪除',
      confirmSuffix: '及其所有檔案。此操作無法復原。',
      cancel: '取消',
      submit: '刪除',
      errFailed: '刪除失敗',
    },
  },
} satisfies Messages<{
  sampleLabels: Record<string, string>;
  create: {
    title: string;
    descriptionPrefix: string;
    descriptionSuffix: string;
    nameLabel: string;
    namePlaceholder: string;
    nameHintPrefix: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
    useTemplate: string;
    orLoadExample: string;
    selectExample: string;
    contentCustomised: string;
    contentOptional: string;
    contentLabelPrefix: string;
    contentHelp: string;
    contentPlaceholderDescription: string;
    cancel: string;
    submit: string;
    errInvalidName: string;
    errDescriptionRequired: string;
    errFailed: string;
  };
  edit: {
    titlePrefix: string;
    description: string;
    cancel: string;
    save: string;
    errFailed: string;
  };
  rename: {
    title: string;
    descriptionPrefix: string;
    descriptionSuffix: string;
    cancel: string;
    submit: string;
    errInvalidName: string;
    errFailed: string;
  };
  del: {
    title: string;
    confirmPrefix: string;
    confirmSuffix: string;
    cancel: string;
    submit: string;
    errFailed: string;
  };
}>;

// ------------------------------------------------------------------ //
//  Skill scaffold template                                            //
// ------------------------------------------------------------------ //

const SKILL_CONTENT_TEMPLATE = (name: string, description: string) => `---
name: ${name || 'my-skill'}
description: ${description || 'What this skill does and when the agent should use it.'}
version: 1.0.0
author: AIbyML Org
tags: []
---

# ${name || 'My Skill'}

## Purpose
[What problem this skill solves and when the agent should load it]

## Key Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

## Usage
1. **Initialize**: [Any setup or API keys needed]
2. **Run**: [How to invoke the main script or workflow]
3. **Output**: [What the agent produces]

## Workflow
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Tools used
- Use \`shell\` to run scripts in \`scripts/\`
- Use \`read_file\` / \`write_file\` for workspace files
- Use \`web_search\` / \`web_fetch\` if external data is needed

## Constraints
- [What this skill should never do]
- Always confirm before overwriting existing files
`.trimEnd();

// ------------------------------------------------------------------ //
//  Sample skill examples                                              //
// ------------------------------------------------------------------ //

interface SkillSample {
  label: string;
  name: string;
  description: string;
  content: string;
}

const SKILL_SAMPLES: SkillSample[] = [
  {
    label: 'Image → Video (Gemini + Banana API)',
    name: 'create-video-from-images',
    description: 'Convert uploaded PNG or JPG images into an 8-second short video using Gemini and Banana API. Use when the user asks to turn a set of images into a short video clip.',
    content: `---
name: create-video-from-images
description: Convert uploaded PNG or JPG images into an 8-second short video using Gemini and Banana API. Use when the user asks to turn a set of images into a short video clip.
version: 1.0.0
author: AIbyML Org
tags: [video, conversion, gemini, banana, images]
---

# Create Video from Images

## Purpose
Convert a collection of PNG or JPG images into an 8-second short video by uploading them to the Banana API and triggering video synthesis via the Gemini platform.

## Key Features
- Accepts image uploads in PNG or JPG format from /workspace
- Interfaces with Banana API for image upload and job queuing
- Uses Gemini API to synthesize frames into a timed video
- Downloads the completed video back to /workspace

## Requirements
- \`BANANA_API_KEY\` and \`GEMINI_API_KEY\` must be set in the workspace environment or passed by the user
- Python 3 with \`requests\` installed (available in the agent container)

## Usage
1. **Prepare images**: Place PNG/JPG files in /workspace/images/
2. **Run script**: \`python3 /workspace/skills/create-video-from-images/scripts/upload_and_convert.py\`
3. **Retrieve video**: The output video is saved to /workspace/output/video.mp4

## Workflow
1. List images in /workspace/images/ using \`list_directory\`
2. Run \`upload_and_convert.py\` via \`shell\` — it uploads images and polls for completion
3. On success, the video is saved to /workspace/output/
4. Confirm the file exists with \`read_file\` or \`list_directory\`

## Tools
- Use \`shell\` to run \`upload_and_convert.py\`
- Use \`list_directory\` to confirm images exist before running
- Use \`read_file\` to inspect logs if the script fails
- Use \`search_memory\` to recall any saved API keys the user has previously provided

## Constraints
- Do not hardcode API keys in scripts — read them from environment variables
- Do not upload more than 20 images per run (API limit)
- Always confirm the output file exists before reporting success to the user

## Script reference
See \`scripts/upload_and_convert.py\` for the full implementation.`,
  },
  {
    label: 'Images → PowerPoint Template (python-pptx)',
    name: 'create-ppt-from-images',
    description: 'Convert a set of PNG or JPG images into a PowerPoint presentation template, arranging images into slides with suggested titles. Use when the user wants to build a presentation from photos or activity images.',
    content: `---
name: create-ppt-from-images
description: Convert a set of PNG or JPG images into a PowerPoint presentation template, arranging images into slides with suggested titles. Use when the user wants to build a presentation from photos or activity images.
version: 1.0.0
author: AIbyML Org
tags: [powerpoint, presentation, images, pptx, conversion]
---

# Create PowerPoint from Images

## Purpose
Automatically arrange a folder of PNG/JPG images into a professional PowerPoint template, one image per slide, with auto-generated title placeholders. Useful for company activity reports, event recaps, and stakeholder presentations.

## Key Features
- Accepts all PNG/JPG/JPEG files from a specified folder in /workspace
- Places each image on a blank slide with a suggested title
- Saves the completed .pptx to /workspace/output/
- Uses python-pptx — no external API or internet connection required

## Requirements
- Python 3 with \`python-pptx\` and \`Pillow\` installed
  - Install if missing: \`pip install python-pptx Pillow\`

## Usage
1. **Prepare images**: Place PNG/JPG files in /workspace/images/
2. **Run script**: \`python3 /workspace/skills/create-ppt-from-images/scripts/generate_ppt.py\`
3. **Find output**: Saved to /workspace/output/company_presentation.pptx

## Workflow
1. Confirm images exist: use \`list_directory\` on /workspace/images/
2. Run the script via \`shell\`
3. Verify the .pptx file was created with \`list_directory\` on /workspace/output/
4. Offer to rename slides or add captions by editing the script parameters

## Tools
- Use \`shell\` to install dependencies and run \`generate_ppt.py\`
- Use \`list_directory\` to inspect /workspace/images/ before running
- Use \`edit_file\` to adjust slide titles or layout settings in the script
- Use \`write_file\` to create a simple image manifest if the user wants a specific slide order

## Constraints
- Supported formats: .png, .jpg, .jpeg only
- Images are resized to fit the slide (8×6 inches) — original files are not modified
- Do not overwrite an existing presentation without confirming with the user

## Script reference
See \`scripts/generate_ppt.py\` for the full implementation.`,
  },
  {
    label: 'OCR + Question Answering (pytesseract)',
    name: 'ocr-and-question-answering',
    description: 'Extract text from PNG or JPG images using OCR (pytesseract) and answer questions based on the extracted content. Use when the user uploads a scanned document, receipt, form, or image containing text and wants to query it.',
    content: `---
name: ocr-and-question-answering
description: Extract text from PNG or JPG images using OCR (pytesseract) and answer questions based on the extracted content. Use when the user uploads a scanned document, receipt, form, or image containing text and wants to query it.
version: 1.0.0
author: AIbyML Org
tags: [ocr, question-answering, image, text-extraction, documents]
---

# OCR and Question Answering

## Purpose
Convert images containing printed or typed text into machine-readable text using Tesseract OCR, then allow the user to ask natural-language questions about the content — dates, names, totals, clauses, or any information visible in the image.

## Key Features
- Accepts PNG/JPG images from /workspace
- Extracts text using pytesseract (wraps Tesseract OCR engine)
- Saves extracted text to /workspace/output/<image_name>.txt
- Answers user questions based on extracted content using the agent's own reasoning

## Requirements
- Tesseract OCR must be installed in the container:
  \`apt-get install -y tesseract-ocr\`
- Python 3 with \`pytesseract\` and \`Pillow\`:
  \`pip install pytesseract Pillow\`

## Usage
1. **Prepare image**: Place the image in /workspace/images/
2. **Run OCR**: \`python3 /workspace/skills/ocr-and-question-answering/scripts/ocr_extract.py /workspace/images/<filename>\`
3. **Read result**: Extracted text is saved to /workspace/output/<filename>.txt
4. **Answer questions**: Read the .txt file and use your reasoning to answer the user's question

## Workflow
1. Confirm the image exists: \`list_directory\` on /workspace/images/
2. Install dependencies if needed via \`shell\`
3. Run \`ocr_extract.py\` via \`shell\` — outputs a .txt file
4. \`read_file\` the .txt to load the extracted text into context
5. Answer the user's question by reasoning over the text — no extra API call needed

## Tools
- Use \`shell\` to install Tesseract/dependencies and run the OCR script
- Use \`list_directory\` to check that the image file exists first
- Use \`read_file\` to load the extracted .txt into context for question answering
- Use \`write_file\` if you need to save the Q&A results for the user

## Constraints
- OCR accuracy depends on image quality — warn the user if the image is low-resolution or handwritten
- Handwriting recognition is limited; recommend a dedicated handwriting model for cursive text
- Do not send image data to any external API — all processing is local inside the container
- Always show the extracted text to the user before answering questions so they can spot OCR errors

## Script reference
See \`scripts/ocr_extract.py\` for the full implementation.`,
  },
  {
    label: 'NGO Field Report Compiler',
    name: 'ngo-field-report-compiler',
    description: 'Compile structured field reports from raw notes, photos, and data files in the workspace. Use when a field officer needs to turn unstructured observations into a formatted impact report for supporters or management.',
    content: `---
name: ngo-field-report-compiler
description: Compile structured field reports from raw notes, photos, and data files in the workspace. Use when a field officer needs to turn unstructured observations into a formatted impact report for supporters or management.
version: 1.0.0
author: AIbyML Org
tags: [ngo, reporting, field-ops, supporters, impact]
---

# NGO Field Report Compiler

## Purpose
Transform raw field notes, activity logs, and supporting files into a professionally structured impact report. The report follows the organisation's standard format: executive summary, activities, beneficiary numbers, challenges, and next steps.

## Key Features
- Reads unstructured notes and CSV data from /workspace/field-data/
- Structures content into the standard NGO report template
- Applies gospel-mission communication principles (audience-calibrated tone, dignity in storytelling)
- Saves the final report as a .md or .docx file to /workspace/output/

## Skills loaded alongside this skill
- Load \`gospel-mission\` for supporter communication tone, impact framing, and ethical standards

## Usage
1. **Prepare data**: Place field notes (.txt/.md) and any CSV data in /workspace/field-data/
2. **Run**: Ask the agent "compile the field report from /workspace/field-data/"
3. **Review**: The draft report is saved to /workspace/output/field-report-<date>.md
4. **Iterate**: Ask for changes to specific sections before finalising

## Workflow
1. \`list_directory\` on /workspace/field-data/ to inventory available files
2. \`read_file\` each source file to load content into context
3. Structure into the standard report template (sections below)
4. Apply gospel-mission tone guidance for the intended audience (default: institutional supporter)
5. \`write_file\` the compiled report to /workspace/output/

## Standard report sections
1. **Executive Summary** (3–5 sentences, outputs + key outcome)
2. **Programme Activities** (what was done, where, who delivered it)
3. **Beneficiaries Reached** (numbers, demographics — never identify individuals without consent)
4. **Key Outcomes** (changes observed; distinguish from outputs)
5. **Challenges & Lessons** (honest; what did not go as planned)
6. **Next Steps** (what happens in the next reporting period)
7. **Budget Utilisation** (high-level only; flag if actuals deviate from plan)

## Tools
- Use \`list_directory\` to inventory /workspace/field-data/ before starting
- Use \`read_file\` to load each source document into context
- Use \`write_file\` to save the completed report
- Use \`web_search\` only if the user asks for sector benchmarks or external references

## Constraints
- Never identify individual beneficiaries by name without explicit consent noted in the source file
- Do not inflate output numbers — use exactly what the source data shows
- Always distinguish outputs from outcomes; never conflate the two
- Flag any data gaps to the user before finalising the report`,
  },
];

// ------------------------------------------------------------------ //
//  Create Skill Dialog                                                //
// ------------------------------------------------------------------ //

export function CreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT(messages);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [contentOpen, setContentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setContent('');
      setContentOpen(false);
      setErr('');
    }
  }, [open]);

  // Keep the frontmatter name: line in sync with the name field so validation never fails.
  useEffect(() => {
    if (!content.trim()) return;
    setContent((prev) => prev.replace(/^(name:\s*).*$/m, `name: ${name}`));
  }, [name]);

  const loadSample = (label: string) => {
    const sample = SKILL_SAMPLES.find((s) => s.label === label);
    if (!sample) return;
    setName(sample.name);
    setDescription(sample.description);
    setContent(sample.content);
    setContentOpen(true);
  };

  const loadTemplate = () => {
    setContent(SKILL_CONTENT_TEMPLATE(name, description));
    setContentOpen(true);
  };

  const handleSubmit = async () => {
    setErr('');
    if (!NAME_REGEX.test(name)) {
      setErr(t.create.errInvalidName);
      return;
    }
    if (description.trim().length === 0) {
      setErr(t.create.errDescriptionRequired);
      return;
    }
    setSaving(true);
    try {
      await authFetch('/api/v1/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (content.trim().length > 0) {
        await authFetch(`/api/v1/skills/${name.trim()}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });
      }
      setName('');
      setDescription('');
      setContent('');
      setContentOpen(false);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.create.errFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto !w-[56vw] !max-w-none">
        <DialogHeader>
          <DialogTitle>{t.create.title}</DialogTitle>
          <DialogDescription>
            {t.create.descriptionPrefix} <code>/skills/&lt;name&gt;/SKILL.md</code>{' '}
            {t.create.descriptionSuffix}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{t.create.nameLabel}</label>
            <Input
              placeholder={t.create.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {t.create.nameHintPrefix} <code>ocr-and-question-answering</code>)
            </p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t.create.descriptionLabel}
            </label>
            <Textarea
              placeholder={t.create.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <p className="text-[11px] text-muted-foreground">{t.create.descriptionHint}</p>
          </div>

          {/* Template / Example controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTemplate}
              className="flex items-center gap-1 rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Wand2 className="size-3" />
              {t.create.useTemplate}
            </button>
            <span className="text-xs text-muted-foreground">{t.create.orLoadExample}</span>
            <select
              className="flex-1 rounded border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              value=""
              onChange={(e) => loadSample(e.target.value)}
            >
              <option value="" disabled>{t.create.selectExample}</option>
              {SKILL_SAMPLES.map((s) => (
                <option key={s.name} value={s.label}>
                  {t.sampleLabels[s.name as keyof typeof t.sampleLabels] ?? s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Collapsible SKILL.md editor */}
          <div className="rounded-md border text-xs">
            <button
              type="button"
              onClick={() => setContentOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-muted-foreground hover:text-foreground"
            >
              <span className="font-medium">
                {t.create.contentLabelPrefix}{' '}
                {content.trim() ? t.create.contentCustomised : t.create.contentOptional}
              </span>
              <ChevronDown className={`size-3.5 transition-transform ${contentOpen ? 'rotate-180' : ''}`} />
            </button>
            {contentOpen && (
              <div className="border-t p-2">
                <p className="mb-2 px-1 text-muted-foreground">{t.create.contentHelp}</p>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[40vh] font-mono text-xs leading-relaxed"
                  placeholder={SKILL_CONTENT_TEMPLATE('my-skill', t.create.contentPlaceholderDescription)}
                />
              </div>
            )}
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.create.cancel}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {t.create.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditDialog({
  target,
  onClose,
  onSaved,
}: {
  target: { dirName: string; content: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT(messages);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setContent(target?.content ?? '');
    setErr('');
  }, [target]);

  if (!target) return null;

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      await authFetch(`/api/v1/skills/${target.dirName}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.edit.errFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!w-[60vw] !max-w-none">
        <DialogHeader>
          <DialogTitle>
            {t.edit.titlePrefix} {target.dirName}/SKILL.md
          </DialogTitle>
          <DialogDescription>{t.edit.description}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60vh] font-mono text-sm"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.edit.cancel}
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {t.edit.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenameDialog({
  target,
  onClose,
  onRenamed,
}: {
  target: { dirName: string } | null;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const t = useT(messages);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setNewName(target?.dirName ?? '');
    setErr('');
  }, [target]);

  if (!target) return null;

  const handleSubmit = async () => {
    setErr('');
    if (!NAME_REGEX.test(newName)) {
      setErr(t.rename.errInvalidName);
      return;
    }
    setSaving(true);
    try {
      await authFetch(`/api/v1/skills/${target.dirName}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });
      onRenamed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.rename.errFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.rename.title}</DialogTitle>
          <DialogDescription>
            {t.rename.descriptionPrefix} <code>name:</code> {t.rename.descriptionSuffix}
          </DialogDescription>
        </DialogHeader>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.rename.cancel}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {t.rename.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: { dirName: string; name: string } | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const t = useT(messages);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (!target) return null;

  const handleConfirm = async () => {
    setSaving(true);
    setErr('');
    try {
      await authFetch(`/api/v1/skills/${target.dirName}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.del.errFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.del.title}</DialogTitle>
          <DialogDescription>
            {t.del.confirmPrefix} <strong>{target.name}</strong> {t.del.confirmSuffix}
          </DialogDescription>
        </DialogHeader>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.del.cancel}
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={saving}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
            {t.del.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
