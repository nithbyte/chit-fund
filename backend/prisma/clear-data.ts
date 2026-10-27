import { PrismaClient, Role } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const isLive = process.argv.includes('--live') || process.env.NODE_ENV === 'production';
const liveUrl = 'postgresql://postgres.muegzetqfloifrewnfod:Chitfund%40durga@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const prisma = new PrismaClient(
  isLive
    ? { datasources: { db: { url: liveUrl } } }
    : undefined
);

async function main() {
  console.log('🧹 Clearing all operational data from Durga Chit Fund database...');

  // 1. Delete in reverse dependency order
  const delAllocations = await prisma.paymentAllocation.deleteMany();
  console.log(`Deleted ${delAllocations.count} payment allocations`);

  const delPayments = await prisma.payment.deleteMany();
  console.log(`Deleted ${delPayments.count} payments`);

  const delPayouts = await prisma.payout.deleteMany();
  console.log(`Deleted ${delPayouts.count} payouts`);

  const delInstallments = await prisma.installment.deleteMany();
  console.log(`Deleted ${delInstallments.count} installments`);

  const delAuctions = await prisma.auction.deleteMany();
  console.log(`Deleted ${delAuctions.count} auctions`);

  const delMemberships = await prisma.membership.deleteMany();
  console.log(`Deleted ${delMemberships.count} memberships`);

  const delChitGroups = await prisma.chitGroup.deleteMany();
  console.log(`Deleted ${delChitGroups.count} chit groups`);

  const delCustomers = await prisma.customer.deleteMany();
  console.log(`Deleted ${delCustomers.count} customers`);

  const delExpenses = await prisma.expense.deleteMany();
  console.log(`Deleted ${delExpenses.count} expenses`);

  const delReconciliations = await prisma.dailyReconciliation.deleteMany();
  console.log(`Deleted ${delReconciliations.count} reconciliations`);

  const delImportBatches = await prisma.importBatch.deleteMany();
  console.log(`Deleted ${delImportBatches.count} import batches`);

  const delAuditLogs = await prisma.auditLog.deleteMany();
  console.log(`Deleted ${delAuditLogs.count} audit logs`);

  // 2. Ensure Durga owner user exists and is active
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

  console.log(`✅ System owner account verified: ${owner.fullName} (${owner.username})`);

  // 3. Default System Settings
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
  console.log('✅ Default system settings verified.');

  console.log('🎉 All operational data cleared successfully. System is completely fresh and ready for manual data entry!');
}

main()
  .catch((e) => {
    console.error('❌ Error clearing data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
