# Standard Operating Procedures (SOPs)

## Overview

This directory contains all Standard Operating Procedures for the Wawa Garden Bar application. SOPs are organized by role and operational area.

## SOP Index

### Front of House / Waiters

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-WAITER-001 | Tab and Order Creation | `SOP-WAITER-TAB-ORDER-MANAGEMENT.md` | Waiters, Servers, Floor Staff |
| SOP-WAITER-002 | Tab Settlement and Payment Processing | `SOP-WAITER-TAB-SETTLEMENT-PAYMENT.md` | Waiters, Servers, Cashiers |
| SOP-WAITER-003 | Order Modifications and Cancellations | `SOP-WAITER-ORDER-MODIFICATIONS.md` | Waiters, Servers, Floor Staff |

### Kitchen / Back of House

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-KITCHEN-001 | Kitchen Display System Operations | `SOP-KITCHEN-DISPLAY-OPERATIONS.md` | Kitchen Staff, Chefs, Line Cooks |

### Administration (Dashboard)

| Document ID | Title | File | Audience | Permission Required |
|-------------|-------|------|----------|---------------------|
| SOP-ADMIN-001 | Order Queue Management | `SOP-ADMIN-ORDER-MANAGEMENT.md` | Admin, Super-Admin | orderManagement |
| SOP-ADMIN-002 | Menu Management | `SOP-ADMIN-MENU-MANAGEMENT.md` | Super-Admin | menuManagement |
| SOP-ADMIN-003 | Inventory Management | `SOP-ADMIN-INVENTORY-MANAGEMENT.md` | Super-Admin | inventoryManagement |
| SOP-ADMIN-004 | Daily Close-Out and Financial Reporting | `SOP-ADMIN-DAILY-CLOSEOUT.md` | Super-Admin | reportsAndAnalytics, expensesManagement |
| SOP-ADMIN-005 | Rewards and Loyalty Program Management | `SOP-ADMIN-REWARDS-LOYALTY.md` | Super-Admin | rewardsAndLoyalty |
| SOP-ADMIN-006 | Admin User Management and System Configuration | `SOP-ADMIN-USER-SYSTEM-CONFIG.md` | Super-Admin | settingsAndConfiguration |
| SOP-ADMIN-007 | Audit Log Review and Customer Data Management | `SOP-ADMIN-AUDIT-CUSTOMER-DATA.md` | Super-Admin | settingsAndConfiguration |

### Customer Service

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-CSR-001 | Delivery Order Management | `SOP-CSR-DELIVERY-ORDER-MANAGEMENT.md` | Customer Service Reps, Delivery Coordinators |

### API / Technical Integration

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-API-001 | Agentic API Tab and Order Management | `SOP-API-TAB-ORDER-MANAGEMENT.md` | AI Agents, Third-party Systems |
| SOP-API-002 | Agentic API Reporting and Analytics | `SOP-API-REPORTING.md` | AI Agents, Analytics Systems |
| SOP-API-003 | Agentic API Tab Settlement and Payment | `SOP-API-TAB-SETTLEMENT-PAYMENT.md` | AI Agents, POS Integrations |
| SOP-API-004 | Agentic API Order Lifecycle Management | `SOP-API-ORDER-LIFECYCLE.md` | AI Agents, KDS Integrations |
| SOP-API-005 | Agentic API Delivery Order Management | `SOP-API-DELIVERY-ORDER-MANAGEMENT.md` | AI Agents, Delivery Platforms |
| SOP-API-006 | Agentic API Inventory Management | `SOP-API-INVENTORY-MANAGEMENT.md` | AI Agents, Supply Chain Systems |
| SOP-API-007 | Agentic API Rewards and Loyalty | `SOP-API-REWARDS-LOYALTY.md` | AI Agents, CRM Systems |
| SOP-API-008 | Agentic API Customer Management | `SOP-API-CUSTOMER-MANAGEMENT.md` | AI Agents, CRM/Marketing Platforms |

### Reference Documents

| Document | File | Description |
|----------|------|-------------|
| Setup Guide | `setup.md` | Project initialization and configuration |
| Environment Variables | `environment-variables-fixed.md` | Environment variable reference and migration guide |
| Operational Scripts | `operational-scripts.md` | Database scripts for seeding, cleanup, and diagnostics |

## Role-to-Scope Mapping (API Keys)

| Role | Scope Count | Scopes |
|------|-------------|--------|
| **Customer** | 7 | menu:read, orders:read, orders:write, payments:read, payments:write, rewards:read, tabs:read |
| **CSR** | 10 | All Customer scopes + customers:read, customers:write, tabs:write |
| **Admin** | 12 | All CSR scopes + inventory:read, analytics:read |
| **Super-Admin** | 14 | All scopes (adds inventory:write, settings:read) |

## Roles and Permissions

| Role | Level | Dashboard Access | SOPs to Follow |
|------|-------|-----------------|----------------|
| Waiter / Server | -- | Orders, Kitchen only | SOP-WAITER-001, 002, 003 |
| Customer Service Rep (CSR) | -- | Orders, Customers, Rewards | SOP-CSR-001, SOP-WAITER-* |
| Kitchen Staff | -- | Kitchen Display only | SOP-KITCHEN-001 |
| Admin | 2 | Orders, Kitchen | SOP-ADMIN-001, SOP-WAITER-* |
| Super-Admin | 3 | All sections | All SOP-ADMIN-*, SOP-WAITER-* |
| API Consumer | -- | Via API only | SOP-API-001 through 008 |

## Training Path

### New Waiter Onboarding
1. Read SOP-WAITER-001 (Tab and Order Creation)
2. Read SOP-WAITER-002 (Tab Settlement and Payment)
3. Read SOP-WAITER-003 (Order Modifications and Cancellations)
4. Shadow an experienced staff member for one shift

### New Kitchen Staff Onboarding
1. Read SOP-KITCHEN-001 (Kitchen Display System)
2. Familiarize with the menu (categories, preparation times)
3. Shadow an experienced cook for one shift

### New Customer Service Rep Onboarding
1. Read SOP-CSR-001 (Delivery Order Management)
2. Read SOP-WAITER-001 (Tab and Order Creation) for general order understanding
3. Read SOP-WAITER-003 (Order Modifications and Cancellations)
4. Shadow an experienced CSR for one shift

### New Admin Onboarding
1. Complete Waiter training path above
2. Read SOP-ADMIN-001 (Order Queue Management)
3. Read any SOP-ADMIN documents relevant to granted permissions

### New Super-Admin Onboarding
1. Complete Admin training path above
2. Read all SOP-ADMIN documents (001-007)
3. Read operational-scripts.md for system maintenance

## Version Control

All SOPs follow semantic versioning. Changes are tracked in each document's Revision History table. Major operational changes require review and re-approval.
