"use client";

import React, { useReducer, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Send,
  Calendar,
  MapPin,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileEdit,
  Clock,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ItemRows } from "./ItemRows";
import {
  rfqCreatorReducer,
  initialRfqCreatorState,
  RfqCreatorState,
} from "./rfqCreatorReducer";
import { parseRfqText, createRfq } from "@/lib/api/rfq";
import { AI_PARSE_TIMEOUT_MS, RFQ_TEXT_MAX_LENGTH } from "@/lib/config";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { MicButton } from "@/components/voice/MicButton";
import { RFQItem } from "@/types";

const EXAMPLE_PROMPTS = [
  "500 standard red clay bricks and 20 bags of Portland cement delivered downtown by Friday",
  "200 sheets of 1/2 inch drywall and 10 buckets of joint compound for Westside Lofts next Monday",
  "15 tons of masonry sand and 40 cinder blocks delivered to Harbor Dock tomorrow morning",
];

export function RfqCreator() {
  const router = useRouter();
  const [state, dispatch] = useReducer(rfqCreatorReducer, initialRfqCreatorState);

  // AbortController reference for cancelable parsing
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // UI state
  const [showOriginalDrawer, setShowOriginalDrawer] = useState(false);
  const [showStartOverModal, setShowStartOverModal] = useState(false);

  // Rate limit countdown timer (if rate limited)
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);

  // Speech Recognition integration
  const {
    isSupported: isVoiceSupported,
    speechState,
    isListening,
    interimTranscript,
    errorMessage: speechError,
    toggleListening,
  } = useSpeechInput({
    onTranscriptAppend: (text) => {
      dispatch({
        type: "SET_RAW_TEXT",
        payload: state.rawText.trim() ? `${state.rawText.trim()} ${text}` : text,
      });
    },
  });

  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCountdown]);

  // Clean up timers & abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, []);

  // Browser beforeunload prompt if form has unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty && state.step !== "done") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isDirty, state.step]);

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------
  const handleStartParsing = async () => {
    if (!state.rawText.trim()) {
      toast.error("Please enter a description of what you need.");
      return;
    }

    dispatch({ type: "START_PARSING" });

    // Setup AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Client-side timeout slightly longer than server timeout
    timeoutTimerRef.current = setTimeout(() => {
      controller.abort();
      dispatch({
        type: "PARSE_FAILURE",
        payload: {
          code: "AI_TIMEOUT",
          message: "Parsing took longer than expected. You can try again or fill in the details manually.",
        },
      });
      toast.error("AI parsing timed out.");
    }, AI_PARSE_TIMEOUT_MS);

    try {
      const parsedDraft = await parseRfqText(state.rawText, controller.signal);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

      dispatch({ type: "PARSE_SUCCESS", payload: parsedDraft });
      toast.success("Request structured! Please review the details below.");
    } catch (err: any) {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

      if (err?.code === "NETWORK_ERROR" && err?.message?.includes("aborted")) {
        // User deliberately cancelled, already handled by cancel action
        return;
      }

      const errorCode = err?.code || "AI_PARSE_FAILED";
      const errorMessage =
        err?.message || "We couldn't structure that automatically. Please review or enter manually.";

      if (errorCode === "RATE_LIMITED") {
        setRateLimitCountdown(15);
      }

      dispatch({
        type: "PARSE_FAILURE",
        payload: { code: errorCode, message: errorMessage },
      });
    }
  };

  const handleCancelParsing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
    }
    dispatch({ type: "CANCEL_PARSING" });
    toast.info("Parsing cancelled.");
  };

  const handleSubmitRfq = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = state.items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one item with a valid name and positive quantity.");
      return;
    }

    if (!state.deliveryDate) {
      toast.error("Please choose a delivery date.");
      return;
    }

    if (!state.location.trim()) {
      toast.error("Please provide a delivery location.");
      return;
    }

    dispatch({ type: "START_SUBMITTING" });

    try {
      const created = await createRfq({
        rawText: state.rawText,
        items: validItems,
        deliveryDate: state.deliveryDate,
        location: state.location.trim(),
      });

      dispatch({ type: "SUBMIT_SUCCESS", payload: created.id });
      toast.success("Your RFQ is live! Suppliers can now place bids.");
    } catch (err: any) {
      dispatch({
        type: "SUBMIT_FAILURE",
        payload: {
          code: err?.code || "UNKNOWN_ERROR",
          message: err?.message || "Failed to post RFQ. Please try again.",
        },
      });
      toast.error(err?.message || "Failed to post RFQ.");
    }
  };

  // -------------------------------------------------------------
  // STEP: DONE (Success Screen)
  // -------------------------------------------------------------
  if (state.step === "done") {
    return (
      <Card className="max-w-xl mx-auto border-emerald-200 bg-white text-center p-8 sm:p-10 shadow-sm animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-in bounce-in duration-300">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900">
          Your RFQ is Live
        </CardTitle>
        <CardDescription className="text-slate-600 mt-2 text-base">
          Sellers and suppliers in the area can now submit bids for your materials.
        </CardDescription>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/buyer" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2">
              <span>View My RFQs</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "RESET" })}
            className="w-full sm:w-auto gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Create Another</span>
          </Button>
        </div>
      </Card>
    );
  }

  // -------------------------------------------------------------
  // STEP: PARSING (Skeleton + Abort)
  // -------------------------------------------------------------
  if (state.step === "parsing") {
    return (
      <Card className="max-w-2xl mx-auto border-slate-200 shadow-sm">
        <CardHeader className="text-center pb-4 border-b border-slate-100">
          <div className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm mx-auto mb-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Reading your request...</span>
          </div>
          <CardTitle className="text-xl">Structuring Materials & Delivery</CardTitle>
          <CardDescription>
            AI is analyzing item names, quantities, required dates, and destination.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Read-only raw text preview */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono">
            <span className="text-[11px] text-slate-400 block mb-1 font-sans font-semibold uppercase">
              Input Prompt:
            </span>
            &ldquo;{state.rawText}&rdquo;
          </div>

          {/* Skeletons simulating the review form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>

          {/* Cancel button */}
          <div className="pt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelParsing}
              className="gap-2 text-slate-600 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------
  // STEP: PARSE_FAILED (Contextual Failure Recovery)
  // -------------------------------------------------------------
  if (state.step === "parse_failed") {
    const isTimeout = state.error?.code === "AI_TIMEOUT";
    const isRateLimited = state.error?.code === "RATE_LIMITED";
    const isOffline = state.error?.code === "NETWORK_ERROR";

    return (
      <Card className="max-w-2xl mx-auto border-amber-300 bg-amber-50/40 shadow-sm p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            {isOffline ? (
              <WifiOff className="h-5 w-5" />
            ) : isTimeout ? (
              <Clock className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">
              {isTimeout
                ? "Parsing took a bit too long"
                : isRateLimited
                ? "Too many tries, please wait a moment"
                : isOffline
                ? "You appear to be offline"
                : "We couldn't read that automatically"}
            </h3>
            <p className="text-sm text-slate-600">
              {isRateLimited && rateLimitCountdown > 0
                ? `You can try again in ${rateLimitCountdown} seconds, or fill in your details manually right away.`
                : isOffline
                ? "Your typed text is safely preserved below. You can retry once connected or continue manually."
                : state.error?.message ||
                  "You can retry with a clearer sentence, or proceed directly to the manual form with your text preserved."}
            </p>
          </div>
        </div>

        {/* Preserved user text */}
        <div className="p-3.5 rounded-lg bg-white border border-amber-200 text-xs text-slate-800 font-mono">
          <span className="text-[11px] text-slate-400 block mb-1 font-sans font-semibold uppercase">
            Preserved Text:
          </span>
          &ldquo;{state.rawText}&rdquo;
        </div>

        {/* Dual Actions: Try Again vs Fill Manually */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => dispatch({ type: "GO_MANUAL" })}
            className="w-full sm:w-auto gap-2"
          >
            <FileEdit className="h-4 w-4" />
            <span>Fill it in manually</span>
          </Button>

          <Button
            type="button"
            onClick={handleStartParsing}
            disabled={isRateLimited && rateLimitCountdown > 0}
            className="w-full sm:w-auto gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>
              {isRateLimited && rateLimitCountdown > 0
                ? `Try again (${rateLimitCountdown}s)`
                : "Try again"}
            </span>
          </Button>
        </div>
      </Card>
    );
  }

  // -------------------------------------------------------------
  // STEP: REVIEW & SUBMIT (The Structured Form)
  // -------------------------------------------------------------
  if (state.step === "review" || state.step === "submitting") {
    const isDeliveryDateMissing = state.missingFields.includes("deliveryDate");
    const isLocationMissing = state.missingFields.includes("location");

    return (
      <form onSubmit={handleSubmitRfq} className="max-w-2xl mx-auto space-y-6">
        {/* Collapsible Original Text Drawer */}
        {state.rawText && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setShowOriginalDrawer((prev) => !prev)}
              className="w-full px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 flex items-center justify-between bg-slate-50 border-b border-slate-200 transition-colors"
            >
              <span className="font-semibold">
                Original Request Text {showOriginalDrawer ? "(Click to hide)" : "(Click to compare)"}
              </span>
              {showOriginalDrawer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showOriginalDrawer && (
              <div className="p-4 text-xs font-mono text-slate-700 bg-white leading-relaxed">
                &ldquo;{state.rawText}&rdquo;
              </div>
            )}
          </div>
        )}

        {/* Assumptions Banners */}
        {state.assumptions.length > 0 && (
          <div className="space-y-1.5">
            {state.assumptions.map((assumption, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-800"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 text-[10px] py-0">
                    Assumption
                  </Badge>
                  <span>{assumption}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "DISMISS_ASSUMPTION", payload: idx })}
                  className="p-1 text-blue-500 hover:text-blue-800"
                  aria-label="Dismiss assumption"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Item Rows Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Review Materials</CardTitle>
            <CardDescription>
              Confirm item quantities and add any missing specifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemRows
              items={state.items}
              onChange={(items) => dispatch({ type: "SET_ITEMS", payload: items })}
              highlightMissing={state.missingFields.includes("items")}
            />
          </CardContent>
        </Card>

        {/* Delivery Details Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Delivery Information</CardTitle>
            <CardDescription>
              Suppliers calculate their quotes and lead times based on your location and date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Delivery Date */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Delivery Date Required</span>
                </label>
                {isDeliveryDateMissing && (
                  <span className="text-[11px] font-medium text-amber-700">
                    Date was not detected — please select one
                  </span>
                )}
              </div>
              <Input
                type="date"
                value={state.deliveryDate}
                onChange={(e) =>
                  dispatch({ type: "SET_DELIVERY_DATE", payload: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
                hasError={isDeliveryDateMissing && !state.deliveryDate}
                className={
                  isDeliveryDateMissing && !state.deliveryDate
                    ? "ring-2 ring-amber-400 border-amber-400"
                    : ""
                }
                required
              />
            </div>

            {/* Delivery Location */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>Delivery Location</span>
                </label>
                {isLocationMissing && (
                  <span className="text-[11px] font-medium text-amber-700">
                    Location was not detected — please add address
                  </span>
                )}
              </div>
              <Input
                placeholder="Jobsite address, landmark, or delivery zone"
                value={state.location}
                onChange={(e) =>
                  dispatch({ type: "SET_LOCATION", payload: e.target.value })
                }
                hasError={isLocationMissing && !state.location.trim()}
                className={
                  isLocationMissing && !state.location.trim()
                    ? "ring-2 ring-amber-400 border-amber-400"
                    : ""
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowStartOverModal(true)}
            className="w-full sm:w-auto"
          >
            Start Over
          </Button>

          <Button
            type="submit"
            isLoading={state.step === "submitting"}
            loadingText="Posting RFQ..."
            className="w-full sm:w-auto gap-2 px-6"
          >
            <Send className="h-4 w-4" />
            <span>Post RFQ</span>
          </Button>
        </div>

        {/* Start Over Confirmation Modal */}
        <Dialog open={showStartOverModal} onOpenChange={setShowStartOverModal}>
          <DialogHeader>
            <DialogTitle>Discard changes and start over?</DialogTitle>
            <DialogDescription>
              This will clear your structured items and return to the request prompt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartOverModal(false)}>
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowStartOverModal(false);
                dispatch({ type: "RESET" });
              }}
            >
              Start Over
            </Button>
          </DialogFooter>
        </Dialog>
      </form>
    );
  }

  // -------------------------------------------------------------
  // STEP: INPUT (Initial Prompt Step)
  // -------------------------------------------------------------
  return (
    <Card className="max-w-2xl mx-auto border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>AI Fast Structure</span>
          </div>

          {/* Voice Input Mic Button */}
          <MicButton
            isSupported={isVoiceSupported}
            speechState={speechState}
            onToggle={toggleListening}
          />
        </div>
        <CardTitle className="text-xl">Describe what you need</CardTitle>
        <CardDescription>
          Speak or type naturally. We’ll extract items, quantities, delivery date, and site address.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Speech Recognition Error Banner */}
        {speechError && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Interim Speech Transcription Feedback */}
        {isListening && (
          <div className="p-2.5 rounded-lg bg-red-50/60 border border-red-200 text-xs text-red-900 flex items-center gap-2 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="font-medium">Listening:</span>
            <span className="italic truncate">{interimTranscript || "Speak now..."}</span>
          </div>
        )}

        {/* Large Textarea with Character Counter */}
        <div className="space-y-1">
          <Textarea
            placeholder="e.g. I need 500 bricks and 10 bags of cement delivered downtown by Friday..."
            value={state.rawText}
            maxLength={RFQ_TEXT_MAX_LENGTH}
            onChange={(e) => dispatch({ type: "SET_RAW_TEXT", payload: e.target.value })}
            className="min-h-[140px] text-base leading-relaxed"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleStartParsing();
              }
            }}
            autoFocus
          />
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Press Cmd+Enter or click below</span>
            <span className="tabular-nums">
              {state.rawText.length}/{RFQ_TEXT_MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* Tappable Example Chips */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Or tap an example prompt:
          </span>
          <div className="flex flex-col gap-1.5">
            {EXAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => dispatch({ type: "SET_RAW_TEXT", payload: prompt })}
                className="text-left text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-colors"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => dispatch({ type: "GO_MANUAL" })}
            className="text-xs text-slate-500 hover:text-slate-900 underline order-2 sm:order-1"
          >
            Prefer to fill it in manually
          </button>

          <Button
            type="button"
            onClick={handleStartParsing}
            disabled={!state.rawText.trim()}
            className="w-full sm:w-auto gap-2 order-1 sm:order-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Structure my request</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
