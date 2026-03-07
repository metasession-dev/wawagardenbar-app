# Standard Operating Procedures (SOPs)

## Overview

This directory contains all Standard Operating Procedures for the Wawa Garden Bar application. SOPs are organized into two categories:

- **Manual SOPs** (`SOP-MANUAL-*`) -- Step-by-step dashboard UI instructions for human staff.
- **Agentic SOPs** (`SOP-AGENTIC-*`) -- REST API endpoint specifications for AI agents and third-party integrations.

## SOP Index

### Manual SOPs -- Front of House / Waiters

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-MANUAL-WAITER-001 | Tab and Order Creation | `SOP-MANUAL-WAITER-TAB-ORDER-MANAGEMENT.md` | Waiters, Servers, Floor Staff |
| SOP-MANUAL-WAITER-002 | Tab Settlement and Payment Processing | `SOP-MANUAL-WAITER-TAB-SETTLEMENT-PAYMENT.md` | Waiters, Servers, Cashiers |
| SOP-MANUAL-WAITER-003 | Order Modifications and Cancellations | `SOP-MANUAL-WAITER-ORDER-MODIFICATIONS.md` | Waiters, Servers, Floor Staff |

### Manual SOPs -- Kitchen / Back of House

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-MANUAL-KITCHEN-001 | Kitchen Display System Operations | `SOP-MANUAL-KITCHEN-DISPLAY-OPERATIONS.md` | Kitchen Staff, Chefs, Line Cooks |

### Manual SOPs -- Customer Service

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-MANUAL-CSR-001 | Delivery Order Management | `SOP-MANUAL-CSR-DELIVERY-ORDER-MANAGEMENT.md` | Customer Service Reps, Delivery Coordinators |

### Manual SOPs -- Administration (Dashboard)

| Document ID | Title | File | Audience | Permission Required |
|-------------|-------|------|----------|---------------------|
| SOP-MANUAL-ADMIN-001 | Order Queue Management | `SOP-MANUAL-ADMIN-ORDER-MANAGEMENT.md` | Admin, Super-Admin | orderManagement |
| SOP-MANUAL-ADMIN-002 | Menu Management | `SOP-MANUAL-ADMIN-MENU-MANAGEMENT.md` | Super-Admin | menuManagement |
| SOP-MANUAL-ADMIN-003 | Inventory Management | `SOP-MANUAL-ADMIN-INVENTORY-MANAGEMENT.md` | Super-Admin | inventoryManagement |
| SOP-MANUAL-ADMIN-004 | Daily Close-Out and Financial Reporting | `SOP-MANUAL-ADMIN-DAILY-CLOSEOUT.md` | Super-Admin | reportsAndAnalytics, expensesManagement |
| SOP-MANUAL-ADMIN-005 | Rewards and Loyalty Program Management | `SOP-MANUAL-ADMIN-REWARDS-LOYALTY.md` | Super-Admin | rewardsAndLoyalty |
| SOP-MANUAL-ADMIN-006 | Admin User Management and System Configuration | `SOP-MANUAL-ADMIN-USER-SYSTEM-CONFIG.md` | Super-Admin | settingsAndConfiguration |
| SOP-MANUAL-ADMIN-007 | Audit Log Review and Customer Data Management | `SOP-MANUAL-ADMIN-AUDIT-CUSTOMER-DATA.md` | Super-Admin | settingsAndConfiguration |
| SOP-MANUAL-ADMIN-008 | Customer Management | `SOP-MANUAL-ADMIN-CUSTOMER-MANAGEMENT.md` | CSR, Admin, Super-Admin | -- |
| SOP-MANUAL-ADMIN-009 | Reporting and Analytics | `SOP-MANUAL-ADMIN-REPORTING-ANALYTICS.md` | Admin, Super-Admin | reportsAndAnalytics |

### Agentic SOPs -- API / Technical Integration

| Document ID | Title | File | Audience |
|-------------|-------|------|----------|
| SOP-AGENTIC-001 | Tab and Order Management | `SOP-AGENTIC-TAB-ORDER-MANAGEMENT.md` | AI Agents, Third-party Systems |
| SOP-AGENTIC-002 | Reporting and Analytics | `SOP-AGENTIC-REPORTING.md` | AI Agents, Analytics Systems |
| SOP-AGENTIC-003 | Tab Settlement and Payment | `SOP-AGENTIC-TAB-SETTLEMENT-PAYMENT.md` | AI Agents, POS Integrations |
| SOP-AGENTIC-004 | Order Lifecycle Management | `SOP-AGENTIC-ORDER-LIFECYCLE.md` | AI Agents, KDS Integrations |
| SOP-AGENTIC-005 | Delivery Order Management | `SOP-AGENTIC-DELIVERY-ORDER-MANAGEMENT.md` | AI Agents, Delivery Platforms |
| SOP-AGENTIC-006 | Inventory Management | `SOP-AGENTIC-INVENTORY-MANAGEMENT.md` | AI Agents, Supply Chain Systems |
| SOP-AGENTIC-007 | Rewards and Loyalty | `SOP-AGENTIC-REWARDS-LOYALTY.md` | AI Agents, CRM Systems |
| SOP-AGENTIC-008 | Customer Management | `SOP-AGENTIC-CUSTOMER-MANAGEMENT.md` | AI Agents, CRM/Marketing Platforms |
| SOP-AGENTIC-009 | Menu Management | `SOP-AGENTIC-MENU-MANAGEMENT.md` | AI Agents, Menu Management Systems |
| SOP-AGENTIC-010 | Admin User Management and System Configuration | `SOP-AGENTIC-ADMIN-MANAGEMENT.md` | AI Agents, Admin Automation Systems |
| SOP-AGENTIC-011 | Audit Log Review | `SOP-AGENTIC-AUDIT-LOGS.md` | AI Agents, Security Monitoring Systems |

