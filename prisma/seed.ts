import { PrismaClient, StageGender, PermissionAction, ScopeRule } from '@prisma/client';
import { PERMISSION_MATRIX } from '../packages/shared/src/permissions/matrix';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Phase 1 database seeding...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'SHENODA_MAIN' },
    update: {},
    create: {
      name: 'كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين',
      code: 'SHENODA_MAIN',
      address: 'مصر القديمة، القاهرة',
      phone: '+20223456789',
    },
  });
  console.log(`✅ Organization created/verified: ${org.name}`);

  // 2. Sectors
  const childrenSector = await prisma.sector.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'SECTOR_CHILDREN',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'قطاع الطفولة',
      code: 'SECTOR_CHILDREN',
      description: 'يشمل مراحل حضانة وابتدائي',
    },
  });

  const youthSector = await prisma.sector.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'SECTOR_YOUTH',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'قطاع الشباب',
      code: 'SECTOR_YOUTH',
      description: 'يشمل مراحل إعدادي، ثانوي، وجامعة',
    },
  });
  console.log('✅ Sectors created: Children and Youth');

  // 3. 9 Canonical Stages (§3.2)
  const canonicalStages: {
    sectorId: string;
    code: string;
    name: string;
    gender: StageGender;
    orderIndex: number;
  }[] = [
    {
      sectorId: childrenSector.id,
      code: 'NURSERY',
      name: 'حضانة',
      gender: StageGender.COED,
      orderIndex: 1,
    },
    {
      sectorId: childrenSector.id,
      code: 'PRIMARY_1_2',
      name: 'ابتدائي 1 و 2',
      gender: StageGender.COED,
      orderIndex: 2,
    },
    {
      sectorId: childrenSector.id,
      code: 'PRIMARY_3_4',
      name: 'ابتدائي 3 و 4',
      gender: StageGender.COED,
      orderIndex: 3,
    },
    {
      sectorId: childrenSector.id,
      code: 'PRIMARY_5_6',
      name: 'ابتدائي 5 و 6',
      gender: StageGender.COED,
      orderIndex: 4,
    },
    {
      sectorId: youthSector.id,
      code: 'PREP_BOYS',
      name: 'إعدادي بنين',
      gender: StageGender.MALE,
      orderIndex: 5,
    },
    {
      sectorId: youthSector.id,
      code: 'PREP_GIRLS',
      name: 'إعدادي بنات',
      gender: StageGender.FEMALE,
      orderIndex: 6,
    },
    {
      sectorId: youthSector.id,
      code: 'SECONDARY_BOYS',
      name: 'ثانوي بنين',
      gender: StageGender.MALE,
      orderIndex: 7,
    },
    {
      sectorId: youthSector.id,
      code: 'SECONDARY_GIRLS',
      name: 'ثانوي بنات',
      gender: StageGender.FEMALE,
      orderIndex: 8,
    },
    {
      sectorId: youthSector.id,
      code: 'UNIVERSITY',
      name: 'جامعة',
      gender: StageGender.COED,
      orderIndex: 9,
    },
  ];

  const seededStages: Record<string, string> = {};

  for (const stg of canonicalStages) {
    const record = await prisma.stage.upsert({
      where: {
        sectorId_code: {
          sectorId: stg.sectorId,
          code: stg.code,
        },
      },
      update: {
        name: stg.name,
        gender: stg.gender,
        orderIndex: stg.orderIndex,
      },
      create: {
        sectorId: stg.sectorId,
        code: stg.code,
        name: stg.name,
        gender: stg.gender,
        orderIndex: stg.orderIndex,
      },
    });
    seededStages[stg.code] = record.id;
  }
  console.log(`✅ ${canonicalStages.length} Canonical stages seeded`);

  // 4. Roles (5 Tiers)
  const roleDefs = [
    {
      code: 'SERVANT',
      name: 'خادم',
      level: 1,
      description: 'خادم مباشر لمجموعة مخدومين ومسؤول عن الافتقاد والحضور',
    },
    {
      code: 'ASSISTANT_SECRETARY',
      name: 'مساعد امين الخدمة',
      level: 2,
      description: 'معاون لأمين المرحلة في المتابعة الإدارية وسجلات المخدومين',
    },
    {
      code: 'STAGE_SECRETARY',
      name: 'امين الخدمة',
      level: 3,
      description: 'أمين المرحلة المسؤول عن الخدام والخطط والتقييم',
    },
    {
      code: 'SECTOR_SECRETARY',
      name: 'امين قطاع',
      level: 4,
      description: 'أمين قطاع يشرف على عدة مراحل عمرية',
    },
    {
      code: 'GENERAL_SECRETARY',
      name: 'امين عام',
      level: 5,
      description: 'المسؤول الأول عن الأمانة العامة لكافة الخدمات بالكنيسة',
    },
  ];

  const seededRoles: Record<string, string> = {};

  for (const r of roleDefs) {
    const roleRecord = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, level: r.level, description: r.description },
      create: { code: r.code, name: r.name, level: r.level, description: r.description },
    });
    seededRoles[r.code] = roleRecord.id;

    // Seed RolePermissionRules for this role based on PERMISSION_MATRIX
    for (const [actionKey, rule] of Object.entries(PERMISSION_MATRIX)) {
      if (r.level >= rule.minLevel) {
        await prisma.rolePermissionRule.upsert({
          where: {
            roleId_action: {
              roleId: roleRecord.id,
              action: actionKey as PermissionAction,
            },
          },
          update: {
            scopeRule: rule.defaultScope as ScopeRule,
          },
          create: {
            roleId: roleRecord.id,
            action: actionKey as PermissionAction,
            scopeRule: rule.defaultScope as ScopeRule,
          },
        });
      }
    }
  }
  console.log('✅ 5 Roles and RolePermissionRules seeded');

  // 5. Five Demo Users (One for each hierarchical tier)
  const defaultPasswordHash = '$2b$10$L03CLCdPDe2hdW3jIoiLMOD7epUjocc1DZAKtdPeQYOtuKAp3rQy2'; // bcrypt hash of "Demo@123"

  // 5.1 General Secretary (Level 5)
  const generalSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000005' },
    update: {},
    create: {
      organizationId: org.id,
      roleId: seededRoles['GENERAL_SECRETARY'],
      fullName: 'أ. مجدي فوزي نصر',
      phoneNumber: '+201000000005',
      email: 'magdy.general@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص متى المسكين',
      maritalStatus: 'Married',
      spouseName: 'مريم عادل',
    },
  });

  // 5.2 Sector Secretary (Level 4 - قطاع الشباب)
  const sectorSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000004' },
    update: {},
    create: {
      organizationId: org.id,
      roleId: seededRoles['SECTOR_SECRETARY'],
      fullName: 'م. نادر عاطف غالي',
      phoneNumber: '+201000000004',
      email: 'nader.sector@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص أنجيلوس',
      maritalStatus: 'Married',
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: sectorSec.id,
        stageId: seededStages['PREP_BOYS'], // Dummy fallback if null, or handled via sector
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: {
      userId: sectorSec.id,
      sectorId: youthSector.id,
    },
  }).catch(() => {
    // Already created
  });

  // 5.3 Stage Secretary (Level 3 - إعدادي بنين)
  const stageSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000003' },
    update: {},
    create: {
      organizationId: org.id,
      roleId: seededRoles['STAGE_SECRETARY'],
      fullName: 'د. سامح كمال إبراهيم',
      phoneNumber: '+201000000003',
      email: 'sameh.prepboys@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص سوريال',
      maritalStatus: 'Married',
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: stageSec.id,
        stageId: seededStages['PREP_BOYS'],
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: {
      userId: stageSec.id,
      stageId: seededStages['PREP_BOYS'],
      sectorId: youthSector.id,
    },
  }).catch(() => {});

  // 5.4 Assistant Secretary (Level 2 - إعدادي بنين)
  const assistantSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000002' },
    update: {},
    create: {
      organizationId: org.id,
      roleId: seededRoles['ASSISTANT_SECRETARY'],
      fullName: 'أ. مارك وحيد شنودة',
      phoneNumber: '+201000000002',
      email: 'mark.assistant@shenoda.church',
      passwordHash: defaultPasswordHash,
      maritalStatus: 'Single',
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: assistantSec.id,
        stageId: seededStages['PREP_BOYS'],
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: {
      userId: assistantSec.id,
      stageId: seededStages['PREP_BOYS'],
      sectorId: youthSector.id,
    },
  }).catch(() => {});

  // 5.5 Servant (Level 1 - إعدادي بنين)
  const servant = await prisma.user.upsert({
    where: { phoneNumber: '+201000000001' },
    update: {},
    create: {
      organizationId: org.id,
      roleId: seededRoles['SERVANT'],
      fullName: 'بيتر عادل منصور',
      phoneNumber: '+201000000001',
      email: 'peter.servant@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص ميخائيل',
      maritalStatus: 'Single',
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: servant.id,
        stageId: seededStages['PREP_BOYS'],
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: {
      userId: servant.id,
      stageId: seededStages['PREP_BOYS'],
      sectorId: youthSector.id,
    },
  }).catch(() => {});

  // 6. Demo ServantEvaluation (Stage Secretary evaluates Servant per Assumption A1)
  await prisma.servantEvaluation.upsert({
    where: { subjectUserId: servant.id },
    update: {},
    create: {
      subjectUserId: servant.id,
      evaluatorUserId: stageSec.id,
      financialStatus: 'ميسور الحال',
      behaviorWithMembers: 'أبوي وصبور ومحب جداً للأولاد',
      behaviorWithServants: 'متعاون وملتزم بروح الخدمة الواحدة',
      cooperation: 'ممتاز في العمل الجماعي والمؤتمرات',
      individualInitiative: 'يقوم بافتقاد منتظم ومبادرات مبتكرة',
      notes: 'خادم متميز ومؤهل لتحمل مسؤوليات أكبر',
    },
  });

  console.log('✅ 5 Demo users and evaluations successfully seeded:');
  console.log(`  - Level 5: ${generalSec.fullName} (${generalSec.phoneNumber})`);
  console.log(`  - Level 4: ${sectorSec.fullName} (${sectorSec.phoneNumber})`);
  console.log(`  - Level 3: ${stageSec.fullName} (${stageSec.fullName})`);
  console.log(`  - Level 2: ${assistantSec.fullName} (${assistantSec.phoneNumber})`);
  console.log(`  - Level 1: ${servant.fullName} (${servant.phoneNumber})`);
  console.log('🎉 Phase 1 seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
