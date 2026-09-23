import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Music, 
  Edit3, 
  Check, 
  CheckCircle2, 
  Heart, 
  Search, 
  Download, 
  Trash2, 
  Plus, 
  Minus, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  BookMarked, 
  Globe, 
  Clock, 
  CheckSquare, 
  Compass,
  ArrowRight,
  Bookmark,
  Share2,
  Calendar,
  Layers,
  Award,
  LogOut,
  RefreshCw,
  User as LucideUser,
  Info,
  MapPin,
  Users,
  Youtube,
  Type,
  Bold,
  Upload,
  AlertTriangle
} from "lucide-react";
import { devotionals, Devotional } from "./data/devotionals";
import { hymns, Hymn } from "./data/hymns";
import {
  timetable,
  timetableTitle,
  backgroundItems,
  backgroundTitle,
  notesItems,
  notesTitle
} from "./data/tripInfo";
import missionBanner from "./assets/images/indonesia_mission_banner_1780304659714.png";
import meditationMusic from "./assets/audio/meditation.mp3";
import {
  initAuth,
  googleSignIn,
  logout,
  addDevotionalEventToCalendar
} from "./lib/googleCalendar";
import {
  shareReflection,
  subscribeToSharedReflections,
  SharedReflection
} from "./lib/sharedReflections";

