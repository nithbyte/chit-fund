import { PrismaClient, Role, ChitType, ChitGroupStatus, MembershipStatus, PaymentMode, PaymentStatus, AuctionStatus } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Durga Chit Fund...');

  // 1. Create or update Durga (Owner)
  const passwordHash = await hash('Durga@Chit2026!');
  const owner = await prisma.user.upsert({
    where: { username: 'durga' },
    update: {
      passwordHash,
      fullName: 'Durga Devi',
      email: 'durga@durgachitfund.com',
      phone: '+919876543210',
      role: Role.OWNER,
      isActive: true,
    },
    create: {
      username: 'durga',
      email: 'durga@durgachitfund.com',
      passwordHash,
      fullName: 'Durga Devi',
      phone: '+919876543210',
      role: Role.OWNER,
      isActive: true,
    },
  });
  console.log(`✅ Owner created: ${owner.fullName} (${owner.username})`);

  // 2. Realistic Customers (representing local shopkeepers, employees, and homemakers)
  const customerData = [
    { customerCode: 'CUST-001', fullName: 'Ramesh Kumar Verma', phone: '9848011223', alternatePhone: '9848011224', address: 'Plot 12, Main Bazar, Guntur', notes: 'Kirana Store owner. Regular cash payer.' },
    { customerCode: 'CUST-002', fullName: 'Lakshmi Narayana Rao', phone: '9848022334', alternatePhone: null, address: 'H.No 4-51, Market Road, Vijayawada', notes: 'Prefers PhonePe / UPI transfer on 5th.' },
    { customerCode: 'CUST-003', fullName: 'Sunitha Kumari K', phone: '9848033445', alternatePhone: '9848033446', address: 'Flat 201, Sri Sai Towers, Tenali', notes: 'School teacher, pays via Google Pay.' },
    { customerCode: 'CUST-004', fullName: 'Venkata Satyanarayana M', phone: '9848044556', alternatePhone: null, address: 'Door 8/12, Gandhi Nagar, Guntur', notes: 'Textile merchant. High credit reliability.' },
    { customerCode: 'CUST-005', fullName: 'Anuradha Devi P', phone: '9848055667', alternatePhone: '9848055668', address: 'D.No 2-19, Nehru Road, Guntur', notes: 'Homemaker. Pays cash on collection visit.' },
    { customerCode: 'CUST-006', fullName: 'Suresh Babu G', phone: '9848066778', alternatePhone: null, address: 'Near Bus Stand, Mangalagiri', notes: 'Auto garage owner. Prefers 10th of month.' },
    { customerCode: 'CUST-007', fullName: 'Padmavathi Chenna', phone: '9848077889', alternatePhone: '9848077890', address: '6th Line, Brodipet, Guntur', notes: 'Tailoring boutique owner.' },
    { customerCode: 'CUST-008', fullName: 'Chaitanya Krishna T', phone: '9848088990', alternatePhone: null, address: 'Flat 104, Balaji Enclave, Vijayawada', notes: 'Software engineer working hybrid.' },
    { customerCode: 'CUST-009', fullName: 'Govinda Raju V', phone: '9848099001', alternatePhone: null, address: 'Old Guntur Railway Feeder Road', notes: 'Vegetable wholesale commission agent.' },
    { customerCode: 'CUST-010', fullName: 'Saraswathi Bai M', phone: '9848110112', alternatePhone: '9848110113', address: '1st Cross, Pattabhipuram, Guntur', notes: 'Pays through Son UPI.' },
    { customerCode: 'CUST-011', fullName: 'Nagaraju Reddy B', phone: '9848121223', alternatePhone: null, address: 'Kothapet Main Road, Guntur', notes: 'Hardware shop owner.' },
    { customerCode: 'CUST-012', fullName: 'Bhavani Shankar K', phone: '9848132334', alternatePhone: '9848132335', address: 'Opp Zilla Parishad, Guntur', notes: 'Government employee, NEFT transfer.' },
    { customerCode: 'CUST-013', fullName: 'Sailaja Rani D', phone: '9848143445', alternatePhone: null, address: 'Ring Road, Near Flyover, Guntur', notes: 'Beauty parlour owner.' },
    { customerCode: 'CUST-014', fullName: 'Prasad Rao Y', phone: '9848154556', alternatePhone: null, address: 'Station Road, Tenali', notes: 'Dairy business owner.' },
    { customerCode: 'CUST-015', fullName: 'Kavitha Madhavi N', phone: '9848165667', alternatePhone: '9848165668', address: 'Chandramouli Nagar, Guntur', notes: 'Private tutor.' },
  ];

  const customers = [];
  for (const c of customerData) {
    const cust = await prisma.customer.upsert({
      where: { customerCode: c.customerCode },
      update: {
        fullName: c.fullName,
        phone: c.phone,
        alternatePhone: c.alternatePhone,
        address: c.address,
        notes: c.notes,
        identityProofType: 'Aadhaar Card',
        identityProofNumber: `XXXX-XXXX-${c.phone.slice(-4)}`,
        isActive: true,
      },
      create: {
        customerCode: c.customerCode,
        fullName: c.fullName,
        phone: c.phone,
        alternatePhone: c.alternatePhone,
        address: c.address,
        notes: c.notes,
        identityProofType: 'Aadhaar Card',
        identityProofNumber: `XXXX-XXXX-${c.phone.slice(-4)}`,
        isActive: true,
      },
    });
    customers.push(cust);
  }
  console.log(`✅ Seeded ${customers.length} realistic customers`);

  // 3. Chit Groups: Both Auction-based and Fixed-Installment
  const group1 = await prisma.chitGroup.upsert({
    where: { groupCode: 'CF-100K-20M-A' },
    update: {},
    create: {
      groupCode: 'CF-100K-20M-A',
      name: '₹1 Lakh 20-Month Auction Chit (Batch A)',
      chitType: ChitType.AUCTION_BASED,
      totalValue: 100000.00,
      monthlyContribution: 5000.00,
      totalMonths: 20,
      currentMonth: 3,
      startDate: new Date('2026-08-10T00:00:00.000Z'),
      expectedEndDate: new Date('2028-03-10T00:00:00.000Z'),
      foremanCommissionRate: 5.00,
      minBidDiscount: 5000.00,
      maxBidDiscount: 35000.00,
      auctionFrequency: 'MONTHLY',
      auctionDayOfMonth: 10,
      status: ChitGroupStatus.ACTIVE,
      notes: 'Active monthly auction chit. Foreman commission 5% (₹5,000).',
    },
  });

  const group2 = await prisma.chitGroup.upsert({
    where: { groupCode: 'CF-200K-20M-B' },
    update: {},
    create: {
      groupCode: 'CF-200K-20M-B',
      name: '₹2 Lakh 20-Month Auction Chit (Batch B)',
      chitType: ChitType.AUCTION_BASED,
      totalValue: 200000.00,
      monthlyContribution: 10000.00,
      totalMonths: 20,
      currentMonth: 1,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      expectedEndDate: new Date('2028-05-01T00:00:00.000Z'),
      foremanCommissionRate: 5.00,
      minBidDiscount: 10000.00,
      maxBidDiscount: 60000.00,
      auctionFrequency: 'MONTHLY',
      auctionDayOfMonth: 5,
      status: ChitGroupStatus.ACTIVE,
      notes: 'New 2 Lakh group started this month.',
    },
  });

  const group3 = await prisma.chitGroup.upsert({
    where: { groupCode: 'CF-50K-10M-FIXED' },
    update: {},
    create: {
      groupCode: 'CF-50K-10M-FIXED',
      name: '₹50,000 10-Month Fixed Savings Chit',
      chitType: ChitType.FIXED_INSTALLMENT,
      totalValue: 50000.00,
      monthlyContribution: 5000.00,
      totalMonths: 10,
      currentMonth: 4,
      startDate: new Date('2026-07-15T00:00:00.000Z'),
      expectedEndDate: new Date('2027-04-15T00:00:00.000Z'),
      foremanCommissionRate: 4.00,
      auctionFrequency: 'MONTHLY',
      auctionDayOfMonth: 15,
      status: ChitGroupStatus.ACTIVE,
      notes: 'Fixed installment group with predetermined draw sequence.',
    },
  });

  console.log('✅ Seeded 3 Chit Groups (Auction & Fixed types)');

  // 4. Enroll Memberships in Group 1 (10 members)
  const membershipsG1 = [];
  for (let i = 0; i < 10; i++) {
    const cust = customers[i];
    const mem = await prisma.membership.upsert({
      where: {
        chitGroupId_ticketNumber: {
          chitGroupId: group1.id,
          ticketNumber: i + 1,
        },
      },
      update: {},
      create: {
        chitGroupId: group1.id,
        customerId: cust.id,
        ticketNumber: i + 1,
        joinedDate: new Date('2026-08-01T00:00:00.000Z'),
        isPrized: i === 1, // Customer 2 won month 2 auction
        prizedMonth: i === 1 ? 2 : null,
        prizeAmount: i === 1 ? 78000.00 : null,
        status: MembershipStatus.ACTIVE,
      },
    });
    membershipsG1.push(mem);
  }

  // 5. Generate Installments for Group 1 (Month 1, 2, 3)
  // Month 1 (Foreman month - no dividend)
  const inst1 = await prisma.installment.upsert({
    where: {
      chitGroupId_monthNumber: {
        chitGroupId: group1.id,
        monthNumber: 1,
      },
    },
    update: {},
    create: {
      chitGroupId: group1.id,
      monthNumber: 1,
      dueDate: new Date('2026-08-10T00:00:00.000Z'),
      baseAmount: 5000.00,
      dividendPerTicket: 0.00,
      payableAmount: 5000.00,
      notes: '1st Month: Foreman installment without dividend.',
    },
  });

  // Month 2 Auction: Winner bid 22,000 discount. Commission = 5,000. Dividend = 17,000 / 10 = 1,700 per ticket.
  const auctionMonth2 = await prisma.auction.upsert({
    where: {
      chitGroupId_monthNumber: {
        chitGroupId: group1.id,
        monthNumber: 2,
      },
    },
    update: {},
    create: {
      chitGroupId: group1.id,
      monthNumber: 2,
      auctionDate: new Date('2026-09-10T11:00:00.000Z'),
      winningBidAmount: 22000.00,
      foremanCommission: 5000.00,
      dividendTotal: 17000.00,
      dividendPerMember: 1700.00,
      winningMembershipId: membershipsG1[1].id,
      netPrizeAmount: 78000.00,
      status: AuctionStatus.COMPLETED,
      notes: 'Won by ticket 2 (Lakshmi Narayana Rao) with bid ₹22,000.',
    },
  });

  const inst2 = await prisma.installment.upsert({
    where: {
      chitGroupId_monthNumber: {
        chitGroupId: group1.id,
        monthNumber: 2,
      },
    },
    update: {},
    create: {
      chitGroupId: group1.id,
      monthNumber: 2,
      dueDate: new Date('2026-09-10T00:00:00.000Z'),
      baseAmount: 5000.00,
      dividendPerTicket: 1700.00,
      payableAmount: 3300.00,
      auctionId: auctionMonth2.id,
      notes: 'Month 2: Dividend ₹1,700 passed to all members. Payable: ₹3,300.',
    },
  });

  // Month 3 Installment (Current Month)
  const inst3 = await prisma.installment.upsert({
    where: {
      chitGroupId_monthNumber: {
        chitGroupId: group1.id,
        monthNumber: 3,
      },
    },
    update: {},
    create: {
      chitGroupId: group1.id,
      monthNumber: 3,
      dueDate: new Date('2026-10-10T00:00:00.000Z'),
      baseAmount: 5000.00,
      dividendPerTicket: 1200.00,
      payableAmount: 3800.00,
      notes: 'Month 3: Current installment due.',
    },
  });

  console.log('✅ Seeded Installments and Auction Record');

  // 6. Record Historical Manual Collections (Cash, UPI, Bank Transfer) with Payment Allocations
  // Payment 1: Ramesh Kumar Verma pays Month 1 & Month 2 in Cash (₹5000 + ₹3300 = ₹8300)
  const payment1 = await prisma.payment.upsert({
    where: { receiptNumber: 'REC-202609-0001' },
    update: {},
    create: {
      receiptNumber: 'REC-202609-0001',
      customerId: customers[0].id,
      amount: 8300.00,
      paymentDate: new Date('2026-09-12T10:30:00.000Z'),
      paymentMode: PaymentMode.CASH,
      notes: 'Cash received at shop for Month 1 and Month 2.',
      receivedById: owner.id,
      status: PaymentStatus.COMPLETED,
      isReversed: false,
    },
  });

  await prisma.paymentAllocation.upsert({
    where: {
      paymentId_installmentId_membershipId: {
        paymentId: payment1.id,
        installmentId: inst1.id,
        membershipId: membershipsG1[0].id,
      },
    },
    update: {},
    create: {
      paymentId: payment1.id,
      installmentId: inst1.id,
      membershipId: membershipsG1[0].id,
      allocatedAmount: 5000.00,
      notes: 'Month 1 Full Payment',
    },
  });

  await prisma.paymentAllocation.upsert({
    where: {
      paymentId_installmentId_membershipId: {
        paymentId: payment1.id,
        installmentId: inst2.id,
        membershipId: membershipsG1[0].id,
      },
    },
    update: {},
    create: {
      paymentId: payment1.id,
      installmentId: inst2.id,
      membershipId: membershipsG1[0].id,
      allocatedAmount: 3300.00,
      notes: 'Month 2 Full Payment',
    },
  });

  // Payment 2: Sunitha Kumari pays via UPI (PhonePe) for Month 1
  const payment2 = await prisma.payment.upsert({
    where: { receiptNumber: 'REC-202608-0002' },
    update: {},
    create: {
      receiptNumber: 'REC-202608-0002',
      customerId: customers[2].id,
      amount: 5000.00,
      paymentDate: new Date('2026-08-09T16:45:00.000Z'),
      paymentMode: PaymentMode.UPI,
      transactionRef: 'UPI2026080948921132',
      notes: 'UPI payment received via PhonePe.',
      receivedById: owner.id,
      status: PaymentStatus.COMPLETED,
      isReversed: false,
    },
  });

  await prisma.paymentAllocation.upsert({
    where: {
      paymentId_installmentId_membershipId: {
        paymentId: payment2.id,
        installmentId: inst1.id,
        membershipId: membershipsG1[2].id,
      },
    },
    update: {},
    create: {
      paymentId: payment2.id,
      installmentId: inst1.id,
      membershipId: membershipsG1[2].id,
      allocatedAmount: 5000.00,
      notes: 'Month 1 Installment',
    },
  });

  // Payment 3: Partial payment demonstration - Venkata Satyanarayana pays ₹3,000 of ₹5,000 for Month 1
  const payment3 = await prisma.payment.upsert({
    where: { receiptNumber: 'REC-202608-0003' },
    update: {},
    create: {
      receiptNumber: 'REC-202608-0003',
      customerId: customers[3].id,
      amount: 3000.00,
      paymentDate: new Date('2026-08-11T12:00:00.000Z'),
      paymentMode: PaymentMode.CASH,
      notes: 'Partial payment received. Remaining ₹2,000 promised next week.',
      receivedById: owner.id,
      status: PaymentStatus.COMPLETED,
      isReversed: false,
    },
  });

  await prisma.paymentAllocation.upsert({
    where: {
      paymentId_installmentId_membershipId: {
        paymentId: payment3.id,
        installmentId: inst1.id,
        membershipId: membershipsG1[3].id,
      },
    },
    update: {},
    create: {
      paymentId: payment3.id,
      installmentId: inst1.id,
      membershipId: membershipsG1[3].id,
      allocatedAmount: 3000.00,
      notes: 'Month 1 Partial Payment (₹2,000 pending)',
    },
  });

  // 7. Audit Log Entry
  await prisma.auditLog.create({
    data: {
      entityType: 'PAYMENT',
      entityId: payment1.id,
      action: 'COLLECTION_RECORDED',
      performedById: owner.id,
      metadata: {
        receiptNumber: payment1.receiptNumber,
        amount: 8300.00,
        mode: 'CASH',
        customerName: 'Ramesh Kumar Verma',
      },
    },
  });

  // 8. Default System Settings
  const defaultSettings = [
    { key: 'company_name', value: 'Durga Chit Fund', description: 'Business display title on receipts and dashboard' },
    { key: 'company_address', value: 'Plot 12, Main Bazar, Guntur, AP - 522001', description: 'Office and collection counter address' },
    { key: 'company_phone', value: '+91 98480 11223', description: 'Proprietor phone for customer inquiries' },
    { key: 'company_proprietor', value: 'Durga Devi', description: 'Authorized foreman and owner signature' },
    { key: 'business_timezone', value: 'Asia/Kolkata', description: 'Official transaction timezone' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }

  console.log('✅ Seeded Payments, Multi-Installment & Partial Allocations, Audit Log, and Settings');
  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
