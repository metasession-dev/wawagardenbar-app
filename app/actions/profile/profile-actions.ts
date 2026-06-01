'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ProfileService, OrderService, TabService } from '@/services';
import { sessionOptions, SessionData } from '@/lib/session';
import { IUser, IAddress, IPreferences } from '@/interfaces';
import { AuditLogService } from '@/services/audit-log-service';

/**
 * Action result type
 */
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validation schemas
 */

/**
 * @requirement REQ-057 — Instagram handle zod pipe (IG-2).
 *
 * Exported so the client form schema can mirror it and both layers
 * apply the SAME transform + refine — no drift between client and
 * server.
 *
 * Pipe stages:
 *   1. `.max(30)` — guard the input size before the transform allocates.
 *   2. `.transform(strip-`@`-and-trim)` — normalise common paste shapes
 *      so the user can paste `@foo` or ` foo ` and have it just work.
 *   3. `.refine(IG-char-regex)` — validates the POST-strip handle
 *      against Instagram's actual handle character set
 *      (`[a-zA-Z0-9._]{1,30}`). Empty-string `''` is the explicit
 *      "clear handle" sentinel and is allowed through.
 */
export const instagramHandleSchema = z
  .string()
  .max(30, 'Handle is too long')
  .transform((v) => v.replace(/^@/, '').trim())
  .refine((v) => v === '' || /^[a-zA-Z0-9._]{1,30}$/.test(v), {
    message: 'Only letters, numbers, periods, and underscores; max 30 chars',
  });

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(), // E.164 format
  instagramHandle: instagramHandleSchema.optional().or(z.literal('')),
});

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  streetAddress: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(2).max(100).default('Nigeria'),
  deliveryInstructions: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

const preferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()).optional(),
  communicationPreferences: z
    .object({
      email: z.boolean(),
      sms: z.boolean(),
      push: z.boolean(),
      // REQ-053 — optional during rollout so client payloads from older
      // builds (without the WhatsApp fields) still validate. When the
      // mobile app + web are both on the new build this can be tightened
      // to required.
      whatsappTransactional: z.boolean().optional(),
      whatsappMarketing: z.boolean().optional(),
    })
    .optional(),
  language: z.string().optional(),
});

/**
 * Get user profile
 */
export async function getUserProfileAction(): Promise<ActionResult<IUser>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const profile = await ProfileService.getUserProfile(session.userId);

    if (!profile) {
      return {
        success: false,
        error: 'Profile not found',
      };
    }

    // Serialize to plain object
    const serializedProfile = JSON.parse(JSON.stringify(profile));

    return {
      success: true,
      data: serializedProfile,
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      success: false,
      error: 'Failed to get profile',
    };
  }
}

/**
 * Update user profile
 */
export async function updateProfileAction(
  data: z.infer<typeof updateProfileSchema>
): Promise<ActionResult<IUser>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Validate input
    const validated = updateProfileSchema.parse(data);

    // Prepare update data
    const updateData: any = {
      firstName: validated.firstName,
      lastName: validated.lastName,
      phone: validated.phone,
    };

    // Handle Instagram Profile — the zod pipe already stripped a
    // leading `@` and trimmed whitespace (REQ-057), so `validated.
    // instagramHandle` is canonical at this point.
    if (validated.instagramHandle) {
      updateData.socialProfiles = {
        instagram: {
          handle: validated.instagramHandle,
          lastCheckedAt: new Date(), // Reset check time on update
          verified: false,
        },
      };
    }

    // Update profile
    const updatedProfile = await ProfileService.updateProfile(
      session.userId,
      updateData
    );

    if (!updatedProfile) {
      return {
        success: false,
        error: 'Failed to update profile',
      };
    }

    // Log audit
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role || 'customer',
      action: 'user.update',
      resource: 'user_profile',
      resourceId: session.userId,
      details: { fields: Object.keys(validated) },
    });

    revalidatePath('/profile');

    // Serialize to plain object
    const serializedProfile = JSON.parse(JSON.stringify(updatedProfile));

    return {
      success: true,
      data: serializedProfile,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: 'Failed to update profile',
    };
  }
}

