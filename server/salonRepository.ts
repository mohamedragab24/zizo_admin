import { and, desc, eq } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { bookings, customers, discounts, salonSettings, services, type BookingServiceSnapshot, type SalonWorkDay } from "../drizzle/schema";
import { getDb } from "./db";

export type AdminSalonSnapshot = {
  services: { id: string; name: string; description: string; price: number; duration: number; active: boolean; icon: string }[];
  bookings: { id: string; name: string; phone: string; date: string; time: string; serviceIds: string[]; status: "مؤكد" | "مكتمل" | "ملغي"; discountCode: string; discountAmount: number; createdAt: string }[];
  customers: { id: string; name: string; phone: string; visits: number; blocked: boolean }[];
  discounts: { id: string; code: string; kind: "percent" | "fixed"; value: number; active: boolean; uses: number }[];
  settings: { shopOpen: boolean; hours: SalonWorkDay[] };
};

export const defaultWorkDays: SalonWorkDay[] = [
  { day: "السبت", enabled: true, start: "10:00", end: "23:00" },
  { day: "الأحد", enabled: true, start: "10:00", end: "23:00" },
  { day: "الاثنين", enabled: true, start: "10:00", end: "23:00" },
  { day: "الثلاثاء", enabled: true, start: "10:00", end: "23:00" },
  { day: "الأربعاء", enabled: true, start: "10:00", end: "23:00" },
  { day: "الخميس", enabled: true, start: "10:00", end: "23:00" },
  { day: "الجمعة", enabled: false, start: "10:00", end: "23:00" },
];

function bookingTimeMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*([صم])$/u.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]) % 12 + (match[3] === "م" ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

async function ensureInitialized() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select({ id: services.id }).from(services).limit(1);
  if (existing.length === 0) {
    const samples = [
      { id: "svc-cut", name: "قص شعر", description: "قصة مرتبة تناسب إطلالتك", price: 150, duration: 30, active: true, icon: "cut" },
      { id: "svc-beard", name: "تهذيب لحية", description: "تحديد وتشذيب باحتراف", price: 100, duration: 20, active: true, icon: "beard" },
      { id: "svc-combo", name: "قص شعر ولحية", description: "إطلالة متكاملة في جلسة واحدة", price: 220, duration: 45, active: true, icon: "combo" },
      { id: "svc-care", name: "عناية بالبشرة", description: "تنظيف وانتعاش بعد الحلاقة", price: 180, duration: 35, active: true, icon: "care" },
    ];
    try {
      await db.insert(services).values(samples);
    } catch (error) {
      if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    }
  }
  const settings = await db.select({ id: salonSettings.id }).from(salonSettings).where(eq(salonSettings.id, "main")).limit(1);
  if (settings.length === 0) {
    try {
      await db.insert(salonSettings).values({ id: "main", country: "EG", currency: "EGP", shopOpen: true, hours: defaultWorkDays });
    } catch (error) {
      if ((error as { code?: string }).code !== "ER_DUP_ENTRY") throw error;
    }
  }
  return db;
}

export async function getSalonSnapshot(): Promise<AdminSalonSnapshot> {
  const db = await ensureInitialized();
  const [serviceRows, bookingRows, customerRows, discountRows, settingsRows] = await Promise.all([
    db.select().from(services),
    db.select().from(bookings).orderBy(desc(bookings.createdAt)),
    db.select().from(customers),
    db.select().from(discounts),
    db.select().from(salonSettings).where(eq(salonSettings.id, "main")).limit(1),
  ]);
  const settings = settingsRows[0];
  return {
    services: serviceRows.map((row) => ({ ...row, price: Number(row.price), duration: Number(row.duration), active: Boolean(row.active) })),
    bookings: bookingRows.map((row) => ({ id: row.bookingCode, name: row.customerName, phone: row.phone, date: row.date, time: row.time, serviceIds: (row.serviceItems ?? []).map((item) => item.id), status: row.status, discountCode: row.discountCode, discountAmount: Number(row.discountAmount), createdAt: row.createdAt.toISOString().slice(0, 10) })),
    customers: customerRows.map((row) => ({ ...row, visits: Number(row.visits), blocked: Boolean(row.blocked) })),
    discounts: discountRows.map((row) => ({ ...row, value: Number(row.value), active: Boolean(row.active), uses: Number(row.uses) })),
    settings: { shopOpen: Boolean(settings?.shopOpen ?? true), hours: settings?.hours ?? defaultWorkDays },
  };
}

