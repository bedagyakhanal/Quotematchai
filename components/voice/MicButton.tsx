"use client";

import React from "react";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeechState } from "@/hooks/useSpeechInput";

export interface MicButtonProps {
  isSupported: boolean;
  speechState: SpeechState;
  onToggle: () => void;
  className?: string;
}

export function MicButton({
  isSupported,
  speechState,
  onToggle,
  className,
}: MicButtonProps) {
  if (!isSupported) {
    return (
      <div className="relative group inline-block">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className={`gap-1.5 opacity-50 cursor-not-allowed ${className || ""}`}
          aria-label="Voice input not supported"
        >
          <MicOff className="h-4 w-4 text-slate-400" />
          <span className="hidden sm:inline text-xs">Voice input</span>
        </Button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[11px] rounded-md shadow-lg pointer-events-none z-50 text-center">
          Voice input isn&apos;t supported in this browser. Typing works great!
        </div>
      </div>
    );
  }

  const isListening = speechState === "listening";
  const isRequesting = speechState === "requesting";

  if (isListening) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onToggle}
        className={`gap-2 animate-pulse bg-red-600 hover:bg-red-700 text-white ${className || ""}`}
        aria-label="Stop listening"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span className="text-xs font-semibold">Listening... Click to stop</span>
        <Square className="h-3.5 w-3.5 fill-current" />
      </Button>
    );
  }

  if (isRequesting) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className={`gap-1.5 ${className || ""}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
        <span className="text-xs">Accessing mic...</span>
      </Button>
    );
  }

  if (speechState === "processing") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className={`gap-1.5 ${className || ""}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
        <span className="text-xs">Processing voice...</span>
      </Button>
    );
  }

  const isError = speechState === "error";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={`gap-1.5 text-slate-700 hover:text-slate-900 ${isError ? "border-amber-300 bg-amber-50/50" : ""} ${className || ""}`}
      title={isError ? "Microphone error. Click to retry." : "Speak to dictate your materials"}
      aria-label="Speak your request with microphone"
    >
      <Mic className={`h-4 w-4 ${isError ? "text-amber-600" : "text-slate-600"}`} />
      <span className="hidden sm:inline text-xs font-medium">
        {isError ? "Retry dictation" : "Dictate request"}
      </span>
    </Button>
  );
}
