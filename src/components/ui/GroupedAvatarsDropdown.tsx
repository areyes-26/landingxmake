"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Tipos locales si no están importados de otro lado
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

  // Unir todos los avatares y limitar a 20
  const allAvatars = avatarGroups.flatMap(group => group.options).slice(0, 20);
  const selectedAvatar = allAvatars.find(a => a.id === selectedAvatarId);

  // Cerrar el dropdown al hacer clic fuera
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
    <div className="relative mt-2" ref={dropdownRef}>
      <button
        type="button"
        className="w-full border rounded-md p-2 flex items-center gap-2 bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
        onClick={() => setOpen(o => !o)}
      >
        {selectedAvatar ? (
          <>
            <Avatar className="h-6 w-6">
              <AvatarImage src={selectedAvatar.imageUrl} alt={selectedAvatar.name} data-ai-hint={selectedAvatar.dataAiHint} />
              <AvatarFallback>{selectedAvatar.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{selectedAvatar.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">Selecciona un avatar</span>
        )}
        <span className="ml-auto">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-background border rounded-md shadow-lg max-h-80 overflow-y-auto">
          <ul className="divide-y divide-muted-foreground/10">
            {allAvatars.map(avatar => (
              <li
                key={avatar.id}
                onClick={() => {
                  onSelect(avatar);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent ${selectedAvatarId === avatar.id ? "bg-accent border-l-4 border-primary" : ""}`}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={avatar.imageUrl} alt={avatar.name} data-ai-hint={avatar.dataAiHint} />
                  <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{avatar.name}</span>
                {selectedAvatarId === avatar.id && <Check className="w-4 h-4 text-primary ml-auto" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
