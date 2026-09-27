import { PrismaClient, StageGender, UserStatus, AttendanceStatus, MemberSessionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Common Coptic Christian First and Last Names for realistic Arabic data
const FIRST_NAMES_MALE = [
  'مينا', 'بيتر', 'كيرلس', 'مارك', 'بولا', 'أنطونيوس', 'يوحنا', 'توماس',
  'أبانوب', 'فيلوباتير', 'داود', 'جورج', 'شنودة', 'مكاريوس', 'أرسانيوس', 'باسيليوس',
  'إسطفانوس', 'متى', 'مرقس', 'لوقا', 'تيموثاوس', 'أثناسيوس', 'كيرلس', 'دانيال',
];

const FIRST_NAMES_FEMALE = [
  'مارينا', 'مريم', 'دميانة', 'سارة', 'فيرينا', 'مونيكا', 'يوستينا', 'إيرينى',
  'ريبيكا', 'هيلانة', 'كاترين', 'مارتينا', 'أرسينيا', 'كرستينا', 'مادونا', 'ساندرا',
  'كلوديا', 'سيلفيا', 'جوليانا', 'ميرنا', 'فبرونيا', 'أنا سيمون',
];

const LAST_NAMES = [
  'سمير', 'شوقي', 'فهمي', 'حنا', 'مكرم', 'نادر', 'سامح', 'مجدي',
  'نجيب', 'عاطف', 'عادل', 'نبيل', 'يوسف', 'عزيز', 'صبحي', 'رزق',
  'ملاك', 'بشاي', 'إبراهيم', 'فوزي', 'منسي', 'تادرس', 'مفيد', 'رمزي',
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function runStressSeed() {
  console.log('🚀 Starting Phase 9 Synthetic Stress Seeder (NFR-2.2)...');
  const startTime = Date.now();

  const isMini = process.argv.includes('--mini');
  const MEMBERS_COUNT = isMini ? 350 : 3500;
  const WEEKS_COUNT = isMini ? 12 : 52;

  console.log(`📊 Target Configuration: ${MEMBERS_COUNT} members, ${WEEKS_COUNT} weeks history (${isMini ? 'MINI' : 'FULL METROPOLITAN'} SCALE)`);

  const passwordHash = await bcrypt.hash('Shenoda@2026', 10);

  // 1. Organization
  console.log('🏛️ Creating/Upserting Organization...');
  const org = await prisma.organization.upsert({
    where: { code: 'SHENODA_MAIN' },
    update: {},
    create: {
      name: 'كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين',
      code: 'SHENODA_MAIN',
      address: 'شارع المحطة، مصر القديمة، القاهرة',
      phone: '0223650000',
    },
  });

  // 2. Roles
  console.log('🛡️ Creating/Upserting 5-Tier Roles...');
  const rolesData = [
    { code: 'SERVANT', name: 'خادم', level: 1 },
    { code: 'ASSISTANT_SECRETARY', name: 'مساعد أمين الخدمة', level: 2 },
    { code: 'STAGE_SECRETARY', name: 'أمين الخدمة', level: 3 },
    { code: 'SECTOR_SECRETARY', name: 'أمين القطاع', level: 4 },
    { code: 'GENERAL_SECRETARY', name: 'الأمين العام', level: 5 },
  ];

  const rolesMap = new Map<number, string>();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, level: r.level },
      create: r,
    });
    rolesMap.set(r.level, role.id);
  }

  // 3. Sectors & Stages
  console.log('📑 Creating 4 Sectors and 9 Stages...');
  const sectorsConfig = [
    {
      code: 'SECTOR_CHILDREN',
      name: 'قطاع الطفولة',
      stages: [
        { code: 'NURSERY', name: 'حضانة ملائكة', gender: StageGender.COED, order: 1 },
        { code: 'PRIMARY_1_2', name: 'ابتدائي 1 و 2', gender: StageGender.COED, order: 2 },
        { code: 'PRIMARY_3_4', name: 'ابتدائي 3 و 4', gender: StageGender.COED, order: 3 },
        { code: 'PRIMARY_5_6', name: 'ابتدائي 5 و 6', gender: StageGender.COED, order: 4 },
      ],
    },
    {
      code: 'SECTOR_PREP',
      name: 'قطاع إعدادي (الفتيان والفتيات)',
      stages: [
        { code: 'PREP_BOYS', name: 'إعدادي بنين', gender: StageGender.MALE, order: 5 },
        { code: 'PREP_GIRLS', name: 'إعدادي بنات', gender: StageGender.FEMALE, order: 6 },
      ],
    },
    {
      code: 'SECTOR_SECONDARY',
      name: 'قطاع ثانوي',
      stages: [
        { code: 'SEC_BOYS', name: 'ثانوي بنين', gender: StageGender.MALE, order: 7 },
        { code: 'SEC_GIRLS', name: 'ثانوي بنات', gender: StageGender.FEMALE, order: 8 },
      ],
    },
    {
      code: 'SECTOR_YOUTH',
      name: 'قطاع الشباب والجامعيين',
      stages: [
        { code: 'UNIVERSITY', name: 'أسرة القديس استفانوس الجامعية', gender: StageGender.COED, order: 9 },
      ],
    },
  ];

  const stageIds: string[] = [];
  const stageGenderMap = new Map<string, StageGender>();

  for (const s of sectorsConfig) {
    const sector = await prisma.sector.upsert({
      where: { organizationId_code: { organizationId: org.id, code: s.code } },
      update: { name: s.name },
      create: { organizationId: org.id, code: s.code, name: s.name },
    });

    for (const st of s.stages) {
      const stage = await prisma.stage.upsert({
        where: { sectorId_code: { sectorId: sector.id, code: st.code } },
        update: { name: st.name, gender: st.gender, orderIndex: st.order },
        create: {
          sectorId: sector.id,
          code: st.code,
          name: st.name,
          gender: st.gender,
          orderIndex: st.order,
        },
      });
      stageIds.push(stage.id);
      stageGenderMap.set(stage.id, st.gender);
    }
  }

  // 4. Servants Provisioning (Target: 350 servants across tiers)
  console.log('👥 Provisioning Servants & Leadership Hierarchy...');
  const servantUsers: Array<{ id: string; stageId?: string }> = [];

  // General Secretary
  const genSecPhone = '01000000000';
  const genSec = await prisma.user.upsert({
    where: { phoneNumber: genSecPhone },
    update: {},
    create: {
      organizationId: org.id,
      roleId: rolesMap.get(5)!,
      fullName: 'أ. مجدي عاطف حنا',
      phoneNumber: genSecPhone,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  // Create servants per stage
  let phoneCounter = 100000;
  for (const sId of stageIds) {
    // 1 Stage Secretary (Level 3)
    const stageSecPhone = `010${phoneCounter++}`;
    const stageSec = await prisma.user.upsert({
      where: { phoneNumber: stageSecPhone },
      update: {},
      create: {
        organizationId: org.id,
        roleId: rolesMap.get(3)!,
        fullName: `أمين مرحلة ${getRandomItem(FIRST_NAMES_MALE)} ${getRandomItem(LAST_NAMES)}`,
        phoneNumber: stageSecPhone,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
    await prisma.scopeAssignment.upsert({
      where: { userId_stageId_sectorId: { userId: stageSec.id, stageId: sId, sectorId: null as any } },
      update: {},
      create: { userId: stageSec.id, stageId: sId },
    }).catch(() => {});

    // 2 Assistant Secretaries (Level 2)
    for (let a = 1; a <= 2; a++) {
      const asstPhone = `010${phoneCounter++}`;
      const asst = await prisma.user.upsert({
        where: { phoneNumber: asstPhone },
        update: {},
        create: {
          organizationId: org.id,
          roleId: rolesMap.get(2)!,
          fullName: `مساعد أمين ${getRandomItem(FIRST_NAMES_MALE)} ${getRandomItem(LAST_NAMES)}`,
          phoneNumber: asstPhone,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });
      await prisma.scopeAssignment.upsert({
        where: { userId_stageId_sectorId: { userId: asst.id, stageId: sId, sectorId: null as any } },
        update: {},
        create: { userId: asst.id, stageId: sId },
      }).catch(() => {});
    }

    // Level 1 Servants (~35 per stage)
    const servantsPerStage = isMini ? 5 : 35;
    for (let sv = 1; sv <= servantsPerStage; sv++) {
      const svPhone = `010${phoneCounter++}`;
      const isFemale = stageGenderMap.get(sId) === StageGender.FEMALE;
      const fn = isFemale ? getRandomItem(FIRST_NAMES_FEMALE) : getRandomItem(FIRST_NAMES_MALE);
      const servant = await prisma.user.upsert({
        where: { phoneNumber: svPhone },
        update: {},
        create: {
          organizationId: org.id,
          roleId: rolesMap.get(1)!,
          fullName: `خادم ${fn} ${getRandomItem(LAST_NAMES)}`,
          phoneNumber: svPhone,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });
      await prisma.scopeAssignment.upsert({
        where: { userId_stageId_sectorId: { userId: servant.id, stageId: sId, sectorId: null as any } },
        update: {},
        create: { userId: servant.id, stageId: sId },
      }).catch(() => {});
      servantUsers.push({ id: servant.id, stageId: sId });
    }
  }

  console.log(`✅ Provisioned ${phoneCounter - 100000} servants and secretaries.`);

  // 5. Served Members (3,500 members)
  console.log(`🧑‍🤝‍🧑 Generating ${MEMBERS_COUNT} Served Members across all stages...`);
  const membersPerStage = Math.floor(MEMBERS_COUNT / stageIds.length);
  const createdMemberIds: Array<{ id: string; stageId: string }> = [];

  for (let sIdx = 0; sIdx < stageIds.length; sIdx++) {
    const sId = stageIds[sIdx];
    const gender = stageGenderMap.get(sId);
    const membersToCreate: any[] = [];

    for (let m = 1; m <= membersPerStage; m++) {
      const isFemale =
        gender === StageGender.FEMALE ||
        (gender === StageGender.COED && m % 2 === 0);
      const fn = isFemale ? getRandomItem(FIRST_NAMES_FEMALE) : getRandomItem(FIRST_NAMES_MALE);
      const ln1 = getRandomItem(LAST_NAMES);
      const ln2 = getRandomItem(LAST_NAMES);

      membersToCreate.push({
        stageId: sId,
        fullName: `${fn} ${ln1} ${ln2}`,
        dateOfBirth: new Date(2010 + (sIdx % 8), getRandomInt(0, 11), getRandomInt(1, 28)),
        address: `${getRandomInt(1, 150)} شارع ${getRandomItem(['شبرا', 'مصر القديمة', 'الترعة', 'الظاهر', 'المعادي'])}`,
        phoneNumber: `012${getRandomInt(10000000, 99999999)}`,
        fatherName: `${ln1} ${ln2}`,
        fatherAge: getRandomInt(40, 58),
        motherName: `${getRandomItem(FIRST_NAMES_FEMALE)} ${getRandomItem(LAST_NAMES)}`,
        motherAge: getRandomInt(36, 52),
        schoolOrUniversity: `مدرسة ${getRandomItem(['القومية', 'الفرير', 'الراعي الصالح', 'الأقباط'])}`,
        educationalGrade: `الصف ${getRandomItem(['الأول', 'الثاني', 'الثالث'])}`,
        financialStatus: getRandomItem(['متوسط', 'جيد', 'ميسور', 'يحتاج رعاية']),
        behaviorInService: getRandomItem(['ممتاز', 'جيد جدا', 'هادئ', 'يحتاج تشجيع']),
        peerIntegration: getRandomItem(['متفاعل ونشط', 'هادئ ومتعاون', 'محبوب من زملائه']),
      });
    }

    // Insert in batches of 500
    for (let b = 0; b < membersToCreate.length; b += 500) {
      const chunk = membersToCreate.slice(b, b + 500);
      await prisma.servedMember.createMany({ data: chunk });
    }

    const fetchedMembers = await prisma.servedMember.findMany({
      where: { stageId: sId },
      select: { id: true, stageId: true },
      take: membersPerStage,
    });
    createdMemberIds.push(...fetchedMembers);
  }

  console.log(`✅ Successfully seeded ${createdMemberIds.length} members with family profiles.`);

  // 6. Historical Attendance Records (Target: up to 150,000 records)
  console.log(`📅 Generating multi-week historical attendance across ${WEEKS_COUNT} calendar weeks...`);

  // Generate session dates (Fridays)
  const sessionDates: Date[] = [];
  const baseDate = new Date();
  for (let w = 0; w < WEEKS_COUNT; w++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - w * 7);
    sessionDates.push(d);
  }

  let totalAttendanceRecords = 0;
  const attendanceBatch: any[] = [];
  const BATCH_SIZE = 2500;

  for (const member of createdMemberIds) {
    for (const sDate of sessionDates) {
      // 80% attendance probability for realistic healthy congregation
      const isPresent = Math.random() < 0.82;
      const status: AttendanceStatus = isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;

      attendanceBatch.push({
        memberId: member.id,
        stageId: member.stageId,
        sessionType: MemberSessionType.SERVICE_ATTENDANCE,
        sessionDate: sDate,
        status,
        recordedById: genSec.id,
      });

      if (attendanceBatch.length >= BATCH_SIZE) {
        await prisma.memberAttendance.createMany({
          data: attendanceBatch,
          skipDuplicates: true,
        });
        totalAttendanceRecords += attendanceBatch.length;
        attendanceBatch.length = 0;
      }
    }
  }

  if (attendanceBatch.length > 0) {
    await prisma.memberAttendance.createMany({
      data: attendanceBatch,
      skipDuplicates: true,
    });
    totalAttendanceRecords += attendanceBatch.length;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`🎉 Stress seeding finished in ${durationSec}s!`);
  console.log(`📊 Summary:`);
  console.log(`   - Organization: 1`);
  console.log(`   - Sectors: 4`);
  console.log(`   - Stages: 9`);
  console.log(`   - Servants & Secretaries: ${phoneCounter - 100000}`);
  console.log(`   - Served Members: ${createdMemberIds.length}`);
  console.log(`   - Attendance Records Created: ${totalAttendanceRecords}`);
}

// Direct script execution
if (require.main === module) {
  runStressSeed()
    .catch((e) => {
      console.error('❌ Error during stress seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
