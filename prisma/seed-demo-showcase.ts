import {
  PrismaClient,
  StageGender,
  UserStatus,
  AttendanceStatus,
  MemberSessionType,
  PrepStatus,
  SpiritualSacrament,
  PlanScopeType,
  EventCategory,
  TargetScopeLevel,
  AlertTargetType,
  AlertStatus,
  PermissionAction,
  ScopeRule,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PERMISSION_MATRIX } from '../packages/shared/src/permissions/matrix';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Comprehensive Demo Showcase Seeder...');

  const defaultPasswordHash = await bcrypt.hash('Demo@123', 10);

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'SHENODA_MAIN' },
    update: {},
    create: {
      name: 'كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين',
      code: 'SHENODA_MAIN',
      address: 'شارع المحطة، مصر القديمة، القاهرة',
      phone: '+20223456789',
    },
  });
  console.log(`✅ 1. Organization: ${org.name}`);

  // 2. Sectors
  const childrenSector = await prisma.sector.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SECTOR_CHILDREN' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'قطاع الطفولة',
      code: 'SECTOR_CHILDREN',
      description: 'يشمل مراحل حضانة وابتدائي',
    },
  });

  const youthSector = await prisma.sector.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SECTOR_YOUTH' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'قطاع الشباب',
      code: 'SECTOR_YOUTH',
      description: 'يشمل مراحل إعدادي، ثانوي، وجامعة',
    },
  });
  console.log('✅ 2. Sectors: Children and Youth');

  // 3. Stages
  const stagePrepBoys = await prisma.stage.upsert({
    where: { sectorId_code: { sectorId: youthSector.id, code: 'PREP_BOYS' } },
    update: {},
    create: {
      sectorId: youthSector.id,
      code: 'PREP_BOYS',
      name: 'إعدادي بنين',
      gender: StageGender.MALE,
      orderIndex: 5,
    },
  });

  const stagePrepGirls = await prisma.stage.upsert({
    where: { sectorId_code: { sectorId: youthSector.id, code: 'PREP_GIRLS' } },
    update: {},
    create: {
      sectorId: youthSector.id,
      code: 'PREP_GIRLS',
      name: 'إعدادي بنات',
      gender: StageGender.FEMALE,
      orderIndex: 6,
    },
  });

  const stagePrimary12 = await prisma.stage.upsert({
    where: { sectorId_code: { sectorId: childrenSector.id, code: 'PRIMARY_1_2' } },
    update: {},
    create: {
      sectorId: childrenSector.id,
      code: 'PRIMARY_1_2',
      name: 'ابتدائي 1 و 2',
      gender: StageGender.COED,
      orderIndex: 2,
    },
  });
  console.log('✅ 3. Key Stages initialized');

  // 4. Roles & Permission Rules
  const rolesData = [
    { code: 'SERVANT', name: 'خادم', level: 1 },
    { code: 'ASSISTANT_SECRETARY', name: 'مساعد أمين الخدمة', level: 2 },
    { code: 'STAGE_SECRETARY', name: 'أمين الخدمة', level: 3 },
    { code: 'SECTOR_SECRETARY', name: 'أمين القطاع', level: 4 },
    { code: 'GENERAL_SECRETARY', name: 'الأمين العام', level: 5 },
  ];

  const rolesMap = new Map<string, string>();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, level: r.level },
      create: r,
    });
    rolesMap.set(r.code, role.id);

    // Populate matrix rules
    for (const [actionKey, rule] of Object.entries(PERMISSION_MATRIX)) {
      if (r.level >= rule.minLevel) {
        await prisma.rolePermissionRule.upsert({
          where: { roleId_action: { roleId: role.id, action: actionKey as PermissionAction } },
          update: { scopeRule: rule.defaultScope as ScopeRule },
          create: {
            roleId: role.id,
            action: actionKey as PermissionAction,
            scopeRule: rule.defaultScope as ScopeRule,
          },
        });
      }
    }
  }
  console.log('✅ 4. Roles & Rules synchronized');

  // 5. Canonical Demo Users (Password: Demo@123)
  // 5.1 General Secretary (Level 5)
  const generalSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000005' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      organizationId: org.id,
      roleId: rolesMap.get('GENERAL_SECRETARY')!,
      fullName: 'أ. مجدي فوزي نصر',
      phoneNumber: '+201000000005',
      email: 'magdy.general@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص متى المسكين',
      maritalStatus: 'Married',
      spouseName: 'مريم عادل',
      status: UserStatus.ACTIVE,
    },
  });

  // 5.2 Sector Secretary (Level 4 - قطاع الشباب)
  const sectorSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000004' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      organizationId: org.id,
      roleId: rolesMap.get('SECTOR_SECRETARY')!,
      fullName: 'م. نادر عاطف غالي',
      phoneNumber: '+201000000004',
      email: 'nader.sector@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص أنجيلوس',
      maritalStatus: 'Married',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: sectorSec.id,
        stageId: stagePrepBoys.id,
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: { userId: sectorSec.id, sectorId: youthSector.id },
  }).catch(() => {});

  // 5.3 Stage Secretary (Level 3 - إعدادي بنين)
  const stageSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000003' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      organizationId: org.id,
      roleId: rolesMap.get('STAGE_SECRETARY')!,
      fullName: 'د. سامح كمال إبراهيم',
      phoneNumber: '+201000000003',
      email: 'sameh.prepboys@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص سوريال',
      maritalStatus: 'Married',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: stageSec.id,
        stageId: stagePrepBoys.id,
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: { userId: stageSec.id, stageId: stagePrepBoys.id, sectorId: youthSector.id },
  }).catch(() => {});

  // 5.4 Assistant Secretary (Level 2 - إعدادي بنين)
  const assistantSec = await prisma.user.upsert({
    where: { phoneNumber: '+201000000002' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      organizationId: org.id,
      roleId: rolesMap.get('ASSISTANT_SECRETARY')!,
      fullName: 'أ. مارك وحيد شنودة',
      phoneNumber: '+201000000002',
      email: 'mark.assistant@shenoda.church',
      passwordHash: defaultPasswordHash,
      maritalStatus: 'Single',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: assistantSec.id,
        stageId: stagePrepBoys.id,
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: { userId: assistantSec.id, stageId: stagePrepBoys.id, sectorId: youthSector.id },
  }).catch(() => {});

  // 5.5 Servant (Level 1 - إعدادي بنين)
  const servant = await prisma.user.upsert({
    where: { phoneNumber: '+201000000001' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      organizationId: org.id,
      roleId: rolesMap.get('SERVANT')!,
      fullName: 'بيتر عادل منصور',
      phoneNumber: '+201000000001',
      email: 'peter.servant@shenoda.church',
      passwordHash: defaultPasswordHash,
      fatherConfessor: 'القمص ميخائيل',
      maritalStatus: 'Single',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.scopeAssignment.upsert({
    where: {
      userId_stageId_sectorId: {
        userId: servant.id,
        stageId: stagePrepBoys.id,
        sectorId: youthSector.id,
      },
    },
    update: {},
    create: { userId: servant.id, stageId: stagePrepBoys.id, sectorId: youthSector.id },
  }).catch(() => {});

  console.log('✅ 5. Canonical Demo Users seeded:');
  console.log('   - Level 5: +201000000005 (أ. مجدي فوزي)');
  console.log('   - Level 4: +201000000004 (م. نادر عاطف)');
  console.log('   - Level 3: +201000000003 (د. سامح كمال)');
  console.log('   - Level 2: +201000000002 (أ. مارك وحيد)');
  console.log('   - Level 1: +201000000001 (بيتر عادل)');
  console.log('   (Unified Password: Demo@123)');

  // 6. Served Members in Prep Boys (إعدادي بنين)
  console.log('🧒 6. Seeding Served Members for Prep Boys...');
  const membersData = [
    {
      fullName: 'كيرلس مينا سمير',
      dateOfBirth: new Date('2012-04-15'),
      address: '14 شارع النيل، مصر القديمة',
      phoneNumber: '01221111001',
      fatherName: 'مينا سمير رزق',
      fatherAge: 44,
      motherName: 'مريم عاطف',
      motherAge: 40,
      fatherConfessor: 'القمص أنجيلوس',
      schoolOrUniversity: 'مدرسة العائلة المقدسة',
      educationalGrade: 'أولى إعدادي',
      financialStatus: 'متوسط الحال',
      behaviorInService: 'منتظم ومحب للترانيم والخدمة',
      peerIntegration: 'متعاون ومحبوب من زملائه',
    },
    {
      fullName: 'مارك جورج فهمي',
      dateOfBirth: new Date('2011-08-20'),
      address: '25 شارع المحطة، مصر القديمة',
      phoneNumber: '01221111002',
      fatherName: 'جورج فهمي حنا',
      fatherAge: 46,
      motherName: 'سارة مكرم',
      motherAge: 42,
      fatherConfessor: 'القمص ميخائيل',
      schoolOrUniversity: 'مدرسة سان مارك',
      educationalGrade: 'ثانية إعدادي',
      financialStatus: 'ميسور الحال',
      behaviorInService: 'يحتاج تشجيع على الحضور المبكر في القداس',
      peerIntegration: 'هادئ ومميز في الأنشطة الرياضية',
    },
    {
      fullName: 'يوسف رفيق عزيز',
      dateOfBirth: new Date('2010-11-10'),
      address: '5 درب البازار، مصر القديمة',
      phoneNumber: '01221111003',
      fatherName: 'رفيق عزيز تادرس',
      fatherAge: 50,
      motherName: 'مونيكا مجدي',
      motherAge: 47,
      fatherConfessor: 'القمص سوريال',
      schoolOrUniversity: 'مدرسة القديس يوسف',
      educationalGrade: 'ثالثة إعدادي',
      financialStatus: 'ظروف خاصة - يحتاج دعم دراسي',
      behaviorInService: 'ذكي ونشيط، يحتاج متابعة دورية بالمنزل',
      peerIntegration: 'قيادي بين زملائه',
    },
    {
      fullName: 'أنطونيوس سامح نبيل',
      dateOfBirth: new Date('2012-01-05'),
      address: '8 حارة الكنيسة، مصر القديمة',
      phoneNumber: '01221111004',
      fatherName: 'سامح نبيل فوزي',
      fatherAge: 43,
      motherName: 'هيلانة عادل',
      motherAge: 39,
      fatherConfessor: 'القمص متى المسكين',
      schoolOrUniversity: 'مدرسة الفرير',
      educationalGrade: 'أولى إعدادي',
      financialStatus: 'متوسط الحال',
      behaviorInService: 'ملتزم جداً بحفظ الألحان القبطية',
      peerIntegration: 'ممتاز',
    },
    {
      fullName: 'بيشوي صبحي منسي',
      dateOfBirth: new Date('2011-06-18'),
      address: '19 شارع كورنيش النيل',
      phoneNumber: '01221111005',
      fatherName: 'صبحي منسي حنا',
      fatherAge: 48,
      motherName: 'إيرينى شوقي',
      motherAge: 44,
      fatherConfessor: 'القمص أنجيلوس',
      schoolOrUniversity: 'مدرسة مصر التجريبية',
      educationalGrade: 'ثانية إعدادي',
      financialStatus: 'متوسط الحال',
      behaviorInService: 'تغيب عن الخدمة لثلاثة أسابيع متتالية لظروف سفر الأسرة',
      peerIntegration: 'محبوب من الجميع',
    },
    {
      fullName: 'فيلوباتير عماد نظمي',
      dateOfBirth: new Date('2010-09-12'),
      address: '32 شارع الفسطاط',
      phoneNumber: '01221111006',
      fatherName: 'عماد نظمي بشاي',
      fatherAge: 52,
      motherName: 'مارتينا نجيب',
      motherAge: 46,
      fatherConfessor: 'القمص ميخائيل',
      schoolOrUniversity: 'مدرسة الأقباط الإعدادية',
      educationalGrade: 'ثالثة إعدادي',
      financialStatus: 'ميسور الحال',
      behaviorInService: 'حضور منتظم في القداس الإلهي والمدارس الصيفية',
      peerIntegration: 'ممتاز وشارك في مسرحية الكنيسة السنوية',
    },
  ];

  const createdMembers: any[] = [];
  for (const m of membersData) {
    const existing = await prisma.servedMember.findFirst({
      where: { stageId: stagePrepBoys.id, fullName: m.fullName },
    });
    if (existing) {
      createdMembers.push(existing);
    } else {
      const member = await prisma.servedMember.create({
        data: {
          stageId: stagePrepBoys.id,
          ...m,
        },
      });
      createdMembers.push(member);
    }
  }

  // 7. Member Servant Assignments (Link members to Peter Adel Level 1)
  console.log('🔗 7. Assigning members to Peter Adel (Servant)...');
  for (const member of createdMembers) {
    await prisma.memberServantAssignment.upsert({
      where: {
        memberId_servantUserId: {
          memberId: member.id,
          servantUserId: servant.id,
        },
      },
      update: {},
      create: {
        memberId: member.id,
        servantUserId: servant.id,
        assignedById: stageSec.id,
      },
    });
  }
  console.log(`✅ 6 Members assigned directly to Servant ${servant.fullName}`);

  // 8. Attendance History (Past 4 Fridays)
  console.log('📅 8. Seeding historical attendance records...');
  const pastDates = [
    new Date('2026-09-04'),
    new Date('2026-09-11'),
    new Date('2026-09-18'),
    new Date('2026-09-25'),
  ];

  for (const date of pastDates) {
    for (let i = 0; i < createdMembers.length; i++) {
      const member = createdMembers[i];
      // Bishoy (index 4) was absent the last 3 weeks to trigger absence alert
      let isPresent = true;
      if (i === 4 && date > new Date('2026-09-04')) {
        isPresent = false;
      } else if (i === 2 && date.getDate() === 18) {
        isPresent = false;
      }

      await prisma.memberAttendance.upsert({
        where: {
          memberId_sessionType_sessionDate: {
            memberId: member.id,
            sessionType: MemberSessionType.SERVICE_ATTENDANCE,
            sessionDate: date,
          },
        },
        update: { status: isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT },
        create: {
          memberId: member.id,
          stageId: stagePrepBoys.id,
          sessionType: MemberSessionType.SERVICE_ATTENDANCE,
          sessionDate: date,
          status: isPresent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
          recordedById: servant.id,
        },
      });
    }
  }

  // 9. Absence Alert (تنبيه غياب متكرر)
  const bishoy = createdMembers[4];
  if (bishoy) {
    const existingAlert = await prisma.absenceAlert.findFirst({
      where: { memberId: bishoy.id, alertStatus: AlertStatus.ACTIVE },
    });
    if (!existingAlert) {
      await prisma.absenceAlert.create({
        data: {
          targetType: AlertTargetType.MEMBER,
          memberId: bishoy.id,
          stageId: stagePrepBoys.id,
          consecutiveCount: 3,
          lastAttendedDate: new Date('2026-09-04'),
          alertStatus: AlertStatus.ACTIVE,
          assignedFollowUpId: servant.id,
          resolutionNotes: 'مطلوب افتقاد منزلي عاجل والتواصل مع ولي الأمر (01001111005)',
        },
      });
      console.log('⚠️ 9. Absence Alert created for member Bishoy (assigned to Peter Adel)');
    }
  }

  // 10. Lesson Preparations (تحضير الدروس)
  console.log('📖 10. Seeding Lesson Preparations...');
  await prisma.lessonPreparation.create({
    data: {
      authorUserId: servant.id,
      stageId: stagePrepBoys.id,
      lessonDate: new Date('2026-09-18'),
      title: 'مثل الابن الضال والرجوع إلى حضن الآب',
      scriptureRef: 'إنجيل لوقا 15: 11-32',
      mainObjective: 'أن يدرك الفتى أن توبة الإنسان تقابل بفرح سماوي عظيم ومحبة أبوية غير مشروطة',
      content: 'مقدمة: مقارنة بين محبة العالم المؤقتة ومحبة الآب الدائمة.\n1. خروج الابن وطلب الميراث.\n2. المرارة في الكورة البعيدة وأكل الخرنوب.\n3. قرار الرجوع: "أقوم والآن وأذهب إلى أبي".\n4. استقبال الآب بالحلّة الأولى والخاتم والذبيحة.\nتطبيق عملي: ممارسة سر التوبة والاعتراف هذا الأسبوع.',
      status: PrepStatus.REVIEWED,
      reviewerNotes: 'تحضير ممتاز ومرتب، تم التأكيد على استخدام وسائل إيضاح وتطبيق تدريب أسبوعي عملي.',
      reviewedById: stageSec.id,
    },
  });

  await prisma.lessonPreparation.create({
    data: {
      authorUserId: servant.id,
      stageId: stagePrepBoys.id,
      lessonDate: new Date('2026-10-02'),
      title: 'داود النبي ومواجهة جليات — الإيمان الذي يغلب العالم',
      scriptureRef: 'صموئيل الأول 17: 32-50',
      mainObjective: 'غرس الثقة في قوة الله والاتكال عليه أمام تحديات سن المراهقة والضغوط المجتمعية',
      content: '1. تحدي جليات وتعيير صفوف إسرائيل.\n2. إيمان داود: "أنت تأتي إليّ بسيف ورمح، وأنا آتي إليك باسم رب الجنود".\n3. خمسة حصيات ملساء (الصلاة، الصوم، الكتاب، الكنيسة، الاعتراف).\n4. انتصار الإيمان وسقوط العملاق.',
      status: PrepStatus.SUBMITTED,
    },
  });

  await prisma.lessonPreparation.create({
    data: {
      authorUserId: servant.id,
      stageId: stagePrepBoys.id,
      lessonDate: new Date('2026-10-09'),
      title: 'سر التناول وثمار الاتحاد بالمسيح',
      scriptureRef: 'يوحنا 6: 51-58',
      mainObjective: 'الاستعداد الروحي والجسدي قبل التقدم لسر التناول المقدس',
      content: 'مسودة قيد الإعداد...',
      status: PrepStatus.DRAFT,
    },
  });
  console.log('✅ 3 Lesson Preparations seeded (Approved, Submitted, Draft)');

  // 11. Spiritual Life Entries (الحياة الروحية الخاصة بالخادم بيتر عادل)
  console.log('🕊️ 11. Seeding Private Spiritual Life Entries for Peter Adel...');
  const spiritualEntries = [
    {
      sacrament: SpiritualSacrament.CONFESSION,
      entryDate: new Date('2026-09-12'),
      notes: 'جلسة اعتراف ونصح روحي مع أبي الروحي. تدريب الأسبوع: ضبط الفكر والمواظبة على قراءة رسالة رومية.',
      fatherName: 'القمص ميخائيل',
    },
    {
      sacrament: SpiritualSacrament.COMMUNION,
      entryDate: new Date('2026-09-18'),
      notes: 'قداس الجمعة وتناول الأسرار المقدسة مع أولاد الخدمة.',
      fatherName: 'كنيسة أنبا شنودة',
    },
    {
      sacrament: SpiritualSacrament.PRAYER_RULE,
      entryDate: new Date('2026-09-24'),
      notes: 'صلاة باكر والغروب وقراءة المزامير (المزمور 23 و 50).',
    },
    {
      sacrament: SpiritualSacrament.FASTING,
      entryDate: new Date('2026-09-25'),
      notes: 'صوم الأربعاء والجمعة حتى الساعة الثالثة ظهراً.',
    },
  ];

  for (const entry of spiritualEntries) {
    await prisma.spiritualLifeEntry.create({
      data: {
        userId: servant.id,
        ...entry,
      },
    });
  }
  console.log('✅ Spiritual journal seeded (Confession, Communion, Prayers)');

  // 12. Year Plan & Calendar Events (تدبير السنة لقطاع إعدادي بنين)
  console.log('📅 12. Seeding Year Plan & Calendar Events...');
  const yearPlan = await prisma.yearPlan.create({
    data: {
      organizationId: org.id,
      title: 'خطة خدمة إعدادي بنين لعام 2026 / 2027 — "تمسك بما عندك"',
      academicYear: '2026-2027',
      scopeType: PlanScopeType.STAGE,
      stageId: stagePrepBoys.id,
      publishedById: stageSec.id,
      isPublished: true,
    },
  });

  const event1 = await prisma.calendarEvent.create({
    data: {
      yearPlanId: yearPlan.id,
      stageId: stagePrepBoys.id,
      title: 'مؤتمر العقيدة والشباب — بيت ماريوحنا بالكنج مريوط',
      description: 'مؤتمر روحي لمدة 3 أيام يتناول أساسيات الإيمان الأرثوذكسي وتاريخ الكنيسة وورش عمل تفاعلية',
      category: EventCategory.CONFERENCE_RETREAT,
      startDate: new Date('2026-10-15T08:00:00Z'),
      endDate: new Date('2026-10-17T18:00:00Z'),
      location: 'بيت ماريوحنا الحبيب — الكنج مريوط، الإسكندرية',
      maxVolunteers: 8,
      createdById: stageSec.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      yearPlanId: yearPlan.id,
      stageId: stagePrepBoys.id,
      title: 'اليوم الرياضي السنوي ودوري كرة القدم للكشافة',
      description: 'مسابقات رياضية وتحديات كشفية وتوزيع الكؤوس على الفرق الفائزة',
      category: EventCategory.COMMUNITY_ACTIVITY,
      startDate: new Date('2026-11-06T09:00:00Z'),
      endDate: new Date('2026-11-06T17:00:00Z'),
      location: 'الملاعب الرياضية بنادي الكنيسة',
      maxVolunteers: 12,
      createdById: stageSec.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      yearPlanId: yearPlan.id,
      stageId: stagePrepBoys.id,
      title: 'رحلة أديرة وادي النطرون ونوال بركة الآباء القديسين',
      description: 'زيارة دير السريان ودير الأنبا بيشوي ودير البراموس وتناول بركة القداس الإلهي',
      category: EventCategory.TRIP_OR_OUTING,
      startDate: new Date('2026-11-20T06:00:00Z'),
      endDate: new Date('2026-11-20T20:00:00Z'),
      location: 'أديرة برية شيهيت — وادي النطرون',
      maxVolunteers: 6,
      createdById: stageSec.id,
    },
  });

  // 1. تدبير اجتماع خدام
  await prisma.calendarEvent.create({
    data: {
      yearPlanId: yearPlan.id,
      stageId: stagePrepBoys.id,
      title: 'اجتماع الخدمة الأسبوعي — ورشة عمل وسائل الإيضاح والافتقاد الحديث',
      description: 'مناقشة منهج التربية الكنسية وأساليب إعداد وسائل إيضاح تفاعلية مناسبة لسن المراهقة والفتيان',
      category: EventCategory.SERVICE_MEETING,
      startDate: new Date('2026-10-09T17:00:00Z'),
      endDate: new Date('2026-10-09T19:00:00Z'),
      location: 'قاعة كنيسة أنبا شنودة بمصر القديمة',
      maxVolunteers: 4,
      createdById: stageSec.id,
    },
  });

  // 2. تحضير الدروس (دروس المنهج المقررة من التدبير)
  const lesson1 = await prisma.calendarEvent.create({
    data: {
      yearPlanId: yearPlan.id,
      stageId: stagePrepBoys.id,
      title: 'داود النبي ومواجهة جليات — الإيمان الذي يغلب العالم',
      description: JSON.stringify({
        overview: 'كيف يتغلب المخدوم على حروب الشك والضغوط المجتمعية بالاتكال التام على قوة الله',
        bibleVerse: '«أَنْتَ تَأْتِي إِلَيَّ بِسَيْفٍ وَبِرُمْحٍ... وَأَنَا آتِي إِلَيْكَ بِاسْمِ رَبِّ الْجُنُودِ» (1صم 17: 45)',
        references: 'تفسير القمص تادرس يعقوب ملطي، كتاب حياة داود النبي لقداسة البابا شنودة الثالث',
      }),
      category: EventCategory.SPIRITUAL_LESSON,
      startDate: new Date('2026-10-02T09:00:00Z'),
      endDate: new Date('2026-10-02T11:00:00Z'),
      location: 'فصول التربية الكنسية — مبنى الخدمات',
      createdById: stageSec.id,
    },
  });

  const lesson2 = await prisma.calendarEvent.create({
    data: {
      yearPlanId: yearPlan.id,
      stageId: stagePrepBoys.id,
      title: 'سر التناول وثمار الاتحاد بالمسيح',
      description: JSON.stringify({
        overview: 'الاستعداد الروحي والجسدي قبل التقدم لسر التناول المقدس وحفظ حواس المخدوم',
        bibleVerse: '«مَنْ يَأْكُلْ جَسَدِي وَيَشْرَبْ دَمِي يَثْبُتْ فِيَّ وَأَنَا فِيهِ» (يو 6: 56)',
        references: 'كتاب الإفخارستيا سر الملكوت للأب متى المسكين، السنكسار، خلاصة طقوس الأسرار',
      }),
      category: EventCategory.SPIRITUAL_LESSON,
      startDate: new Date('2026-10-09T09:00:00Z'),
      endDate: new Date('2026-10-09T11:00:00Z'),
      location: 'فصول التربية الكنسية — مبنى الخدمات',
      createdById: stageSec.id,
    },
  });

  // Link Servant Volunteer for Conference
  await prisma.eventVolunteer.create({
    data: {
      eventId: event1.id,
      userId: servant.id,
      roleInEvent: 'مسؤول تنظيم ورش العمل الروحية ومجموعات التلمذة',
    },
  });
  console.log('✅ Year Plan with 6 Events (Meetings, Service, Lessons) & Volunteer registration created');

  // 13. Servant Post (منشور خادم مستقل بالمرحلة)
  await prisma.yearPlanServantPost.create({
    data: {
      yearPlanId: yearPlan.id,
      stageId: stagePrepBoys.id,
      authorId: servant.id,
      title: 'تنويه لخدام إعدادي بنين بخصوص مذكرات درس الجمعة القادمة',
      content: 'سلام ونعمة يا أحبائي، تم بحمد الله طباعة مذكرات درس "داود وجليات" وتوزيع الأولاد إلى 4 مجموعات عمل، يرجى التواجد بالخدمة الساعة 9:30 صباحاً.',
    },
  });
  console.log('✅ Servant Stage-Isolated Post created');

  // 14. Announcements (إعلانات متعددة المستويات)
  console.log('📢 14. Seeding Announcements & Recipients...');
  const ann1 = await prisma.announcement.create({
    data: {
      authorUserId: generalSec.id,
      title: 'بركة بداية العام الدراسي والخدمي الجديد ومواعيد القداسات الإضافية',
      content: 'تحت رعاية نيافة الحبر الجليل، يسر أمانة الخدمة إعلان مواعيد القداسات الإلهية الصباحية يومي الجمعة والأحد، مع تمنياتنا لجميع الخدام والمخدومين بعام روحي ودراسي مبارك.',
      targetScopeType: TargetScopeLevel.ORG_ALL,
      isPinned: true,
      expiresAt: new Date('2026-12-31'),
    },
  });

  const ann2 = await prisma.announcement.create({
    data: {
      authorUserId: sectorSec.id,
      title: 'اجتماع عام لخدام قطاع الشباب (إعدادي - ثانوي - جامعة)',
      content: 'نلتقي بمشيئة الله يوم السبت القادم الساعة 6:30 مساءً بالقاعة الكبرى لمناقشة الخطة المشتركة ومؤتمرات نصف العام.',
      targetScopeType: TargetScopeLevel.SECTOR_ALL,
      targetSectorId: youthSector.id,
      isPinned: false,
      expiresAt: new Date('2026-10-31'),
    },
  });

  const ann3 = await prisma.announcement.create({
    data: {
      authorUserId: stageSec.id,
      title: 'تنبيه عاجل لخدام إعدادي بنين: استلام كشوف الافتقاد الشهرية',
      content: 'نرجو من جميع الخدام مراجعة بطاقات متابعة الحضور والغياب وتسجيل بيانات المخدومين الجدد في دفتر المتابعة الإلكتروني قبل نهاية الأسبوع.',
      targetScopeType: TargetScopeLevel.STAGE_ALL,
      targetStageId: stagePrepBoys.id,
      isPinned: true,
      expiresAt: new Date('2026-10-15'),
    },
  });

  // Add recipients for Peter
  const allAnnouncements = [ann1, ann2, ann3];
  for (const ann of allAnnouncements) {
    await prisma.announcementRecipient.create({
      data: {
        announcementId: ann.id,
        userId: servant.id,
        isRead: false,
      },
    });
  }
  console.log('✅ 3 Tiered Announcements created with recipient linkages');

  // 15. Interactive Poll (استطلاع رأي لخدام إعدادي بنين)
  console.log('📊 15. Seeding Interactive Poll...');
  const poll = await prisma.poll.create({
    data: {
      createdById: stageSec.id,
      stageId: stagePrepBoys.id,
      question: 'ما هو الموعد الأنسب للقاء الخدام التجهيزي الأسبوعي وتحضير الدرس؟',
      allowMultiple: false,
      closesAt: new Date('2026-10-20T23:59:59Z'),
      options: {
        create: [
          { text: 'الجمعة صباحاً بعد القداس مباشرة (10:30 ص)', order: 1 },
          { text: 'السبت مساءً (6:00 م)', order: 2 },
          { text: 'الأحد بعد الاجتماع العام (8:00 م)', order: 3 },
        ],
      },
    },
    include: { options: true },
  });

  // Pre-seed some votes
  if (poll.options.length >= 2) {
    await prisma.pollVote.create({
      data: {
        pollId: poll.id,
        optionId: poll.options[0].id,
        userId: servant.id,
      },
    });
    await prisma.pollVote.create({
      data: {
        pollId: poll.id,
        optionId: poll.options[0].id,
        userId: assistantSec.id,
      },
    });
    await prisma.pollVote.create({
      data: {
        pollId: poll.id,
        optionId: poll.options[1].id,
        userId: stageSec.id,
      },
    });
  }
  console.log('✅ Poll created with pre-cast votes for live charts');

  console.log('\n🎉 Comprehensive Demo Data Seeding Complete!');
  console.log('───────────────────────────────────────────────────');
  console.log('🔑 جاهز لتسجيل الدخول والتجربة:');
  console.log('   خادم (Level 1):      +201000000001 (بيتر عادل)');
  console.log('   مساعد أمين (Level 2): +201000000002 (أ. مارك وحيد)');
  console.log('   أمين مرحلة (Level 3): +201000000003 (د. سامح كمال)');
  console.log('   أمين قطاع (Level 4):  +201000000004 (م. نادر عاطف)');
  console.log('   أمين عام (Level 5):    +201000000005 (أ. مجدي فوزي)');
  console.log('   كلمة المرور الموحدة:   Demo@123');
  console.log('───────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error during demo showcase seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
