import React, { useState, useEffect } from 'react';
import { Module } from '../types';
import {
  getOrAssignUserToGroup,
  getGroupDiscussionResponses,
  GroupWithMembers
} from '../services/groupService';

interface GroupDiscussionProps {
  module: Module;
  userId: string;
  currentUserResponses: Record<string, string>;
}

const GroupDiscussion: React.FC<GroupDiscussionProps> = ({
  module,
  userId,
  currentUserResponses
}) => {
  const [groupInfo, setGroupInfo] = useState<GroupWithMembers | null>(null);
  const [groupResponses, setGroupResponses] = useState<Array<{
    userId: string;
    userName: string;
    responses: Record<string, string>;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadGroupData();
  }, [module.id, userId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      // Get or assign user to a group
      const group = await getOrAssignUserToGroup(userId, module.id);
      setGroupInfo(group);

      // Get all group members' responses
      const responses = await getGroupDiscussionResponses(group.group.id, module.id);
      setGroupResponses(responses);
    } catch (error) {
      console.error('Failed to load group data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh responses when current user's responses change
  useEffect(() => {
    if (groupInfo) {
      loadGroupData();
    }
  }, [currentUserResponses]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="ml-3 text-slate-600">載入討論小組...</span>
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
      {/* Group Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-3">
            {groupInfo.group.group_number}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              第 {groupInfo.group.group_number} 組討論
            </h3>
            <p className="text-sm text-slate-600">
              {groupInfo.memberCount} 位成員 • {module.discussionPrompts.length} 個討論問題
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg
            className={`w-6 h-6 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <>
          {/* Group Members */}
          <div className="mb-6 bg-white rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              組員名單
            </h4>
            <div className="flex flex-wrap gap-2">
              {groupInfo.members.map((member) => (
                <div
                  key={member.id}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    member.id === userId
                      ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {member.name} {member.id === userId && '(你)'}
                </div>
              ))}
            </div>
          </div>

          {/* Discussion Responses */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              小組討論內容
            </h4>

            {module.discussionPrompts.map((prompt, index) => {
              const questionKey = `discussion_${index}`;
              const responsesForQuestion = groupResponses.filter(
                r => r.responses[questionKey]
              );

              return (
                <div key={index} className="bg-white rounded-lg p-4">
                  <div className="text-sm font-medium text-slate-700 mb-3">
                    問題 {index + 1}：{prompt}
                  </div>

                  {responsesForQuestion.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">尚無組員回應此問題</p>
                  ) : (
                    <div className="space-y-3">
                      {responsesForQuestion.map((userResponse) => (
                        <div
                          key={userResponse.userId}
                          className={`p-3 rounded-lg ${
                            userResponse.userId === userId
                              ? 'bg-amber-50 border-l-4 border-amber-400'
                              : 'bg-slate-50 border-l-4 border-blue-400'
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            <span className={`text-xs font-semibold ${
                              userResponse.userId === userId
                                ? 'text-amber-700'
                                : 'text-blue-700'
                            }`}>
                              {userResponse.userName}
                              {userResponse.userId === userId && ' (你的回應)'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {userResponse.responses[questionKey]}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Helpful Tips */}
          <div className="mt-4 bg-blue-100 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">討論小組說明</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>你已被隨機分配到第 {groupInfo.group.group_number} 組</li>
                  <li>每組最多 5 位成員</li>
                  <li>你只能看到組員的回應，無法編輯他們的內容</li>
                  <li>你的回應會即時分享給組員</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupDiscussion;
