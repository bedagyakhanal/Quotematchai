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
  const onTranscriptAppendRef = useRef(onTranscriptAppend);

  useEffect(() => {
    onTranscriptAppendRef.current = onTranscriptAppend;
  }, [onTranscriptAppend]);

  // Check browser support on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    setIsSupported(Boolean(SpeechRecognitionClass));
  }, []);

  // Handle tab visibility and unmount cleanup
  useEffect(() => {
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
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setErrorMessage(
        "Voice dictation is not supported by this browser. Typing works great!"
      );
      setSpeechState("error");
      return;
    }

    // Abort any existing instance before creating a new one
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setErrorMessage(null);
    setSpeechState("requesting");
    isExplicitStopRef.current = false;

    try {
      const recognition = new SpeechRecognitionClass();
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
          const transcriptPart = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            const finalChunk = transcriptPart.trim();
            if (finalChunk && onTranscriptAppendRef.current) {
              onTranscriptAppendRef.current(finalChunk);
            }
          } else {
            currentInterim += transcriptPart;
          }
        }

        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        // "no-speech" occurs during silence in continuous recognition.
        // Ignore it if the user is still in listening mode so session isn't killed.
        if (event.error === "no-speech") {
          setInterimTranscript("");
          return;
        }

        if (event.error === "aborted") {
          return;
        }

        setSpeechState("error");
        setInterimTranscript("");

        switch (event.error) {
          case "not-allowed":
          case "service-not-allowed":
            setErrorMessage(
              "Microphone permission was denied. Please allow microphone access in your browser address bar/settings."
            );
            break;
          case "network":
            setErrorMessage(
              "Speech recognition network error. Please check your connection."
            );
            break;
          case "audio-capture":
            setErrorMessage("No microphone was detected on your device.");
            break;
          default:
            setErrorMessage(
              `Voice recognition error (${event.error}). Please type instead.`
            );
            break;
        }
      };

      recognition.onend = () => {
        setInterimTranscript("");
        setSpeechState((prev) =>
          prev === "listening" || prev === "requesting" ? "idle" : prev
        );
        recognitionRef.current = null;
        isExplicitStopRef.current = false;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSpeechState("error");
      setErrorMessage(
        err?.message || "Could not start microphone. Please check permissions."
      );
      recognitionRef.current = null;
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) {
      setSpeechState("idle");
      return;
    }
    isExplicitStopRef.current = true;
    setSpeechState("processing");
    try {
      recognitionRef.current.stop();
    } catch {
      setSpeechState("idle");
      recognitionRef.current = null;
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
