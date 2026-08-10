-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "storeName" TEXT NOT NULL DEFAULT 'Olma Market',
    "contactPhone" TEXT NOT NULL DEFAULT '+998 71 200 00 00',
    "contactEmail" TEXT NOT NULL DEFAULT 'info@olmamarket.uz',
    "deliveryFee" INTEGER NOT NULL DEFAULT 15000,
    "telegramUrl" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);
