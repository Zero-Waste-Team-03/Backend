import dataSource from 'src/infrastructure/db/data-source';
import {
  Category,
  CategorySensitivityValues,
} from 'src/core/category/entities/category.entity';

type SeedCategory = {
  name: string;
  sensitivity: Category['sensitivity'];
};

const CATEGORIES_TO_SEED: SeedCategory[] = [
  { name: 'Bakery', sensitivity: CategorySensitivityValues.LOW },
  { name: 'Cooked Meals', sensitivity: CategorySensitivityValues.HIGH },
  { name: 'Dairy', sensitivity: CategorySensitivityValues.HIGH },
  {
    name: 'Fruits & Vegetables',
    sensitivity: CategorySensitivityValues.MEDIUM,
  },
  { name: 'Dry Goods', sensitivity: CategorySensitivityValues.LOW },
  { name: 'Beverages', sensitivity: CategorySensitivityValues.LOW },
];

async function upsertCategory(seed: SeedCategory): Promise<void> {
  const categoryRepo = dataSource.getRepository(Category);

  const existing = await categoryRepo.findOne({
    where: { name: seed.name },
  });

  if (existing) {
    categoryRepo.merge(existing, { sensitivity: seed.sensitivity });
    await categoryRepo.save(existing);
    return;
  }

  const category = categoryRepo.create(seed);
  await categoryRepo.save(category);
}

async function seedCategories(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const category of CATEGORIES_TO_SEED) {
      await upsertCategory(category);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedCategories()
  .then(() => {
    process.stdout.write('Category seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Category seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
