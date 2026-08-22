import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { users, type User } from '../../db/schema/users.js';
import { notificationPreferences } from '../../db/schema/notifications.js';
import { logger } from '../../utils/logger.js';

export interface TelegramUserData {
  id: number | bigint;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export class UserService {
  static async upsertUser(tgUser: TelegramUserData): Promise<User | null> {
    try {
      const db = getDb();
      const tgId = BigInt(tgUser.id);

      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.telegramId, tgId))
        .limit(1);

      if (existingUsers[0]) {
        const [updated] = await db
          .update(users)
          .set({
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || null,
            username: tgUser.username || null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUsers[0].id))
          .returning();
        return updated || existingUsers[0];
      }

      const [newUser] = await db
        .insert(users)
        .values({
          telegramId: tgId,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name || null,
          username: tgUser.username || null,
          languageCode: tgUser.language_code || 'uz',
          isActive: true,
        })
        .returning();

      if (newUser) {
        // Create default notification preferences
        await db
          .insert(notificationPreferences)
          .values({
            userId: newUser.id,
            matchStart: true,
            matchGoals: true,
            matchFinalResult: true,
          })
          .onConflictDoNothing();
      }

      return newUser || null;
    } catch (error) {
      logger.warn({ error, tgUserId: tgUser.id }, 'Foydalanuvchini bazaga saqlashda xatolik');
      return null;
    }
  }
}
