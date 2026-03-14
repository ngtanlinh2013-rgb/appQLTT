/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Wallet, 
  BarChart3, 
  Plus, 
  Search, 
  ChevronRight, 
  QrCode, 
  Download,
  Trash2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableCell, 
  TableRow, 
  WidthType, 
  AlignmentType, 
  TextRun,
  Header,
  Footer,
  BorderStyle
} from 'docx';
import { saveAs } from 'file-saver';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Student, Class, AttendanceRecord, Payment, BillingCycle, AttendanceStatus } from './types';
import { cn, formatCurrency, generateId } from './utils';

// --- Local Storage Logic ---
const STORAGE_KEYS = {
  STUDENTS: 'edumanager_students',
  CLASSES: 'edumanager_classes',
  ATTENDANCE: 'edumanager_attendance',
  PAYMENTS: 'edumanager_payments',
  CYCLES: 'edumanager_cycles',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'classes' | 'attendance' | 'payments' | 'reports'>('dashboard');
  
  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cycles, setCycles] = useState<BillingCycle[]>([]);

  // Load data
  useEffect(() => {
    const load = (key: string, fallback: any) => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    };

    const initialStudents = load(STORAGE_KEYS.STUDENTS, []);
    const initialClasses = load(STORAGE_KEYS.CLASSES, []);
    
    if (initialStudents.length === 0 && initialClasses.length === 0) {
      // Add sample data
      const sampleClassId = generateId();
      const sampleStudentId = generateId();
      
      setStudents([{
        id: sampleStudentId,
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        parentName: 'Nguyễn Văn B',
        joinDate: new Date().toISOString(),
        classIds: [sampleClassId]
      }]);
      
      setClasses([{
        id: sampleClassId,
        name: 'Toán 9 - Cơ bản',
        schedule: 'Thứ 2, Thứ 6 (17:00 - 18:30)',
        feePerSession: 50000
      }]);
    } else {
      setStudents(initialStudents);
      setClasses(initialClasses);
      setAttendance(load(STORAGE_KEYS.ATTENDANCE, []));
      setPayments(load(STORAGE_KEYS.PAYMENTS, []));
      setCycles(load(STORAGE_KEYS.CYCLES, []));
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(cycles));
  }, [students, classes, attendance, payments, cycles]);

  // --- Actions ---
  const addStudent = (student: Omit<Student, 'id'>) => {
    const newStudent = { ...student, id: generateId(), classIds: student.classIds || [] };
    setStudents([...students, newStudent]);
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(students.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addClass = (cls: Omit<Class, 'id'>) => {
    const newClass = { ...cls, id: generateId() };
    setClasses([...classes, newClass]);
  };

  const updateClass = (id: string, updates: Partial<Class>) => {
    setClasses(classes.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const markAttendance = (classId: string, studentId: string, date: string, status: AttendanceStatus, manualCycleNumber?: number) => {
    // Find or create cycle
    let activeCycle = cycles.find(c => c.classId === classId && c.studentId === studentId && c.status === 'active');
    
    if (!activeCycle) {
      // Determine cycle number
      let cycleNumber = manualCycleNumber;
      if (!cycleNumber) {
        const studentCycles = cycles.filter(c => c.studentId === studentId && c.classId === classId);
        const cls = classes.find(c => c.id === classId);
        const baseNumber = cls?.startCycleNumber || 1;
        cycleNumber = baseNumber + studentCycles.length;
      }

      activeCycle = {
        id: generateId(),
        studentId,
        classId,
        startDate: date,
        status: 'active',
        sessionsCompleted: 0,
        absencesCount: 0,
        isPaid: false,
        cycleNumber
      };
      setCycles(prev => [...prev, activeCycle!]);
    }

    const sessionIndex = activeCycle.sessionsCompleted + 1;
    
    const record: AttendanceRecord = {
      id: generateId(),
      classId,
      studentId,
      date,
      status,
      sessionIndexInCycle: sessionIndex,
      cycleId: activeCycle.id,
      cycleNumber: activeCycle.cycleNumber
    };

    setAttendance(prev => [...prev, record]);

    // Update cycle
    setCycles(prev => prev.map(c => {
      if (c.id === activeCycle!.id) {
        const newSessionsCompleted = c.sessionsCompleted + 1;
        const newAbsencesCount = status === 'absent' ? c.absencesCount + 1 : c.absencesCount;
        
        if (newSessionsCompleted === 8) {
          return { ...c, sessionsCompleted: 8, absencesCount: newAbsencesCount, status: 'completed' };
        }
        return { ...c, sessionsCompleted: newSessionsCompleted, absencesCount: newAbsencesCount };
      }
      return c;
    }));
  };

  const addPayment = (payment: Omit<Payment, 'id'>) => {
    const newPayment = { ...payment, id: generateId() };
    setPayments([...payments, newPayment]);
    
    // Mark cycle as paid
    setCycles(prev => prev.map(c => {
      if (c.id === payment.cycleId) {
        return { ...c, isPaid: true };
      }
      return c;
    }));
  };

  // --- Views ---
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-black/5 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
              <BookOpen size={18} />
            </div>
            EduManager
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-semibold opacity-50">Management System</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart3 size={20} />} label="Tổng quan" />
          <NavItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={<Users size={20} />} label="Học sinh" />
          <NavItem active={activeTab === 'classes'} onClick={() => setActiveTab('classes')} icon={<BookOpen size={20} />} label="Lớp học" />
          <NavItem active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<CheckCircle2 size={20} />} label="Điểm danh" />
          <NavItem active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={<Wallet size={20} />} label="Học phí" />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<Download size={20} />} label="Báo cáo" />
        </nav>

        <div className="p-6 border-t border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold">Admin</p>
              <p className="text-xs text-muted-foreground">Trung tâm dạy thêm</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardView 
              students={students} 
              classes={classes} 
              payments={payments} 
              cycles={cycles}
            />
          )}
          {activeTab === 'students' && (
            <StudentsView 
              students={students} 
              classes={classes}
              onAdd={addStudent} 
              onUpdate={updateStudent}
              onDelete={(id) => setStudents(students.filter(s => s.id !== id))}
            />
          )}
          {activeTab === 'classes' && (
            <ClassesView 
              classes={classes} 
              onAdd={addClass} 
              onUpdate={updateClass}
              onDelete={(id) => setClasses(classes.filter(c => c.id !== id))}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceView 
              classes={classes} 
              students={students} 
              attendance={attendance} 
              onMark={markAttendance}
              cycles={cycles}
            />
          )}
          {activeTab === 'payments' && (
            <PaymentsView 
              students={students} 
              classes={classes} 
              cycles={cycles} 
              payments={payments}
              attendance={attendance}
              onAddPayment={addPayment}
            />
          )}
          {activeTab === 'reports' && (
            <ReportsView 
              payments={payments}
              attendance={attendance}
              students={students}
              classes={classes}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        active 
          ? "bg-black text-white shadow-md" 
          : "text-muted-foreground hover:bg-black/5 hover:text-black"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// --- Dashboard View ---
function DashboardView({ students, classes, payments, cycles }: { students: Student[], classes: Class[], payments: Payment[], cycles: BillingCycle[] }) {
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const activeCycles = cycles.filter(c => c.status === 'active');
  const pendingPayments = cycles.filter(c => c.sessionsCompleted >= 6 && !c.isPaid);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Tổng quan</h2>
        <p className="text-muted-foreground">Chào mừng trở lại! Dưới đây là tình hình trung tâm của bạn.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Tổng học sinh" value={students.length} icon={<Users className="text-blue-500" />} />
        <StatCard label="Số lớp học" value={classes.length} icon={<BookOpen className="text-emerald-500" />} />
        <StatCard label="Doanh thu" value={formatCurrency(totalRevenue)} icon={<Wallet className="text-orange-500" />} />
        <StatCard label="Cần thu phí" value={pendingPayments.length} icon={<AlertCircle className="text-red-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <h3 className="text-lg font-bold mb-6">Thông báo thu phí (Buổi 6+)</h3>
          <div className="space-y-4">
            {pendingPayments.length > 0 ? (
              pendingPayments.map(cycle => {
                const student = students.find(s => s.id === cycle.studentId);
                const cls = classes.find(c => c.id === cycle.classId);
                return (
                  <div key={cycle.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div>
                      <p className="font-bold text-red-900">{student?.name}</p>
                      <p className="text-xs text-red-700">Lớp: {cls?.name} - Lần {cycle.cycleNumber || '?'} - Buổi {cycle.sessionsCompleted}/8</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-900">
                        {formatCurrency(((classes.find(c => c.id === cycle.classId)?.feePerSession || 50000) * 8) - (cycle.absencesCount * (classes.find(c => c.id === cycle.classId)?.feePerSession || 50000)))}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Cần báo thu</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">Không có thông báo mới.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <h3 className="text-lg font-bold mb-6">Biểu đồ doanh thu</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payments.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'dd/MM')} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" fill="#000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

// --- Students View ---
function StudentsView({ students, classes, onAdd, onUpdate, onDelete }: { 
  students: Student[], 
  classes: Class[],
  onAdd: (s: Omit<Student, 'id'>) => void, 
  onUpdate: (id: string, s: Partial<Student>) => void,
  onDelete: (id: string) => void 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', parentName: '', classIds: [] as string[] });

  const openAdd = () => {
    setEditingStudent(null);
    setFormData({ name: '', phone: '', parentName: '', classIds: [] });
    setIsModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({ 
      name: student.name, 
      phone: student.phone, 
      parentName: student.parentName || '', 
      classIds: student.classIds || [] 
    });
    setIsModalOpen(true);
  };

  const toggleClass = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Học sinh</h2>
          <p className="text-muted-foreground">Quản lý danh sách học sinh tại trung tâm.</p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <Plus size={20} /> Thêm học sinh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/5">
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Họ và tên</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Số điện thoại</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Lớp học</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} className="border-b border-black/5 hover:bg-black/[0.02] transition-colors">
                <td className="p-4 font-bold">{student.name}</td>
                <td className="p-4 text-muted-foreground">{student.phone || '-'}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {(student.classIds || []).map(cid => {
                      const cls = classes.find(c => c.id === cid);
                      return cls ? (
                        <span key={cid} className="px-2 py-0.5 bg-black/5 rounded text-[10px] font-bold uppercase">
                          {cls.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => openEdit(student)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                    <ChevronRight size={18} />
                  </button>
                  <button onClick={() => onDelete(student.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-muted-foreground italic">Chưa có học sinh nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingStudent ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-black">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingStudent) {
                onUpdate(editingStudent.id, formData);
              } else {
                onAdd({ ...formData, joinDate: new Date().toISOString() });
              }
              setIsModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Họ và tên</label>
                <input 
                  required
                  className="w-full bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Số điện thoại</label>
                <input 
                  className="w-full bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Tên phụ huynh</label>
                <input 
                  className="w-full bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
                  value={formData.parentName}
                  onChange={e => setFormData({...formData, parentName: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Ghi danh vào lớp</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {classes.map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClass(cls.id)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-bold border transition-all",
                        formData.classIds.includes(cls.id)
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black/10 hover:border-black/30"
                      )}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg mt-4">
                {editingStudent ? 'Cập nhật' : 'Lưu học sinh'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// --- Classes View ---
function ClassesView({ classes, onAdd, onUpdate, onDelete }: { 
  classes: Class[], 
  onAdd: (c: Omit<Class, 'id'>) => void, 
  onUpdate: (id: string, c: Partial<Class>) => void,
  onDelete: (id: string) => void 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({ name: '', schedule: '', feePerSession: 50000 });

  const openAdd = () => {
    setEditingClass(null);
    setFormData({ name: '', schedule: '', feePerSession: 50000 });
    setIsModalOpen(true);
  };

  const openEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({ name: cls.name, schedule: cls.schedule, feePerSession: cls.feePerSession });
    setIsModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lớp học</h2>
          <p className="text-muted-foreground">Quản lý các lớp học và lịch dạy.</p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <Plus size={20} /> Thêm lớp học
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => openEdit(cls)}
                className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"
              >
                <ChevronRight size={18} />
              </button>
              <button 
                onClick={() => onDelete(cls.id)}
                className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center mb-4">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{cls.name}</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar size={16} /> {cls.schedule}
              </p>
              <p className="text-sm font-bold text-emerald-600">
                {formatCurrency(cls.feePerSession)} / buổi
              </p>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground italic bg-white rounded-2xl border border-dashed border-black/20">
            Chưa có lớp học nào.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingClass ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-black">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingClass) {
                onUpdate(editingClass.id, formData);
              } else {
                onAdd(formData);
              }
              setIsModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Tên lớp</label>
                <input 
                  required
                  placeholder="Ví dụ: Toán 9 - Nâng cao"
                  className="w-full bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Lịch học</label>
                <input 
                  required
                  placeholder="Ví dụ: Thứ 2, Thứ 4 (18:00 - 19:30)"
                  className="w-full bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
                  value={formData.schedule}
                  onChange={e => setFormData({...formData, schedule: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Học phí mỗi buổi</label>
                <input 
                  type="number"
                  required
                  className="w-full bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
                  value={formData.feePerSession}
                  onChange={e => setFormData({...formData, feePerSession: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Lần thu tiền bắt đầu</label>
                <input 
                  type="number"
                  className="w-full bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
                  value={formData.startCycleNumber || 1}
                  onChange={e => setFormData({...formData, startCycleNumber: parseInt(e.target.value)})}
                />
              </div>
              <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg mt-4">
                {editingClass ? 'Cập nhật' : 'Lưu lớp học'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// --- Attendance View ---
function AttendanceView({ classes, students, attendance, onMark, cycles }: { 
  classes: Class[], 
  students: Student[], 
  attendance: AttendanceRecord[], 
  onMark: (cid: string, sid: string, date: string, status: AttendanceStatus, cycleNum?: number) => void,
  cycles: BillingCycle[]
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualCycleNumber, setManualCycleNumber] = useState<string>('');

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const enrolledStudents = students.filter(s => s.classIds?.includes(selectedClassId));
  
  const getAttendanceStatus = (sid: string) => {
    return attendance.find(a => a.classId === selectedClassId && a.studentId === sid && a.date === selectedDate)?.status;
  };

  const getCycleProgress = (sid: string) => {
    const cycle = cycles.find(c => c.classId === selectedClassId && c.studentId === sid && c.status === 'active');
    return cycle ? cycle.sessionsCompleted : 0;
  };

  const getActiveCycleNumber = (sid: string) => {
    const cycle = cycles.find(c => c.classId === selectedClassId && c.studentId === sid && c.status === 'active');
    return cycle?.cycleNumber;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Điểm danh</h2>
        <p className="text-muted-foreground">Ghi nhận sự hiện diện của học sinh trong mỗi buổi học.</p>
      </header>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-full md:w-64">
          <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Chọn lớp học</label>
          <select 
            className="w-full bg-white border border-black/5 rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
          >
            <option value="">-- Chọn lớp --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="w-full md:w-64">
          <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Ngày học</label>
          <input 
            type="date"
            className="w-full bg-white border border-black/5 rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-50">Lần thu tiền (Nếu bắt đầu chu kỳ mới)</label>
          <input 
            type="number"
            placeholder="Ví dụ: 1"
            className="w-full bg-white border border-black/5 rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
            value={manualCycleNumber}
            onChange={e => setManualCycleNumber(e.target.value)}
          />
        </div>
      </div>

      {selectedClassId ? (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5">
                <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Học sinh</th>
                <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Chu kỳ (8 buổi)</th>
                <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50 text-center">Có mặt</th>
                <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50 text-center">Vắng</th>
              </tr>
            </thead>
            <tbody>
              {enrolledStudents.map(student => {
                const status = getAttendanceStatus(student.id);
                const progress = getCycleProgress(student.id);
                const cycleNum = getActiveCycleNumber(student.id);
                
                return (
                  <tr key={student.id} className="border-b border-black/5 hover:bg-black/[0.01]">
                    <td className="p-4 font-bold">
                      {student.name}
                      {cycleNum && <span className="ml-2 text-[10px] bg-black text-white px-1.5 py-0.5 rounded-full">Lần {cycleNum}</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              progress >= 6 ? "bg-orange-500" : "bg-black"
                            )}
                            style={{ width: `${(progress / 8) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold w-8">{progress}/8</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onMark(selectedClassId, student.id, selectedDate, 'present', manualCycleNumber ? parseInt(manualCycleNumber) : undefined)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all mx-auto",
                          status === 'present' 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" 
                            : "bg-black/5 text-black/20 hover:bg-black/10"
                        )}
                      >
                        <Check size={20} />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onMark(selectedClassId, student.id, selectedDate, 'absent', manualCycleNumber ? parseInt(manualCycleNumber) : undefined)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all mx-auto",
                          status === 'absent' 
                            ? "bg-red-500 text-white shadow-lg shadow-red-200" 
                            : "bg-black/5 text-black/20 hover:bg-black/10"
                        )}
                      >
                        <X size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {enrolledStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground italic">Không có học sinh nào trong lớp này.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-black/20">
          <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Vui lòng chọn lớp học để bắt đầu điểm danh.</p>
        </div>
      )}
    </motion.div>
  );
}

// --- Payments View ---
function PaymentsView({ students, classes, cycles, payments, attendance, onAddPayment }: { 
  students: Student[], 
  classes: Class[], 
  cycles: BillingCycle[], 
  payments: Payment[],
  attendance: AttendanceRecord[],
  onAddPayment: (p: Omit<Payment, 'id'>) => void
}) {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle | null>(null);
  const [notificationCycle, setNotificationCycle] = useState<BillingCycle | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [prevOverpayment, setPrevOverpayment] = useState<number>(0);
  const [prevUnpaid, setPrevUnpaid] = useState<number>(0);
  const [manualAdjustment, setManualAdjustment] = useState<number>(0);

  const pendingCycles = cycles.filter(c => !c.isPaid);

  const calculateTotal = (cycle: BillingCycle) => {
    const cls = classes.find(c => c.id === cycle.classId);
    const feePerSession = cls?.feePerSession || 50000;
    const baseAmount = 8 * feePerSession;
    const absenceDeduction = cycle.absencesCount * feePerSession;
    return baseAmount - absenceDeduction - prevOverpayment + prevUnpaid + manualAdjustment;
  };

  const getCycleNumber = (cycle: BillingCycle) => {
    if (cycle.cycleNumber) return cycle.cycleNumber;
    
    const studentCycles = cycles
      .filter(c => c.studentId === cycle.studentId && c.classId === cycle.classId)
      .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
    
    const index = studentCycles.findIndex(c => c.id === cycle.id);
    return index !== -1 ? index + 1 : studentCycles.length;
  };

  const handlePay = () => {
    if (!selectedCycle) return;
    
    const amount = calculateTotal(selectedCycle);
    const cycleNum = getCycleNumber(selectedCycle);
    const student = students.find(s => s.id === selectedCycle.studentId);
    const cls = classes.find(c => c.id === selectedCycle.classId);
    
    onAddPayment({
      studentId: selectedCycle.studentId,
      classId: selectedCycle.classId,
      amount,
      date: new Date().toISOString(),
      method: paymentMethod,
      cycleId: selectedCycle.id,
      note: `${student?.name} - ${cls?.name} - Lần ${cycleNum}. (Dư cũ: ${formatCurrency(prevOverpayment)}, Nợ cũ: ${formatCurrency(prevUnpaid)}, Chỉnh sửa: ${formatCurrency(manualAdjustment)})`
    });
    
    setSelectedCycle(null);
    setPrevOverpayment(0);
    setPrevUnpaid(0);
    setManualAdjustment(0);
  };

  const bankInfo = {
    account: "00389884196",
    name: "Nguyễn Lê Hoài Thông",
    bank: "MB Bank"
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Học phí</h2>
        <p className="text-muted-foreground">Quản lý thu phí theo chu kỳ 8 buổi.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div className="p-4 bg-black/5 border-b border-black/5">
              <h3 className="font-bold text-xs uppercase tracking-widest opacity-50">Danh sách cần thu phí</h3>
            </div>
            <div className="divide-y divide-black/5">
              {pendingCycles.map(cycle => {
                const student = students.find(s => s.id === cycle.studentId);
                const cls = classes.find(c => c.id === cycle.classId);
                const feePerSession = cls?.feePerSession || 50000;
                const amount = (8 * feePerSession) - (cycle.absencesCount * feePerSession);
                
                return (
                  <div key={cycle.id} className="p-4 flex items-center justify-between hover:bg-black/[0.01] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        cycle.sessionsCompleted >= 6 ? "bg-orange-100 text-orange-700" : "bg-black/5 text-black"
                      )}>
                        {cycle.sessionsCompleted}
                      </div>
                      <div>
                        <p className="font-bold">{student?.name}</p>
                        <p className="text-xs text-muted-foreground">{cls?.name} • Bắt đầu: {format(parseISO(cycle.startDate), 'dd/MM/yyyy')}</p>
                        {cycle.absencesCount > 0 && (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Đã trừ {cycle.absencesCount} buổi nghỉ (-{formatCurrency(cycle.absencesCount * feePerSession)})</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(amount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Tạm tính</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setNotificationCycle(cycle)}
                          className="bg-black/5 text-black px-3 py-2 rounded-xl text-xs font-bold hover:bg-black/10 transition-colors flex items-center gap-1"
                        >
                          <Download size={14} />
                          Thông báo
                        </button>
                        <button 
                          onClick={() => setSelectedCycle(cycle)}
                          className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-105 transition-transform"
                        >
                          Thu phí
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pendingCycles.length === 0 && (
                <div className="p-12 text-center text-muted-foreground italic">Không có học phí cần thu.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
            <h3 className="text-lg font-bold mb-6">Lịch sử thu phí gần đây</h3>
            <div className="space-y-4">
              {payments.slice(-5).reverse().map(payment => {
                const student = students.find(s => s.id === payment.studentId);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-black/5 rounded-xl">
                    <div>
                      <p className="text-sm font-bold">{student?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{format(parseISO(payment.date), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">+{formatCurrency(payment.amount)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">{payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedCycle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">Xác nhận thanh toán</h3>
              <button onClick={() => setSelectedCycle(null)} className="text-muted-foreground hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-6 bg-black/5 rounded-2xl border border-black/5">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4">Thông tin học viên</p>
                  <p className="text-xl font-bold">{students.find(s => s.id === selectedCycle.studentId)?.name}</p>
                  <p className="text-muted-foreground">{classes.find(c => c.id === selectedCycle.classId)?.name}</p>
                  <div className="mt-6 pt-6 border-t border-black/10 flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-50">Tổng số tiền</p>
                      <p className="text-3xl font-black tracking-tighter">{formatCurrency(calculateTotal(selectedCycle))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-red-500">Nghỉ {selectedCycle.absencesCount} buổi</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 block">Tiền dư lần trước (-)</label>
                    <input 
                      type="number"
                      className="w-full bg-black/5 border-none rounded-xl p-2 text-sm focus:ring-2 focus:ring-black outline-none"
                      value={prevOverpayment || ''}
                      onChange={e => setPrevOverpayment(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 block">Chưa đóng lần trước (+)</label>
                    <input 
                      type="number"
                      className="w-full bg-black/5 border-none rounded-xl p-2 text-sm focus:ring-2 focus:ring-black outline-none"
                      value={prevUnpaid || ''}
                      onChange={e => setPrevUnpaid(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 block">Điều chỉnh khác (+/-)</label>
                    <input 
                      type="number"
                      className="w-full bg-black/5 border-none rounded-xl p-2 text-sm focus:ring-2 focus:ring-black outline-none"
                      value={manualAdjustment || ''}
                      onChange={e => setManualAdjustment(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-50">Phương thức thanh toán</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPaymentMethod('cash')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        paymentMethod === 'cash' ? "border-black bg-black text-white" : "border-black/5 hover:border-black/20"
                      )}
                    >
                      <Banknote size={24} />
                      <span className="font-bold text-sm">Tiền mặt</span>
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('transfer')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        paymentMethod === 'transfer' ? "border-black bg-black text-white" : "border-black/5 hover:border-black/20"
                      )}
                    >
                      <CreditCard size={24} />
                      <span className="font-bold text-sm">Chuyển khoản</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handlePay}
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:scale-[1.02] transition-transform"
                >
                  Xác nhận đã thu
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-8 bg-[#f9f9f9] rounded-2xl border border-dashed border-black/10">
                {paymentMethod === 'transfer' ? (
                  <>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-6">Quét mã QR để thanh toán</p>
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 border border-black/5">
                      <QRCodeSVG 
                        value={`https://api.vietqr.io/image/970422-123456789-qr_only.jpg?amount=${calculateTotal(selectedCycle)}&addInfo=${students.find(s => s.id === selectedCycle.studentId)?.name} - ${classes.find(c => c.id === selectedCycle.classId)?.name} - Lan ${getCycleNumber(selectedCycle)}`} 
                        size={200}
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm">{bankInfo.bank}: {bankInfo.account}</p>
                      <p className="text-xs text-muted-foreground">Chủ TK: {bankInfo.name.toUpperCase()}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-2">Nội dung đã được tạo sẵn</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <Banknote size={40} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Thanh toán tiền mặt</h4>
                      <p className="text-sm text-muted-foreground">Vui lòng nhận tiền trực tiếp từ phụ huynh và nhấn xác nhận.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tuition Notification Modal */}
      <AnimatePresence>
        {notificationCycle && (
          <TuitionNotificationModal 
            cycle={notificationCycle}
            student={students.find(s => s.id === notificationCycle.studentId)!}
            cls={classes.find(c => c.id === notificationCycle.classId)!}
            attendance={attendance.filter(a => a.cycleId === notificationCycle.id)}
            cycleNumber={notificationCycle.cycleNumber || getCycleNumber(notificationCycle)}
            onClose={() => setNotificationCycle(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TuitionNotificationModal({ cycle, student, cls, attendance, cycleNumber, onClose }: {
  cycle: BillingCycle,
  student: Student,
  cls: Class,
  attendance: AttendanceRecord[],
  cycleNumber: number,
  onClose: () => void
}) {
  const feePerSession = cls.feePerSession || 50000;
  const amount = (8 * feePerSession) - (cycle.absencesCount * feePerSession);
  
  const presentDates = attendance
    .filter(a => a.status === 'present')
    .map(a => format(parseISO(a.date), 'dd/MM'))
    .join(', ');
    
  const absentDates = attendance
    .filter(a => a.status === 'absent')
    .map(a => format(parseISO(a.date), 'dd/MM'))
    .join(', ');

  const bankInfo = {
    account: "00389884196",
    name: "Nguyễn Lê Hoài Thông",
    bank: "MB Bank"
  };

  const transferContent = `Hoc phi lan ${cycleNumber} - ${student.name} - ${cls.name}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative"
      >
        {/* Header Decoration */}
        <div className="h-3 bg-black w-full" />
        
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tighter uppercase italic">Thông báo</h3>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Thu học phí</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="text-center py-4 border-y border-black/5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 mb-1">Lần thứ {cycleNumber}</p>
              <p className="text-xl font-black italic uppercase tracking-tight">{cls.name}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase opacity-40">Học sinh</span>
                <span className="font-bold text-lg">{student.name}</span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase opacity-40">Lớp</span>
                <span className="font-medium">{cls.name}</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase opacity-40">Ngày đã học</p>
                <p className="text-sm font-medium bg-emerald-50 text-emerald-700 p-2 rounded-lg border border-emerald-100">
                  {presentDates || 'Chưa có dữ liệu'}
                </p>
              </div>

              {absentDates && (
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase opacity-40">Ngày vắng</p>
                  <p className="text-sm font-medium bg-red-50 text-red-700 p-2 rounded-lg border border-red-100">
                    {absentDates}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-dashed border-black/10">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold uppercase opacity-40 mb-1">Học phí phải nộp</p>
                    <p className="text-3xl font-black tracking-tighter">{formatCurrency(amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chu kỳ 8 buổi</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black text-white p-6 rounded-[2rem] space-y-4 shadow-xl">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-50">
                  <span>Thông tin chuyển khoản</span>
                  <Banknote size={14} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs opacity-70">Ngân hàng</p>
                  <p className="font-bold">{bankInfo.bank}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs opacity-70">Số tài khoản</p>
                    <p className="font-mono font-bold tracking-wider">{bankInfo.account}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs opacity-70">Người thụ hưởng</p>
                    <p className="font-bold text-[11px] uppercase">{bankInfo.name}</p>
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-white/10">
                  <p className="text-xs opacity-70">Nội dung</p>
                  <p className="text-xs font-bold bg-white/10 p-2 rounded-lg border border-white/5">{transferContent}</p>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <div className="bg-white p-3 rounded-2xl">
                  <QRCodeSVG 
                    value={`https://api.vietqr.io/image/970422-${bankInfo.account}-qr_only.jpg?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}`} 
                    size={140}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-black text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <Download size={18} />
              Tải xuống / In
            </button>
            <button 
              onClick={onClose}
              className="px-6 bg-black/5 text-black py-4 rounded-2xl font-bold text-sm hover:bg-black/10 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Reports View ---
function ReportsView({ payments, attendance, students, classes }: { 
  payments: Payment[], 
  attendance: AttendanceRecord[], 
  students: Student[],
  classes: Class[]
}) {
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    payments.forEach(p => {
      const month = format(parseISO(p.date), 'MM/yyyy');
      months[month] = (months[month] || 0) + p.amount;
    });
    return Object.entries(months).map(([name, amount]) => ({ name, amount }));
  }, [payments]);

  const attendanceStats = useMemo(() => {
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    return [
      { name: 'Có mặt', value: present, color: '#10b981' },
      { name: 'Vắng', value: absent, color: '#ef4444' }
    ];
  }, [attendance]);

  const s1aData = useMemo(() => {
    return payments
      .filter(p => format(parseISO(p.date), 'yyyy-MM') === reportMonth)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [payments, reportMonth]);

  const totalS1A = s1aData.reduce((sum, p) => sum + p.amount, 0);

  const exportToWord = async () => {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "Ngày tháng", alignment: AlignmentType.CENTER, children: [new TextRun({ bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ text: "Diễn giải nội dung", alignment: AlignmentType.CENTER, children: [new TextRun({ bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ text: "Số tiền", alignment: AlignmentType.CENTER, children: [new TextRun({ bold: true })] })] }),
        ],
      }),
      ...s1aData.map(p => {
        const student = students.find(s => s.id === p.studentId);
        const cls = classes.find(c => c.id === p.classId);
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: format(parseISO(p.date), 'dd/MM/yyyy'), alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: p.note || `Thu học phí - ${student?.name} - ${cls?.name}` })] }),
            new TableCell({ children: [new Paragraph({ text: formatCurrency(p.amount), alignment: AlignmentType.RIGHT })] }),
          ],
        });
      }),
      new TableRow({
        children: [
          new TableCell({ columnSpan: 2, children: [new Paragraph({ text: "TỔNG CỘNG", alignment: AlignmentType.RIGHT, children: [new TextRun({ bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ text: formatCurrency(totalS1A), alignment: AlignmentType.RIGHT, children: [new TextRun({ bold: true })] })] }),
        ],
      }),
    ];

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "SỔ THU TIỀN (MẪU S1A)", bold: true, size: 32 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Tháng: ${format(parseISO(reportMonth + '-01'), 'MM/yyyy')}`, italics: true }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Ngày xuất báo cáo: ${format(new Date(), 'dd/MM/yyyy')}`, size: 20 }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400 },
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `So_Thu_S1A_${reportMonth}.docx`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Báo cáo & Thống kê</h2>
          <p className="text-muted-foreground">Theo dõi tình hình tài chính và chuyên cần.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-black/5">
          <h3 className="text-xl font-bold mb-8">Doanh thu theo tháng</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v/1000000}M`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" fill="#000" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
          <h3 className="text-xl font-bold mb-8">Tỷ lệ chuyên cần</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendanceStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {attendanceStats.map(stat => (
              <div key={stat.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                <span className="text-xs font-bold uppercase tracking-wider opacity-60">{stat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* S1A Report Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold">Sổ thu tiền (Mẫu S1A)</h3>
            <p className="text-sm text-muted-foreground">Báo cáo chi tiết các khoản thu theo mẫu Cục Thuế.</p>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="month"
              className="bg-black/5 border-none rounded-xl p-3 focus:ring-2 focus:ring-black outline-none"
              value={reportMonth}
              onChange={e => setReportMonth(e.target.value)}
            />
            <button 
              onClick={exportToWord}
              className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform shadow-lg"
            >
              <Download size={20} /> Xuất Word (.docx)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5">
                <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50 border border-black/10">Ngày tháng</th>
                <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50 border border-black/10">Diễn giải nội dung</th>
                <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50 border border-black/10 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {s1aData.map(p => {
                const student = students.find(s => s.id === p.studentId);
                const cls = classes.find(c => c.id === p.classId);
                return (
                  <tr key={p.id} className="hover:bg-black/[0.01]">
                    <td className="p-4 border border-black/10">{format(parseISO(p.date), 'dd/MM/yyyy')}</td>
                    <td className="p-4 border border-black/10">{p.note || `Thu học phí - ${student?.name} - ${cls?.name}`}</td>
                    <td className="p-4 border border-black/10 text-right font-mono">{formatCurrency(p.amount)}</td>
                  </tr>
                );
              })}
              {s1aData.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-muted-foreground italic border border-black/10">Không có dữ liệu thu tiền trong tháng này.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-black/5 font-bold">
                <td colSpan={2} className="p-4 text-right border border-black/10 uppercase text-xs tracking-widest">Tổng cộng</td>
                <td className="p-4 text-right border border-black/10 font-mono text-lg">{formatCurrency(totalS1A)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-6 border-b border-black/5">
          <h3 className="text-xl font-bold">Lịch sử giao dịch chi tiết</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/5">
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Ngày</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Học sinh</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Số tiền</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Hình thức</th>
              <th className="p-4 font-bold text-xs uppercase tracking-widest opacity-50">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id} className="border-b border-black/5 hover:bg-black/[0.01]">
                <td className="p-4 text-sm">{format(parseISO(payment.date), 'dd/MM/yyyy HH:mm')}</td>
                <td className="p-4 font-bold">{students.find(s => s.id === payment.studentId)?.name}</td>
                <td className="p-4 font-bold text-emerald-600">{formatCurrency(payment.amount)}</td>
                <td className="p-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    payment.method === 'cash' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {payment.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                  </span>
                </td>
                <td className="p-4 text-xs text-muted-foreground">{payment.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
