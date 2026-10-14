"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Send, Plus, Trash2, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { parseRfqText, createRfq } from "@/lib/api/rfq";
import { RFQItem } from "@/types";

const EXAMPLE_PROMPTS = [
  "500 standard red clay bricks and 20 bags of Portland cement delivered downtown by Friday",
  "200 sheets of 1/2 inch drywall and 10 buckets of joint compound for Westside Lofts next Monday",
  "15 tons of masonry sand and 40 cinder blocks delivered to Harbor Dock tomorrow morning",
];

export default function NewRfqPage() {
  const router = useRouter();

  // Mode: 'ai' or 'manual'
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [promptText, setPromptText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [items, setItems] = useState<RFQItem[]>([
    { name: "", quantity: 1, unit: "units" },
  ]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [location, setLocation] = useState("");

  const handleStructureWithAi = async () => {
    if (!promptText.trim()) {
      toast.error("Please enter a description of what you need.");
      return;
    }

    setIsParsing(true);
    try {
      const parsed = await parseRfqText(promptText);
      setItems(parsed.items.length ? parsed.items : [{ name: promptText, quantity: 1, unit: "units" }]);
      if (parsed.deliveryDate) setDeliveryDate(parsed.deliveryDate);
      if (parsed.location) setLocation(parsed.location);

      setMode("manual");
      toast.success("Request structured! Please review the details below.");
    } catch (err: any) {
      toast.error(err?.message || "Could not parse automatically. Please fill in details manually.");
      setMode("manual");
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: "", quantity: 1, unit: "units" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof RFQItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one item with a valid name and quantity.");
      return;
    }
    if (!deliveryDate) {
      toast.error("Please specify a required delivery date.");
      return;
    }
    if (!location.trim()) {
      toast.error("Please provide a delivery location.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRfq({
        rawText: promptText,
        items: validItems,
        deliveryDate,
        location: location.trim(),
      });
      toast.success("Your RFQ is live! Suppliers have been notified.");
      router.push("/buyer");
    } catch (err: any) {
      toast.error(err?.message || "Failed to post RFQ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Create Request for Quote"
      description="Tell us what materials you need. Describe it naturally or fill in the structured form."
      actions={
        <Link href="/buyer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to RFQs</span>
          </Button>
        </Link>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {mode === "ai" ? (
          /* AI Assist Step */
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
                <Sparkles className="h-4 w-4" />
                <span>AI Fast Structure</span>
              </div>
              <CardTitle className="text-xl">Describe your requirements</CardTitle>
              <CardDescription>
                Speak or type naturally. Our AI will parse items, quantities, date, and location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g. 500 standard red clay bricks and 20 bags of Portland cement delivered downtown by Friday..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="min-h-[120px] text-base leading-relaxed"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    handleStructureWithAi();
                  }
                }}
              />

              {/* Example Prompts */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Or click an example:
                </span>
                <div className="flex flex-col gap-1.5">
                  {EXAMPLE_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptText(prompt)}
                      className="text-left text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="text-xs text-slate-500 hover:text-slate-900 underline order-2 sm:order-1"
                >
                  Prefer to fill it in manually
                </button>

                <Button
                  onClick={handleStructureWithAi}
                  isLoading={isParsing}
                  loadingText="Structuring request..."
                  className="w-full sm:w-auto gap-2 order-1 sm:order-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Structure my request</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Structured Review & Submit Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Items & Quantities</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Item name (e.g. Red clay bricks)"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      className="flex-1"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                      }
                      className="w-20 tabular-nums"
                      min={1}
                      required
                    />
                    <Input
                      placeholder="Unit (e.g. bags)"
                      value={item.unit || ""}
                      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                      className="w-24 sm:w-28"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Delivery Date Required</span>
                  </label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Delivery Location</span>
                  </label>
                  <Input
                    placeholder="Site address or jobsite location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("ai")}
              >
                Back to Prompt
              </Button>

              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Posting RFQ..."
                className="gap-2 px-6"
              >
                <Send className="h-4 w-4" />
                <span>Post RFQ</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
}
