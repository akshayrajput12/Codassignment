import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(), // e.g. KT100193
  orderDatetime: text('order_datetime').notNull(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  orderValue: real('order_value').notNull(),
  items: text('items').notNull(),
  numItems: integer('num_items').notNull(),
  customerPriorOrders: integer('customer_prior_orders').notNull().default(0),
  customerPriorRto: integer('customer_prior_rto').notNull().default(0),
  utmSource: text('utm_source'),
  courier: text('courier'),
  paymentMethod: text('payment_method').notNull().default('COD'),
  createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const outcomes = sqliteTable('outcomes', {
  orderId: text('order_id').primaryKey().references(() => orders.id),
  finalStatus: text('final_status').notNull(), // DELIVERED, RTO, IN_TRANSIT
  knownAt: text('known_at'),
});

export const policies = sqliteTable('policies', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  name: text('name').notNull(),
  configJson: text('config_json').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  action: text('action').notNull(), // SHIP_AS_IS, SHIP_AFTER_CONFIRMATION, NUDGE_TO_PREPAID, HOLD_CANCEL
  workflowState: text('workflow_state').notNull(),
  probability: real('probability').notNull(),
  riskBand: text('risk_band').notNull(), // LOW, MEDIUM, ELEVATED, HIGH
  explanation: text('explanation').notNull(),
  reasonCodesJson: text('reason_codes_json').notNull(),
  evidenceJson: text('evidence_json').notNull(),
  economicsJson: text('economics_json').notNull(),
  policyVersion: text('policy_version').notNull(),
  modelVersion: text('model_version').notNull(),
  assessmentSource: text('assessment_source').notNull().default('heuristic'),
  createdAt: text('created_at').notNull(),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  state: text('state').notNull(), // AWAITING_CONFIRMATION, AWAITING_PREPAID, etc.
  language: text('language').notNull().default('en'), // en, hi, hinglish
  customerPhone: text('customer_phone').notNull(),
  virtualNow: text('virtual_now').notNull(), // Virtual clock time ISO
  outreachSuppressed: integer('outreach_suppressed', { mode: 'boolean' }).notNull().default(false),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  direction: text('direction').notNull(), // OUTBOUND, INBOUND
  body: text('body').notNull(),
  intent: text('intent'),
  createdAt: text('created_at').notNull(),
});

export const quotes = sqliteTable('quotes', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  originalAmount: real('original_amount').notNull(),
  discountAmount: real('discount_amount').notNull(),
  finalAmount: real('final_amount').notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, EXPIRED, PAID, CANCELLED
  token: text('token').notNull(), // Verification token for mock payment callback
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const scheduledJobs = sqliteTable('scheduled_jobs', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  jobType: text('job_type').notNull(), // REMINDER_6H, EXPIRY_24H
  dueAt: text('due_at').notNull(),
  processedAt: text('processed_at'),
  status: text('status').notNull().default('PENDING'), // PENDING, COMPLETED, CANCELLED
  createdAt: text('created_at').notNull(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  payloadJson: text('payload_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const imports = sqliteTable('imports', {
  id: text('id').primaryKey(),
  sourceChecksum: text('source_checksum').notNull(),
  fileLabel: text('file_label').notNull(),
  rawCount: integer('raw_count').notNull(),
  uniqueCount: integer('unique_count').notNull(),
  resolvedCount: integer('resolved_count').notNull(),
  status: text('status').notNull().default('COMPLETED'),
  createdAt: text('created_at').notNull(),
});
