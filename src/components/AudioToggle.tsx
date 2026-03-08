import { useState } from "react";
import { Volume2, VolumeX, Waves, SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { useAudioController } from "@/hooks/useAudioController";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AudioToggle = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    isMuted,
    isPlaying,
    volume,
    track,
    tracks,
    mute,
    unmute,
    setVolume,
    setTrack,
    play,
    pause,
  } = useAudioController();

  const activeIcon =
    isMuted || !isPlaying ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="text-foreground/80 hover:text-foreground transition-colors"
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        onClick={() => (isMuted ? unmute() : mute())}
      >
        {activeIcon}
      </Button>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Open audio controls"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4 bg-background/95 backdrop-blur-sm border-primary/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Waves className="h-4 w-4 text-primary" />
              <span>Audio Console</span>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={mute}>
                Mute
              </Button>
              <Button variant="outline" size="sm" onClick={unmute}>
                Unmute
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-foreground/60">Active Track</p>
            <Select value={track.id} onValueChange={(value) => setTrack(value)}>
              <SelectTrigger className="bg-background/60 border-primary/20 text-foreground">
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-foreground/50 truncate">{track.name}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <Slider
              value={[volume * 100]}
              onValueChange={([val]) => setVolume(val / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-foreground/60">
            <span>Status: {isMuted ? "Muted" : isPlaying ? "Playing" : "Paused"}</span>
            <div className="space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={play}
                disabled={isPlaying && !isMuted}
              >
                Play
              </Button>
              <Button variant="secondary" size="sm" onClick={pause}>
                Pause
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AudioToggle;
