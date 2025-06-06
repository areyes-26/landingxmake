"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";

interface AvatarOption {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
}

interface AvatarGroup {
  title: string;
  options: AvatarOption[];
}

interface Props {
  selectedAvatarId: string | null;
  onSelect: (avatar: AvatarOption) => void;
}

export default function GroupedAvatarsDropdown({ selectedAvatarId, onSelect }: Props) {
  const [avatarGroups, setAvatarGroups] = useState<AvatarGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/avatars-by-group");
        const data = await res.json();
        setAvatarGroups(data || []);
      } catch (err) {
        console.error("Error al cargar avatares agrupados:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="mt-6 border rounded-md p-4 bg-background">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">Avatares agrupados por grupo</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando avatares...</p>
      ) : (
        <ul className="space-y-4 max-h-[400px] overflow-y-auto">
          {avatarGroups.map(group => (
            <li key={group.title}>
              <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">{group.title}</p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {group.options.map(avatar => (
                  <li
                    key={avatar.id}
                    onClick={() => onSelect(avatar)}
                    className={`cursor-pointer border rounded-md px-3 py-2 flex items-center gap-2 hover:bg-accent ${
                      selectedAvatarId === avatar.id ? "border-primary bg-accent" : "border-border"
                    }`}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
