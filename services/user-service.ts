import { connectDB } from '@/lib/mongodb';
import UserModel from '@/models/user-model';
import { IUser, IAddress } from '@/interfaces';

export interface UpdateProfileFromCheckoutData {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: {
    label?: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode?: string;
    deliveryInstructions?: string;
  };
  savePhone?: boolean;
  saveAddress?: boolean;
}

export class UserService {
  /**
   * Update user profile from checkout data
   */
  static async updateProfileFromCheckout(
    data: UpdateProfileFromCheckoutData
  ): Promise<IUser | null> {
    await connectDB();

    const user = await UserModel.findById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updates: Partial<IUser> = {};

    // Update email if provided and not already set (or update existing)
    // We piggyback on savePhone or just always save if missing because email is critical for receipts
    if (data.email) {
      // If user has no email, or if savePhone is true (treating it as "Save Contact Info")
      if (!user.email || data.savePhone) {
        updates.email = data.email;
      }
    }

    // Update phone if provided and save requested
    if (data.phone && data.savePhone) {
      updates.phone = data.phone;
    }

    // Update name if provided. REQ-121 (REQ-CHECKOUT-015): checkout asks for
    // a first name only, so a last name is optional.
    const firstName = data.firstName?.trim();
    if (firstName) {
      const lastName = data.lastName?.trim();
      updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      updates.name = lastName ? `${firstName} ${lastName}` : firstName;
    }

    // Add delivery address if provided and save requested
    if (data.address && data.saveAddress) {
      // REQ-121 (REQ-CHECKOUT-016): addresses are saved automatically, so the
      // same street must not be added again on every order.
      const normalise = (value?: string) => (value ?? '').trim().toLowerCase();
      const existing = user.addresses.find(
        (addr: IAddress) =>
          normalise(addr.streetAddress) ===
            normalise(data.address!.streetAddress) &&
          normalise(addr.city) === normalise(data.address!.city)
      );
      if (existing) {
        existing.lastUsedAt = new Date();
        if (data.address.deliveryInstructions) {
          existing.deliveryInstructions = data.address.deliveryInstructions;
        }
      }
      const isFirstAddress = user.addresses.length === 0;

      const newAddress: IAddress = {
        label: data.address.label || 'Home',
        streetAddress: data.address.streetAddress,
        city: data.address.city,
        state: data.address.state,
        postalCode: data.address.postalCode || '',
        country: 'Nigeria',
        deliveryInstructions: data.address.deliveryInstructions,
        isDefault: isFirstAddress,
        lastUsedAt: new Date(),
      };

      if (!existing) user.addresses.push(newAddress);
    }

    // Apply updates
    Object.assign(user, updates);
    await user.save();

    return user;
  }

  /**
   * Get user's default address
   */
  static async getDefaultAddress(userId: string): Promise<IAddress | null> {
    await connectDB();

    const user = await UserModel.findById(userId);
    if (!user) {
      return null;
    }

    const defaultAddr = user.addresses.find((addr) => addr.isDefault);
    return (
      defaultAddr || (user.addresses.length > 0 ? user.addresses[0] : null)
    );
  }

  /**
   * Get user profile with all details
   */
  static async getUserProfile(userId: string): Promise<IUser | null> {
    await connectDB();

    const user = await UserModel.findById(userId).select(
      '-verificationPin -pinExpiresAt -sessionToken'
    );

    return user;
  }

  /**
   * Update user profile fields
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<IUser>
  ): Promise<IUser | null> {
    await connectDB();

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-verificationPin -pinExpiresAt -sessionToken');

    return user;
  }

  /**
   * Search users by email or phone
   * Returns registered users only (excludes guests)
   */
  static async searchUsers(query: string): Promise<IUser[]> {
    await connectDB();

    if (!query || query.trim().length < 3) {
      return [];
    }

    const searchQuery = query.trim();

    // Search by email or phone
    const users = await UserModel.find({
      role: { $in: ['customer', 'admin', 'super-admin'] }, // Exclude guests
      $or: [
        { email: { $regex: searchQuery, $options: 'i' } },
        { phone: { $regex: searchQuery, $options: 'i' } },
      ],
    })
      .select('_id firstName lastName email phone role')
      .limit(10)
      .lean();

    return users as IUser[];
  }

  /**
   * Get user by ID (for admin purposes)
   */
  static async getUserById(userId: string): Promise<IUser | null> {
    await connectDB();

    const user = await UserModel.findById(userId)
      .select('-verificationPin -pinExpiresAt -sessionToken')
      .lean();

    return user as IUser | null;
  }
}
