import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/user-model';
import Order from '@/models/order-model';
import { IUser, IAddress } from '@/interfaces';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

/**
 * Service for managing user profiles
 */
export class ProfileService {
  /**
   * Get complete user profile
   */
  static async getUserProfile(userId: string): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(userId)
      .populate('preferences.favoriteItems')
      .lean();

    return user as IUser | null;
  }

  /**
   * Update user profile basic information
   */
  static async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      preferences?: Partial<IUser['preferences']>;
      socialProfiles?: Partial<IUser['socialProfiles']>;
    }
  ): Promise<IUser | null> {
    await connectDB();

    const updateData: Record<string, unknown> = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (data.preferences) {
      if (data.preferences.dietaryRestrictions) {
        updateData['preferences.dietaryRestrictions'] =
          data.preferences.dietaryRestrictions;
      }
      if (data.preferences.communicationPreferences) {
        updateData['preferences.communicationPreferences'] =
          data.preferences.communicationPreferences;
      }
      if (data.preferences.language) {
        updateData['preferences.language'] = data.preferences.language;
      }
    }

    if (data.socialProfiles) {
      if (data.socialProfiles.instagram) {
        updateData['socialProfiles.instagram'] = data.socialProfiles.instagram;
      }
      // Add other social profiles here if needed
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    return user as IUser | null;
  }

  /**
   * Upload profile picture
   */
  static async uploadProfilePicture(
    userId: string,
    file: File
  ): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      await connectDB();

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return { success: false, message: 'File must be an image' };
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, message: 'File size must be less than 5MB' };
      }

      // Create unique filename — derive extension from validated MIME type, not user input
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      };
      const ext = extMap[file.type] || 'jpg';
      const filename = `profile-${userId}-${Date.now()}.${ext}`;
      const uploadDir = path.join(
        process.cwd(),
        'public',
        'uploads',
        'profiles'
      );
      // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal — filename is userId + timestamp + MIME-derived extension; no user input
      const filepath = path.join(uploadDir, filename);

      // Convert File to Buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Save file
      await writeFile(filepath, buffer);

      const url = `/uploads/profiles/${filename}`;

      // Update user profile
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Delete old profile picture if exists — validate path stays within public/
      if (user.profilePicture) {
        const publicDir = path.join(process.cwd(), 'public');
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal — containment validated on next line
        const oldPath = path.resolve(publicDir, user.profilePicture);
        if (oldPath.startsWith(publicDir + path.sep)) {
          try {
            await unlink(oldPath);
          } catch (error) {
            // Ignore error if file doesn't exist
            console.error('Error deleting old profile picture:', error);
          }
        }
      }

      user.profilePicture = url;
      await user.save();

      return { success: true, url };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return { success: false, message: 'Failed to upload profile picture' };
    }
  }

  /**
   * Add new address
   */
  static async addAddress(
    userId: string,
    address: Omit<IAddress, '_id' | 'createdAt' | 'lastUsedAt'>
  ): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return null;

    // If this is the first address or marked as default, set it as default
    if (user.addresses.length === 0 || address.isDefault) {
      // Remove default from other addresses
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.addresses.push(address as IAddress);
    await user.save();

    return user.toObject();
  }

  /**
   * Update existing address
   */
  static async updateAddress(
    userId: string,
    addressId: string,
    data: Partial<Omit<IAddress, '_id' | 'createdAt'>>
  ): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return null;

    // Find address by ID
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id?.toString() === addressId
    );

    if (addressIndex === -1) return null;

    // If setting as default, remove default from others
    if (data.isDefault) {
      user.addresses.forEach((addr, idx) => {
        if (idx !== addressIndex) {
          addr.isDefault = false;
        }
      });
    }

    // Update address fields
    Object.assign(user.addresses[addressIndex], data);
    await user.save();

    return user.toObject();
  }

  /**
   * Delete address
   */
  static async deleteAddress(
    userId: string,
    addressId: string
  ): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return null;

    // Find address by ID
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id?.toString() === addressId
    );

    if (addressIndex === -1) return null;

    const wasDefault = user.addresses[addressIndex].isDefault;

    // Remove address
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default, set first remaining as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return user.toObject();
  }

  /**
   * Set address as default
   */
  static async setDefaultAddress(
    userId: string,
    addressId: string
  ): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return null;

    // Remove default from all addresses
    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id?.toString() === addressId;
    });

    await user.save();

    return user.toObject();
  }

  /**
   * Get all user addresses
   */
  static async getAddresses(userId: string): Promise<IAddress[]> {
    await connectDB();

    const user = await User.findById(userId).select('addresses').lean();
    return user?.addresses || [];
  }

  /**
   * Update address last used timestamp
   */
  static async updateAddressLastUsed(
    userId: string,
    addressId: string
  ): Promise<void> {
    await connectDB();

    await User.updateOne(
      { _id: userId, 'addresses._id': addressId },
      { $set: { 'addresses.$.lastUsedAt': new Date() } }
    );
  }

  /**
   * Claim guest orders and convert to registered user
   */
  static async claimGuestOrders(
    userId: string,
    email: string
  ): Promise<{ success: boolean; ordersLinked: number }> {
    await connectDB();

    try {
      // Find all guest orders with this email
      const guestOrders = await Order.find({
        customerEmail: email,
        userId: { $exists: false },
      });

      if (guestOrders.length === 0) {
        return { success: true, ordersLinked: 0 };
      }

      const orderIds = guestOrders.map((order) => order._id);

      // Update orders with userId
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { userId: new Types.ObjectId(userId) } }
      );

      // Update user with guest order IDs
      await User.findByIdAndUpdate(userId, {
        $set: {
          guestOrderIds: orderIds,
          claimedAt: new Date(),
          isGuest: false,
        },
      });

      return { success: true, ordersLinked: guestOrders.length };
    } catch (error) {
      console.error('Error claiming guest orders:', error);
      return { success: false, ordersLinked: 0 };
    }
  }

  /**
   * Create or update guest profile during checkout
   */
  static async createOrUpdateGuestProfile(data: {
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<IUser> {
    await connectDB();

    // Check if user already exists
    let user = await User.findOne({ email: data.email });

    if (user) {
      // Update existing user if new data provided
      if (data.phone && !user.phone) user.phone = data.phone;
      if (data.firstName && !user.firstName) user.firstName = data.firstName;
      if (data.lastName && !user.lastName) user.lastName = data.lastName;
      await user.save();
    } else {
      // Create new guest user
      user = await User.create({
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        isGuest: true,
        emailVerified: false,
      });
    }

    return user.toObject();
  }

  /**
   * Save address during checkout
   */
  static async saveAddressDuringCheckout(
    userId: string,
    address: Omit<IAddress, '_id' | 'createdAt' | 'lastUsedAt'>,
    setAsDefault: boolean = false
  ): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) return null;

    // Check if similar address already exists
    const existingAddress = user.addresses.find(
      (addr) =>
        addr.streetAddress === address.streetAddress &&
        addr.city === address.city &&
        addr.postalCode === address.postalCode
    );

    if (existingAddress) {
      // Update last used timestamp
      existingAddress.lastUsedAt = new Date();
      if (setAsDefault) {
        user.addresses.forEach((addr) => {
          addr.isDefault = false;
        });
        existingAddress.isDefault = true;
      }
    } else {
      // Add new address
      if (setAsDefault || user.addresses.length === 0) {
        user.addresses.forEach((addr) => {
          addr.isDefault = false;
        });
        address.isDefault = true;
      }
      user.addresses.push(address as IAddress);
    }

    await user.save();
    return user.toObject();
  }

  /**
   * Check if email exists
   */
  static async checkEmailExists(email: string): Promise<{
    exists: boolean;
    isGuest: boolean;
    userId?: string;
  }> {
    await connectDB();

    const user = await User.findOne({ email }).select('_id isGuest').lean();

    if (!user) {
      return { exists: false, isGuest: false };
    }

    return {
      exists: true,
      isGuest: user.isGuest,
      userId: user._id.toString(),
    };
  }
}
