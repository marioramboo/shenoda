import { prisma } from '../config/prisma';
import { HashService } from './hash.service';
import { PermissionAction, ScopeRule } from '@prisma/client';
import { PERMISSION_MATRIX } from '@shenoda/shared';

/**
 * Idempotently seeds the Level 6 ADMIN role and the two Stealth Admin accounts (George & Mario).
 * Runs on server startup so production on Render/Neon is guaranteed to have these accounts ready.
 */
export async function bootstrapAdminSystem(): Promise<void> {
  try {
    // 1. Ensure primary organization exists
    let org = await prisma.organization.findFirst({
      where: { code: 'SHENODA_MAIN' },
    });
    if (!org) {
      org = await prisma.organization.findFirst();
    }
    if (!org) {
      console.warn('⚠️ [AdminBootstrap] No organization found yet. Skipping admin seeding.');
      return;
    }

    // 2. Ensure ADMIN role exists (Level 6)
    const adminRole = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      update: {
        name: 'مدير النظام',
        level: 6,
        description: 'مدير النظام بكافة الصلاحيات الكاملة فوق كافة الأدوار والرتب',
      },
      create: {
        code: 'ADMIN',
        name: 'مدير النظام',
        level: 6,
        description: 'مدير النظام بكافة الصلاحيات الكاملة فوق كافة الأدوار والرتب',
      },
    });

    // 3. Ensure all RolePermissionRules exist for ADMIN role
    if (PERMISSION_MATRIX) {
      for (const [actionKey] of Object.entries(PERMISSION_MATRIX)) {
        await prisma.rolePermissionRule
          .upsert({
            where: {
              roleId_action: {
                roleId: adminRole.id,
                action: actionKey as PermissionAction,
              },
            },
            update: {
              scopeRule: ScopeRule.ORGANIZATION,
            },
            create: {
              roleId: adminRole.id,
              action: actionKey as PermissionAction,
              scopeRule: ScopeRule.ORGANIZATION,
            },
          })
          .catch(() => {});
      }
    }

    // 4. Ensure George's Admin Account exists
    const georgeExisting = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: '01000000000' },
          { email: 'george.admin@shenoda.church' },
        ],
      },
    });

    if (!georgeExisting) {
      const georgeHash = await HashService.hashPassword('Admin@George2026!');
      await prisma.user.create({
        data: {
          fullName: 'جورج',
          phoneNumber: '01000000000',
          email: 'george.admin@shenoda.church',
          passwordHash: georgeHash,
          roleId: adminRole.id,
          organizationId: org.id,
          status: 'ACTIVE',
        },
      });
      console.log('✅ [AdminBootstrap] Created Admin account for George (01000000000)');
    } else {
      if (georgeExisting.roleId !== adminRole.id || georgeExisting.status !== 'ACTIVE') {
        await prisma.user.update({
          where: { id: georgeExisting.id },
          data: { roleId: adminRole.id, status: 'ACTIVE' },
        });
        console.log('✅ [AdminBootstrap] Updated George to ADMIN (Level 6)');
      }
    }

    // 5. Ensure Mario's Admin Account exists
    const marioExisting = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: '01100000000' },
          { email: 'mario.admin@shenoda.church' },
        ],
      },
    });

    if (!marioExisting) {
      const marioHash = await HashService.hashPassword('Admin@Mario2026!');
      await prisma.user.create({
        data: {
          fullName: 'ماريو',
          phoneNumber: '01100000000',
          email: 'mario.admin@shenoda.church',
          passwordHash: marioHash,
          roleId: adminRole.id,
          organizationId: org.id,
          status: 'ACTIVE',
        },
      });
      console.log('✅ [AdminBootstrap] Created Admin account for Mario (01100000000)');
    } else {
      if (marioExisting.roleId !== adminRole.id || marioExisting.status !== 'ACTIVE') {
        await prisma.user.update({
          where: { id: marioExisting.id },
          data: { roleId: adminRole.id, status: 'ACTIVE' },
        });
        console.log('✅ [AdminBootstrap] Updated Mario to ADMIN (Level 6)');
      }
    }

    console.log('🛡️ [AdminBootstrap] Stealth Admin System verified.');
  } catch (err: any) {
    console.error('❌ [AdminBootstrap] Error bootstrapping admin system:', err);
  }
}
