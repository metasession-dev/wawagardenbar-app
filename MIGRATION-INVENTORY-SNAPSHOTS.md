# Inventory Snapshots Migration Guide

## Problem
After updating the inventory snapshot system to support separate food and drink snapshots, the database still has the old unique index that doesn't include `mainCategory`. This causes a duplicate key error when trying to create snapshots.

## Error Message
```
E11000 duplicate key error collection: wawagardenbar_backup_20260125_100801.inventorysnapshots
index: snapshotDate_1_submittedBy_1 dup key: { snapshotDate: ..., submittedBy: ... }
```

## Solution
Run the migration script to:
1. Drop the old unique index `(snapshotDate + submittedBy)`
2. Add `mainCategory` field to all existing snapshots (defaults to 'food')
3. Create new unique index `(snapshotDate + mainCategory + submittedBy)`

## How to Run Migration

### Step 1: Backup Your Database (Recommended)
```bash
# Create a backup before running migration
mongodump --uri="your_mongodb_uri" --out=./backup-before-migration
```

### Step 2: Run the Migration Script
```bash
# From the project root directory
npx tsx scripts/migrate-inventory-snapshots.ts
```

### Step 3: Verify Migration
The script will output:
- ✅ Indexes dropped/created
- ✅ Number of documents updated
- ✅ Final index list
- ✅ Statistics

### Expected Output
```
🔄 Starting inventory snapshots migration...

✅ Connected to MongoDB

📋 Checking existing indexes...
Current indexes: _id_, snapshotDate_1_submittedBy_1, ...

🗑️  Dropping old index: snapshotDate_1_submittedBy_1
✅ Old index dropped successfully

📝 Updating existing snapshots with mainCategory field...
Found X snapshots without mainCategory
✅ Updated X snapshots with mainCategory: 'food'

🔧 Creating new unique index (snapshotDate + mainCategory + submittedBy)...
✅ New unique index created successfully

📊 Final verification...
Current indexes:
  - _id_: {"_id":1}
  - snapshotDate_1_mainCategory_1_submittedBy_1: {"snapshotDate":1,"mainCategory":1,"submittedBy":1}
  - ...

📈 Statistics:
  Total snapshots: X
  Snapshots with mainCategory: X

✅ Migration completed successfully!
```

## Important Notes

### Default Category Assignment
- All existing snapshots will be assigned `mainCategory: 'food'` by default
- If you have existing drink snapshots, you may need to manually update them after migration:

```javascript
// Connect to MongoDB and run:
db.inventorysnapshots.updateMany(
  { 
    mainCategory: 'food',
    // Add criteria to identify drink snapshots, e.g.:
    'items.mainCategory': 'drinks'
  },
  { 
    $set: { mainCategory: 'drinks' } 
  }
)
```

### Handling Duplicates
If you have multiple snapshots for the same date and user (which shouldn't happen but might exist), you'll need to:

1. Identify duplicates:
```javascript
db.inventorysnapshots.aggregate([
  {
    $group: {
      _id: { snapshotDate: "$snapshotDate", submittedBy: "$submittedBy" },
      count: { $sum: 1 },
      ids: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } }
])
```

2. Manually review and delete duplicates, keeping the most recent or most complete one

3. Re-run the migration script

## After Migration

Once migration is complete:
1. Staff can now create separate food and drink snapshots for the same day
2. Each snapshot type can be approved/rejected independently
3. The system will prevent duplicate snapshots per category per day per user

## Rollback (If Needed)

If you need to rollback:

```javascript
// 1. Drop new index
db.inventorysnapshots.dropIndex("snapshotDate_1_mainCategory_1_submittedBy_1")

// 2. Remove mainCategory field
db.inventorysnapshots.updateMany(
  {},
  { $unset: { mainCategory: "" } }
)

// 3. Recreate old index
db.inventorysnapshots.createIndex(
  { snapshotDate: 1, submittedBy: 1 },
  { unique: true }
)
```

## Troubleshooting

### Error: "Index already exists"
This is normal if you've run the migration before. The script will skip creating the index.

### Error: "Cannot create unique index due to duplicates"
You have duplicate snapshots. Follow the "Handling Duplicates" section above.

### Error: "Connection refused"
Check your `MONGODB_URI` environment variable is set correctly.

## Support

If you encounter issues:
1. Check the error message carefully
2. Ensure database backup exists
3. Review the migration script logs
4. Contact the development team if needed