export default function App() {
  // Tab states: 'devotional', 'hymnal', 'journal'
  const [activeTab, setActiveTab] = useState<"devotional" | "hymnal" | "journal" | "info">("devotional");
  
  // Selected Devotional Day State (Index 0 to 7)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  
  // Devotional Reading Progress (Completed Days stored in local storage)
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  
  // Devotional font size: 'normal', 'large', 'xl'
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xl">("large");

  // Site-wide accessibility settings for users with low vision: text scale (%) and bold-text mode
  const [a11yFontScale, setA11yFontScale] = useState<number>(100);
  const [a11yBoldText, setA11yBoldText] = useState<boolean>(false);
  const [a11yPanelOpen, setA11yPanelOpen] = useState<boolean>(false);
  const a11yPanelRef = useRef<HTMLDivElement | null>(null);
  
  // Journal entries: key is `day_X_q_Y` and value is string
  const [journalEntries, setJournalEntries] = useState<Record<string, string>>({});
  const [savedTimeStamps, setSavedTimeStamps] = useState<Record<string, string>>({});

  // Snapshot (JSON string) of journalEntries as of the last time the user backed them up to a file,
  // used to detect and warn about unsaved changes that only exist in this browser's storage
  const [lastBackupSnapshot, setLastBackupSnapshot] = useState<string>("{}");
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  // Group-sharing decision per journal entry key: 'shared' | 'declined'
  const [shareChoices, setShareChoices] = useState<Record<string, "shared" | "declined">>({});
  const [pendingSharePromptKey, setPendingSharePromptKey] = useState<string | null>(null);
  const [shareInFlightKey, setShareInFlightKey] = useState<string | null>(null);
  const [shareErrorKey, setShareErrorKey] = useState<string | null>(null);

  // Group Reflections Wall (Firestore live feed)
  const [sharedReflections, setSharedReflections] = useState<SharedReflection[]>([]);

  // Audio Speech Synthesis Player State ('prayer' | 'scripture' | 'guide' | null)
  const [speakingSectionId, setSpeakingSectionId] = useState<string | null>(null);
  
  // Meditative Background Music State
  const [isPlayingWaves, setIsPlayingWaves] = useState<boolean>(false);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Hymnal Screen States
  const [hymnSearchQuery, setHymnSearchQuery] = useState<string>("");
  const [selectedLang, setSelectedLang] = useState<"all" | "zh" | "en">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [bookmarkedHymns, setBookmarkedHymns] = useState<number[]>([]);
  const [activeHymnId, setActiveHymnId] = useState<number>(1);
  const [hymnFontSize, setHymnFontSize] = useState<number>(18);
  const [highlightedHymnLines, setHighlightedHymnLines] = useState<string[]>([]);

  // Hymn Audio Playback State
  const [isPlayingHymnAudio, setIsPlayingHymnAudio] = useState<boolean>(false);
  const hymnAudioRef = useRef<HTMLAudioElement | null>(null);
  const playingHymnIdRef = useRef<number | null>(null);

  // Hymn YouTube Online Player State (id of the hymn whose embed is open, if any)
  const [activeYoutubeHymnId, setActiveYoutubeHymnId] = useState<number | null>(null);

  // Share copy states
  const [copiedDayIndex, setCopiedDayIndex] = useState<number | null>(null);
  const [copiedHymnId, setCopiedHymnId] = useState<number | null>(null);

  // Google OAuth and Calendar Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  // Users can schedule their 8-day plan starting from a selected date and time
  const [syncStartDate, setSyncStartDate] = useState<string>(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return todayStr;
  });
  const [syncTime, setSyncTime] = useState<string>("08:00");

  // Google OAuth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setCalendarToken(token);
      },
      () => {
        setGoogleUser(null);
        setCalendarToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setCalendarToken(result.accessToken);
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setSyncErrorMsg("登入失敗，請確認是否同意日曆權限： " + (err.message || err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setCalendarToken(null);
      setSyncSuccessMsg(null);
      setSyncErrorMsg(null);
    } catch (err) {
      console.error("Google Logout error:", err);
    }
  };

  const handleBulkSyncCalendar = async () => {
    if (!calendarToken) {
      alert("請先登入 Google 帳號以開始同步！");
      return;
    }

    const confirmMessage = `❓ 確定要把「 8 日訪宣靈修材料精華 」一鍵同步至 Google 日曆嗎？\n\n` +
      `📅 起始日期：${syncStartDate}\n` +
      `⏰ 每日時間：${syncTime}\n` +
      `提醒：這會在您的 Google 日曆連續建立 8 個獨立的早禱/靈讀行程。`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsSyncingCalendar(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      const startParts = syncStartDate.split("-").map(Number);
      let count = 0;

      for (let i = 0; i < devotionals.length; i++) {
        const dev = devotionals[i];
        
        // Calculate the target date safely using Date object
        const targetDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        targetDate.setDate(targetDate.getDate() + i);
        
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const formattedDateStr = `${year}-${month}-${day}`;

        const eventPayload = {
          summary: `🇮🇩【印尼訪宣靈修】${dev.dayText}：${dev.theme}`,
          description: `📖 靈讀範圍：${dev.scriptureRef}\n\n💡 經文內容：\n${dev.scriptureText}\n\n🙏 P城同行禱告文：\n${dev.prayer}\n\n🔗 訪宣隨行冊：${window.location.origin}`,
          startDate: formattedDateStr,
          startTime: syncTime
        };

        await addDevotionalEventToCalendar(calendarToken, eventPayload);
        count++;
      }

      setSyncSuccessMsg(`🎉 成功同步！已在您的 Google 日曆為您建立連續 ${count} 天（${syncStartDate} 起）的「印尼訪宣靈修及禱告」計畫！隨時可用手機按時靈修！🚀`);
    } catch (err: any) {
      console.error("Bulk Sync Error:", err);
      setSyncErrorMsg("日曆同步發生錯誤：" + (err.message || err));
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleSingleSyncCalendar = async (dev: Devotional) => {
    if (!calendarToken) {
      const choice = window.confirm("請先登入 Google 帳號以啟用日曆功能。現在要為您進行登入嗎？");
      if (choice) {
        handleGoogleLogin();
      }
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const targetDateStr = window.prompt(`請輸入想要將《${dev.dayText} 靈修》安排在日曆的哪一天？格式為 YYYY-MM-DD：`, todayStr);
    if (!targetDateStr) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
      alert("日期格式不正確，請使用 YYYY-MM-DD。例：2026-06-01");
      return;
    }

    const targetTimeStr = window.prompt(`請輸入您期望的靈修提醒時間？格式為 HH:MM：`, "08:00");
    if (!targetTimeStr) return;

    if (!/^\d{2}:\d{2}$/.test(targetTimeStr)) {
      alert("時間格式不正確，請使用 HH:MM。例：08:30");
      return;
    }

    const confirmed = window.confirm(
      `❓ 確認在 Google 日曆建立單日行程：\n\n` +
      `📌 活動：🇮🇩【印尼訪宣靈修】${dev.dayText}：${dev.theme}\n` +
      `📅 日期：${targetDateStr}\n` +
      `⏰ 時間：${targetTimeStr}`
    );
    if (!confirmed) return;

    setIsSyncingCalendar(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      const eventPayload = {
        summary: `🇮🇩【印尼訪宣靈修】${dev.dayText}：${dev.theme}`,
        description: `📖 靈讀範圍：${dev.scriptureRef}\n\n💡 經文內容：\n${dev.scriptureText}\n\n🙏 P城同行禱告文：\n${dev.prayer}\n\n🔗 訪宣隨行冊：${window.location.origin}`,
        startDate: targetDateStr,
        startTime: targetTimeStr
      };

      await addDevotionalEventToCalendar(calendarToken, eventPayload);
      setSyncSuccessMsg(`🎉 成功！《${dev.dayText} 靈修》提醒已登錄至您指定的日曆時段：${targetDateStr} ${targetTimeStr}。`);
    } catch (err: any) {
      console.error("Single Sync error:", err);
      setSyncErrorMsg("日曆同步發生錯誤：" + (err.message || err));
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Load state on startup
  useEffect(() => {
    try {
      const storedCompleted = localStorage.getItem("mission_completed_days");
      if (storedCompleted) {
        setCompletedDays(JSON.parse(storedCompleted));
      }
      
      const storedJournal = localStorage.getItem("mission_journal_entries");
      if (storedJournal) {
        setJournalEntries(JSON.parse(storedJournal));
      }

      const storedTimestamps = localStorage.getItem("mission_journal_timestamps");
      if (storedTimestamps) {
        setSavedTimeStamps(JSON.parse(storedTimestamps));
      }

      const storedBookmarks = localStorage.getItem("mission_bookmarked_hymns");
      if (storedBookmarks) {
        setBookmarkedHymns(JSON.parse(storedBookmarks));
      }

      const storedShareChoices = localStorage.getItem("mission_journal_share_choices");
      if (storedShareChoices) {
        setShareChoices(JSON.parse(storedShareChoices));
      }

      const storedFontScale = localStorage.getItem("mission_a11y_font_scale");
      if (storedFontScale) {
        setA11yFontScale(Number(storedFontScale));
      }

      const storedBoldText = localStorage.getItem("mission_a11y_bold_text");
      if (storedBoldText) {
        setA11yBoldText(storedBoldText === "true");
      }

      const storedBackupSnapshot = localStorage.getItem("mission_journal_backup_snapshot");
      if (storedBackupSnapshot) {
        setLastBackupSnapshot(storedBackupSnapshot);
      }
    } catch (e) {
      console.error("Error reading from localStorage", e);
    }
  }, []);

  // Apply the site-wide font scale to the document root so it affects all rem-based text sizes
  useEffect(() => {
    document.documentElement.style.fontSize = `${a11yFontScale}%`;
    localStorage.setItem("mission_a11y_font_scale", String(a11yFontScale));
  }, [a11yFontScale]);

  // Apply the site-wide bold-text mode to the document root
  useEffect(() => {
    document.documentElement.classList.toggle("a11y-bold-text", a11yBoldText);
    localStorage.setItem("mission_a11y_bold_text", String(a11yBoldText));
  }, [a11yBoldText]);

  // Close the accessibility panel when clicking outside of it
  useEffect(() => {
    if (!a11yPanelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (a11yPanelRef.current && !a11yPanelRef.current.contains(e.target as Node)) {
        setA11yPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [a11yPanelOpen]);

  // Live subscription to the anonymized Group Reflections Wall
  useEffect(() => {
    const unsubscribe = subscribeToSharedReflections((items) => {
      setSharedReflections(items);
    });
    return () => unsubscribe();
  }, []);

  // Sync utilities
  const toggleDayCompletion = (dayNum: number) => {
    let nextCompleted = [...completedDays];
    if (nextCompleted.includes(dayNum)) {
      nextCompleted = nextCompleted.filter((d) => d !== dayNum);
    } else {
      nextCompleted.push(dayNum);
    }
    setCompletedDays(nextCompleted);
    localStorage.setItem("mission_completed_days", JSON.stringify(nextCompleted));
  };

  const handleJournalChange = (dayNum: number, questionIndex: number, text: string) => {
    const key = `day_${dayNum}_q_${questionIndex}`;
    const nextJournal = { ...journalEntries, [key]: text };
    setJournalEntries(nextJournal);
    localStorage.setItem("mission_journal_entries", JSON.stringify(nextJournal));

    // Save timestamp
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const nextTimestamps = { ...savedTimeStamps, [key]: nowStr };
    setSavedTimeStamps(nextTimestamps);
    localStorage.setItem("mission_journal_timestamps", JSON.stringify(nextTimestamps));
  };

  // Ask once (on blur) whether a freshly-written reflection should be shared with the group
  const handleJournalBlur = (dayNum: number, questionIndex: number) => {
    const key = `day_${dayNum}_q_${questionIndex}`;
    const text = journalEntries[key] || "";
    if (text.trim().length === 0) return;
    if (shareChoices[key]) return;
    setPendingSharePromptKey(key);
  };

  const handleShareDecision = async (
    dayNum: number,
    questionIndex: number,
    question: string,
    decision: "shared" | "declined"
  ) => {
    const key = `day_${dayNum}_q_${questionIndex}`;

    if (decision === "declined") {
      const nextChoices = { ...shareChoices, [key]: "declined" as const };
      setShareChoices(nextChoices);
      localStorage.setItem("mission_journal_share_choices", JSON.stringify(nextChoices));
      setPendingSharePromptKey(null);
      return;
    }

    setShareInFlightKey(key);
    setShareErrorKey(null);
    try {
      await shareReflection(dayNum, question, journalEntries[key] || "");
      const nextChoices = { ...shareChoices, [key]: "shared" as const };
      setShareChoices(nextChoices);
      localStorage.setItem("mission_journal_share_choices", JSON.stringify(nextChoices));
      setPendingSharePromptKey(null);
    } catch (e) {
      console.error("Failed to share reflection", e);
      setShareErrorKey(key);
    } finally {
      setShareInFlightKey(null);
    }
  };

  const toggleBookmarkHymn = (hymnId: number) => {
    let nextBookmarks = [...bookmarkedHymns];
    if (nextBookmarks.includes(hymnId)) {
      nextBookmarks = nextBookmarks.filter((id) => id !== hymnId);
    } else {
      nextBookmarks.push(hymnId);
    }
    setBookmarkedHymns(nextBookmarks);
    localStorage.setItem("mission_bookmarked_hymns", JSON.stringify(nextBookmarks));
  };

  // Meditative background music playback (looping mp3)
  const startPeacefulSound = () => {
    if (isPlayingWaves) {
      stopPeacefulSound();
      return;
    }

    if (!musicAudioRef.current) {
      musicAudioRef.current = new Audio(meditationMusic);
      musicAudioRef.current.loop = true;
      musicAudioRef.current.volume = 0.4;
    }

    musicAudioRef.current
      .play()
      .then(() => setIsPlayingWaves(true))
      .catch((e) => console.warn("Unable to play background music", e));
  };

  const stopPeacefulSound = () => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    setIsPlayingWaves(false);
  };

  // Clean up background music on unmount
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    };
  }, []);

  // Hymn audio playback (speaker icon on a hymn's lyric sheet)
  const toggleHymnAudio = (hymn: Hymn) => {
    if (!hymn.audioSrc) return;

    if (isPlayingHymnAudio && playingHymnIdRef.current === hymn.id) {
      hymnAudioRef.current?.pause();
      setIsPlayingHymnAudio(false);
      return;
    }

    if (!hymnAudioRef.current) {
      hymnAudioRef.current = new Audio();
      hymnAudioRef.current.onended = () => setIsPlayingHymnAudio(false);
    }

    if (playingHymnIdRef.current !== hymn.id) {
      hymnAudioRef.current.src = hymn.audioSrc;
      playingHymnIdRef.current = hymn.id;
    }

    hymnAudioRef.current
      .play()
      .then(() => setIsPlayingHymnAudio(true))
      .catch((e) => console.warn("Unable to play hymn audio", e));
  };

  // Stop hymn audio when switching to a different hymn, and on unmount
  useEffect(() => {
    return () => {
      if (hymnAudioRef.current) {
        hymnAudioRef.current.pause();
        hymnAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (playingHymnIdRef.current !== null && playingHymnIdRef.current !== activeHymnId) {
      hymnAudioRef.current?.pause();
      setIsPlayingHymnAudio(false);
    }
  }, [activeHymnId]);

  // Close the YouTube embed when switching to a different hymn
  useEffect(() => {
    setActiveYoutubeHymnId(null);
  }, [activeHymnId]);

  // Audio Text-To-Speech for prayers
  const handleReadSection = (sectionId: string, text: string) => {
    if (speakingSectionId === sectionId) {
      window.speechSynthesis.cancel();
      setSpeakingSectionId(null);
      return;
    }

    const cleanText = text.replace(/阿們。/g, "，阿們。");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "zh-HK"; // Cantonese voice (falls back to Mandarin-compatible voices if unavailable)

    // Choose a peaceful voice pace
    utterance.rate = 0.85;

    utterance.onend = () => {
      setSpeakingSectionId(null);
    };

    utterance.onerror = () => {
      setSpeakingSectionId(null);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeakingSectionId(sectionId);
  };

  // Stop any in-progress narration when switching devotional day, and on unmount
  useEffect(() => {
    window.speechSynthesis.cancel();
    setSpeakingSectionId(null);
  }, [selectedDayIndex]);

  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // Export journal as TXT
  // Formats today's date as YYYYMMDD (no separators) so backup/export filenames sort and scan easily on-device
  const getFileDateStamp = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  };

  const handleExportJournal = () => {
    let output = `=========================================\n`;
    output += `印尼訪宣八天靈修札記與心志筆記\n`;
    output += `匯出日期: ${new Date().toLocaleDateString()}\n`;
    output += `旅程的主角是你與承載你信仰的真神。\n`;
    output += `=========================================\n\n`;

    devotionals.forEach((dev) => {
      output += `【${dev.dayText}｜主題：${dev.theme}】\n`;
      output += `經文範圍：${dev.scriptureRef}\n`;
      output += `-----------------------------------------\n`;
      
      dev.reflections.forEach((question, qIdx) => {
        const key = `day_${dev.day}_q_${qIdx}`;
        const answer = journalEntries[key] || "（未填寫個人反思）";
        output += `問題 ${qIdx + 1}: ${question}\n`;
        output += `札記紀錄: ${answer}\n`;
        if (savedTimeStamps[key]) {
          output += `（自動儲存時間: ${savedTimeStamps[key]}）\n`;
        }
        output += `\n`;
      });
      output += `\n`;
    });

    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `訪宣靈修隨行札記-${getFileDateStamp()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Whether the journal has content that has changed since the last time it was backed up to a file
  const currentJournalSnapshot = JSON.stringify(journalEntries);
  const hasUnbackedJournalChanges =
    Object.values(journalEntries).some((v: string) => v.trim().length > 0) &&
    currentJournalSnapshot !== lastBackupSnapshot;

  // Save a restorable JSON backup of all journal data to a file on the user's device
  const handleBackupJournal = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      completedDays,
      journalEntries,
      savedTimeStamps,
      shareChoices,
      bookmarkedHymns
    };

    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `訪宣札記備份-${getFileDateStamp()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    localStorage.setItem("mission_journal_backup_snapshot", currentJournalSnapshot);
    setLastBackupSnapshot(currentJournalSnapshot);
    setBackupError(null);
    setBackupMessage("已下載備份檔案。建議將它保存在手機的「檔案」App 或雲端硬碟中，避免遺失。");
  };

  // Restore journal data from a previously downloaded JSON backup file, overwriting this device's records
  const handleBackupFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== "object" || typeof data.journalEntries !== "object") {
          throw new Error("Invalid backup file format");
        }

        if (!window.confirm("還原備份將覆蓋這部裝置目前的札記記錄，確定要繼續嗎？")) {
          return;
        }

        const nextJournal = data.journalEntries || {};
        const nextTimestamps = data.savedTimeStamps || {};
        const nextCompleted = data.completedDays || [];
        const nextShareChoices = data.shareChoices || {};
        const nextBookmarks = data.bookmarkedHymns || [];

        setJournalEntries(nextJournal);
        setSavedTimeStamps(nextTimestamps);
        setCompletedDays(nextCompleted);
        setShareChoices(nextShareChoices);
        setBookmarkedHymns(nextBookmarks);

        localStorage.setItem("mission_journal_entries", JSON.stringify(nextJournal));
        localStorage.setItem("mission_journal_timestamps", JSON.stringify(nextTimestamps));
        localStorage.setItem("mission_completed_days", JSON.stringify(nextCompleted));
        localStorage.setItem("mission_journal_share_choices", JSON.stringify(nextShareChoices));
        localStorage.setItem("mission_bookmarked_hymns", JSON.stringify(nextBookmarks));

        const restoredSnapshot = JSON.stringify(nextJournal);
        localStorage.setItem("mission_journal_backup_snapshot", restoredSnapshot);
        setLastBackupSnapshot(restoredSnapshot);

        setBackupError(null);
        setBackupMessage("備份已成功還原至這部裝置。");
      } catch (err) {
        console.error("Failed to restore backup", err);
        setBackupMessage(null);
        setBackupError("還原失敗，請確認選擇的是先前匯出的備份檔案（.json）。");
      }
    };
    reader.readAsText(file);
  };

  // Clear tracking safely
  const handleResetData = () => {
    if (window.confirm("確定要重設您在這部裝置上記錄的所有反思與已讀狀態嗎？這項動作無法復原！")) {
      localStorage.clear();
      setCompletedDays([]);
      setJournalEntries({});
      setSavedTimeStamps({});
      setBookmarkedHymns([]);
      setLastBackupSnapshot("{}");
      setBackupMessage(null);
      setBackupError(null);
      alert("所有訪宣紀錄已安全清除。");
    }
  };

  // Share link generator helper
  const handleCopyDayText = (dev: Devotional, idx: number) => {
    const text = `【印尼訪宣靈修 ${dev.dayText}】\n主題：${dev.theme}\n經文：${dev.scriptureRef}\n經文大綱：\n${dev.scriptureText.split('\n')[0]}...\n\n一起來靈修吧！`;
    navigator.clipboard.writeText(text);
    setCopiedDayIndex(idx);
    setTimeout(() => setCopiedDayIndex(null), 2500);
  };

  const handleCopyHymnText = (h: Hymn) => {
    const text = `【訪宣詩歌精選】\n《${h.title}》\n\n${h.lyrics.slice(0, 150)}...\n\n(隨身訪宣歌本分享)`;
    navigator.clipboard.writeText(text);
    setCopiedHymnId(h.id);
    setTimeout(() => setCopiedHymnId(null), 2500);
  };

  // Active Day reference
  const activeDay = devotionals[selectedDayIndex];

  // Hymn filtering helper
  const filteredHymns = hymns.filter((h) => {
    const matchesSearch = 
      h.title.toLowerCase().includes(hymnSearchQuery.toLowerCase()) ||
      h.lyrics.toLowerCase().includes(hymnSearchQuery.toLowerCase());
    const matchesLang = selectedLang === "all" ? true : h.lang === selectedLang;
    const matchesCategory = 
      selectedCategory === "全部" 
        ? true 
        : selectedCategory === "收藏" 
          ? bookmarkedHymns.includes(h.id) 
          : h.category === selectedCategory;
    return matchesSearch && matchesLang && matchesCategory;
  });

  const activeHymn = hymns.find((h) => h.id === activeHymnId) || hymns[0];

  const totalCompletedCount = completedDays.length;
  const totalJournalAnswersCount = Object.values(journalEntries).filter((t): t is string => typeof t === "string" && t.trim().length > 0).length;

  return (
    <div id="applet-container" className="min-h-screen bg-brand-bg text-[#2C2C2C] flex flex-col antialiased selection:bg-brand-clay/35 selection:text-brand-darkgreen">
      
      {/* 1. BRANDING HERO HEADER */}
      <header id="primary-header" className="bg-white border-b border-brand-border/70 py-6 px-6 relative flex-shrink-0 shadow-xs">
        {/* Subtle geometric pattern matching the design theme */}
        <div className="absolute inset-0 opacity-1 bg-[radial-gradient(#5A634E_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10 w-full">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#E8E4D9] text-brand-green text-[10px] tracking-widest px-2.5 py-1 rounded font-bold uppercase border border-brand-border/40">
                Indonesia 訪宣隨行手冊
              </span>
              <span className="bg-brand-green/10 text-brand-green text-[10px] px-2.5 py-1 rounded font-bold border border-brand-green/20">
                P城專用版
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-brand-darkgreen" id="app-title">
              印尼訪宣靈修與詩歌隨身冊
            </h1>
            <p className="text-sm text-[#6B665F] font-sans font-medium mt-1 flex items-center gap-1.5 flex-wrap">
              <span>「作主門徒」生命屬靈旅程 ── 心志預備、跨文化謙卑、同心合一</span>
              <span className="text-brand-border hidden md:inline">|</span>
              <span className="italic font-serif text-brand-clay-dark font-semibold">馬太福音 28:18-20</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Sound Control Room */}
            <div className="flex items-center gap-2 bg-brand-bg p-1.5 rounded-lg border border-brand-border/70 shadow-xs">
              <button
                id="sound-synth"
                onClick={startPeacefulSound}
                className={`flex items-center gap-2 text-xs font-sans font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  isPlayingWaves
                    ? "bg-brand-green text-white font-semibold shadow-xs animate-pulse"
                    : "text-[#6B665F] hover:bg-brand-border/30 hover:text-brand-darkgreen"
                }`}
                title="播放柔和的默想背景音樂，協助您阻絕周圍雜音。"
              >
                {isPlayingWaves ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span>{isPlayingWaves ? "背景音樂：開" : "安靜氛圍音樂"}</span>
              </button>
            </div>

            {/* Accessibility Controls: site-wide font size + bold text for users with low vision */}
            <div className="relative" ref={a11yPanelRef}>
              <button
                id="a11y-toggle"
                onClick={() => setA11yPanelOpen((v) => !v)}
                className={`flex items-center gap-2 text-xs font-sans font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer border ${
                  a11yFontScale !== 100 || a11yBoldText
                    ? "bg-brand-green text-white border-brand-green font-semibold shadow-xs"
                    : "bg-brand-bg text-[#6B665F] border-brand-border/70 hover:bg-brand-border/30 hover:text-brand-darkgreen"
                }`}
                title="調整全站字體大小與粗細，方便視力較弱的使用者閱讀"
              >
                <Type className="h-3.5 w-3.5" />
                <span>易讀設定</span>
              </button>

              {a11yPanelOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-brand-border rounded-xl shadow-lg p-4 z-50 text-left">
                  <h4 className="font-serif font-bold text-sm text-brand-darkgreen mb-3 flex items-center gap-1.5">
                    <Type className="h-4 w-4 text-brand-clay-dark" />
                    易讀輔助設定
                  </h4>

                  <div className="mb-3">
                    <p className="text-[11px] text-stone-500 font-bold mb-1.5">全站字體大小</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setA11yFontScale((s) => Math.max(100, s - 15))}
                        disabled={a11yFontScale <= 100}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="縮小字體"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="flex-1 text-center text-xs font-mono font-bold text-brand-darkgreen">
                        {a11yFontScale}%
                      </span>
                      <button
                        onClick={() => setA11yFontScale((s) => Math.min(145, s + 15))}
                        disabled={a11yFontScale >= 145}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="放大字體"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setA11yBoldText((b) => !b)}
                    className={`w-full flex items-center justify-between gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                      a11yBoldText ? "bg-brand-green text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Bold className="h-3.5 w-3.5" />
                      加粗全站文字
                    </span>
                    <span>{a11yBoldText ? "開" : "關"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setA11yFontScale(100);
                      setA11yBoldText(false);
                    }}
                    className="w-full text-center mt-2.5 text-[11px] text-stone-400 hover:text-stone-600 underline cursor-pointer"
                  >
                    重設為預設
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. STATS & PROGRESS TRACKER */}
      <section id="user-stats" className="bg-brand-bg py-4 px-4 border-b border-dashed border-brand-border">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-brand-border flex items-center gap-3 shadow-xs">
            <div className="p-2 bg-brand-green/10 text-brand-green rounded-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-sans">靈修進度</p>
              <p className="text-sm font-semibold text-brand-darkgreen font-mono">
                {totalCompletedCount} / 8 天已讀完
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-brand-border flex items-center gap-3 shadow-xs">
            <div className="p-2 bg-brand-clay/10 text-brand-clay-dark rounded-lg">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-sans">反思答案</p>
              <p className="text-sm font-semibold text-brand-darkgreen font-mono">
                已書寫 {totalJournalAnswersCount} 題筆記
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-brand-border flex items-center gap-3 shadow-xs">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-sans">詩歌收藏</p>
              <p className="text-sm font-semibold text-brand-darkgreen font-mono">
                {bookmarkedHymns.length} 首常唱詩歌
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-brand-border flex items-center gap-3 col-span-2 lg:col-span-1 shadow-xs">
            <div className="p-1 px-2.5 rounded-lg text-brand-green text-xs font-mono font-medium leading-tight flex-1">
              <div className="flex justify-between text-[10px] uppercase tracking-wider text-[#A19A8E] mb-1 font-sans font-bold">
                <span>訪宣靈修完成度</span>
                <span>{Math.round((totalCompletedCount / 8) * 100)}%</span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-green h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(totalCompletedCount / 8) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ROOT TABS BAR */}
      <nav id="root-tabs" className="bg-white border-b border-brand-border sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex px-4">
          <button
            id="tab-btn-devotional"
            onClick={() => setActiveTab("devotional")}
            className={`flex-1 md:flex-initial py-4 px-6 font-medium text-sm transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "devotional"
                ? "border-brand-green text-brand-green bg-brand-bg/50 font-bold"
                : "border-transparent text-stone-500 hover:text-brand-green hover:bg-brand-bg/20"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>📘 八日靈修材料</span>
          </button>

          <button
            id="tab-btn-hymnal"
            onClick={() => setActiveTab("hymnal")}
            className={`flex-1 md:flex-initial py-4 px-6 font-medium text-sm transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "hymnal"
                ? "border-brand-green text-brand-green bg-brand-bg/50 font-bold"
                : "border-transparent text-stone-500 hover:text-brand-green hover:bg-brand-bg/20"
            }`}
          >
            <Music className="h-4 w-4" />
            <span>🎵 訪宣詩歌本</span>
            <span className="bg-[#E8E4D9] text-[#2C2C2C] font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">
              29首
            </span>
          </button>

          <button
            id="tab-btn-journal"
            onClick={() => {
              setActiveTab("journal");
            }}
            className={`flex-1 md:flex-initial py-4 px-6 font-medium text-sm transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "journal"
                ? "border-brand-green text-brand-green bg-brand-bg/50 font-bold"
                : "border-transparent text-stone-500 hover:text-brand-green hover:bg-brand-bg/20"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>✏️ 隨行靈修札記</span>
          </button>

          <button
            id="tab-btn-info"
            onClick={() => setActiveTab("info")}
            className={`flex-1 md:flex-initial py-4 px-6 font-medium text-sm transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "info"
                ? "border-brand-green text-brand-green bg-brand-bg/50 font-bold"
                : "border-transparent text-stone-500 hover:text-brand-green hover:bg-brand-bg/20"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>🧭 行程與須知</span>
          </button>
        </div>
      </nav>

      {/* 4. MAIN CONTENT AREA */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto p-4 md:py-8 flex flex-col md:flex-row gap-6">
        
        {/* =========================================
            TAB 1: DEVOTIONAL MATERIAL VIEW 
            ========================================= */}
        {activeTab === "devotional" && (
          <div className="w-full flex flex-col lg:flex-row gap-6">
            
            {/* Desktop Left-Rail: Day Select list */}
            <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
              <div className="bg-white rounded-2xl border border-brand-border p-4 text-left">
                <div className="flex items-center justify-between mb-3 text-brand-darkgreen">
                  <h3 className="font-serif font-bold text-sm tracking-wide">訪宣靈修進度表 (8天)</h3>
                  <Award className="h-4 w-4 text-brand-clay" />
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {devotionals.map((dev, idx) => {
                    const isSelected = selectedDayIndex === idx;
                    const isCompleted = completedDays.includes(dev.day);
                    return (
                      <button
                        key={dev.day}
                        onClick={() => setSelectedDayIndex(idx)}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col cursor-pointer ${
                          isSelected 
                            ? "bg-brand-darkgreen border-brand-darkgreen text-white shadow-xs" 
                            : isCompleted
                              ? "bg-brand-green/5 border-brand-border hover:bg-brand-green/10 text-stone-800"
                              : "bg-white border-brand-border hover:bg-brand-bg text-stone-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? "text-brand-clay" : "text-brand-clay-dark"}`}>
                            {dev.dayText}
                          </span>
                          {isCompleted && (
                            <span className={`inline-block ${isSelected ? "text-white" : "text-brand-green"}`}>
                              <CheckCircle2 className="h-3.5 w-3.5 fill-current bg-white rounded-full text-brand-green" />
                            </span>
                          )}
                        </div>
                        <span className="font-serif font-bold text-sm truncate mt-1 leading-tight">
                          {dev.theme}
                        </span>
                        <span className={`text-[11px] truncate mt-1 ${isSelected ? "text-stone-300" : "text-stone-400"}`}>
                          {dev.scriptureRef.split("（")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instructions banner */}
              <div className="bg-brand-bg/80 rounded-2xl border border-brand-border p-4 text-xs text-[#6B665F] leading-relaxed">
                <h4 className="font-bold text-brand-darkgreen mb-1 flex items-center gap-1 font-sans">
                  <Sparkles className="h-3 w-3 text-brand-clay-dark" />
                  使用說明：
                </h4>
                本靈修材料以「作主門徒」的訪宣屬靈旅程設計，涵蓋預備心志、服侍遇到的挑戰及使命。期望透過主題、經文、反思與禱告回應來操練與主的關係。
              </div>

              {/* Google Calendar Hub */}
              <div className="bg-white rounded-2xl border border-brand-border p-4 text-left flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between text-brand-darkgreen border-b border-brand-border/40 pb-2 mb-1 font-sans">
                  <h3 className="font-serif font-bold text-xs tracking-wide flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-brand-clay-dark" />
                    <span>📅 2026 訪宣日曆提醒同步</span>
                  </h3>
                  <span className="text-[10px] bg-brand-green/15 text-brand-green font-bold px-1.5 py-0.5 rounded font-mono">
                    Google
                  </span>
                </div>

                {!googleUser ? (
                  <div className="space-y-3 font-sans">
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      一鍵同步 8 天訪宣靈修計畫到您的 Google Calendar，方便隊員在印尼出隊時隨時隨地查閱經文與進行同行開展禱告！🇮🇩
                    </p>
                    
                    {/* COMPLIANT GOOGLE MATERIAL SIGN IN BUTTON */}
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-stone-50 border border-stone-200 py-2 px-3 rounded-xl cursor-pointer text-xs font-semibold text-stone-700 transition-all font-sans active:bg-stone-100 shadow-3xs"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2500/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span>{isLoggingIn ? "正在連線 Google..." : "啟用 Google 月曆對接"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 font-sans">
                    {/* User identity row */}
                    <div className="flex items-center gap-2 bg-[#FAF8F5] p-2 rounded-xl border border-brand-border/60">
                      {googleUser.photoURL ? (
                        <img 
                          src={googleUser.photoURL} 
                          alt="Google Avatar" 
                          className="h-7 w-7 rounded-full border border-brand-green/30" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-bold">
                          👤
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-800 text-[11px] truncate leading-tight">
                          {googleUser.displayName}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate leading-tight mt-0.5">
                          {googleUser.email}
                        </p>
                      </div>
                      <button 
                        onClick={handleGoogleLogout} 
                        className="p-1 px-1.5 hover:bg-stone-100 rounded-md text-stone-400 hover:text-red-500 transition-colors cursor-pointer" 
                        title="中斷日曆登入"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Datetime fields settings */}
                    <div className="space-y-2.5 bg-[#FAF8F5]/80 p-2.5 rounded-xl border border-brand-border/40 text-[11px]">
                      <div>
                        <label className="block text-[#6B665F] font-bold mb-1">📅 印尼開展起始日期</label>
                        <input 
                          type="date" 
                          value={syncStartDate}
                          onChange={(e) => setSyncStartDate(e.target.value)}
                          className="w-full bg-white border border-brand-border rounded-lg p-1 px-2 text-stone-700 font-mono text-[11px] outline-none focus:border-brand-green"
                        />
                      </div>

                      <div>
                        <label className="block text-[#6B665F] font-bold mb-1">⏰ 每日提醒默想時間</label>
                        <input 
                          type="time" 
                          value={syncTime}
                          onChange={(e) => setSyncTime(e.target.value)}
                          className="w-full bg-white border border-brand-border rounded-lg p-1 px-2 text-stone-700 font-mono text-[11px] outline-none focus:border-brand-green"
                        />
                      </div>
                    </div>

                    {/* Run Bulk syncing action */}
                    <button
                      onClick={handleBulkSyncCalendar}
                      disabled={isSyncingCalendar}
                      className="w-full bg-brand-green hover:bg-brand-darkgreen text-white py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 text-[11px] shadow-3xs"
                    >
                      {isSyncingCalendar ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Calendar className="h-3.5 w-3.5" />
                      )}
                      <span>{isSyncingCalendar ? "日曆同步推送中..." : "一鍵匯入 8 日提醒行程 🚀"}</span>
                    </button>
                  </div>
                )}

                {/* Event process state notices */}
                {syncSuccessMsg && (
                  <div className="bg-emerald-50 text-emerald-800 text-[10px] p-2 rounded-lg border border-emerald-200/50 leading-relaxed font-sans font-medium">
                    {syncSuccessMsg}
                  </div>
                )}
                {syncErrorMsg && (
                  <div className="bg-red-50 text-red-800 text-[10px] p-2 rounded-lg border border-red-200/50 leading-relaxed font-sans font-medium">
                    {syncErrorMsg}
                  </div>
                )}
              </div>

              {/* Action Reset Button */}
              <button 
                onClick={handleResetData}
                className="w-full text-center py-2 px-3 border border-brand-border/80 hover:bg-red-50 hover:text-red-750 hover:border-red-200 text-stone-500 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>重設所有札記紀錄</span>
              </button>
            </aside>

            {/* Main Interactive Devotional Panel */}
            <div className="flex-1 bg-white rounded-2xl border border-brand-border p-6 shadow-sm overflow-hidden flex flex-col gap-6">

              {/* Inspiration Welcome Banner */}
              <div className="relative h-44 md:h-52 w-full rounded-2xl overflow-hidden shadow-xs border border-brand-border/45 group">
                <img 
                  src={missionBanner}
                  alt="Indonesia Tropical Sunrise" 
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/5 flex flex-col justify-end p-5">
                  <span className="text-[9px] text-[#E8E4D9] font-bold tracking-widest uppercase bg-brand-green px-2 py-0.5 rounded backdrop-blur-xs w-max select-none">
                    🇮🇩 印尼訪宣・心志同行
                  </span>
                  <h3 className="text-[#FAF6F0] text-lg font-serif font-bold mt-1 tracking-wide">
                    在熱帶晨光中 ───── 傾聽祂對這片土地並你我生命的呼召
                  </h3>
                </div>
              </div>
              
              {/* Day Header */}
              <div className="border-b border-brand-border/60 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-brand-clay/20 text-brand-darkgreen font-bold px-2.5 py-0.5 rounded text-xs font-mono">
                      {activeDay.dayText}
                    </span>
                    <span className="bg-[#E8E4D9] text-brand-green text-xs px-2.5 py-0.5 rounded font-bold border border-brand-border/40">
                      靈修專題
                    </span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-brand-darkgreen">
                    主題：{activeDay.theme}
                  </h2>
                </div>

                {/* Reader Controllers */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mark as read state */}
                  <button
                    onClick={() => toggleDayCompletion(activeDay.day)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                      completedDays.includes(activeDay.day)
                        ? "bg-brand-green text-white shadow-xs"
                        : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                    }`}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>{completedDays.includes(activeDay.day) ? "本日已讀完 ✓" : "標記為已讀完"}</span>
                  </button>

                  {/* Share button */}
                  <button
                    onClick={() => handleCopyDayText(activeDay, selectedDayIndex)}
                    className="p-2 hover:bg-stone-100 rounded-xl border border-brand-border text-stone-500 hover:text-stone-800 flex items-center gap-1 text-xs cursor-pointer"
                    title="複製今日經文大綱"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{copiedDayIndex === selectedDayIndex ? "已複製大綱" : "分享"}</span>
                  </button>

                  {/* Single Day Calendar Sync button */}
                  <button
                    onClick={() => handleSingleSyncCalendar(activeDay)}
                    className="p-2 hover:bg-stone-100 rounded-xl border border-brand-border text-brand-green hover:text-brand-darkgreen flex items-center gap-1 text-xs cursor-pointer"
                    title="將今日靈修排程安排加入 Google 日曆"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>排入日曆</span>
                  </button>

                  {/* Font size selectors */}
                  <div className="bg-stone-100 rounded-xl p-1 flex items-center">
                    <button
                      onClick={() => setFontSize("normal")}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        fontSize === "normal" ? "bg-white text-brand-darkgreen font-bold shadow-xs" : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      中
                    </button>
                    <button
                      onClick={() => setFontSize("large")}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        fontSize === "large" ? "bg-white text-brand-darkgreen font-bold shadow-xs" : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      大
                    </button>
                    <button
                      onClick={() => setFontSize("xl")}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        fontSize === "xl" ? "bg-white text-brand-darkgreen font-bold shadow-xs" : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      特大
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION A: THE HOLY SCRIPTURE */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-brand-bg/60 px-3 py-1.5 rounded-lg border border-brand-border/40 gap-2">
                  <h3 className="font-serif font-bold text-sm text-brand-darkgreen flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-3.5 bg-brand-clay rounded-full inline-block shrink-0"></span>
                    <span className="truncate">經文範圍：{activeDay.scriptureRef}</span>
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReadSection("scripture", activeDay.scriptureText)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-colors font-medium cursor-pointer ${
                        speakingSectionId === "scripture"
                          ? "bg-brand-clay text-brand-darkgreen font-semibold animate-pulse"
                          : "bg-white border border-brand-border/60 text-stone-500 hover:text-brand-darkgreen hover:bg-brand-bg"
                      }`}
                      title="語音朗讀經文內容"
                    >
                      {speakingSectionId === "scripture" ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      <span>{speakingSectionId === "scripture" ? "停止" : "語音朗讀"}</span>
                    </button>
                    <span className="text-[11px] text-stone-400 font-mono">
                      中文譯本
                    </span>
                  </div>
                </div>

                <div 
                  className={`bg-white rounded-2xl border border-brand-border/70 p-5 md:p-6 shadow-xs font-serif leading-relaxed text-[#2C2C2C] relative overflow-hidden border-l-4 border-l-brand-clay ${
                    fontSize === "normal" 
                      ? "text-base" 
                      : fontSize === "large" 
                        ? "text-lg" 
                        : "text-xl md:text-2xl"
                  }`}
                >
                  <p className="whitespace-pre-line text-left leading-relaxed">
                    {activeDay.scriptureText}
                  </p>
                </div>
              </div>

              {/* SECTION B: BIBLE DEVOTIONAL GUIDE */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-brand-bg/60 px-3 py-1.5 rounded-lg border border-brand-border/40 gap-2">
                  <h3 className="font-serif font-bold text-sm text-brand-darkgreen flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-brand-green rounded-full inline-block"></span>
                    經文導引與探討
                  </h3>
                  <button
                    onClick={() => handleReadSection("guide", activeDay.guide)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-colors font-medium cursor-pointer ${
                      speakingSectionId === "guide"
                        ? "bg-brand-clay text-brand-darkgreen font-semibold animate-pulse"
                        : "bg-white border border-brand-border/60 text-stone-500 hover:text-brand-darkgreen hover:bg-brand-bg"
                    }`}
                    title="語音朗讀經文導引與探討"
                  >
                    {speakingSectionId === "guide" ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    <span>{speakingSectionId === "guide" ? "停止" : "語音朗讀"}</span>
                  </button>
                </div>

                <div 
                  className={`text-[#2C2C2C] tracking-wide leading-relaxed font-sans text-left space-y-4 opacity-95 ${
                    fontSize === "normal" 
                      ? "text-sm" 
                      : fontSize === "large" 
                        ? "text-base" 
                        : "text-lg"
                  }`}
                >
                  {activeDay.guide.split("\n\n").map((para, pIdx) => (
                    <p key={pIdx} className="leading-relaxed text-justify indent-8">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* SECTION C: PERSISTENT LIFE REFLECTION JOURNAL */}
              <div className="space-y-4 border-t border-dashed border-brand-border pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-brand-darkgreen flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-brand-darkgreen" />
                    <span>生命反思 & 隨行札記</span>
                  </h3>
                  <span className="bg-[#E8E4D9] text-[#6B665F] text-[11px] px-2.5 py-0.5 rounded font-mono font-bold">
                    資料自動儲存於此瀏覽器
                  </span>
                </div>

                <div className="space-y-5">
                  {activeDay.reflections.map((question, qIdx) => {
                    const entryKey = `day_${activeDay.day}_q_${qIdx}`;
                    const currentAnswer = journalEntries[entryKey] || "";
                    const lastSavedTimestamp = savedTimeStamps[entryKey];

                    return (
                      <div key={qIdx} className="bg-brand-bg/30 rounded-2xl border border-brand-border/70 p-4 flex flex-col gap-3">
                        <div className="flex gap-2 items-start text-left">
                          <span className="bg-brand-darkgreen text-white font-mono font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5">
                            {qIdx + 1}
                          </span>
                          <p className="font-sans font-semibold text-stone-800 text-sm leading-tight md:text-base">
                            {question}
                          </p>
                        </div>

                        <div className="relative">
                          <textarea
                            value={currentAnswer}
                            onChange={(e) => handleJournalChange(activeDay.day, qIdx, e.target.value)}
                            onBlur={() => handleJournalBlur(activeDay.day, qIdx)}
                            placeholder="在此處寫下今日的屬靈反思、軟弱與決心紀錄（札記會即時安全存檔）..."
                            className="w-full h-24 bg-white border border-brand-border focus:border-brand-green focus:ring-1 focus:ring-brand-green rounded-xl p-3 text-sm text-stone-800 font-sans leading-relaxed focus:outline-none"
                          />

                          {/* Live Saved timestamp indicator */}
                          <div className="absolute bottom-2 right-3 flex items-center gap-1.5 text-[10px] text-stone-400">
                            {currentAnswer.trim().length > 0 ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green inline-block animate-pulse"></span>
                                  <span>已存檔 {lastSavedTimestamp ? `@ ${lastSavedTimestamp}` : ""}</span>
                                </>
                            ) : (
                              <span>待填寫札記</span>
                            )}
                          </div>
                        </div>

                        {/* Share-with-group inline prompt (shown once per entry, on blur) */}
                        {pendingSharePromptKey === entryKey && (
                          <div className="bg-brand-bg/70 border border-brand-border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <p className="text-xs text-stone-700 font-sans">
                              要將這則反思<span className="font-bold text-brand-darkgreen">匿名</span>分享給訪宣隊團隊嗎？（不會附上您的姓名）
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleShareDecision(activeDay.day, qIdx, question, "shared")}
                                disabled={shareInFlightKey === entryKey}
                                className="bg-brand-green hover:bg-brand-darkgreen text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60 transition-colors"
                              >
                                {shareInFlightKey === entryKey ? "分享中…" : "匿名分享"}
                              </button>
                              <button
                                onClick={() => handleShareDecision(activeDay.day, qIdx, question, "declined")}
                                disabled={shareInFlightKey === entryKey}
                                className="bg-white border border-brand-border hover:bg-stone-100 text-stone-600 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60 transition-colors"
                              >
                                不分享，只留給自己
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Share error (e.g. offline / not yet configured) */}
                        {shareErrorKey === entryKey && (
                          <div className="text-[11px] text-rose-600 font-sans flex items-center gap-1.5">
                            <span>⚠️ 分享失敗，請檢查網路連線後再試一次。</span>
                            <button
                              onClick={() => setPendingSharePromptKey(entryKey)}
                              className="underline hover:text-rose-700 cursor-pointer"
                            >
                              重試
                            </button>
                          </div>
                        )}

                        {/* Decision badge once the user has chosen */}
                        {shareChoices[entryKey] === "shared" && (
                          <div className="text-[11px] text-brand-green font-sans flex items-center gap-1.5">
                            <Check className="h-3 w-3" />
                            <span>已匿名分享給團隊</span>
                          </div>
                        )}
                        {shareChoices[entryKey] === "declined" && (
                          <div className="text-[11px] text-brand-clay-dark font-sans flex items-start gap-1.5">
                            <span>🔒</span>
                            <span>僅存於此瀏覽器裝置，清除資料或換手機將會遺失，建議另外複製保存到手機的「備忘錄」App。</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION D: THE CLOSING PRAYER AND AUDIO TTS PLAYER */}
              <div className="bg-brand-darkgreen text-white rounded-2xl p-5 md:p-6 border border-brand-border/20 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-clay/20 text-[#E8E4D9] border border-brand-clay/35 px-2.5 py-0.5 rounded text-xs font-serif font-bold">
                      禱告回應
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#FAF6F0]">P城同行禱告文</h4>
                  </div>

                  {/* Read prayer speech button */}
                  <button
                    onClick={() => handleReadSection("prayer", activeDay.prayer)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition-colors font-medium cursor-pointer ${
                      speakingSectionId === "prayer"
                        ? "bg-brand-clay text-brand-darkgreen font-semibold animate-pulse"
                        : "bg-brand-green/80 hover:bg-brand-green text-white border border-brand-border/20"
                    }`}
                  >
                    {speakingSectionId === "prayer" ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    <span>{speakingSectionId === "prayer" ? "停止導讀" : "語音祈禱導讀"}</span>
                  </button>
                </div>

                <div className="italic text-brand-bg leading-relaxed font-serif text-justify text-base md:text-lg opacity-95">
                  「 {activeDay.prayer} 」
                </div>
              </div>

              {/* Day Bottom Pager */}
              <div className="flex justify-between items-center border-t border-brand-border pt-4 mt-2">
                <button
                  disabled={selectedDayIndex === 0}
                  onClick={() => setSelectedDayIndex(prev => prev - 1)}
                  className="px-4 py-2 border border-brand-border hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  ← 上一天
                </button>

                <span className="text-xs text-stone-400 font-mono">
                  第 {selectedDayIndex + 1} / 8 天
                </span>

                <button
                  disabled={selectedDayIndex === devotionals.length - 1}
                  onClick={() => setSelectedDayIndex(prev => prev + 1)}
                  className="px-4 py-2 bg-brand-darkgreen hover:bg-brand-green text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-30 cursor-pointer"
                >
                  下一天 →
                </button>
              </div>

            </div>

          </div>
        )}

        {/* =========================================
            TAB 2: MISSION HYMNAL VIEW 
            ========================================= */}
        {activeTab === "hymnal" && (
          <div className="w-full flex flex-col gap-4">

            {/* Connectivity note for YouTube playback */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2.5 flex items-start gap-2 text-left">
              <Youtube className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                「YouTube 線上聽」需要網絡連線，印尼當地 Wifi／數據可能不穩定。建議出發前趁有網絡時，先在 YouTube 打開想聽的詩歌播放一次（或開啟 YouTube 離線下載功能），現場才能穩定聆聽。
              </span>
            </div>

          <div className="w-full flex flex-col md:flex-row gap-6">

            {/* Left Column: Hymn Selector Bar & Search filters */}
            <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">
              
              <div className="bg-white rounded-2xl border border-brand-border p-4 space-y-4 shadow-sm">
                
                {/* Search Inputs */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">搜尋歌名或歌詞</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={hymnSearchQuery}
                      onChange={(e) => setHymnSearchQuery(e.target.value)}
                      placeholder="輸入關鍵字..."
                      className="w-full bg-[#FAF8F5]/80 border border-brand-border focus:border-brand-green focus:outline-none rounded-xl py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-brand-green"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    {hymnSearchQuery && (
                      <button 
                        onClick={() => setHymnSearchQuery("")}
                        className="absolute right-3 top-2 text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
                      >
                        清除
                      </button>
                    )}
                  </div>
                </div>

                {/* Dialect Filter */}
                <div className="space-y-1 block text-left">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">語言篩選</span>
                  <div className="grid grid-cols-3 gap-1 bg-brand-bg/85 p-1 rounded-xl text-center">
                    <button
                      onClick={() => setSelectedLang("all")}
                      className={`text-xs py-1 rounded-lg cursor-pointer ${selectedLang === "all" ? "bg-white text-brand-darkgreen font-bold shadow-xs" : "text-stone-500 hover:text-stone-800"}`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setSelectedLang("zh")}
                      className={`text-xs py-1 rounded-lg cursor-pointer ${selectedLang === "zh" ? "bg-white text-brand-darkgreen font-bold shadow-xs" : "text-stone-500 hover:text-stone-850"}`}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => setSelectedLang("en")}
                      className={`text-xs py-1 rounded-lg cursor-pointer ${selectedLang === "en" ? "bg-white text-brand-darkgreen font-bold shadow-xs" : "text-stone-500 hover:text-stone-850"}`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Category selectors */}
                <div className="space-y-1 block text-left">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">詩歌類別 / 收藏</span>
                  <div className="flex flex-wrap gap-1">
                    {["全部", "敬拜讚美", "宣教與生命", "信心跟隨", "收藏"].map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-brand-darkgreen border-brand-darkgreen text-white font-semibold shadow-xs"
                              : "bg-[#FAF8F5] border-brand-border hover:bg-brand-bg text-stone-600"
                          }`}
                        >
                          {cat === "收藏" ? `❤️ 收藏 (${bookmarkedHymns.length})` : cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Matching Songs List */}
              <div className="bg-white rounded-2xl border border-brand-border p-4 flex flex-col gap-2 shadow-sm">
                <div className="flex justify-between items-center text-xs text-stone-400 font-semibold mb-1">
                  <span>符合篩選條件的音軌</span>
                  <span>{filteredHymns.length} 首</span>
                </div>

                <div className="max-h-96 md:max-h-[50vh] overflow-y-auto space-y-1 pr-1">
                  {filteredHymns.length > 0 ? (
                    filteredHymns.map((h, hIdx) => {
                      const isActive = activeHymnId === h.id;
                      const isBookmarked = bookmarkedHymns.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          onClick={() => {
                            setActiveHymnId(h.id);
                            setHighlightedHymnLines([]); // Clear highlight on change
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isActive
                              ? "bg-brand-bg border-brand-green text-brand-darkgreen font-serif font-bold shadow-xs border-l-4 border-l-brand-green"
                              : "bg-white border-brand-border hover:bg-stone-50 text-stone-700"
                          }`}
                        >
                          <div className="truncate flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold block w-5 shrink-0 ${isActive ? "text-brand-green" : "text-stone-400"}`}>
                              {h.id}
                            </span>
                            <span className="truncate text-sm">{h.title}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isBookmarked && <span className="text-rose-500">❤️</span>}
                            <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-bold ${
                              h.lang === "zh" ? "bg-brand-green/10 text-brand-green" : "bg-stone-100 text-stone-700 border border-stone-200"
                            }`}>
                              {h.lang}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-stone-400 text-xs">
                      沒有找到符合條件的詩歌。
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Lyric Sheet Panel */}
            <div className="flex-1 bg-white rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col gap-6 relative">
              
              {/* Lyric Box toolbar header */}
              <div className="border-b border-brand-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#E8E4D9] text-brand-darkgreen text-xs px-2.5 py-0.5 rounded font-mono font-bold border border-brand-border/45">
                    Hymn #{activeHymn.id}
                  </span>
                  
                  <h2 className="text-xl font-serif font-bold text-brand-darkgreen">
                    {activeHymn.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* YouTube Online Playback Toggle */}
                  {activeHymn.youtubeId && (
                    <button
                      onClick={() => setActiveYoutubeHymnId(prev => prev === activeHymn.id ? null : activeHymn.id)}
                      className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                        activeYoutubeHymnId === activeHymn.id
                          ? "bg-red-600 text-white border-red-600 shadow-xs"
                          : "bg-stone-50 border-stone-250 text-stone-500 hover:text-stone-850"
                      }`}
                      title="在 YouTube 線上聽這首詩歌"
                    >
                      <Youtube className="h-4 w-4" />
                      <span>{activeYoutubeHymnId === activeHymn.id ? "關閉播放" : "YouTube 線上聽"}</span>
                    </button>
                  )}

                  {/* Hymn Audio Playback Button */}
                  {activeHymn.audioSrc && (
                    <button
                      onClick={() => toggleHymnAudio(activeHymn)}
                      className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                        isPlayingHymnAudio && playingHymnIdRef.current === activeHymn.id
                          ? "bg-brand-green text-white border-brand-green shadow-xs animate-pulse"
                          : "bg-stone-50 border-stone-250 text-stone-500 hover:text-stone-850"
                      }`}
                      title="播放詩歌音檔"
                    >
                      {isPlayingHymnAudio && playingHymnIdRef.current === activeHymn.id
                        ? <Volume2 className="h-4 w-4" />
                        : <VolumeX className="h-4 w-4" />}
                      <span>
                        {isPlayingHymnAudio && playingHymnIdRef.current === activeHymn.id ? "播放中" : "播放詩歌"}
                      </span>
                    </button>
                  )}

                  {/* Bookmark Button */}
                  <button
                    onClick={() => toggleBookmarkHymn(activeHymn.id)}
                    className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                      bookmarkedHymns.includes(activeHymn.id)
                        ? "bg-rose-50/60 border-rose-200 text-rose-600"
                        : "bg-stone-50 border-stone-250 text-stone-500 hover:text-stone-850"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${bookmarkedHymns.includes(activeHymn.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                    <span>{bookmarkedHymns.includes(activeHymn.id) ? "已收藏此歌" : "收藏"}</span>
                  </button>

                  <button
                    onClick={() => handleCopyHymnText(activeHymn)}
                    className="p-2.5 min-h-[38px] hover:bg-stone-100 border border-brand-border rounded-xl text-stone-500 text-xs hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                    title="複製今日詩歌歌詞"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{copiedHymnId === activeHymn.id ? "已複製" : "分享"}</span>
                  </button>

                  {/* Size toggler */}
                  <div className="bg-stone-100 rounded-xl p-1 flex items-center font-mono">
                    <button
                      onClick={() => setHymnFontSize(prev => Math.max(14, prev - 2))}
                      className="p-1 px-2 hover:bg-white rounded-lg transition-all text-xs cursor-pointer"
                      title="調小字型"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-[11px] px-2 text-stone-600 block">
                      {hymnFontSize}px
                    </span>
                    <button
                      onClick={() => setHymnFontSize(prev => Math.min(32, prev + 2))}
                      className="p-1 px-2 hover:bg-white rounded-lg transition-all text-xs cursor-pointer"
                      title="調大字型"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* YouTube Online Player — small compact box so it reads as a "listen" widget rather than a full video screen */}
              {activeYoutubeHymnId === activeHymn.id && activeHymn.youtubeId && (
                <div className="w-full flex justify-center">
                  <div className="w-full max-w-[280px] rounded-xl overflow-hidden border border-brand-border bg-black aspect-video">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube-nocookie.com/embed/${activeHymn.youtubeId}?autoplay=1&rel=0`}
                      title={`${activeHymn.title} - YouTube`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Highlight instruction banners */}
              <div className="text-center text-[11px] text-[#6B665F] bg-brand-bg/85 py-2 px-3 rounded-lg flex items-center justify-center gap-1 border border-brand-border/40">
                <Sparkles className="h-3.5 w-3.5 text-brand-clay-dark" />
                <span>提示：點擊任何一行歌詞，即可高亮顯示，協助領唱或跟唱時不易看錯行。</span>
              </div>

              {/* centered clean lyrics sheet */}
              <div 
                className="flex-1 min-h-[40vh] select-none text-center bg-brand-bg/25 hover:bg-[#FAF8F5]/55 transition-colors p-6 rounded-2xl border border-brand-border font-serif tracking-wider font-medium overflow-y-auto"
                style={{ fontSize: `${hymnFontSize}px` }}
              >
                <div className="inline-block text-center space-y-6 max-w-xl w-full leading-relaxed">
                  {activeHymn.lyrics.split("\n\n").map((stanza, stIdx) => (
                    <div key={stIdx} className="space-y-2">
                      {stanza.split("\n").map((line, lIdx) => {
                        const lineKey = `${stIdx}-${lIdx}`;
                        const isHighlighted = highlightedHymnLines.includes(lineKey);
                        return (
                          <p
                            key={lIdx}
                            onClick={() => {
                              if (isHighlighted) {
                                setHighlightedHymnLines(prev => prev.filter(k => k !== lineKey));
                              } else {
                                setHighlightedHymnLines(prev => [...prev, lineKey]);
                              }
                            }}
                            className={`cursor-pointer px-3 transition-all text-justify md:text-center inline-block w-full leading-relaxed hover:bg-brand-bg rounded-lg ${
                              isHighlighted 
                                ? "bg-brand-clay/20 text-brand-darkgreen border-x-4 border-brand-green font-bold shadow-xs scale-[1.02] py-1.5" 
                                : "text-stone-700 hover:text-brand-darkgreen py-1"
                            }`}
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hymn Footer metadata information */}
              <div className="text-xs text-stone-400 text-center italic border-t border-dashed border-brand-border pt-3">
                訪宣歌本精選 ── 本地保存個人愛好與閱讀字體級別，以便戶外探訪時無阻閱讀。
              </div>

            </div>

          </div>

          </div>
        )}

        {/* =========================================
            TAB 3: MY COMPREHENSIVE JOURNAL VIEW
            ========================================= */}
        {activeTab === "journal" && (
          <div className="w-full flex flex-col gap-6">

            {/* Group Reflections Wall ── anonymized entries shared by the team */}
            <div className="bg-white rounded-2xl border border-brand-border p-6 text-left space-y-4 shadow-sm">
              <div className="border-b border-brand-border/60 pb-4">
                <h2 className="text-xl font-serif font-bold text-brand-darkgreen flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-darkgreen" />
                  <span>團隊分享牆 ── 匿名心聲</span>
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  來自隊員選擇「匿名分享」的反思，不會顯示任何姓名或帳號資訊。
                </p>
              </div>

              {sharedReflections.length === 0 ? (
                <div className="text-center text-sm text-stone-400 py-8">
                  目前還沒有人分享反思，成為第一位分享的隊員吧！
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {sharedReflections.map((item) => (
                    <div key={item.id} className="bg-brand-bg/30 border border-brand-border/60 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-[10px] font-mono font-bold text-brand-clay-dark bg-[#E8E4D9] px-2 py-0.5 rounded shrink-0">
                          Day {item.dayNumber}
                        </span>
                        {item.createdAt && (
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {item.createdAt.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-stone-600 mb-1">{item.question}</p>
                      <p className="text-sm text-stone-800 leading-relaxed italic">「 {item.text} 」</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-brand-border p-6 text-left space-y-6 shadow-sm">

              {/* Header Box */}
              <div className="border-b border-brand-border/60 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-darkgreen flex items-center gap-2">
                    <Edit3 className="h-6 w-6 text-brand-darkgreen" />
                    <span>訪宣心志札記 ── 靈格總回顧</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    以下為您這 8 天記錄的所有生命反思。您可以下載此對話筆記，作為此次印尼訪宣的信心留念。
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleExportJournal}
                    className="bg-brand-darkgreen hover:bg-brand-green text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>下載所有訪宣反思筆記</span>
                  </button>
                  <button
                    onClick={handleBackupJournal}
                    className="bg-white border border-brand-border hover:bg-brand-bg/50 text-brand-darkgreen font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="下載可還原的備份檔案（JSON），方便日後匯入"
                  >
                    <Download className="h-4 w-4" />
                    <span>備份札記</span>
                  </button>
                  <button
                    onClick={() => backupFileInputRef.current?.click()}
                    className="bg-white border border-brand-border hover:bg-brand-bg/50 text-brand-darkgreen font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    title="從先前下載的備份檔案還原札記"
                  >
                    <Upload className="h-4 w-4" />
                    <span>還原備份</span>
                  </button>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleBackupFileSelected}
                  />
                </div>
              </div>

              {/* Reminder to back up journal notes to a file on the device, so they survive a cleared browser or a new device */}
              {hasUnbackedJournalChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-left">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-800">記得備份您的札記！</p>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      您的反思目前只儲存在這部裝置的瀏覽器中。建議按下「備份札記」，把檔案存到手機的「檔案」App 或雲端硬碟，避免清除瀏覽器資料或更換裝置時遺失記錄。
                    </p>
                  </div>
                  <button
                    onClick={handleBackupJournal}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    立即備份
                  </button>
                </div>
              )}

              {backupMessage && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-200/50 leading-relaxed font-medium">
                  {backupMessage}
                </div>
              )}
              {backupError && (
                <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-200/50 leading-relaxed font-medium">
                  {backupError}
                </div>
              )}

              {/* Devotion Journal Timeline list */}
              <div className="space-y-8 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-brand-border">
                {devotionals.map((dev) => {
                  
                  // Check if this day has any entries
                  const dayAnswers = dev.reflections.map((_, qIdx) => {
                    const key = `day_${dev.day}_q_${qIdx}`;
                    return journalEntries[key] || "";
                  }).filter(a => a.trim().length > 0);

                  const hasEntries = dayAnswers.length > 0;

                  return (
                    <div key={dev.day} className="relative pl-12 flex flex-col gap-3 group text-left">
                      
                      {/* Timeline dot */}
                      <div className={`absolute left-3.5 top-1.5 h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center ${
                        hasEntries 
                          ? "bg-brand-green border-white text-white scale-110 shadow-xs" 
                          : "bg-white border-brand-border text-stone-400"
                      }`}>
                        {hasEntries ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span className="text-[9px] font-bold">{dev.day}</span>
                        )}
                      </div>

                      {/* Card Content block */}
                      <div className="bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] transition-all rounded-2xl border border-brand-border p-5 shadow-xs">
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 mb-3 border-b border-stone-205">
                          <div>
                            <span className="text-xs text-brand-clay-dark font-bold font-mono">
                              {dev.dayText}
                            </span>
                            <h3 className="font-serif font-bold text-brand-darkgreen text-base leading-tight">
                              {dev.theme} ── <span className="font-normal text-stone-500 font-mono text-xs">{dev.scriptureRef.split("（")[0]}</span>
                            </h3>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedDayIndex(dev.day - 1);
                              setActiveTab("devotional");
                            }}
                            className="text-xs text-brand-green hover:text-brand-darkgreen font-bold hover:underline transition-colors cursor-pointer"
                          >
                            前往閱讀靈修內容 →
                          </button>
                        </div>

                        {/* Questions review */}
                        <div className="space-y-3">
                          {dev.reflections.map((question, qIdx) => {
                            const key = `day_${dev.day}_q_${qIdx}`;
                            const val = journalEntries[key] || "";

                            return (
                              <div key={qIdx} className="text-xs md:text-sm">
                                <p className="font-semibold text-stone-700 block">
                                  問題 {qIdx + 1}：{question}
                                </p>
                                {val.trim().length > 0 ? (
                                  <p className="mt-1 text-stone-900 bg-white p-3 rounded-lg border border-brand-border/60 border-l-2 border-l-brand-clay leading-relaxed italic pr-4 relative">
                                    「 {val} 」
                                    {savedTimeStamps[key] && (
                                      <span className="block text-right text-[10px] text-stone-400 font-mono mt-1 font-normal not-italic">
                                        自動存檔於 {savedTimeStamps[key]}
                                      </span>
                                    )}
                                  </p>
                                ) : (
                                  <p className="text-stone-400 italic text-xs mt-1">
                                    （尚未寫下此問題的反思筆記）
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Static export helper and guide */}
              <div className="text-center pt-4 border-t border-dashed border-brand-border">
                <button
                  onClick={handleExportJournal}
                  className="inline-flex items-center gap-2 bg-[#E8E4D9] hover:bg-[#D4CFC7] transition-colors text-brand-darkgreen font-bold text-xs px-5 py-3 rounded-xl cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>點擊此處將這 8 天的反思精華打包為純文本 TXT 留檔</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* =========================================
            TAB 4: TRIP INFO ── BACKGROUND, TIMETABLE & NOTES
            ========================================= */}
        {activeTab === "info" && (
          <div className="w-full flex flex-col gap-6">

            {/* Background Section */}
            <div className="bg-white rounded-2xl border border-brand-border p-6 text-left shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-brand-border/60 pb-3">
                <div className="p-2 bg-brand-green/10 text-brand-green rounded-lg">
                  <Info className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-serif font-bold text-brand-darkgreen">
                  {backgroundTitle}
                </h2>
              </div>
              <ul className="space-y-3">
                {backgroundItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-stone-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-clay mt-2 shrink-0"></span>
                    <p>
                      {item.label && (
                        <span className="font-bold text-brand-darkgreen">{item.label}：</span>
                      )}
                      <span>{item.text}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Timetable Section */}
            <div className="bg-white rounded-2xl border border-brand-border p-6 text-left shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-brand-border/60 pb-3">
                <div className="p-2 bg-brand-clay/10 text-brand-clay-dark rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-serif font-bold text-brand-darkgreen">
                  {timetableTitle}
                </h2>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-xs md:text-sm border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-brand-bg/60">
                      <th className="p-2.5 text-left font-serif font-bold text-brand-darkgreen border border-brand-border/60 whitespace-nowrap">日期</th>
                      <th className="p-2.5 text-left font-serif font-bold text-brand-darkgreen border border-brand-border/60">上午</th>
                      <th className="p-2.5 text-left font-serif font-bold text-brand-darkgreen border border-brand-border/60">中午</th>
                      <th className="p-2.5 text-left font-serif font-bold text-brand-darkgreen border border-brand-border/60">下午</th>
                      <th className="p-2.5 text-left font-serif font-bold text-brand-darkgreen border border-brand-border/60">晚上</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetable.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-brand-bg/20"}>
                        <td className="p-2.5 font-bold text-brand-clay-dark border border-brand-border/60 whitespace-nowrap align-top">{row.date}</td>
                        <td className="p-2.5 text-stone-700 border border-brand-border/60 align-top">{row.morning}</td>
                        <td className="p-2.5 text-stone-700 border border-brand-border/60 align-top">{row.noon}</td>
                        <td className="p-2.5 text-stone-700 border border-brand-border/60 align-top">{row.afternoon}</td>
                        <td className="p-2.5 text-stone-700 border border-brand-border/60 align-top">{row.evening}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Important Notes Section */}
            <div className="bg-brand-darkgreen text-white rounded-2xl p-6 border border-brand-border/20 shadow-md text-left">
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <div className="p-2 bg-brand-clay/20 text-[#E8E4D9] rounded-lg">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[#FAF6F0]">
                  {notesTitle}
                </h2>
              </div>
              <ul className="space-y-3">
                {notesItems.map((item, idx) => (
                  <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-brand-bg font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-clay mt-2 shrink-0"></span>
                    <p>
                      {item.label && (
                        <span className="font-bold text-[#FAF6F0]">{item.label}：</span>
                      )}
                      <span>{item.text}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}

      </main>

      {/* 5. PEACEFUL COMPANION FOOTER */}
      <footer id="primary-footer" className="bg-brand-darkgreen text-[#E8E4D9]/80 text-xs py-10 px-4 border-t border-brand-border/30 text-center space-y-4 mt-12 shadow-inner">
        <p className="text-[#FAF6F0] font-serif font-bold text-sm tracking-wide">
          印尼訪宣隨身手冊 ── 印尼訪宣八天靈修材料與 29 首訪宣手冊詩歌。
        </p>
        <p className="text-[#FAF6F0]/65 text-[11px] leading-relaxed max-w-lg mx-auto">
          「耶穌上前來，對他們說：天上地上一切權柄都賜給我了。所以，你們要去使萬民做我的門徒，給他們施洗，歸入父、子、聖靈的名下，我吩咐你們的一切，都要教導他們遵守。記住，我時刻都與你們同在，直到現世時代的終結。」
        </p>
        <p className="text-brand-clay text-[10px]">
          &copy; 2026 訪宣同行隊員專屬手冊。使用 Noto Serif 經文排版，內建 SpeechSynthesis 禱告導讀功能。
        </p>
      </footer>

    </div>
  );
}