### Reference Documents

| Document | File | Description |
|----------|------|-------------|
| Setup Guide | `setup.md` | Project initialization and configuration |
| Environment Variables | `environment-variables-fixed.md` | Environment variable reference and migration guide |
| Operational Scripts | `operational-scripts.md` | Database scripts for seeding, cleanup, and diagnostics |

## Manual / Agentic SOP Pairs

The following table shows the correspondence between manual (dashboard) and agentic (API) SOPs covering the same operational area:

| Operational Area | Manual SOP | Agentic SOP |
|------------------|------------|-------------|
| Order Management | SOP-MANUAL-ADMIN-001 | SOP-AGENTIC-004 |
| Tab and Order Creation | SOP-MANUAL-WAITER-001 | SOP-AGENTIC-001 |
| Tab Settlement and Payment | SOP-MANUAL-WAITER-002 | SOP-AGENTIC-003 |
| Delivery Order Management | SOP-MANUAL-CSR-001 | SOP-AGENTIC-005 |
| Inventory Management | SOP-MANUAL-ADMIN-003 | SOP-AGENTIC-006 |
| Rewards and Loyalty | SOP-MANUAL-ADMIN-005 | SOP-AGENTIC-007 |
| Customer Management | SOP-MANUAL-ADMIN-008 | SOP-AGENTIC-008 |
| Reporting and Analytics | SOP-MANUAL-ADMIN-009 | SOP-AGENTIC-002 |
| Menu Management | SOP-MANUAL-ADMIN-002 | SOP-AGENTIC-009 |
| Admin User Management | SOP-MANUAL-ADMIN-006 | SOP-AGENTIC-010 |
| Audit Log Review | SOP-MANUAL-ADMIN-007 | SOP-AGENTIC-011 |

## Role-to-Scope Mapping (API Keys)

| Role | Scope Count | Scopes |
|------|-------------|--------|
| **Customer** | 7 | menu:read, orders:read, orders:write, payments:read, payments:write, rewards:read, tabs:read |
| **CSR** | 10 | All Customer scopes + customers:read, customers:write, tabs:write |
| **Admin** | 14 | All CSR scopes + menu:write, inventory:read, analytics:read, audit:read |
| **Super-Admin** | 17 | All scopes (adds inventory:write, settings:read, settings:write) |

## Roles and Permissions

| Role | Level | Dashboard Access | SOPs to Follow |
|------|-------|-----------------|----------------|
| Waiter / Server | -- | Orders, Kitchen only | SOP-MANUAL-WAITER-001, 002, 003 |
| Customer Service Rep (CSR) | -- | Orders, Customers, Rewards | SOP-MANUAL-CSR-001, SOP-MANUAL-ADMIN-008 |
| Kitchen Staff | -- | Kitchen Display only | SOP-MANUAL-KITCHEN-001 |
| Admin | 2 | Orders, Kitchen | SOP-MANUAL-ADMIN-001, SOP-MANUAL-ADMIN-009 |
| Super-Admin | 3 | All sections | All SOP-MANUAL-ADMIN-*, SOP-MANUAL-WAITER-* |
| API Consumer | -- | Via API only | SOP-AGENTIC-001 through 011 |

## Training Path

### New Waiter Onboarding
1. Read SOP-MANUAL-WAITER-001 (Tab and Order Creation)
2. Read SOP-MANUAL-WAITER-002 (Tab Settlement and Payment)
3. Read SOP-MANUAL-WAITER-003 (Order Modifications and Cancellations)
4. Shadow an experienced staff member for one shift

### New Kitchen Staff Onboarding
1. Read SOP-MANUAL-KITCHEN-001 (Kitchen Display System)
2. Familiarize with the menu (categories, preparation times)
3. Shadow an experienced cook for one shift

### New Customer Service Rep Onboarding
1. Read SOP-MANUAL-CSR-001 (Delivery Order Management)
2. Read SOP-MANUAL-ADMIN-008 (Customer Management)
3. Read SOP-MANUAL-WAITER-001 (Tab and Order Creation) for general order understanding
4. Read SOP-MANUAL-WAITER-003 (Order Modifications and Cancellations)
5. Shadow an experienced CSR for one shift

### New Admin Onboarding
1. Complete Waiter training path above
2. Read SOP-MANUAL-ADMIN-001 (Order Queue Management)
3. Read SOP-MANUAL-ADMIN-009 (Reporting and Analytics)
4. Read any SOP-MANUAL-ADMIN documents relevant to granted permissions

### New Super-Admin Onboarding
1. Complete Admin training path above
2. Read all SOP-MANUAL-ADMIN documents (001-009)
3. Read operational-scripts.md for system maintenance

## Version Control

All SOPs follow semantic versioning. Changes are tracked in each document's Revision History table. Major operational changes require review and re-approval.
