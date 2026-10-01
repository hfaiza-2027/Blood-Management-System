import type { ID } from "./common";

export type NotificationKind =
  | "emergency_nearby"
  | "appointment_reminder"
  | "request_accepted"
  | "donor_responded"
  | "request_fulfilled"
  | "account_verified"
  | "announcement";

export interface Notification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}
