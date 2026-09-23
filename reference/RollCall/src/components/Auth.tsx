import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Download, Upload, Plus, RefreshCw, Trash2, Users, Save, LogOut } from 'lucide-react';
import Auth from './Auth';
import { v4 as uuidv4 } from 'uuid'; // You'll need to install this package

const RollCallSystem = () => {
  const systemTitle = "茶果嶺浸信會點名程式";
  const AUTO_SAVE_INTERVAL = 60000; // 1 minute

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // System states
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [newName, setNewName] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);

  // ID Validation function
  const validateId = (id) => {
    return typeof id === 'string' && id.length > 0;
  };

  // Generate unique ID
  const generateUniqueId = (prefix = '') => {
    return `${prefix}_${uuidv4()}`;
  };

  // Handle file upload with improved ID generation
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
            id: generateUniqueId('file'),
            name: line.trim().split(',')[0]
          }));

        // Validate all IDs before adding
        if (newMembers.every(member => validateId(member.id))) {
          setMembers(prevMembers => [...prevMembers, ...newMembers]);
        } else {
          alert('錯誤：產生ID時發生問題');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  // Add individual name with improved ID handling
  const handleAddName = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      const newId = generateUniqueId('manual');
      if (!validateId(newId)) {
        alert('錯誤：無法產生有效的ID');
        return;
      }

      const newMember = {
        id: newId,
        name: newName.trim()
      };
      setMembers(prevMembers => [...prevMembers, newMember]);
      setNewName('');
      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 2000);
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm('確定要登出嗎？')) {
      setIsAuthenticated(false);
    }
  };

  // ... rest of your existing functions ...

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <Auth onLogin={setIsAuthenticated} />;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Add logout button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <LogOut className="w-4 h-4" />
          登出
        </button>
      </div>

      {/* Rest of your existing JSX */}
    </div>
  );
};

export default RollCallSystem;
