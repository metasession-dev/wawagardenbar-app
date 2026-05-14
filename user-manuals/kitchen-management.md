# Kitchen Management — User Manual

This manual covers the Kitchen Management feature: tracking the raw
ingredients you cook with, defining recipes, recording production
batches, and seeing how all of that flows into your inventory and
finances. It is written for restaurant operators, not developers.

If you are responsible for adding new staff, restocking ingredients,
costing dishes, or running daily reports, this is the page you want.

---

## Contents

1. [What this feature does](#what-this-feature-does)
2. [Who can use it](#who-can-use-it) — turning the permission on
3. [Two kinds of inventory](#two-kinds-of-inventory) — Sellable vs Kitchen
4. [Adding a kitchen ingredient](#adding-a-kitchen-ingredient)
5. [Restocking a kitchen ingredient from an expense](#restocking-a-kitchen-ingredient-from-an-expense)
6. [Writing a recipe](#writing-a-recipe)
7. [Recording a production batch](#recording-a-production-batch)
8. [Voiding a production batch](#voiding-a-production-batch)
9. [How this affects the Daily Financial Report](#how-this-affects-the-daily-financial-report)
10. [Common questions and gotchas](#common-questions-and-gotchas)

---

## What this feature does

Before Kitchen Management:

- Your inventory list was a single flat list. Anything in inventory was
  also on the customer menu.
- An expense you spent on ingredients (say, ₦10,000 on goat meat) did not
  update your stock anywhere automatically. You had to remember to also
  edit the inventory by hand.
- There was no built-in way to say "one bowl of pepper soup uses 200 g of
  goat meat and 50 ml of palm oil" — so portion costs were a guess.

After Kitchen Management:

- **Kitchen ingredients** (goat meat, palm oil, salt, etc.) live in their
  own tab on the Inventory dashboard, separate from the items you actually
  sell to customers. Customers never see them on the menu.
- When you save an **expense** linked to a kitchen ingredient, the
  ingredient's stock goes **up** automatically — and the system remembers
  what it cost you so per-dish costs stay accurate.
- You can write a **recipe** that says exactly which ingredients (and how
  much of each) go into one batch of a menu item.
- When you **make a batch**, every ingredient is deducted from stock and
  the finished dish is added to the sellable side of inventory — all in
  one click.

The end result: stock numbers reflect reality, dish costs are real,
and the Daily Financial Report's gross profit number is one you can
trust.

---

## Who can use it

Kitchen Management is a **per-user permission**. Just because someone is
an admin does not mean they automatically see the kitchen pages — a
super-admin must turn it on for them.

### Turning the permission on for a user

1. Log in as **super-admin**.
2. Go to **Settings → Admins**.
3. Pick the admin (or csr) you want to give kitchen access to.
4. Open the **Permissions** section.
5. Toggle on **Kitchen Management** (ChefHat icon — described as
   "Author recipes and record production batches").
6. Save.
7. The user must **log out and back in** for the permission to take
   effect — sidebar links only refresh at login.

After the toggle is on, the user will see two new sidebar entries:

- **Recipes** (`ChefHat` icon)
- **Production** (`Boxes` icon)

If they don't see them, they didn't log out + back in.

### Who is a super-admin by default?

- **super-admin** — Kitchen Management is always on; you cannot toggle
  it off.
- **admin** — off by default; super-admin must turn it on.
- **csr** — off by default; super-admin can turn it on if needed (rare).

Voiding a production batch is **super-admin only** regardless of the
Kitchen Management toggle. See [Voiding a production batch](#voiding-a-production-batch).

---

## Two kinds of inventory

Open **Inventory** on the sidebar. You will see two tabs:

- **Sellable** — items that appear on the customer menu (e.g. "Goat
  Pepper Soup", "Jollof Rice", "Heineken Bottle"). Customers can order
  these. The count on the tab is the number of distinct sellable items.
- **Kitchen** — raw ingredients used inside the kitchen (e.g. "Goat
  meat", "Palm oil", "Stock cubes"). Customers **never** see these on
  the menu. The count on the tab is the number of distinct kitchen
  ingredients.

Stock numbers in both tabs work the same way — a `currentStock` column,
min/max thresholds, last-restocked date — but kitchen ingredients are
stored in whatever unit you set when you create them (grams, kilograms,
ml, litres, eggs, pieces). They are deducted automatically when you
record a production batch.

> If your Kitchen tab is empty, see
> [Adding a kitchen ingredient](#adding-a-kitchen-ingredient).

---

## Adding a kitchen ingredient

To buy in (or just keep track of) a new raw ingredient:

1. Go to **Inventory → Kitchen** tab.
2. Click **Add Kitchen Ingredient**.
3. Fill in:
   - **Name** — what you call it in the kitchen, e.g. `Goat meat`.
   - **COGS category** — the category this restock will count against on
     your Daily Financial Report. The list is the same one used by the
     Expense form. (e.g. _Meat/Protein_, _Oils & Fats_, _Spices_).
   - **Unit** — the unit you want to store stock in. **Pick what is
     easiest to count day-to-day.** If you weigh the freezer in grams,
     pick `Grams`. If you cup the palm oil by litres, pick `Litres`.
     This is the unit you will see on the inventory dashboard going
     forward.
   - **Initial stock** — how much is on hand right now (optional,
     defaults to 0).
   - **Min / Max stock** — thresholds for restock alerts (optional).
4. Click **Create ingredient**.

The ingredient now appears on the Kitchen tab and is available in:

- The "Add to inventory" dropdown on the Expense form, when expense
  type is **Direct Cost**.
- The ingredient dropdown in the Recipe builder.

The ingredient is **hidden from the customer menu** and the public
ordering pages. You do not need to worry about a customer seeing
"Goat meat" as a menu item.

### Why is there a price field of 0 on the linked menu-item?

Each kitchen ingredient is internally paired with a hidden menu-item
record so the inventory system can track stock the same way it does
for sellables. The price is 0 because the item is not sold. You can
ignore this internal pairing — there is no menu surface that would
ever show it.

---

## Restocking a kitchen ingredient from an expense

This is the day-to-day flow you will use most often. You bought
something, you log it as an expense, and the system bumps the matching
ingredient's stock up automatically.

1. Go to **Expenses** (sidebar).
2. Click **Add Expense**.
3. In the line item:
   - **Type** — `Direct Cost (COGS)`. The "Add to inventory" dropdown
     **only appears for Direct Cost lines**. Operating expenses, rent,
     salaries etc. never bump kitchen stock.
   - **Category** — pick from the grouped COGS dropdown (same list as
     on the kitchen ingredient).
   - **Description** — what you actually bought, e.g. `Goat meat from
Iwaya market`.
   - **Quantity** — how much you bought, e.g. `5`.
   - **Unit** — the unit the **quantity** is in, e.g. `Kilograms`. You
     do **not** have to match the inventory's stored unit — see below.
   - **Unit Cost** — what one unit (in the unit you just picked) cost,
     e.g. `200` for ₦200/kg.
   - **Add to inventory (optional)** — pick the kitchen ingredient you
     want this expense to restock.
4. Add more line items if your receipt covers several ingredients.
5. Save.

The expense now sits in **Pending Expenses** for a final review.

6. Go to **Pending Expenses** (sidebar) and **Transfer** the group to
   confirmed expenses.

The moment you transfer, the system:

- adds the converted quantity to the ingredient's `currentStock`
  (see below for the conversion rule),
- records a stock-movement audit row tagged with this expense, and
- updates the ingredient's weighted-average cost-per-unit so future
  per-dish costing is accurate.

### "Converted quantity"? What unit conversion?

The system understands that **5 kg = 5000 g** and **2 litres = 2000 ml**.

If your expense says `5 kg` of goat meat and your inventory stores
goat meat in `g`, the inventory's `currentStock` goes up by **5000**,
not by 5. Likewise `2 litres → 2000 ml` for palm oil.

A short note is added to the stock-movement audit row whenever a
conversion happens (`Converted 5 kg → 5000 g`) so an auditor can see
exactly what was applied.

The system **only converts within the same dimension**:

| Conversion                              | Allowed?            |
| --------------------------------------- | ------------------- |
| kg ↔ g                                 | ✅                  |
| litres ↔ ml                            | ✅                  |
| kg → ml (mass to volume)                | ❌ rejected at save |
| eggs → pieces (different "count" units) | ❌ rejected at save |

If you see an error like "cross-dimension conversion not supported",
that means the expense unit and the inventory unit are not compatible.
Either fix the expense unit, or change what unit the inventory stores
its stock in.

### Editing or deleting a restock expense

If you edit a transferred expense's **quantity** or **amount**, the
system **reverses the previous restock** and applies a new one — so
the inventory and the cost history stay consistent.

If reversing would drive the inventory `currentStock` below zero (e.g.
you already cooked through the goat meat from that restock and now
want to retroactively claim you only bought 1 kg instead of 5),
the edit is **blocked** with a clear error naming the ingredient and
the shortfall. Fix the inventory level manually first if you really
need to.

The same rules apply when you delete an expense.

---

## Writing a recipe

A recipe says "one batch of _Goat Pepper Soup_ (yielding 1 portion)
uses 200 g of goat meat and 50 ml of palm oil." Once it exists,
running a batch deducts those amounts and adds the finished dish to
the menu item's stock.

1. Go to **Recipes** (sidebar).
2. Click **New Recipe** (top-right).
3. Fill in:
   - **Recipe name** — e.g. `Goat Pepper Soup — small pot`.
   - **Target menu item** — the customer-facing dish this batch
     produces. Only sellable items appear in this dropdown — kitchen
     ingredients are filtered out.
   - **Portions per batch (yield)** — how many "servings" one batch
     produces. Used to compute per-portion COGS.
4. Add ingredient rows. For each row:
   - **Kitchen ingredient** — pick from the dropdown. Only kitchen
     ingredients appear here.
   - **Quantity** — how much of the ingredient one batch consumes.
   - **Unit** — defaults to the ingredient's stored unit, but you can
     override to any compatible unit (e.g. ingredient stored as `kg`,
     recipe specified in `g`). Same dimension rule as the Expense
     form.
5. Add a notes field at the bottom if you want to record prep tips.
6. Click **Create recipe**.

### Validation rules that catch problems before you save

- Two rows for the **same ingredient** in one recipe — rejected.
- An ingredient row's unit is from a **different dimension** to the
  ingredient's stored unit (e.g. ingredient is in `kg`, you typed
  `ml` for the recipe row) — rejected.
- For count-based units (`eggs`, `bottles`, `crates`), the row's
  unit must **exactly match** the ingredient's stored unit. There
  is no auto-conversion between count units — `bottles` and `crates`
  are not the same thing.
- An empty recipe (no name, no target, no ingredients) — rejected.

### Editing or deactivating a recipe

From the recipe list:

- **Edit** — opens the builder pre-filled. Save to update.
- **Deactivate** — the recipe stays in the list (with a `Deactivated`
  badge) but no longer appears in the "Make a batch" dropdown. Use
  this when you stop selling that dish but want to keep its history.
- **Reactivate** — flip it back on.

---

## Recording a production batch

You cook a pot of pepper soup. You want the system to:

- deduct the goat meat and palm oil you used from kitchen stock,
- add the pepper soup portions you just produced to the sellable
  inventory,
- record the event so the Daily Financial Report knows what your
  per-portion costs are.

That is one click:

1. Go to **Production** (sidebar).
2. Click **Make a batch** (top-right).
3. In the dialog:
   - **Recipe** — pick the recipe you want to run. Only **active**
     recipes are shown.
   - **Batches** — how many batches you ran (default 1). Multiplies
     every ingredient quantity by this number.
   - **Actual yield** _(optional)_ — if you got fewer portions than
     the recipe expects (burnt some, over-portioned), enter the real
     number here. Defaults to `recipe.yieldPortions × batches`.
   - **Notes** _(optional)_ — free text, e.g. `Burnt a bit, slight
under-yield`.
4. Click **Run batch**.

The system then runs a **pre-flight check** first: does the kitchen
have enough of every ingredient (after any unit conversion) to cover
this batch? If even one ingredient is short, the batch is **blocked**
and you see an error like:

> Insufficient Goat meat — needs 4000, have 1000

No deductions happen on a blocked batch. Fix the stock (restock the
ingredient, or run fewer batches) and try again.

When the batch succeeds:

- Each ingredient's `currentStock` is reduced by the per-batch quantity
  × batches, **after** any unit conversion.
- The target menu item's stock goes up by `actualYield`.
- Production history records the run, with a snapshot of which
  ingredients were used and how much. The snapshot stays even if the
  recipe is later edited — so historical batches show what really
  happened, not what the current recipe says.

You can view the recent production history below the Make-a-batch
button.

---

## Voiding a production batch

If you made a batch by mistake (wrong recipe, wrong batch count, etc.):

1. Go to **Production** (sidebar).
2. Find the row in the history table.
3. Click **Void** on that row.
4. If the batch is older than 24 hours, you must enter a **reason
   note** — this is recorded on every reversal audit row.

The system then:

- adds each ingredient's deducted quantity back to its `currentStock`,
- subtracts the yielded portions from the target menu item's stock,
- marks the production as `voided` (still visible in history, never
  silently deleted),
- records compensating audit rows tied to the same production id.

### Permission

**Only super-admin can void a production**, regardless of whether
Kitchen Management is enabled.

- super-admin → sees the Void button on every production history row.
- admin (with Kitchen Management on) → does **not** see Void buttons.
- csr → cannot access the page at all.

Within 24 hours of the batch, no reason note is required. After 24
hours, the reason is mandatory and is stamped onto every reversal row
so the audit trail explains why the void happened.

---

## How this affects the Daily Financial Report

Open the **Daily Financial Report** (Reports → Daily). You will see
cards for Total Revenue, Gross Profit, Operating Expenses, and Net
Profit.

A few rules that follow from the way Kitchen Management is wired:

- **Production events never move revenue.** Making a batch creates
  audit rows but never an order or a payment. The Total Revenue card
  is therefore identical before and after a batch.
- **Restocking from an expense never moves revenue either.** A
  Direct Cost expense bumps inventory + cost history, but the expense
  itself shows up on the Operating Expenses card (specifically in
  the Direct Costs breakdown), not on the revenue side.
- **Per-portion COGS uses a weighted-average cost.** Suppose you
  buy 5 kg of goat meat for ₦200/kg in the morning (so ₦40/100 g)
  and then 5 kg for ₦300/kg in the afternoon (so ₦60/100 g). The
  weighted average is ₦50/100 g — that is what's used for any portion
  you make from goat meat going forward, until the next restock
  changes the average. This means dish costs don't jump every time
  your supplier prices change; they smooth out.

### When the report numbers look wrong

Common causes:

- Forgot to **transfer** a pending expense after adding it. The
  expense doesn't count toward the report until you transfer.
- Recipe specifies the **wrong yield**. If the recipe says
  `yieldPortions = 10` but you actually got 5 portions, per-portion
  COGS will be half of what it should be. Either edit the recipe's
  yield, or enter the real number in the "Actual yield" field every
  batch.
- A batch was **voided** but you forgot. Check the production history
  for `voided` rows on the date in question.

---

## Common questions and gotchas

**The Kitchen sidebar link is missing.**
You don't have Kitchen Management enabled, or you forgot to log out
and back in after a super-admin granted it. See
[Who can use it](#who-can-use-it).

**I added a kitchen ingredient but the "Add to inventory" dropdown
in the Expense form still says "No kitchen ingredients available".**
The dropdown only appears for **Direct Cost** expense lines. Set the
line's Type to `Direct Cost (COGS)` first; the dropdown then appears
and the new ingredient should be in the list.

**My "Make a batch" dropdown shows "No active recipes" but I have
recipes.**
The recipes you have are all **deactivated**. Go to Recipes, find
each, and click **Reactivate**.

**A batch I just ran isn't reflected on the inventory dashboard.**
Refresh the Inventory page. The dashboard pulls fresh data on each
load, but a tab still showing the cached value won't auto-refresh.

**I edited a transferred expense's quantity and got an error about
"current stock being short by X".**
You're trying to retroactively reduce a restock, but the ingredient
has already been consumed in production. The system won't let you
drive `currentStock` below zero silently. Either run an inventory
adjustment to add stock back first, or edit the expense without
changing its quantity.

**The customer menu is showing one of my kitchen ingredients.**
This should never happen — kitchen ingredients are filtered from
every customer-facing menu surface. If you do see one, screenshot it
and flag it to engineering; it is a data bug, not a configuration
issue.

**Unit conversion: the system added 5 to my goat meat stock when I
saved a 5 kg expense, not 5000.**
This was a real bug (D10) and has been fixed. If you still see this,
re-run the audit script (`scripts/audit-expense-link-units.ts`) and
report any rows it flags — they are historical expenses that need
manual reconciliation.

**I'm an admin with Kitchen Management on but I can't void a batch.**
By design. Voiding is super-admin-only. Ask a super-admin to do it.
