import React from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RFQItem } from "@/types";

export interface ItemRowsProps {
  items: RFQItem[];
  onChange: (items: RFQItem[]) => void;
  highlightMissing?: boolean;
}

export function ItemRows({
  items,
  onChange,
  highlightMissing = false,
}: ItemRowsProps) {
  const handleAddItem = () => {
    onChange([...items, { name: "", quantity: 1, unit: "units" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const handleFieldChange = (
    index: number,
    field: keyof RFQItem,
    value: string | number
  ) => {
    const updated = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Materials & Items ({items.length})
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="gap-1 text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Row</span>
        </Button>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const isNameEmpty = highlightMissing && !item.name.trim();
          const isQtyInvalid = highlightMissing && (!item.quantity || item.quantity <= 0);

          return (
            <div
              key={idx}
              className={`flex items-start sm:items-center gap-2 p-2 rounded-lg transition-colors ${
                isNameEmpty || isQtyInvalid
                  ? "bg-amber-50/70 border border-amber-200"
                  : "bg-slate-50 border border-slate-100"
              }`}
            >
              {/* Item Name */}
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Item name (e.g. Standard red clay bricks)"
                  value={item.name}
                  onChange={(e) => handleFieldChange(idx, "name", e.target.value)}
                  className={`bg-white text-sm h-10 ${
                    isNameEmpty ? "border-amber-400 focus-visible:ring-amber-500" : ""
                  }`}
                  aria-label={`Item ${idx + 1} name`}
                />
              </div>

              {/* Quantity */}
              <div className="w-20 sm:w-24">
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Qty"
                  value={item.quantity || ""}
                  onChange={(e) =>
                    handleFieldChange(idx, "quantity", parseFloat(e.target.value) || 0)
                  }
                  className={`bg-white text-sm h-10 tabular-nums ${
                    isQtyInvalid ? "border-amber-400 focus-visible:ring-amber-500" : ""
                  }`}
                  aria-label={`Item ${idx + 1} quantity`}
                />
              </div>

              {/* Unit (Optional) */}
              <div className="w-24 sm:w-32">
                <Input
                  placeholder="Unit (e.g. bags)"
                  value={item.unit || ""}
                  onChange={(e) => handleFieldChange(idx, "unit", e.target.value)}
                  className="bg-white text-sm h-10"
                  aria-label={`Item ${idx + 1} unit`}
                />
              </div>

              {/* Delete Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveItem(idx)}
                disabled={items.length <= 1}
                className="h-10 w-10 text-slate-400 hover:text-red-600 disabled:opacity-30 shrink-0"
                title={items.length <= 1 ? "At least one item is required" : "Remove item"}
                aria-label={`Remove item ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {highlightMissing && items.some((i) => !i.name.trim() || !i.quantity) && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Please make sure each item has a description and a positive quantity.</span>
        </div>
      )}
    </div>
  );
}
