"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VOICE_LANGUAGE } from "@/lib/config";

export type SpeechState =
  | "idle"
  | "requesting"
  | "listening"
  | "processing"
  | "error";

export interface UseSpeechInputOptions {
  onTranscriptChange?: (text: string) => void;
  onTranscriptAppend?: (text: string) => void;
  lang?: string;
}

export function useSpeechInput({
  onTranscriptAppend,
  lang = VOICE_LANGUAGE,
}: UseSpeechInputOptions = {}) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isExplicitStopRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    setIsSupported(Boolean(SpeechRecognition));

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setSpeechState("listening");
      setErrorMessage(null);
    };

    recognition.onresult = (event: any) => {
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          if (onTranscriptAppend && transcriptPart.trim()) {
            onTranscriptAppend(transcriptPart.trim());
          }
        } else {
          currentInterim += transcriptPart;
        }
      }

      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: any) => {
      setSpeechState("error");
      setInterimTranscript("");

      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          setErrorMessage(
            "Microphone permission was denied. Please allow microphone access in your browser address bar."
          );
          break;
        case "no-speech":
          setErrorMessage("We didn't hear anything. Please try speaking again.");
          break;
        case "network":
          setErrorMessage("Speech recognition network error. Typing works great!");
          break;
        case "audio-capture":
          setErrorMessage("No microphone was found on your device.");
          break;
        default:
          setErrorMessage(`Voice recognition error (${event.error}). Please type instead.`);
          break;
      }
    };

    recognition.onend = () => {
      setInterimTranscript("");
      if (!isExplicitStopRef.current && speechState === "listening") {
        setSpeechState("idle");
      } else {
        setSpeechState("idle");
      }
      isExplicitStopRef.current = false;
    };

    recognitionRef.current = recognition;

    // Handle tab visibility change (stop recording if user leaves tab)
    const handleVisibilityChange = () => {
      if (document.hidden && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [lang, onTranscriptAppend, speechState]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setErrorMessage(null);
    setSpeechState("requesting");
    isExplicitStopRef.current = false;

    try {
      recognitionRef.current.start();
    } catch {
      // In case start was called when already running
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 150);
      } catch {
        setSpeechState("idle");
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isExplicitStopRef.current = true;
    setSpeechState("processing");
    try {
      recognitionRef.current.stop();
    } catch {
      setSpeechState("idle");
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (speechState === "listening" || speechState === "requesting") {
      stopListening();
    } else {
      startListening();
    }
  }, [speechState, startListening, stopListening]);

  return {
    isSupported,
    speechState,
    isListening: speechState === "listening",
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
  };
}
