import { PrismaClient, Role, PaymentMethod, DocType, MovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for Shree Ganesh Traders...");

  // 1. System Settings
  console.log("-> Seeding system settings...");
  const settings = [
    { key: "COMPANY_NAME", value: "Shree Ganesh Traders Pvt. Ltd.", description: "Registered business name" },
    { key: "COMPANY_PAN", value: "609876543", description: "Inland Revenue Dept PAN/VAT" },
    { key: "COMPANY_ADDRESS", value: "Kalimati Wholesale Market, Kathmandu, Nepal", description: "Office address" },
    { key: "COMPANY_PHONE", value: "+977-1-4281234, 9851023456", description: "Contact phone numbers" },
    { key: "COMPANY_EMAIL", value: "info@shreeganeshtraders.com.np", description: "Official email" },
    { key: "CURRENCY", value: "NPR", description: "Primary currency code" },
    { key: "FISCAL_YEAR", value: "2081/82", description: "Current Nepal Fiscal Year (BS)" },
    { key: "VAT_RATE", value: "13", description: "Nepal Standard VAT percentage" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 2. Invoice Sequences
  console.log("-> Seeding invoice sequences...");
  const sequences = [
    { docType: DocType.SALE_INVOICE, prefix: "SINV-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
    { docType: DocType.PURCHASE_INVOICE, prefix: "PINV-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
    { docType: DocType.SALE_RETURN, prefix: "SRTN-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
    { docType: DocType.PURCHASE_RETURN, prefix: "PRTN-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
    { docType: DocType.PAYMENT_RECEIVED, prefix: "RCPT-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
    { docType: DocType.PAYMENT_MADE, prefix: "VPAY-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
    { docType: DocType.STOCK_ADJUSTMENT, prefix: "SADJ-2081-", fiscalYear: "2081/82", nextNumber: 1, padding: 6 },
  ];

  for (const seq of sequences) {
    await prisma.invoiceSequence.upsert({
      where: { docType: seq.docType },
      update: { prefix: seq.prefix, fiscalYear: seq.fiscalYear },
      create: seq,
    });
  }

  // 3. Units & Conversions
  console.log("-> Seeding units...");
  const unitsData = [
    { name: "Piece", symbol: "pcs", isBaseUnit: true },
    { name: "Carton", symbol: "ctn", isBaseUnit: false },
    { name: "Box", symbol: "box", isBaseUnit: false },
    { name: "Kilogram", symbol: "kg", isBaseUnit: true },
    { name: "Liter", symbol: "ltr", isBaseUnit: true },
    { name: "Packet", symbol: "pkt", isBaseUnit: true },
    { name: "Dozen", symbol: "dz", isBaseUnit: false },
  ];

  const unitsMap = new Map<string, string>();
  for (const u of unitsData) {
    const unit = await prisma.unit.upsert({
      where: { symbol: u.symbol },
      update: { name: u.name, isBaseUnit: u.isBaseUnit },
      create: u,
    });
    unitsMap.set(u.symbol, unit.id);
  }

  // Global Unit Conversions
  const pcsId = unitsMap.get("pcs")!;
  const ctnId = unitsMap.get("ctn")!;
  const boxId = unitsMap.get("box")!;
  const dzId = unitsMap.get("dz")!;

  const conversions = [
    { fromUnitId: ctnId, toUnitId: pcsId, factor: 24 },
    { fromUnitId: boxId, toUnitId: pcsId, factor: 12 },
    { fromUnitId: dzId, toUnitId: pcsId, factor: 12 },
  ];

  for (const conv of conversions) {
    const existing = await prisma.unitConversion.findFirst({
      where: { fromUnitId: conv.fromUnitId, toUnitId: conv.toUnitId, productId: null },
    });
    if (!existing) {
      await prisma.unitConversion.create({ data: conv });
    }
  }

  // 4. Users (Bcrypt hashed)
  console.log("-> Seeding demo users with secure passwords...");
  const passwordSalt = await bcrypt.genSalt(10);
  const srijanaPassword = await bcrypt.hash("$Tock234", passwordSalt);
  const adminPassword = await bcrypt.hash("Admin@123Password", passwordSalt);
  const managerPassword = await bcrypt.hash("Manager@123Password", passwordSalt);
  const salesPassword = await bcrypt.hash("Sales@123Password", passwordSalt);
  const inventoryPassword = await bcrypt.hash("Inventory@123Password", passwordSalt);

  await prisma.user.upsert({
    where: { email: "srijanashah47@gmail.com" },
    update: { passwordHash: srijanaPassword, role: Role.ADMIN, isActive: true },
    create: {
      name: "Srijana Shah",
      email: "srijanashah47@gmail.com",
      passwordHash: srijanaPassword,
      role: Role.ADMIN,
      phone: "+977-9851000000",
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@shreeganesh.com.np" },
    update: { passwordHash: adminPassword, role: Role.ADMIN },
    create: {
      name: "Bikram Sharma (Proprietor)",
      email: "admin@shreeganesh.com.np",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      phone: "9851011111",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@shreeganesh.com.np" },
    update: { passwordHash: managerPassword, role: Role.MANAGER },
    create: {
      name: "Suman Shrestha (General Manager)",
      email: "manager@shreeganesh.com.np",
      passwordHash: managerPassword,
      role: Role.MANAGER,
      phone: "9851022222",
    },
  });

  await prisma.user.upsert({
    where: { email: "sales@shreeganesh.com.np" },
    update: { passwordHash: salesPassword, role: Role.SALES_STAFF },
    create: {
      name: "Anil Thapa (Sales Executive)",
      email: "sales@shreeganesh.com.np",
      passwordHash: salesPassword,
      role: Role.SALES_STAFF,
      phone: "9851033333",
    },
  });

  await prisma.user.upsert({
    where: { email: "inventory@shreeganesh.com.np" },
    update: { passwordHash: inventoryPassword, role: Role.INVENTORY_STAFF },
    create: {
      name: "Rajesh Maharjan (Warehouse Supervisor)",
      email: "inventory@shreeganesh.com.np",
      passwordHash: inventoryPassword,
      role: Role.INVENTORY_STAFF,
      phone: "9851044444",
    },
  });

  // 5. Categories
  console.log("-> Seeding product categories...");
  const categoriesData = [
    { name: "Food & Groceries", slug: "food-groceries", description: "Rice, pulses, edible oils, spices and staples" },
    { name: "Beverages", slug: "beverages", description: "Juices, energy drinks, tea, coffee and mineral water" },
    { name: "Snacks & Confectionery", slug: "snacks-confectionery", description: "Noodles, biscuits, chocolates and chips" },
    { name: "Personal Care", slug: "personal-care", description: "Soaps, shampoos, toothpaste and cosmetics" },
    { name: "Household & Cleaning", slug: "household-cleaning", description: "Detergents, floor cleaners and dishwash" },
    { name: "Dairy Products", slug: "dairy-products", description: "Butter, cheese, milk powder and ghee" },
  ];

  const categoriesMap = new Map<string, string>();
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
    categoriesMap.set(c.slug, cat.id);
  }

  // 6. Expense Categories
  console.log("-> Seeding expense categories...");
  const expenseCats = [
    { name: "Warehouse & Office Rent", description: "Monthly lease for Kalimati warehouse facility" },
    { name: "Transportation & Freight", description: "Delivery van fuel, driver allowances and vehicle hire" },
    { name: "Staff Refreshments & Lunch", description: "Daily staff tea, snacks, and overtime meal expenses" },
    { name: "Electricity & Utilities", description: "NEA electricity, drinking water, and high-speed internet" },
    { name: "Packaging & Stationery", description: "Cardboard cartons, tape, invoice printing paper and office supplies" },
    { name: "Repairs & Maintenance", description: "Forklift repair, pallet replacement and electrical maintenance" },
  ];

  for (const ec of expenseCats) {
    await prisma.expenseCategory.upsert({
      where: { name: ec.name },
      update: { description: ec.description },
      create: ec,
    });
  }

  // 7. Suppliers
  console.log("-> Seeding suppliers...");
  const suppliersData = [
    {
      name: "Chaudhary Group Foods Pvt. Ltd.",
      companyName: "CG Foods Nepal",
      phone: "+977-1-5542300",
      email: "orders@cgcorpnepal.com",
      panVatNumber: "300123456",
      address: "Sanepa, Lalitpur",
      openingBalance: 125000,
      currentBalance: 125000,
    },
    {
      name: "Dabur Nepal Pvt. Ltd.",
      companyName: "Dabur Nepal",
      phone: "+977-1-4428042",
      email: "distributors@dabur.com.np",
      panVatNumber: "300456789",
      address: "Tinkune, Kathmandu",
      openingBalance: 84000,
      currentBalance: 84000,
    },
    {
      name: "Unilever Nepal Limited",
      companyName: "Unilever Nepal",
      phone: "+977-57-520123",
      email: "customercare@unilever.com.np",
      panVatNumber: "300789123",
      address: "Basamadi, Hetauda",
      openingBalance: 210000,
      currentBalance: 210000,
    },
    {
      name: "Himalayan Beverage Distributors",
      companyName: "Himalayan Beverages",
      phone: "+977-1-5260111",
      email: "sales@himalayanbeverage.com",
      panVatNumber: "601234567",
      address: "Satdobato, Lalitpur",
      openingBalance: 45000,
      currentBalance: 45000,
    },
  ];

  for (const s of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.supplier.create({ data: s });
    }
  }

  // 8. Customers
  console.log("-> Seeding customers...");
  const customersData = [
    {
      name: "Ram Narayan Prasad",
      shopName: "Ram General Store",
      phone: "9841234567",
      email: "ramstore.newroad@gmail.com",
      panVatNumber: "602345678",
      address: "Khichapokhari, New Road, Kathmandu",
      creditLimit: 150000,
      openingBalance: 42500,
      currentBalance: 42500,
    },
    {
      name: "Shyam Sundar Tuladhar",
      shopName: "Shyam Provision Store",
      phone: "9841345678",
      email: "shyam.ason@yahoo.com",
      panVatNumber: "603456789",
      address: "Ason Chowk, Kathmandu",
      creditLimit: 100000,
      openingBalance: 28000,
      currentBalance: 28000,
    },
    {
      name: "Krishna Bahadur KC",
      shopName: "Krishna Mini Mart",
      phone: "9841456789",
      email: "krishnamart.patan@gmail.com",
      panVatNumber: "604567890",
      address: "Kumaripati, Lalitpur",
      creditLimit: 200000,
      openingBalance: 65000,
      currentBalance: 65000,
    },
    {
      name: "Laxmi Maya Shrestha",
      shopName: "Laxmi Departmental Store",
      phone: "9841567890",
      email: "laxmi.koteshwor@gmail.com",
      panVatNumber: "605678901",
      address: "Koteshwor Chowk, Kathmandu",
      creditLimit: 250000,
      openingBalance: 98000,
      currentBalance: 98000,
    },
    {
      name: "Ganesh Gopal Suwal",
      shopName: "Ganesh Kirana Pasal",
      phone: "9841678901",
      panVatNumber: "606789012",
      address: "Suryabinayak, Bhaktapur",
      creditLimit: 80000,
      openingBalance: 15000,
      currentBalance: 15000,
    },
  ];

  for (const c of customersData) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.customer.create({ data: c });
    }
  }

  // 9. Products & Opening Stock
  console.log("-> Seeding products with initial stock...");
  const foodCatId = categoriesMap.get("food-groceries")!;
  const bevCatId = categoriesMap.get("beverages")!;
  const snackCatId = categoriesMap.get("snacks-confectionery")!;
  const persCatId = categoriesMap.get("personal-care")!;
  const houseCatId = categoriesMap.get("household-cleaning")!;
  const dairyCatId = categoriesMap.get("dairy-products")!;

  const productsData = [
    {
      name: "Wai Wai Instant Noodles 75g (Chicken)",
      sku: "WAI-WAI-75G",
      barcode: "8901234001011",
      categoryId: snackCatId,
      baseUnitId: pcsId,
      description: "Nepal's favorite pre-cooked brown noodles pack",
      costPrice: 20.5,
      sellingPrice: 25.0,
      minSellingPrice: 23.0,
      reorderThreshold: 150,
      openingStock: 600,
    },
    {
      name: "Real Mixed Fruit Juice 1L",
      sku: "REAL-MIX-1L",
      barcode: "8901234002022",
      categoryId: bevCatId,
      baseUnitId: pcsId,
      description: "100% natural mixed fruit blend tetra pack",
      costPrice: 245.0,
      sellingPrice: 290.0,
      minSellingPrice: 275.0,
      reorderThreshold: 50,
      openingStock: 240,
    },
    {
      name: "Sunsilk Black Shine Shampoo 350ml",
      sku: "SUNSILK-BLK-350",
      barcode: "8901234003033",
      categoryId: persCatId,
      baseUnitId: pcsId,
      description: "Amla pearl complex hair nourishing shampoo bottle",
      costPrice: 380.0,
      sellingPrice: 445.0,
      minSellingPrice: 420.0,
      reorderThreshold: 30,
      openingStock: 120,
    },
    {
      name: "Surf Excel Easy Wash 1kg",
      sku: "SURF-EASY-1KG",
      barcode: "8901234004044",
      categoryId: houseCatId,
      baseUnitId: pcsId,
      description: "Superior stain removal washing powder pack",
      costPrice: 215.0,
      sellingPrice: 250.0,
      minSellingPrice: 240.0,
      reorderThreshold: 40,
      openingStock: 200,
    },
    {
      name: "Dettol Original Bath Soap 75g",
      sku: "DETTOL-SOAP-75G",
      barcode: "8901234005055",
      categoryId: persCatId,
      baseUnitId: pcsId,
      description: "Antibacterial protection bar soap",
      costPrice: 48.0,
      sellingPrice: 60.0,
      minSellingPrice: 55.0,
      reorderThreshold: 100,
      openingStock: 480,
    },
    {
      name: "Fortune Sunlite Refined Sunflower Oil 1L",
      sku: "FORTUNE-SUN-1L",
      barcode: "8901234006066",
      categoryId: foodCatId,
      baseUnitId: pcsId,
      description: "Enriched with Vitamin A and D edible cooking oil pouch",
      costPrice: 260.0,
      sellingPrice: 295.0,
      minSellingPrice: 285.0,
      reorderThreshold: 60,
      openingStock: 300,
    },
    {
      name: "Amul Pasteurised Butter 500g",
      sku: "AMUL-BTR-500G",
      barcode: "8901234007077",
      categoryId: dairyCatId,
      baseUnitId: pcsId,
      description: "Rich creamy pure milk table butter pack",
      costPrice: 485.0,
      sellingPrice: 540.0,
      minSellingPrice: 520.0,
      reorderThreshold: 25,
      openingStock: 90,
    },
    {
      name: "Colgate Strong Teeth Dental Cream 200g",
      sku: "COLGATE-ST-200G",
      barcode: "8901234008088",
      categoryId: persCatId,
      baseUnitId: pcsId,
      description: "Calcium and fluoride cavity protection toothpaste",
      costPrice: 135.0,
      sellingPrice: 165.0,
      minSellingPrice: 155.0,
      reorderThreshold: 50,
      openingStock: 250,
    },
    {
      name: "Red Bull Energy Drink 250ml",
      sku: "RED-BULL-250ML",
      barcode: "8901234009099",
      categoryId: bevCatId,
      baseUnitId: pcsId,
      description: "Vitalizes body and mind premium energy can",
      costPrice: 175.0,
      sellingPrice: 210.0,
      minSellingPrice: 200.0,
      reorderThreshold: 48,
      openingStock: 192,
    },
    {
      name: "Tokla CTC Pure Leaf Tea 500g",
      sku: "TOKLA-TEA-500G",
      barcode: "8901234010100",
      categoryId: bevCatId,
      baseUnitId: pcsId,
      description: "Jhapa Nepal estate blended strong CTC garden tea",
      costPrice: 220.0,
      sellingPrice: 260.0,
      minSellingPrice: 250.0,
      reorderThreshold: 35,
      openingStock: 160,
    },
  ];

  for (const p of productsData) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          categoryId: p.categoryId,
          baseUnitId: p.baseUnitId,
          description: p.description,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          minSellingPrice: p.minSellingPrice,
          reorderThreshold: p.reorderThreshold,
          currentStock: p.openingStock,
        },
      });

      // Record immutable opening stock ledger movement
      await prisma.stockMovement.create({
        data: {
          productId: created.id,
          movementType: MovementType.OPENING,
          qty: p.openingStock,
          unitCost: p.costPrice,
          runningBalance: p.openingStock,
          runningAvgCost: p.costPrice,
          referenceType: "OPENING",
          referenceDoc: "OPENING-STOCK-2081",
          notes: "Initial inventory migration balance",
          createdById: admin.id,
        },
      });
    }
  }

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
