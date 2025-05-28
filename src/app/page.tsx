
'use client';

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, PlaySquare, User } from "lucide-react";

interface FormData {
  videoTitle: string;
  description: string;
  topic: string;
  avatarId: string;
}

const DURATION_LIMITS = {
  '30s': { label: '30 seconds', limit: 100 },
  '1min': { label: '1 minute', limit: 300 },
  '1.5min': { label: '1:30 minutes', limit: 600 },
};

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    videoTitle: '',
    description: '',
    topic: '',
    avatarId: ''
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<keyof typeof DURATION_LIMITS>('30s');

  const charLimit = DURATION_LIMITS[activeTab].limit;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "description") {
      if (value.length <= charLimit) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Submitting...');

    // Truncate description just in case it somehow exceeds limit
    const descriptionToSend = formData.description.length > charLimit
      ? formData.description.substring(0, charLimit)
      : formData.description;

    try {
      const res = await fetch('/api/send-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, description: descriptionToSend }),
      });

      const result = await res.json();

      if (res.ok && (result.success || result.response || result.rawResponse)) {
        setStatus('Video idea submitted successfully!');
        setFormData({ videoTitle: '', description: '', topic: '', avatarId: '' });
      } else {
        setStatus(`Error submitting: ${result.error || JSON.stringify(result)}`);
      }
    } catch (error: any) {
      setStatus(`Connection error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <PlaySquare className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Video Platform</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Home</a>
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Explore</a>
            <a href="#" className="text-primary font-semibold hover:text-primary/90 transition-colors">Create</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5 text-foreground/70 hover:text-foreground" />
            </Button>
            <Avatar>
              <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="profile woman" />
              <AvatarFallback><User size={20}/></AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Submit a Video</h1>
            <p className="text-muted-foreground mt-1">
              Share your story with the world. Fill out the form below to submit your video for review.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof typeof DURATION_LIMITS)} className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 border-b-0 mb-2">
              {Object.entries(DURATION_LIMITS).map(([key, { label, limit }]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="pb-3 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground hover:text-foreground"
                >
                  {label} ({limit} character limit)
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Ensure TabsContent is a direct child of Tabs */}
            <TabsContent value={activeTab} >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="videoTitle" className="text-sm font-medium">Video Title</Label>
                  <Input
                    id="videoTitle"
                    name="videoTitle"
                    placeholder="Enter the title of your video"
                    value={formData.videoTitle}
                    onChange={handleChange}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Video Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your video in detail"
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={charLimit}
                    required
                    className="mt-1 min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {formData.description.length}/{charLimit} characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="topic" className="text-sm font-medium">Main Topic</Label>
                  <Input
                    id="topic"
                    name="topic"
                    placeholder="Enter the main topic of your video"
                    value={formData.topic}
                    onChange={handleChange}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="avatarId" className="text-sm font-medium">Avatar ID</Label>
                  <Input
                    id="avatarId"
                    name="avatarId"
                    placeholder="Enter your avatar ID"
                    value={formData.avatarId}
                    onChange={handleChange}
                    required
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isLoading} className="min-w-[150px] rounded-lg text-base py-3 px-6">
                    {isLoading ? 'Submitting...' : 'Submit Video'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {status && (
            <p className={`mt-6 text-sm p-3 rounded-md ${status.startsWith('Error') || status.startsWith('Connection error') ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-300'}`}>
              {status}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
