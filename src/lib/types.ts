export type UserRole = 'admin' | 'member';

export const USER_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },  // כחול
  { bg: '#fce7f3', text: '#be185d', dot: '#ec4899' },  // ורוד
  { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },  // ירוק
  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },  // כתום
  { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },  // סגול
  { bg: '#fecaca', text: '#991b1b', dot: '#ef4444' },  // אדום
  { bg: '#ccfbf1', text: '#134e4a', dot: '#14b8a6' },  // טורקיז
  { bg: '#f3e8ff', text: '#6b21a8', dot: '#a855f7' },  // סגול בהיר
  { bg: '#fed7aa', text: '#9a3412', dot: '#f97316' },  // כתום כהה
  { bg: '#cffafe', text: '#155e75', dot: '#06b6d4' },  // תכלת
];

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  color_index: number;
  created_at: string;
  notification_preferences?: {
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
  };
}

export interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  user_id: string | null;
  created_at: string;
}

export interface ShiftWithUser extends Shift {
  user: User | null;
}

export type ViewMode = 'list' | 'week' | 'month';

export function isOvernight(shift: { start_time: string; end_time: string }): boolean {
  return shift.end_time.slice(0, 5) <= shift.start_time.slice(0, 5);
}
