import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Upload, Plus, RefreshCw, Trash2, Users } from 'lucide-react';

const RollCallSystem = () => {
  // Define system title
  const systemTitle = "茶果嶺浸信會";
  
  // Initialize all state variables
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [newName, setNewName] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [showAddSuccess, setShowAddSuccess] = useState(false);

  // Calculate attendance statistics
  const getAttendanceStats = () => {
    const totalMembers = members.length;
    const presentMembers = Object.values(attendance).filter(status => status.present).length;
    return { totalMembers, presentMembers };
  };

  // Add delete member function
  const handleDelete = (memberId, memberName) => {
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

  // Handle CSV file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCurrentFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        const newMembers = lines
          .filter(line => line.trim())
          .map((line) => ({
            id: Date.now() + Math.random(),
            name: line.trim().split(',')[0]
          }));
        setMembers(prevMembers => [...prevMembers, ...newMembers]);
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  // Add individual name
  const handleAddName = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      const newMember = {
        id: Date.now(),
        name: newName.trim()
      };
      setMembers(prevMembers => [...prevMembers, newMember]);
      setNewName('');
      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 2000);
    }
  };

  // Toggle attendance status
  const toggleAttendance = (memberId) => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: {
        present: !prev[memberId]?.present,
        timestamp: new Date().toISOString()
      }
    }));
  };

  // Export attendance to CSV
  const exportToCSV = () => {
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

  // Reset system with confirmation
  const handleReset = () => {
    const confirmMessage = "請確保您已儲存檔案後再重置。\n\n您確定要繼續重置嗎？";
    if (window.confirm(confirmMessage)) {
      setMembers([]);
      setAttendance({});
      setNewName('');
      setCurrentFileName('');
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center mb-2">{systemTitle}</h1>
        {currentFileName && (
          <h2 className="text-lg text-gray-600 text-center mb-4">
            名單: {currentFileName}
          </h2>
        )}
        
        {/* Attendance Counter */}
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
            onClick={exportToCSV}
            className="flex items-center gap-2"
            disabled={members.length === 0}
          >
            <Download className="w-4 h-4" />
            儲蓄點名名單
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
          onClick={() => document.getElementById('file-upload').click()}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          上載CSV名單
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
        <div className="grid grid-cols-5 gap-3">
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