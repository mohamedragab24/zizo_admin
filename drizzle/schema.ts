import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Manus identities used for project/admin access. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const services = mysqlTable("salon_services", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  price: int("price").notNull(),
  duration: int("duration").notNull(),
  active: boolean("active").default(true).notNull(),
  icon: varchar("icon", { length: 24 }).default("cut").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SalonService = typeof services.$inferSelect;

export const customers = mysqlTable("salon_customers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  visits: int("visits").default(0).notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SalonCustomer = typeof customers.$inferSelect;

export const discounts = mysqlTable("salon_discounts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  kind: mysqlEnum("kind", ["percent", "fixed"]).notNull(),
  value: int("value").notNull(),
  active: boolean("active").default(true).notNull(),
  uses: int("uses").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SalonDiscount = typeof discounts.$inferSelect;

export type BookingServiceSnapshot = { id: string; name: string; price: number; duration: number };
export const bookings = mysqlTable("salon_bookings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  bookingCode: varchar("bookingCode", { length: 24 }).notNull().unique(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  date: varchar("bookingDate", { length: 10 }).notNull(),
  time: varchar("bookingTime", { length: 20 }).notNull(),
  serviceItems: json("serviceItems").$type<BookingServiceSnapshot[]>().notNull(),
  status: mysqlEnum("status", ["مؤكد", "مكتمل", "ملغي"]).default("مؤكد").notNull(),
  discountCode: varchar("discountCode", { length: 40 }).default("").notNull(),
  discountAmount: int("discountAmount").default(0).notNull(),
  queueAhead: int("queueAhead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SalonBooking = typeof bookings.$inferSelect;

export type SalonWorkDay = { day: string; enabled: boolean; start: string; end: string };
export const salonSettings = mysqlTable("salon_settings", {
  id: varchar("id", { length: 40 }).primaryKey(),
  firstAdminOpenId: varchar("firstAdminOpenId", { length: 64 }),
  country: varchar("country", { length: 2 }).default("EG").notNull(),
  currency: varchar("currency", { length: 3 }).default("EGP").notNull(),
  shopOpen: boolean("shopOpen").default(true).notNull(),
  hours: json("hours").$type<SalonWorkDay[]>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SalonSettings = typeof salonSettings.$inferSelect;
