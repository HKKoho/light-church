import React, { useState, useEffect } from 'react';

interface Member {
  id: string;
  name: string;
}

interface AttendanceRecord {
  present: boolean;
  timestamp: string;
}

interface AttendanceState {
  [memberId: string]: AttendanceRecord;
}

declare global {
  interface Window {
    recoveryHandler?: () => void;
  }
}
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Upload, Plus, RefreshCw, Trash2, Users, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STORAGE_KEY = 'rollCallSystemTemp';

const RollCallSystem = () => {
  const systemTitle = "茶果嶺浸信會點名應用程序";
  
  // Initialize state variables
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [newName, setNewName] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [countdown, setCountdown] = useState(1800);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showRecoveryAlert, setShowRecoveryAlert] = useState(false);

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const { 
          members: savedMembers, 
          attendance: savedAttendance,
          fileName: savedFileName,
          timestamp 
        } = JSON.parse(savedData);
        
        // Show recovery alert
        setShowRecoveryAlert(true);
        
        // Pre-load the saved data but don't apply until user confirms
        const handleRecover = () => {
          setMembers(savedMembers);
          setAttendance(savedAttendance);
          setCurrentFileName(savedFileName);
          setShowRecoveryAlert(false);
        };

        // Attach the recovery handler to the window
        window.recoveryHandler = handleRecover;
      } catch (error) {
        console.error('Error loading saved data:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    
    // Cleanup function for window.recoveryHandler
    return () => {
      if (window.recoveryHandler) {
        delete window.recoveryHandler;
      }
    };
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (members.length > 0 || Object.keys(attendance).length > 0) {
      const dataToSave = {
        members,
        attendance,
        fileName: currentFileName,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [members, attendance, currentFileName]);

  // Rest of your existing timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isTimerRunning && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsTimerRunning(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, countdown]);

  // Format countdown time (existing function)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Timer controls (existing functions)
  const startTimer = () => setIsTimerRunning(true);
  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = () => {
    setCountdown(1800);
    setIsTimerRunning(false);
  };

  // Enhanced reset function
  const handleReset = () => {
    const confirmMessage = "請確保您已儲存檔案後再重置。\n\n您確定要繼續重置嗎？";
    if (window.confirm(confirmMessage)) {
      setMembers([]);
      setAttendance({});
      setNewName('');
      setCurrentFileName('');
      resetTimer();
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Existing attendance statistics function
  const getAttendanceStats = () => {
    const totalMembers = members.length;
    const presentMembers = Object.values(attendance).filter(status => status.present).length;
    return { totalMembers, presentMembers };
  };

  // Enhanced file upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCurrentFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const newMembers = lines
          .filter(line => line.trim())
          .map((line, index) => ({
            id: `${Date.now()}_${index}`,
            name: line.trim().split(',')[0]
          }));
        setMembers(prevMembers => [...prevMembers, ...newMembers]);
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  // Rest of your existing handlers
  const handleAddName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const newMember = {
        id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: newName.trim()
      };
      setMembers(prevMembers => [...prevMembers, newMember]);
      setNewName('');
      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 2000);
    }
  };

  const toggleAttendance = (memberId: string) => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: {
        present: !prev[memberId]?.present,
        timestamp: new Date().toISOString()
      }
    }));
  };

  const handleDelete = (memberId: string, memberName: string) => {
    const confirmMessage = `確定要刪除 ${memberName} 嗎？`;
    if (window.confirm(confirmMessage)) {
      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
      setAttendance(prev => {
        const newAttendance = { ...prev };
        delete newAttendance[memberId];
        return newAttendance;
      });
    }
  };

  const handleExport = () => {
    if (members.length === 0) {
      alert('沒有成員可匯出');
      return;
    }
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    const headers = ['姓名', '出席狀態', '時間'];
    
    const rows = members.map(member => [
      member.name,
      attendance[member.id]?.present ? '出席' : '缺席',
      attendance[member.id]?.timestamp || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${systemTitle}_${date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {showRecoveryAlert && (
        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>發現未完成的點名記錄！</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.recoveryHandler?.()}
              >
                恢復記錄
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecoveryAlert(false)}
              >
                忽略
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Rest of your existing JSX */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-2">{systemTitle}</h1>
        {currentFileName && (
          <h2 className="text-lg text-gray-600 text-center mb-4">
            名單: {currentFileName}
          </h2>
        )}

        <div className="flex justify-center items-center mb-4">
          <Card className="p-3 bg-yellow-50">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div className="text-center">
                <p className="text-yellow-600 font-medium">倒數時間</p>
                <p className="text-xl font-bold text-yellow-700">{formatTime(countdown)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {!isTimerRunning ? (
                <button
                  onClick={startTimer}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  開始
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  暫停
                </button>
              )}
              <button
                onClick={resetTimer}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                重設
              </button>
            </div>
          </Card>
        </div>
        
        {members.length > 0 && (
          <div className="flex justify-center items-center gap-2 mb-4">
            <Card className="p-3 bg-blue-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div className="text-center">
                  <p className="text-blue-600 font-medium">
                    出席人數: {getAttendanceStats().presentMembers} / {getAttendanceStats().totalMembers}
                  </p>
                  <p className="text-xs text-blue-500">
                    出席率: {((getAttendanceStats().presentMembers / getAttendanceStats().totalMembers) * 100 || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button 
            onClick={handleExport}
            className="flex items-center gap-2"
            disabled={members.length === 0}
          >
            <Download className="w-4 h-4" />
            儲存點名名單
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            className="flex items-center gap-2"
            disabled={members.length === 0}
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </Button>
        </div>
      </div>

      <form onSubmit={handleAddName} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="輸入姓名"
          className="flex-1 p-2 border rounded"
        />
        <Button type="submit">新增</Button>
        <Button 
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          匯入名單
        </Button>
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </form>

      {showAddSuccess && (
        <div className="text-green-600 text-center mb-2">
          成功新增成員！
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-gray-50">
          <p className="text-gray-600">
            請開始新增成員或匯入名單。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {members.map(member => (
            <Card
              key={member.id}
              className="p-3 relative group hover:shadow-lg"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(member.id, member.name);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 
                  transition-opacity p-1 hover:bg-red-100 rounded-full"
                title="刪除成員"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>

              <div 
                onClick={() => toggleAttendance(member.id)}
                className={`cursor-pointer pt-2 pb-1 px-2 rounded transition-colors
                  ${attendance[member.id]?.present 
                    ? 'bg-green-100' 
                    : 'hover:bg-gray-50'}`}
              >
                <div className="text-center">
                  <h3 className="font-medium text-sm mb-1">{member.name}</h3>
                  <p className="text-xs text-gray-600">
                    {attendance[member.id]?.present ? '已到' : '未點名'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RollCallSystem;