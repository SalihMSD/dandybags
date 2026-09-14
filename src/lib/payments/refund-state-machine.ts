export type RefundState =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";

export type RefundEvent =
  | "initiate"
  | "razorpay_request_sent"
  | "razorpay_processed"
  | "razorpay_pending"
  | "razorpay_failed"
  | "retry"
  | "db_failure";

interface TransitionTarget {
  state: RefundState;
  event: RefundEvent;
}

const transitions: Record<RefundState, TransitionTarget[]> = {
  PENDING: [
    { state: "PROCESSING", event: "razorpay_request_sent" },
    { state: "FAILED", event: "db_failure" },
  ],
  PROCESSING: [
    { state: "SUCCESS", event: "razorpay_processed" },
    { state: "PENDING", event: "razorpay_pending" },
    { state: "FAILED", event: "razorpay_failed" },
  ],
  SUCCESS: [],
  FAILED: [
    { state: "PENDING", event: "retry" },
  ],
};

export const refundStateMachine = {
  next(state: RefundState): RefundEvent[] {
    return transitions[state].map((t) => t.event);
  },

  transition(state: RefundState, event: RefundEvent): RefundState | null {
    const target = transitions[state].find((t) => t.event === event);
    return target ? target.state : null;
  },

  isTerminal(state: RefundState): boolean {
    return state === "SUCCESS" || state === "FAILED";
  },
};
