import { ApiErrorCode, ParsedRfqDraft, RFQItem } from "@/types";

export type RfqCreatorStep =
  | "input"
  | "parsing"
  | "review"
  | "submitting"
  | "done"
  | "parse_failed";

export interface RfqCreatorState {
  step: RfqCreatorStep;
  rawText: string;
  items: RFQItem[];
  deliveryDate: string;
  location: string;
  missingFields: string[];
  assumptions: string[];
  error: { code: ApiErrorCode | string; message: string } | null;
  createdRfqId: string | null;
  isDirty: boolean;
}

export type RfqCreatorAction =
  | { type: "SET_RAW_TEXT"; payload: string }
  | { type: "START_PARSING" }
  | { type: "CANCEL_PARSING" }
  | { type: "PARSE_SUCCESS"; payload: ParsedRfqDraft }
  | { type: "PARSE_FAILURE"; payload: { code: ApiErrorCode | string; message: string } }
  | { type: "GO_MANUAL" }
  | { type: "SET_ITEMS"; payload: RFQItem[] }
  | { type: "SET_DELIVERY_DATE"; payload: string }
  | { type: "SET_LOCATION"; payload: string }
  | { type: "DISMISS_ASSUMPTION"; payload: number }
  | { type: "START_SUBMITTING" }
  | { type: "SUBMIT_SUCCESS"; payload: string }
  | { type: "SUBMIT_FAILURE"; payload: { code: ApiErrorCode | string; message: string } }
  | { type: "RESET" };

export const initialRfqCreatorState: RfqCreatorState = {
  step: "input",
  rawText: "",
  items: [{ name: "", quantity: 1, unit: "units" }],
  deliveryDate: "",
  location: "",
  missingFields: [],
  assumptions: [],
  error: null,
  createdRfqId: null,
  isDirty: false,
};

export function rfqCreatorReducer(
  state: RfqCreatorState,
  action: RfqCreatorAction
): RfqCreatorState {
  switch (action.type) {
    case "SET_RAW_TEXT":
      return {
        ...state,
        rawText: action.payload,
        isDirty: Boolean(action.payload.trim()),
      };

    case "START_PARSING":
      return {
        ...state,
        step: "parsing",
        error: null,
      };

    case "CANCEL_PARSING":
      return {
        ...state,
        step: "input",
        error: null,
      };

    case "PARSE_SUCCESS": {
      const draft = action.payload;
      return {
        ...state,
        step: "review",
        items: draft.items.length ? draft.items : [{ name: "", quantity: 1, unit: "units" }],
        deliveryDate: draft.deliveryDate || state.deliveryDate,
        location: draft.location || state.location,
        missingFields: draft.missingFields || [],
        assumptions: draft.assumptions || [],
        error: null,
        isDirty: true,
      };
    }

    case "PARSE_FAILURE":
      return {
        ...state,
        step: "parse_failed",
        error: action.payload,
      };

    case "GO_MANUAL": {
      // Transition directly to review, prefilling with whatever text we have
      const fallbackItems: RFQItem[] =
        state.items.length && state.items[0].name.trim()
          ? state.items
          : state.rawText.trim()
          ? [{ name: state.rawText.slice(0, 60), quantity: 1, unit: "units" }]
          : [{ name: "", quantity: 1, unit: "units" }];

      return {
        ...state,
        step: "review",
        items: fallbackItems,
        missingFields: [],
        error: null,
        isDirty: true,
      };
    }

    case "SET_ITEMS":
      return {
        ...state,
        items: action.payload,
        isDirty: true,
      };

    case "SET_DELIVERY_DATE":
      return {
        ...state,
        deliveryDate: action.payload,
        // Clear missingField highlight if user filled it
        missingFields: state.missingFields.filter((f) => f !== "deliveryDate"),
        isDirty: true,
      };

    case "SET_LOCATION":
      return {
        ...state,
        location: action.payload,
        // Clear missingField highlight if user filled it
        missingFields: state.missingFields.filter((f) => f !== "location"),
        isDirty: true,
      };

    case "DISMISS_ASSUMPTION":
      return {
        ...state,
        assumptions: state.assumptions.filter((_, idx) => idx !== action.payload),
      };

    case "START_SUBMITTING":
      return {
        ...state,
        step: "submitting",
        error: null,
      };

    case "SUBMIT_SUCCESS":
      return {
        ...state,
        step: "done",
        createdRfqId: action.payload,
        error: null,
        isDirty: false,
      };

    case "SUBMIT_FAILURE":
      return {
        ...state,
        step: "review",
        error: action.payload,
      };

    case "RESET":
      return {
        ...initialRfqCreatorState,
      };

    default:
      return state;
  }
}
