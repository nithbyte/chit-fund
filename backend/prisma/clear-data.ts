import { PrismaClient, Role } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

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
