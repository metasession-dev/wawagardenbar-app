# REQ-084 — AI Use Note

## AI Involvement

AI (Cascade) is used for implementation. Risk raised by one level per SDLC rules (MEDIUM → effectively HIGH scrutiny on review).

## Tasks Delegated to AI

- Stripping admin logic from customer checkout component and renaming
- Extending `expressCreateOrderAction` server action with orderType, customerInfo, deliveryInfo, pickupTime params
- Creating `AdminTabCheckoutForm` component for manual tab payment
- Updating express create-order page UI with order type selector and conditional fields
- Updating `payment-method-step.tsx` to remove admin props
- Removing price override validation from `createOrder` server action

## Human Review Required

- Final code review before merge (MEDIUM risk — second human reviewer required per SDLC)
- UAT verification on Railway deploy
- Financial report accuracy verification (ensure totals calculation via SettingsService produces correct delivery fees and tax)
- Verify no admin logic leaked into customer checkout path