/**
 * Update preferences
 */
export async function updatePreferencesAction(
  data: z.infer<typeof preferencesSchema>
): Promise<ActionResult<IUser>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Validate input
    const validated = preferencesSchema.parse(data);

    // REQ-053 — the schema accepts the new WhatsApp fields as optional
    // during rollout (older client builds may not send them). Default
    // any unsent field here so the persisted preferences object matches
    // the strict IPreferences shape downstream.
    const normalisedPreferences: Partial<IPreferences> =
      validated.communicationPreferences
        ? {
            ...validated,
            communicationPreferences: {
              ...validated.communicationPreferences,
              whatsappTransactional:
                validated.communicationPreferences.whatsappTransactional ??
                true,
              whatsappMarketing:
                validated.communicationPreferences.whatsappMarketing ?? false,
            },
          }
        : (validated as Partial<IPreferences>);

    // Update profile
    const updatedProfile = await ProfileService.updateProfile(session.userId, {
      preferences: normalisedPreferences,
    });

    if (!updatedProfile) {
      return {
        success: false,
        error: 'Failed to update preferences',
      };
    }

    revalidatePath('/profile');

    // Serialize to plain object
    const serializedProfile = JSON.parse(JSON.stringify(updatedProfile));

    return {
      success: true,
      data: serializedProfile,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    console.error('Error updating preferences:', error);
    return {
      success: false,
      error: 'Failed to update preferences',
    };
  }
}

/**
 * Upload profile picture
 */
export async function uploadProfilePictureAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    const result = await ProfileService.uploadProfilePicture(
      session.userId,
      file
    );

    if (!result.success) {
      return {
        success: false,
        error: result.message || 'Failed to upload picture',
      };
    }

    // Log audit
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role || 'customer',
      action: 'user.update',
      resource: 'user_profile_picture',
      resourceId: session.userId,
    });

    revalidatePath('/profile');

    return {
      success: true,
      data: { url: result.url! },
    };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return {
      success: false,
      error: 'Failed to upload picture',
    };
  }
}

/**
 * Add address
 */
export async function addAddressAction(
  data: z.infer<typeof addressSchema>
): Promise<ActionResult<IUser>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Validate input
    const validated = addressSchema.parse(data);

    // Add address
    const updatedProfile = await ProfileService.addAddress(
      session.userId,
      validated
    );

    if (!updatedProfile) {
      return {
        success: false,
        error: 'Failed to add address',
      };
    }

    // Log audit
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role || 'customer',
      action: 'user.update',
      resource: 'user_address',
      resourceId: session.userId,
      details: { action: 'add', label: validated.label },
    });

    revalidatePath('/profile');

    // Serialize to plain object
    const serializedProfile = JSON.parse(JSON.stringify(updatedProfile));

    return {
      success: true,
      data: serializedProfile,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    console.error('Error adding address:', error);
    return {
      success: false,
      error: 'Failed to add address',
    };
  }
}

/**
 * Update address
 */
export async function updateAddressAction(
  addressId: string,
  data: Partial<z.infer<typeof addressSchema>>
): Promise<ActionResult<IUser>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Update address
    const updatedProfile = await ProfileService.updateAddress(
      session.userId,
      addressId,
      data
    );

    if (!updatedProfile) {
      return {
        success: false,
        error: 'Failed to update address',
      };
    }

    // Log audit
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role || 'customer',
      action: 'user.update',
      resource: 'user_address',
      resourceId: session.userId,
      details: { action: 'update', addressId },
    });

    revalidatePath('/profile');

    // Serialize to plain object
    const serializedProfile = JSON.parse(JSON.stringify(updatedProfile));

    return {
      success: true,
      data: serializedProfile,
    };
  } catch (error) {
    console.error('Error updating address:', error);
    return {
      success: false,
      error: 'Failed to update address',
    };
  }
}

/**
 * Delete address
 */
