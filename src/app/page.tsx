
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
  '30s': { label: '30 seconds', limit: 100 }, // Example limit
  '1min': { label: '1 minute', limit: 300 },   // Example limit
  '1.5min': { label: '1:30 minutes', limit: 600 },// Example limit
};

type DurationKey = keyof typeof DURATION_LIMITS;

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    videoTitle: '',
    description: '',
    topic: '',
    avatarId: ''
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DurationKey>('30s');

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

    const descriptionToSend = formData.description.length > charLimit
      ? formData.description.substring(0, charLimit)
      : formData.description;

    try {
      const res = await fetch('/api/send-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, description: descriptionToSend, topic: formData.topic, avatarId: formData.avatarId, videoTitle: formData.videoTitle }),
      });

      const result = await res.json();

      if (res.ok && (result.success || result.response || result.rawResponse)) {
        setStatus('Video idea submitted successfully!');
        setFormData({ videoTitle: '', description: '', topic: '', avatarId: '' });
      } else {
        const errorMessage = result.error || (typeof result.rawResponse === 'string' ? result.rawResponse : JSON.stringify(result));
        setStatus(`Error submitting: ${errorMessage}`);
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
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <PlaySquare className="h-7 w-7 text-primary" />
            <span className="font-semibold text-xl">Video Platform</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Home</a>
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Explore</a>
            <a href="#" className="text-primary font-semibold hover:text-primary/90 transition-colors">Create</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground hover:bg-accent/50">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="profile woman" />
              <AvatarFallback><User size={18}/></AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 flex justify-center">
        <div className="w-full max-w-2xl bg-card p-6 sm:p-8 rounded-xl shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Submit a Video</h1>
            <p className="text-muted-foreground mt-2 text-base">
              Share your story with the world. Fill out the form below to submit your video idea.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DurationKey)} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 mb-6">
              {(Object.keys(DURATION_LIMITS) as DurationKey[]).map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                >
                  {DURATION_LIMITS[key].label} 
                  <span className="hidden sm:inline text-xs ml-1 text-muted-foreground/80">({DURATION_LIMITS[key].limit} chars)</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab} className="pt-2"> {/* Added pt-2 for spacing after underline from TabsTrigger */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="videoTitle" className="text-sm font-medium mb-2 block text-foreground/90">Video Title</Label>
                  <Input
                    id="videoTitle"
                    name="videoTitle"
                    placeholder="Enter the title of your video"
                    value={formData.videoTitle}
                    onChange={handleChange}
                    required
                    className="bg-input border-border placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium mb-2 block text-foreground/90">Video Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your video in detail..."
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={charLimit}
                    required
                    className="min-h-[150px] bg-input border-border placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 text-right">
                    {formData.description.length}/{charLimit} characters
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="topic" className="text-sm font-medium mb-2 block text-foreground/90">Main Topic</Label>
                    <Input
                      id="topic"
                      name="topic"
                      placeholder="e.g., Technology, Cooking"
                      value={formData.topic}
                      onChange={handleChange}
                      required
                      className="bg-input border-border placeholder:text-muted-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="avatarId" className="text-sm font-medium mb-2 block text-foreground/90">Avatar ID</Label>
                    <Input
                      id="avatarId"
                      name="avatarId"
                      placeholder="Enter your avatar ID"
                      value={formData.avatarId}
                      onChange={handleChange}
                      required
                      className="bg-input border-border placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="min-w-[180px] text-base py-3 px-6 shadow-md hover:shadow-lg transition-shadow duration-150 ease-in-out"
                    size="lg"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Video'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {status && (
            <p className={`mt-6 text-sm p-4 rounded-lg ${status.startsWith('Error') || status.startsWith('Connection error') ? 'bg-destructive/10 text-destructive' : 'bg-green-600/10 text-green-400'} border ${status.startsWith('Error') || status.startsWith('Connection error') ? 'border-destructive/30' : 'border-green-600/30'}`}>
              {status}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
