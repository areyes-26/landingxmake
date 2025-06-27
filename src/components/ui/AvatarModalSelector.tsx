"use client"

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface AvatarLook {
  avatar_id: string;
  avatar_name: string;
  preview_image_url: string;
}

interface TalkingPhotoLook {
  talking_photo_id: string;
  talking_photo_name: string;
  preview_image_url: string;
}

interface AvatarGroup {
  avatar_id: string;
  avatar_name: string;
  preview_image_url: string;
  looks: AvatarLook[];
}

interface TalkingPhotoGroup {
  talking_photo_id: string;
  talking_photo_name: string;
  preview_image_url: string;
  looks: TalkingPhotoLook[];
}

interface AvatarData {
  avatars: AvatarGroup[];
  talking_photos: TalkingPhotoGroup[];
}

interface AvatarModalSelectorProps {
  onAvatarSelect: (avatarId: string, lookId?: string) => void;
  selectedAvatarId?: string;
  selectedLookId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarModalSelector({ 
  onAvatarSelect, 
  selectedAvatarId, 
  selectedLookId, 
  isOpen, 
  onClose 
}: AvatarModalSelectorProps) {
  const [selectedGroup, setSelectedGroup] = useState<AvatarGroup | TalkingPhotoGroup | null>(null);
  const [selectedLook, setSelectedLook] = useState<AvatarLook | TalkingPhotoLook | null>(null);
  const [avatarData, setAvatarData] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showLooks, setShowLooks] = useState(false);
  const { user } = useAuth();
  const { userPlan } = useUserPlan();

  const itemsPerPage = 6;

  // Cargar datos según el plan del usuario
  useEffect(() => {
    const loadAvatarData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let jsonFile = '';
        switch (userPlan) {
          case 'free':
            jsonFile = '/avatar-list/freeplan.json';
            break;
          case 'premium':
            jsonFile = '/avatar-list/basicplan.json';
            break;
          case 'pro':
            jsonFile = '/avatar-list/proplan.json';
            break;
          default:
            jsonFile = '/avatar-list/freeplan.json';
        }

        const response = await fetch(jsonFile);
        if (!response.ok) {
          throw new Error(`Failed to load avatar data: ${response.status}`);
        }
        
        const data: AvatarData = await response.json();
        setAvatarData(data);
        
        // Set selected group if provided
        if (selectedAvatarId) {
          // Buscar en avatars
          const avatarGroup = data.avatars.find(g => g.looks.some(l => l.avatar_id === selectedAvatarId));
          if (avatarGroup) {
            setSelectedGroup(avatarGroup);
            const look = avatarGroup.looks.find(l => l.avatar_id === selectedAvatarId);
            if (look) setSelectedLook(look);
          } else {
            // Buscar en talking photos
            const talkingPhotoGroup = data.talking_photos.find(g => g.looks.some(l => l.talking_photo_id === selectedAvatarId));
            if (talkingPhotoGroup) {
              setSelectedGroup(talkingPhotoGroup);
              const look = talkingPhotoGroup.looks.find(l => l.talking_photo_id === selectedAvatarId);
              if (look) setSelectedLook(look);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading avatar data');
        console.error('Error loading avatar data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userPlan && isOpen) {
      loadAvatarData();
    }
  }, [userPlan, selectedAvatarId, isOpen]);

  const handleGroupSelect = (group: AvatarGroup | TalkingPhotoGroup) => {
    setSelectedGroup(group);
    setShowLooks(true);
    setCurrentPage(0);
  };

  const handleLookSelect = (look: AvatarLook | TalkingPhotoLook) => {
    setSelectedLook(look);
    const lookId = 'avatar_id' in look ? look.avatar_id : look.talking_photo_id;
    onAvatarSelect(lookId);
    onClose();
  };

  const handleBackToGroups = () => {
    setShowLooks(false);
    setSelectedGroup(null);
    setCurrentPage(0);
  };

  const getGroupName = (group: AvatarGroup | TalkingPhotoGroup) => {
    if ('avatar_id' in group) {
      return group.avatar_name;
    } else {
      return group.talking_photo_name;
    }
  };

  const getGroupType = (group: AvatarGroup | TalkingPhotoGroup) => {
    return 'avatar_id' in group ? 'Avatar' : 'Talking Photo';
  };

  const getLookName = (look: AvatarLook | TalkingPhotoLook) => {
    if ('avatar_id' in look) {
      return look.avatar_name;
    } else {
      return look.talking_photo_name;
    }
  };

  const getLookId = (look: AvatarLook | TalkingPhotoLook) => {
    if ('avatar_id' in look) {
      return look.avatar_id;
    } else {
      return look.talking_photo_id;
    }
  };

  const isLookSelected = (look: AvatarLook | TalkingPhotoLook) => {
    const lookId = getLookId(look);
    return selectedLookId === lookId || selectedAvatarId === lookId;
  };

  // Combinar avatars y talking photos
  const allGroups = avatarData ? [
    ...avatarData.avatars.map(group => ({ ...group, type: 'avatar' as const })),
    ...avatarData.talking_photos.map(group => ({ ...group, type: 'talking_photo' as const }))
  ] : [];

  const totalPages = Math.ceil(allGroups.length / itemsPerPage);
  const currentGroups = allGroups.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const totalLookPages = selectedGroup ? Math.ceil(selectedGroup.looks.length / itemsPerPage) : 0;
  const currentLooks = selectedGroup ? selectedGroup.looks.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage) : [];

  if (!isOpen) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md transition-all duration-300"></div>
      )}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/80 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                {showLooks && (
                  <button
                    onClick={handleBackToGroups}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-300" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-white">
                  {showLooks ? `Seleccionar Look - ${selectedGroup ? getGroupName(selectedGroup) : ''}` : 'Seleccionar Avatar'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Reintentar
                  </button>
                </div>
              ) : showLooks ? (
                // Looks Grid
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {currentLooks.map((look) => (
                      <div
                        key={getLookId(look)}
                        onClick={() => handleLookSelect(look)}
                        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                          isLookSelected(look)
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
                        }`}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={look.preview_image_url}
                            alt={getLookName(look)}
                            className="w-full h-full object-cover"
                          />
                          {isLookSelected(look) && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                              <Check className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-white truncate">
                            {getLookName(look)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination for looks */}
                  {totalLookPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-400">
                        {currentPage + 1} de {totalLookPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalLookPages - 1, currentPage + 1))}
                        disabled={currentPage === totalLookPages - 1}
                        className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Groups Grid
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {currentGroups.map((group) => (
                      <div
                        key={'avatar_id' in group ? group.avatar_id : group.talking_photo_id}
                        onClick={() => handleGroupSelect(group)}
                        className="group cursor-pointer rounded-xl overflow-hidden border-2 border-gray-700 hover:border-gray-500 bg-gray-800/50 transition-all duration-200"
                      >
                        <div className="aspect-square relative">
                          <img
                            src={group.preview_image_url}
                            alt={getGroupName(group)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-white truncate">
                            {getGroupName(group)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {getGroupType(group)} • {group.looks.length} looks
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination for groups */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-400">
                        {currentPage + 1} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 