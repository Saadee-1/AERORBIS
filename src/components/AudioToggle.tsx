import { Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { useAudioController } from "@/hooks/useAudioController";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

const AudioToggle = () => {
  const { isMuted, volume, toggleMute, setVolume } = useAudioController();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/80 hover:text-foreground transition-colors"
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-4 bg-background/95 backdrop-blur-sm border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/80">Audio</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-8 px-2"
            >
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-foreground/60">Volume</label>
            <Slider
              value={[volume * 100]}
              onValueChange={([val]) => setVolume(val / 100)}
              max={100}
              step={1}
              className="w-full"
              disabled={isMuted}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AudioToggle;
