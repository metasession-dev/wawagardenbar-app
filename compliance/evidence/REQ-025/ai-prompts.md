# AI Prompts Log — REQ-025

**AI Tool:** Cascade (Codeium)
**Risk Level:** HIGH
**Date:** 2026-04-12

## Summary

Cascade was used as pair programmer throughout all phases of this requirement. All generated code was reviewed and approved by William before commit.

## Phase 1 — Unit Tests

- "Write unit tests for deriveBusinessDate and shouldShowPreviousDayCheckbox using WAT timezone offset, covering before cutoff, at cutoff, after cutoff, midnight boundary, and invalid cutoff fallback"
- "Write unit tests to confirm orders and tabs are attributed to the correct businessDate field for reporting, independent of paidAt timestamps"

## Phase 2 — Implementation

- "Add optional businessDate field to IOrder and ITab interfaces and Mongoose schemas with an index"
- "Add getBusinessDayCutoff and updateBusinessDayCutoff to SystemSettingsService with validation and audit log"
- "Update TabService markTabPaid, completeTabPaymentManually, closeTab to derive and set businessDate"
- "Update OrderService updatePaymentStatus and completeOrderPaymentManually to set businessDate"
- "Update FinancialReportService to query by businessDate instead of paidAt"
- "Update Monnify and Paystack webhooks to derive and set businessDate on payment confirmation"

## Phase 3 — UI

- "Create a reusable BusinessDayCheckbox component that is pre-checked and visible only before the cutoff time"
- "Create BusinessDayCutoffForm component for the settings page"
- "Integrate BusinessDayCheckbox into AdminPayTabDialog, AdminPayOrderDialog, and Express Close Tab page"
- "Add getBusinessDayCutoffAction and updateBusinessDayCutoffAction to settings actions"

## Phase 4 — E2E Tests

- "Write Playwright E2E tests for the business day cutoff feature covering settings page, express close tab, and order payment dialog"

## Phase 5 — Backfill Script

- "Write a one-time idempotent backfill script to populate businessDate on existing paid orders and closed tabs using paidAt/closedAt and the configured cutoff"

## Phase 6 — Gates & Evidence

- "Fix paidAt fallback in FinancialReportService queries for pre-migration records"
- "Upgrade next.js to patch GHSA-q4gf-8mx6-v5v3"
- "Create security-summary.md, test-execution-summary.md, release ticket, and update RTM"
