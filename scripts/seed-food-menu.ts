/**
 * Seed Food Menu and Inventory
 * 
 * Populates menu items and inventory from the food menu data
 * 
 * Usage: npx tsx scripts/seed-food-menu.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';

interface FoodItem {
  name: string;
  description: string;
  mainCategory: string;
  category: string;
  price: number;
  preparationTime: number;
  tags: string[];
  availableForOrdering: boolean;
  inventoryTracking: {
    enabled: boolean;
    initialStock: number;
    unit: string;
    minimumStock: number;
    maximumStock: number;
    costPerUnit: number;
    supplier: string;
    preventOrdersWhenOutOfStock: boolean;
  };
}

const foodMenu: FoodItem[] = [
  // Soups & Sauces
  {
    name: 'Efo',
    description: 'Traditional Nigerian vegetable soup made with fresh spinach and assorted meats. Rich, flavorful, and packed with nutrients - a healthy, satisfying choice.',
    mainCategory: 'food',
    category: 'soups',
    price: 2000,
    preparationTime: 15,
    tags: ['Sauce', 'Soup', 'Vegetarian-friendly'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 38,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 500,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Ogbono',
    description: 'Classic Nigerian soup made from ground ogbono seeds. Thick, rich, and deliciously smooth with a unique draw that pairs perfectly with any swallow.',
    mainCategory: 'food',
    category: 'soups',
    price: 2000,
    preparationTime: 15,
    tags: ['Soup', 'Traditional', 'Draw Soup'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 19,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 300,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Egusi',
    description: 'Popular Nigerian melon seed soup with a rich, nutty flavor. Thick, hearty, and loaded with authentic spices - a true Nigerian favorite.',
    mainCategory: 'food',
    category: 'soups',
    price: 1500,
    preparationTime: 15,
    tags: ['Sauce', 'Soup', 'Traditional'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 5,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 300,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Obe Ata and Goat',
    description: 'Spicy Nigerian pepper sauce with tender goat meat. Bold, fiery flavors that awaken your taste buds - perfect for those who love heat.',
    mainCategory: 'food',
    category: 'sauce',
    price: 2000,
    preparationTime: 15,
    tags: ['Sauce', 'Spicy', 'Goat Meat'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 18,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 1000,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Obe Ata and Beef',
    description: 'Traditional Nigerian pepper sauce with succulent beef. Rich, spicy, and full of authentic flavors that complement any swallow perfectly.',
    mainCategory: 'food',
    category: 'sauce',
    price: 1500,
    preparationTime: 15,
    tags: ['Sauce', 'Spicy', 'Beef'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 10,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 700,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },

  // Swallows
  {
    name: 'Semo',
    description: 'Smooth, stretchy swallow made from semolina. Light, easy to swallow, and the perfect companion for your favorite Nigerian soup.',
    mainCategory: 'food',
    category: 'swallow',
    price: 0,
    preparationTime: 15,
    tags: ['Swallow', 'Carb', 'Traditional'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 50,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 300,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Amala',
    description: 'Traditional Yoruba swallow made from yam flour. Dark, earthy, and authentically Nigerian - a classic choice for soup lovers.',
    mainCategory: 'food',
    category: 'swallow',
    price: 0,
    preparationTime: 15,
    tags: ['Swallow', 'Carb', 'Traditional', 'Yoruba'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 50,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 300,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Eba',
    description: 'Popular Nigerian swallow made from cassava flour (garri). Firm, filling, and the most beloved companion for any Nigerian soup.',
    mainCategory: 'food',
    category: 'swallow',
    price: 0,
    preparationTime: 15,
    tags: ['Swallow', 'Carb', 'Traditional'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 50,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 300,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },

  // Carbs & Mains
  {
    name: 'Rice',
    description: 'Perfectly cooked white rice, fluffy and aromatic. A versatile base that pairs wonderfully with any of our delicious sauces and stews.',
    mainCategory: 'food',
    category: 'rice-dishes',
    price: 1000,
    preparationTime: 15,
    tags: ['Carb', 'Rice', 'Versatile'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 20,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 500,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Indomie',
    description: 'Popular instant noodles prepared fresh with vegetables and seasonings. Quick, tasty, and satisfying - a Nigerian comfort food favorite.',
    mainCategory: 'food',
    category: 'noodles',
    price: 1000,
    preparationTime: 15,
    tags: ['Carb', 'Noodles', 'Quick Bite'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 20,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 500,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },

  // Small Chops
  {
    name: 'Peppered Beef',
    description: 'Tender beef pieces coated in spicy pepper sauce. Juicy, flavorful, and perfectly seasoned - an irresistible Nigerian snack.',
    mainCategory: 'food',
    category: 'small-chops',
    price: 1000,
    preparationTime: 15,
    tags: ['Side', 'Spicy', 'Beef', 'Small Chops'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 20,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 500,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Peppered Pomo',
    description: 'Soft, chewy cow skin in spicy pepper sauce. A unique Nigerian delicacy with bold flavors that keeps you coming back for more.',
    mainCategory: 'food',
    category: 'small-chops',
    price: 1000,
    preparationTime: 15,
    tags: ['Side', 'Spicy', 'Pomo', 'Small Chops'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 20,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 500,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Asun',
    description: 'Spicy grilled goat meat, a Yoruba delicacy. Smoky, tender, and bursting with bold peppers - perfect with a cold drink.',
    mainCategory: 'food',
    category: 'small-chops',
    price: 2000,
    preparationTime: 15,
    tags: ['Side', 'Spicy', 'Goat Meat', 'Grilled', 'Small Chops'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 30,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 1000,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },

  // Pepper Soups
  {
    name: 'Cowtail Peppersoup',
    description: 'Traditional Nigerian pepper soup with tender cowtail. Aromatic, spicy, and believed to have medicinal properties - comfort in a bowl.',
    mainCategory: 'food',
    category: 'pepper-soup',
    price: 3000,
    preparationTime: 15,
    tags: ['Side', 'Soup', 'Spicy', 'Cowtail', 'Medicinal'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 10,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 1500,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Goat meat pepper soup',
    description: 'Classic Nigerian pepper soup with succulent goat meat. Hot, aromatic, and deeply satisfying - perfect for any weather or occasion.',
    mainCategory: 'food',
    category: 'pepper-soup',
    price: 3000,
    preparationTime: 15,
    tags: ['Side', 'Soup', 'Spicy', 'Goat Meat', 'Traditional'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 20,
      unit: 'Plates',
      minimumStock: 5,
      maximumStock: 50,
      costPerUnit: 1500,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
  {
    name: 'Catfish Peppersoup',
    description: 'Premium pepper soup with fresh whole catfish. Rich, spicy, and luxuriously flavorful - a special treat for seafood lovers.',
    mainCategory: 'food',
    category: 'pepper-soup',
    price: 8000,
    preparationTime: 20,
    tags: ['Side', 'Soup', 'Spicy', 'Catfish', 'Seafood', 'Premium'],
    availableForOrdering: true,
    inventoryTracking: {
      enabled: true,
      initialStock: 3,
      unit: 'Plates',
      minimumStock: 2,
      maximumStock: 10,
      costPerUnit: 4000,
      supplier: '',
      preventOrdersWhenOutOfStock: true,
    },
  },
];

async function seedFoodMenu() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    console.log('\n🍽️  Starting food menu seeding...');
    console.log(`📊 Total items to process: ${foodMenu.length}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of foodMenu) {
      try {
        // Check if menu item already exists
        const existingMenuItem = await MenuItemModel.findOne({ name: item.name });

        if (existingMenuItem) {
          console.log(`⏭️  Skipping ${item.name} - already exists`);
          skipped++;
          continue;
        }

        // Create menu item first
        const menuItem = await MenuItemModel.create({
          name: item.name,
          description: item.description,
          mainCategory: item.mainCategory,
          category: item.category,
          price: item.price,
          costPerUnit: item.inventoryTracking.costPerUnit,
          preparationTime: item.preparationTime,
          tags: item.tags,
          isAvailable: item.availableForOrdering,
          images: [],
          trackInventory: item.inventoryTracking.enabled,
        });

        console.log(`✅ Created menu item: ${item.name}`);
        created++;

        // Create inventory record if tracking is enabled
        if (item.inventoryTracking.enabled) {
          const inventory = await InventoryModel.create({
            menuItemId: menuItem._id,
            itemName: item.name,
            currentStock: item.inventoryTracking.initialStock,
            minimumStock: item.inventoryTracking.minimumStock,
            maximumStock: item.inventoryTracking.maximumStock,
            unit: item.inventoryTracking.unit,
            costPerUnit: item.inventoryTracking.costPerUnit,
            supplier: item.inventoryTracking.supplier,
            lastRestocked: new Date(),
            preventOrdersWhenOutOfStock: item.inventoryTracking.preventOrdersWhenOutOfStock,
          });

          // Update menu item with inventory reference
          await MenuItemModel.findByIdAndUpdate(menuItem._id, {
            inventoryId: inventory._id,
          });

          console.log(`  📦 Created inventory record for ${item.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${item.name}:`, error);
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`✅ Created: ${created} items`);
    console.log(`🔄 Updated: ${updated} items`);
    console.log(`⏭️  Skipped: ${skipped} items`);
    console.log(`📦 Total: ${foodMenu.length} items`);

    console.log('\n✨ Food menu seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding food menu:', error);
    process.exit(1);
  }
}

seedFoodMenu();
