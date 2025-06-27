"use client"

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { AvatarModalSelector } from './AvatarModalSelector';
import { Button } from './button';

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

interface AvatarSelectorProps {
  onAvatarSelect: (avatarId: string, lookId?: string) => void;
  selectedAvatarId?: string;
  selectedLookId?: string;
  isModalOpen?: boolean;
  setIsModalOpen?: (open: boolean) => void;
}

export function AvatarSelector({ onAvatarSelect, selectedAvatarId, selectedLookId, isModalOpen, setIsModalOpen }: AvatarSelectorProps) {
  const [selectedGroup, setSelectedGroup] = useState<AvatarGroup | TalkingPhotoGroup | null>(null);
  const [selectedLook, setSelectedLook] = useState<AvatarLook | TalkingPhotoLook | null>(null);
  const [avatarData, setAvatarData] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const modalOpen = typeof isModalOpen === 'boolean' ? isModalOpen : internalModalOpen;
  const setModalOpen = setIsModalOpen || setInternalModalOpen;
  const { user } = useAuth();
  const { userPlan } = useUserPlan();

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

    if (userPlan) {
      loadAvatarData();
    }
  }, [userPlan, selectedAvatarId]);

  const handleAvatarSelect = (avatarId: string, lookId?: string) => {
    onAvatarSelect(avatarId, lookId);
  };

  const getGroupName = (group: AvatarGroup | TalkingPhotoGroup) => {
    if ('avatar_id' in group) {
      return group.avatar_name;
    } else {
      return group.talking_photo_name;
    }
  };

  const getLookName = (look: AvatarLook | TalkingPhotoLook) => {
    if ('avatar_id' in look) {
      return look.avatar_name;
    } else {
      return look.talking_photo_name;
    }
  };

  const getGroupType = (group: AvatarGroup | TalkingPhotoGroup) => {
    return 'avatar_id' in group ? 'Avatar' : 'Talking Photo';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!avatarData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No avatar data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Selection Button */}
      <div>
        <label className="video-forms-form-label">
          Selecciona un Avatar
        </label>
        <Button
          onClick={() => setModalOpen(true)}
          variant="outline"
          className="w-full h-12 text-left justify-start bg-gray-800/50 border-gray-700 hover:bg-gray-700/50"
        >
          {selectedLook ? (
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={selectedLook.preview_image_url} 
                  alt={getLookName(selectedLook)}
                />
                <AvatarFallback>
                  {getLookName(selectedLook).charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium text-white">
                  {selectedGroup ? getGroupName(selectedGroup) : getLookName(selectedLook)}
                </div>
                <div className="text-sm text-gray-400">
                  {selectedGroup && getGroupType(selectedGroup)} • {getLookName(selectedLook)}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-gray-400">Haz clic para seleccionar un avatar...</span>
          )}
        </Button>
      </div>

      {/* Selection Preview */}
      {selectedLook && selectedGroup && (
        <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <Avatar className="h-16 w-16">
            <AvatarImage 
              src={selectedLook.preview_image_url} 
              alt={getLookName(selectedLook)}
              className="object-cover"
            />
            <AvatarFallback className="text-lg">
              {getLookName(selectedLook).charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold text-white text-lg">
              {getGroupName(selectedGroup)}
            </div>
            <div className="text-gray-300">
              {getLookName(selectedLook)}
            </div>
            <div className="text-sm text-gray-400">
              {getGroupType(selectedGroup)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 