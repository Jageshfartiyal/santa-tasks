import bcrypt from 'bcryptjs';
import { PrismaClient, type Priority, type TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();
const RANK = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

type SeedTask = [title: string, status: TaskStatus, priority: Priority, dueOffset: number | null];

const projects: { name: string; description: string; status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; tasks: SeedTask[] }[] = [
  {
    name: 'Website Redesign',
    description: 'Refresh the marketing site with the new brand.',
    status: 'ACTIVE',
    tasks: [
      ['Collect brand assets', 'DONE', 'MEDIUM', -10],
      ['Wireframe landing page', 'DONE', 'HIGH', -6],
      ['Build hero section', 'IN_PROGRESS', 'HIGH', 2],
      ['Write case study copy', 'TODO', 'LOW', 9],
      ['Fix broken footer links', 'TODO', 'MEDIUM', -2],
      ['Run accessibility audit', 'TODO', 'HIGH', 14],
    ],
  },
  {
    name: 'Mobile App Launch',
    description: 'Ship v1 to both app stores.',
    status: 'ACTIVE',
    tasks: [
      ['Finalize onboarding flow', 'IN_PROGRESS', 'HIGH', 3],
      ['Prepare store screenshots', 'TODO', 'MEDIUM', 7],
      ['Set up crash reporting', 'DONE', 'MEDIUM', -4],
      ['Beta tester outreach', 'TODO', 'LOW', null],
    ],
  },
  {
    name: 'Q3 Planning',
    description: 'Roadmap and OKRs for next quarter.',
    status: 'COMPLETED',
    tasks: [
      ['Draft OKRs', 'DONE', 'HIGH', -30],
      ['Review with leadership', 'DONE', 'MEDIUM', -25],
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Demo1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@santa.dev' },
    update: { passwordHash, name: 'Demo User' },
    create: { email: 'demo@santa.dev', name: 'Demo User', passwordHash },
  });

  // Idempotent: rebuild the demo user's data on every run.
  await prisma.project.deleteMany({ where: { userId: user.id } });
  for (const p of projects) {
    await prisma.project.create({
      data: {
        userId: user.id,
        name: p.name,
        description: p.description,
        status: p.status,
        tasks: {
          create: p.tasks.map(([title, status, priority, due]) => ({
            title,
            status,
            priority,
            priorityRank: RANK[priority],
            dueDate: due === null ? null : day(due),
          })),
        },
      },
    });
  }
  console.log('Seeded demo user: demo@santa.dev / Demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