export async function deleteAddressAction(
  addressId: string
): Promise<ActionResult<IUser>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Delete address
    const updatedProfile = await ProfileService.deleteAddress(
      session.userId,
      addressId
    );

    if (!updatedProfile) {
      return {
        success: false,
        error: 'Failed to delete address',
      };
    }

    // Log audit
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role || 'customer',
      action: 'user.update',
      resource: 'user_address',
      resourceId: session.userId,
      details: { action: 'delete', addressId },
    });

    revalidatePath('/profile');

    // Serialize to plain object
    const serializedProfile = JSON.parse(JSON.stringify(updatedProfile));

    return {
      success: true,
      data: serializedProfile,
    };
  } catch (error) {
    console.error('Error deleting address:', error);
    return {
      success: false,
      error: 'Failed to delete address',
    };
  }
}

/**
 * Set default address
 */
export async function setDefaultAddressAction(
  addressId: string
): Promise<ActionResult<IUser>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Set default address
    const updatedProfile = await ProfileService.setDefaultAddress(
      session.userId,
      addressId
    );

    if (!updatedProfile) {
      return {
        success: false,
        error: 'Failed to set default address',
      };
    }

    revalidatePath('/profile');

    // Serialize to plain object
    const serializedProfile = JSON.parse(JSON.stringify(updatedProfile));

    return {
      success: true,
      data: serializedProfile,
    };
  } catch (error) {
    console.error('Error setting default address:', error);
    return {
      success: false,
      error: 'Failed to set default address',
    };
  }
}

/**
 * Get user addresses
 */
export async function getUserAddressesAction(): Promise<
  ActionResult<IAddress[]>
> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const addresses = await ProfileService.getAddresses(session.userId);

    // Serialize to plain object
    const serializedAddresses = JSON.parse(JSON.stringify(addresses));

    return {
      success: true,
      data: serializedAddresses,
    };
  } catch (error) {
    console.error('Error getting addresses:', error);
    return {
      success: false,
      error: 'Failed to get addresses',
    };
  }
}

/**
 * Claim guest orders
 */
export async function claimGuestOrdersAction(
  email: string
): Promise<ActionResult<{ ordersLinked: number }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const result = await ProfileService.claimGuestOrders(session.userId, email);

    if (!result.success) {
      return {
        success: false,
        error: 'Failed to claim guest orders',
      };
    }

    // Log audit
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role || 'customer',
      action: 'user.update',
      resource: 'user_guest_conversion',
      resourceId: session.userId,
      details: { ordersLinked: result.ordersLinked },
    });

    revalidatePath('/profile');
    revalidatePath('/orders');

    return {
      success: true,
      data: { ordersLinked: result.ordersLinked },
    };
  } catch (error) {
    console.error('Error claiming guest orders:', error);
    return {
      success: false,
      error: 'Failed to claim guest orders',
    };
  }
}

/**
 * Request data deletion
 */
export async function requestDataDeletionAction(
  email: string,
  reason: string
): Promise<ActionResult<{ ticketId: string }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Check for open tabs
    const openTab = await TabService.getOpenTabForUser(session.userId);
    if (openTab) {
      return {
        success: false,
        error:
          'You have an open tab. Please settle your tab before requesting data deletion.',
      };
    }

    // Check for active orders
    const { orders } = await OrderService.getOrdersByUserId(session.userId, {
      limit: 20,
    });
    const activeOrders = orders.filter((order) =>
      [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'out-for-delivery',
      ].includes(order.status)
    );

    if (activeOrders.length > 0) {
      return {
        success: false,
        error:
          'You have active orders. Please wait for them to be completed before requesting data deletion.',
      };
    }

    // In a real app, this would create a ticket in a support system
    // or trigger a retention policy workflow.
    const ticketId = `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Log the request for compliance
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: email,
      userRole: session.role || 'customer',
      action: 'user.delete_request',
      resource: 'user_data',
      resourceId: session.userId,
      details: { reason, ticketId, providedIdentifier: email },
    });

    return {
      success: true,
      data: { ticketId },
    };
  } catch (error) {
    console.error('Error requesting data deletion:', error);
    return {
      success: false,
      error: 'Failed to submit data deletion request',
    };
  }
}