export async function saveSalonSnapshot(snapshot: AdminSalonSnapshot) {
  const db = await ensureInitialized();
  for (const item of snapshot.services) {
    await db.insert(services).values({ id: item.id, name: item.name.slice(0, 120), description: item.description, price: Math.max(0, Math.round(item.price)), duration: Math.max(5, Math.round(item.duration)), active: item.active, icon: item.icon.slice(0, 24) }).onDuplicateKeyUpdate({ set: { name: item.name.slice(0, 120), description: item.description, price: Math.max(0, Math.round(item.price)), duration: Math.max(5, Math.round(item.duration)), active: item.active, icon: item.icon.slice(0, 24) } });
  }
  for (const item of snapshot.customers) {
    await db.insert(customers).values({ id: item.id, name: item.name.slice(0, 160), phone: item.phone.slice(0, 32), visits: Math.max(0, Math.round(item.visits)), blocked: item.blocked }).onDuplicateKeyUpdate({ set: { name: item.name.slice(0, 160), visits: Math.max(0, Math.round(item.visits)), blocked: item.blocked } });
  }
  for (const item of snapshot.discounts) {
    await db.insert(discounts).values({ id: item.id, code: item.code.toUpperCase().slice(0, 40), kind: item.kind, value: Math.max(1, Math.round(item.value)), active: item.active, uses: Math.max(0, Math.round(item.uses)) }).onDuplicateKeyUpdate({ set: { code: item.code.toUpperCase().slice(0, 40), kind: item.kind, value: Math.max(1, Math.round(item.value)), active: item.active, uses: Math.max(0, Math.round(item.uses)) } });
  }
  for (const item of snapshot.bookings) {
    await db.update(bookings).set({ status: item.status }).where(eq(bookings.bookingCode, item.id));
  }
  const safeHours = snapshot.settings.hours.map((day) => ({ day: String(day.day).slice(0, 20), enabled: Boolean(day.enabled), start: String(day.start).slice(0, 5), end: String(day.end).slice(0, 5) }));
  await db.insert(salonSettings).values({ id: "main", country: "EG", currency: "EGP", shopOpen: Boolean(snapshot.settings.shopOpen), hours: safeHours }).onDuplicateKeyUpdate({ set: { country: "EG", currency: "EGP", shopOpen: Boolean(snapshot.settings.shopOpen), hours: safeHours } });
  return getSalonSnapshot();
}

