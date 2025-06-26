"use client"

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';

interface AvatarLook {
  look_id: string;
  look_name: string;
  preview_url: string;
  avatar_type: 'standard' | 'premium' | 'talking_photo';
  gender: string;
  premium: boolean;
}

interface AvatarGroup {
  base_name: string;
  base_type: 'standard' | 'premium' | 'talking_photo';
  gender: string;
  premium: boolean;
  looks: AvatarLook[];
}

interface AvatarSelectorProps {
  onAvatarSelect: (avatarId: string, lookId?: string) => void;
  selectedAvatarId?: string;
  selectedLookId?: string;
}

export function AvatarSelector({ onAvatarSelect, selectedAvatarId, selectedLookId }: AvatarSelectorProps) {
  const [avatarGroups, setAvatarGroups] = useState<AvatarGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AvatarGroup | null>(null);
  const [selectedLook, setSelectedLook] = useState<AvatarLook | null>(null);
  const { user } = useAuth();
  const { userPlan } = useUserPlan();

  useEffect(() => {
    fetchAvatarGroups();
  }, []);

  const fetchAvatarGroups = async () => {
    try {
      setLoading(true);
      const plan = userPlan || 'basic';
      const response = await fetch(`/api/avatars-with-looks?plan=${plan}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch avatar groups: ${response.status}`);
      }
      const data = await response.json();
      setAvatarGroups(data.avatar_groups || []);
      // Set selected group if provided
      if (selectedAvatarId) {
        // Find the group that contains the look with this id
        const group = (data.avatar_groups || []).find((g: AvatarGroup) => g.looks.some((l: AvatarLook) => l.look_id === selectedAvatarId));
        if (group) {
          setSelectedGroup(group);
          const look = group.looks.find((l: AvatarLook) => l.look_id === selectedAvatarId);
          if (look) setSelectedLook(look);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching avatar groups');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (baseName: string) => {
    const group = avatarGroups.find(g => g.base_name === baseName);
    setSelectedGroup(group || null);
    if (group && group.looks.length > 0) {
      setSelectedLook(group.looks[0]);
      onAvatarSelect(group.looks[0].look_id);
    } else {
      setSelectedLook(null);
      onAvatarSelect('', undefined);
    }
  };

  const handleLookChange = (lookId: string) => {
    if (selectedGroup) {
      const look = selectedGroup.looks.find(l => l.look_id === lookId);
      setSelectedLook(look || null);
      if (look) onAvatarSelect(look.look_id);
    }
  };

  const getAvatarTypeLabel = (type: string, premium?: boolean) => {
    switch (type) {
      case 'premium':
        return 'Premium';
      case 'standard':
        return 'Standard';
      case 'talking_photo':
        return 'Talking Photo';
      default:
        return type;
    }
  };

  const getAvatarTypeColor = (type: string) => {
    switch (type) {
      case 'premium':
        return 'bg-yellow-100 text-yellow-800';
      case 'standard':
        return 'bg-blue-100 text-blue-800';
      case 'talking_photo':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
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
        <Button onClick={fetchAvatarGroups}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Group Selection Dropdown */}
      <div>
        <label className="video-forms-form-label">
          Selecciona un Avatar
        </label>
        <select
          value={selectedGroup?.base_name || ''}
          onChange={(e) => handleGroupChange(e.target.value)}
          className="video-forms-avatar-select"
        >
          <option value="">Selecciona un avatar...</option>
          {avatarGroups.map((group) => (
            <option key={group.base_name} value={group.base_name}>
              {group.base_name.charAt(0).toUpperCase() + group.base_name.slice(1)} ({getAvatarTypeLabel(group.base_type, group.premium)})
            </option>
          ))}
        </select>
      </div>

      {/* Look Selection Dropdown */}
      {selectedGroup && selectedGroup.looks.length > 0 && (
        <div>
          <label className="video-forms-form-label">
            Selecciona un Look
          </label>
          <select
            value={selectedLook?.look_id || ''}
            onChange={(e) => handleLookChange(e.target.value)}
            className="video-forms-avatar-select"
          >
            <option value="">Selecciona un look...</option>
            {selectedGroup.looks.map((look) => (
              <option key={look.look_id} value={look.look_id}>
                {look.look_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selection Preview */}
      {selectedLook && selectedGroup && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          marginTop: '2rem',
          background: 'none',
          boxShadow: 'none',
          padding: 0
        }}>
          <Avatar style={{ width: 96, height: 96, minWidth: 96, minHeight: 96 }}>
            <AvatarImage 
              src={selectedLook.preview_url} 
              alt={selectedLook.look_name}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
            <AvatarFallback style={{ fontSize: 32 }}>
              {selectedLook.look_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'white', marginBottom: 4 }}>
              {selectedGroup.base_name.charAt(0).toUpperCase() + selectedGroup.base_name.slice(1)}
            </div>
            <div style={{ fontSize: '1rem', color: '#cbd5e1' }}>
              {selectedLook.look_name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 