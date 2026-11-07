/** Shared step enum for the Hands On CPR flow (owned by CprFlowController). */
export enum CprStep {
  Idle = "Idle",
  Call = "Call",
  MarkChest = "MarkChest",
  Ready = "Ready",
  Compressing = "Compressing",
  StandClear = "StandClear",
  ShockReady = "ShockReady",
  Summary = "Summary"
}