export async function createSalonBooking(input: { name: string; phone: string; date: string; time: string; serviceIds: string[]; discountCode?: string }) {
  const db = await ensureInitialized();
  const normalizedPhone = input.phone.replace(/[\s()-]/g, "");
  const existingCustomer = await db.select().from(customers).where(eq(customers.phone, normalizedPhone)).limit(1);
  if (existingCustomer[0]?.blocked) return { ok: false as const, status: 403, message: "لا يمكن إتمام الحجز، تواصل مع الصالون للمساعدة." };

  const requested = Array.from(new Set(input.serviceIds)).slice(0, 8);
  const serviceRows = await db.select().from(services);
  const selected = serviceRows.filter((service) => requested.includes(service.id) && service.active);
  if (selected.length === 0 || selected.length !== requested.length) return { ok: false as const, status: 400, message: "اختار خدمة متاحة واحدة على الأقل." };
  const serviceItems: BookingServiceSnapshot[] = selected.map((service) => ({ id: service.id, name: service.name, price: Number(service.price), duration: Number(service.duration) }));
  const subtotal = serviceItems.reduce((total, item) => total + item.price, 0);

  let discountCode = "";
  let discountAmount = 0;
  const code = (input.discountCode ?? "").trim().toUpperCase();
  if (code) {
    const match = await db.select().from(discounts).where(eq(discounts.code, code)).limit(1);
    if (!match[0]?.active) return { ok: false as const, status: 400, message: "كود الخصم غير صالح أو غير مفعّل." };
    discountCode = match[0].code;
    discountAmount = Math.min(subtotal, match[0].kind === "percent" ? Math.round(subtotal * match[0].value / 100) : match[0].value);
    await db.update(discounts).set({ uses: match[0].uses + 1 }).where(eq(discounts.id, match[0].id));
  }

  const name = input.name.trim().slice(0, 160);
  if (existingCustomer[0]) {
    await db.update(customers).set({ name, visits: existingCustomer[0].visits + 1 }).where(eq(customers.phone, normalizedPhone));
  } else {
    await db.insert(customers).values({ id: `cus-${randomUUID()}`, name, phone: normalizedPhone, visits: 1, blocked: false });
  }

  const aheadRows = await db.select({ time: bookings.time }).from(bookings).where(and(eq(bookings.date, input.date), eq(bookings.status, "مؤكد")));
  const requestedMinutes = bookingTimeMinutes(input.time);
  const queueAhead = aheadRows.filter((row) => {
    const existingMinutes = bookingTimeMinutes(row.time);
    return existingMinutes === null || requestedMinutes === null || existingMinutes <= requestedMinutes;
  }).length;
  const bookingCode = `#${randomBytes(4).toString("hex").toUpperCase()}`;
  const bookingId = `bk-${randomUUID()}`;
  await db.insert(bookings).values({ id: bookingId, bookingCode, customerName: name, phone: normalizedPhone, date: input.date, time: input.time, serviceItems, status: "مؤكد", discountCode, discountAmount, queueAhead });
  return { ok: true as const, booking: { id: bookingId, bookingCode, name, phone: normalizedPhone, date: input.date, time: input.time, serviceItems, status: "مؤكد" as const, discountCode, discountAmount, queueAhead, total: Math.max(0, subtotal - discountAmount) } };
}

export async function getPublicSalonInfo() {
  const db = await ensureInitialized();
  const [serviceRows, settingsRows] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)),
    db.select().from(salonSettings).where(eq(salonSettings.id, "main")).limit(1),
  ]);
  return { country: "EG", currency: "EGP", shopOpen: Boolean(settingsRows[0]?.shopOpen ?? true), services: serviceRows.map((item) => ({ id: item.id, name: item.name, description: item.description, price: Number(item.price), duration: Number(item.duration), active: Boolean(item.active), icon: item.icon })) };
}

export async function validateSalonDiscount(input: { serviceIds: string[]; code: string }) {
  const db = await ensureInitialized();
  const code = input.code.trim().toUpperCase();
  const [discountRows, serviceRows] = await Promise.all([
    db.select().from(discounts).where(eq(discounts.code, code)).limit(1),
    db.select().from(services),
  ]);
  const discount = discountRows[0];
  if (!discount?.active) return { ok: false as const, message: "كود الخصم غير صالح أو غير مفعّل." };
  const selected = serviceRows.filter((service) => input.serviceIds.includes(service.id) && service.active);
  if (!selected.length || selected.length !== new Set(input.serviceIds).size) return { ok: false as const, message: "اختار خدمات متاحة أولاً." };
  const subtotal = selected.reduce((sum, service) => sum + Number(service.price), 0);
  const amount = Math.min(subtotal, discount.kind === "percent" ? Math.round(subtotal * discount.value / 100) : discount.value);
  return { ok: true as const, code: discount.code, amount, total: Math.max(0, subtotal - amount) };
}
