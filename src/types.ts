import { format } from 'date-fns';

export type Student = {
  id: string;
  name: string;
  phone: string;
  parentName?: string;
  joinDate: string;
  classIds: string[]; // List of class IDs the student is enrolled in
};

export type Class = {
  id: string;
  name: string;
  schedule: string; // e.g., "Thứ 2, Thứ 4 (18:00 - 19:30)"
  feePerSession: number; // default 50000
  startCycleNumber?: number; // Manual start cycle number
};

export type AttendanceStatus = 'present' | 'absent';

export type AttendanceRecord = {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  sessionIndexInCycle: number; // 1 to 8
  cycleId: string; // To group 8 sessions
  cycleNumber?: number;
};

export type Payment = {
  id: string;
  studentId: string;
  classId: string;
  amount: number;
  date: string;
  method: 'cash' | 'transfer';
  cycleId: string;
  note?: string;
};

export type BillingCycle = {
  id: string;
  studentId: string;
  classId: string;
  startDate: string;
  status: 'active' | 'completed';
  sessionsCompleted: number; // 0 to 8
  absencesCount: number;
  isPaid: boolean;
  cycleNumber?: number;
};
