"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export interface AvatarOption {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
}

export interface AvatarGroup {
  title: string;
  options: AvatarOption[];
}

interface Props {
  selectedAvatarId: string | null;
  onSelect: (avatar: AvatarOption) => void;
  avatarGroups: AvatarGroup[];
}

export default function GroupedAvatarsDropdown({ selectedAvatarId, onSelect, avatarGroups }: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allAvatars = avatarGroups.flatMap(group => group.options);
  const limitedAvatars = allAvatars.slice(0, 20);
  const selectedAvatar = allAvatars.find(a => a.id === selectedAvatarId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="voice-select text-left w-full flex items-center"
        onClick={() => setOpen(o => !o)}
        style={{ paddingRight: '3rem' }} 
      >
        {selectedAvatar ? (
          <>
            <Avatar className="h-8 w-8 mr-3">
              <AvatarImage src={selectedAvatar.imageUrl} alt={selectedAvatar.name} data-ai-hint={selectedAvatar.dataAiHint} />
              <AvatarFallback>{selectedAvatar.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{selectedAvatar.name}</span>
          </>
        ) : (
          <span>Select an avatar</span>
        )}
      </button>

      {open && (
        <div className="voice-options-container avatar-options-container">
          <ul className="divide-y divide-slate-700">
            {limitedAvatars.map(avatar => (
              <li
                key={avatar.id}
                onClick={() => {
                  onSelect(avatar);
                  setOpen(false);
                }}
                className="voice-option"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                  <AvatarImage src={avatar.imageUrl} alt={avatar.name} data-ai-hint={avatar.dataAiHint} />
                  <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                </Avatar>
                  <span className="text-sm truncate">{avatar.name}</span>
                </div>
                {selectedAvatarId === avatar.id && <Check className="w-4 h-4 text-sky-400" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}