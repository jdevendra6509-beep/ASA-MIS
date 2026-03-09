import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import {
  Users,
  Settings,
  Mail,
  LayoutDashboard,
  UserPlus,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  User,
  Camera,
  Upload,
  CreditCard,
  Home,
  Briefcase,
  GraduationCap,
  MapPin,
  Phone,
  Calendar,
  FileText,
  Edit2,
  Slash,
  Send,
  X,
  Check,
  RefreshCw
} from 'lucide-react';
import { UserRole, Employee, DEPARTMENTS } from './types';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";

const ai = new (GoogleGenAI as any)({
  apiKey: process.env.GEMINI_API_KEY || "",
  fetch: (...args: any[]) => (window.fetch as any)(...args)
});

// --- Components ---

const Sidebar = ({ onLogout }: { onLogout: () => void }) => {
  const location = window.location.pathname;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: UserPlus, label: 'Employee Creation', path: '/employees/create' },
    { icon: Users, label: 'Employee List', path: '/employees' },
    { icon: Settings, label: 'System Setup', path: '/settings' },
  ];

  return (
    <div className="w-64 bg-zinc-950 text-zinc-400 h-screen fixed left-0 top-0 border-r border-zinc-800 flex flex-col">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-white font-bold text-xl tracking-tight italic">MIS Portal</h1>
        <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Master Admin Control</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
              location === item.path
                ? "bg-zinc-800 text-white"
                : "hover:bg-zinc-900 hover:text-zinc-200"
            )}
          >
            <item.icon size={18} className={cn(location === item.path ? "text-emerald-400" : "group-hover:text-emerald-400")} />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left hover:text-red-400 transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ title, user }: { title: string, user: any }) => (
  <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
    <h2 className="text-lg font-semibold text-zinc-800">{title}</h2>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-medium text-zinc-900">{user?.firstName} {user?.lastName}</p>
        <p className="text-xs text-zinc-500">{user?.role}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 font-bold text-xs">
        {user?.firstName?.[0]}{user?.lastName?.[0]}
      </div>
    </div>
  </header>
);

// --- Pages ---

const EditEmployeeModal = ({ employee, onClose, onSave }: { employee: Employee, onClose: () => void, onSave: (updates: Partial<Employee>) => void }) => {
  const [formData, setFormData] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    designation: employee.designation,
    department: employee.department,
    role: employee.role,
    reportingPartner: employee.reportingPartner,
    reportingManager: employee.reportingManager,
  });
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch active/pending partners for the dropdown
    fetch(`/api/users/by-role/${UserRole.PARTNER}`)
      .then(res => res.json())
      .then(setPartners);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updates = { ...formData };
    if (updates.role === UserRole.PARTNER) {
      updates.reportingPartner = '';
      updates.reportingManager = '';
    } else if (updates.role === UserRole.MANAGER) {
      updates.reportingManager = updates.reportingPartner;
    }

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        onSave(updates);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isPartner = formData.role === UserRole.PARTNER;
  const isManager = formData.role === UserRole.MANAGER;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-bold text-zinc-900">Edit Employee</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">First Name *</label>
              <input
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Last Name *</label>
              <input
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Designation *</label>
            <input
              required
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              value={formData.designation}
              onChange={e => setFormData({ ...formData, designation: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Department *</label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Software Role *</label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white"
                value={formData.role}
                onChange={e => {
                  const newRole = e.target.value as UserRole;
                  setFormData({ ...formData, role: newRole });
                }}
              >
                {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {!isPartner && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reporting Partner *</label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white"
                value={formData.reportingPartner}
                onChange={e => setFormData({ ...formData, reportingPartner: e.target.value })}
              >
                <option value="">Select Partner</option>
                {partners.map(p => <option key={p.id} value={`${p.firstName} ${p.lastName}`}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
          )}

          {!isPartner && !isManager && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reporting Manager *</label>
              <input
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
                value={formData.reportingManager}
                onChange={e => setFormData({ ...formData, reportingManager: e.target.value })}
              />
            </div>
          )}

          <div className="pt-6 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-zinc-600 font-semibold hover:bg-zinc-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ActionsMenu = ({ employee, onAction }: { employee: Employee, onAction: (type: 'edit' | 'status' | 'resend') => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-lg transition-colors border",
          isOpen ? "bg-zinc-100 text-zinc-900 border-zinc-300" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 border-transparent"
        )}
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-zinc-100 py-2 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
          <button
            onClick={() => { onAction('edit'); setIsOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-3"
          >
            <Edit2 size={16} className="text-zinc-400" />
            <span>Edit Details</span>
          </button>

          {employee.status !== 'Active' && employee.status !== 'Disabled' && (
            <button
              onClick={() => { onAction('resend'); setIsOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-3"
            >
              <Send size={16} />
              <span>Resend Invite</span>
            </button>
          )}

          <div className="my-1 border-t border-zinc-100" />

          <button
            onClick={() => { onAction('status'); setIsOpen(false); }}
            className={cn(
              "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3",
              employee.status === 'Disabled' ? "text-emerald-600 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"
            )}
          >
            {employee.status === 'Disabled' ? (
              <>
                <Check size={16} />
                <span>Enable Account</span>
              </>
            ) : (
              <>
                <Slash size={16} />
                <span>Disable Account</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  const loadEmployees = () => {
    setLoading(true);
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAction = async (employee: Employee, type: 'edit' | 'status' | 'resend') => {
    if (type === 'edit') {
      setEditingEmployee(employee);
    } else if (type === 'status') {
      const newStatus = employee.status === 'Disabled' ? 'Active' : 'Disabled';
      try {
        const res = await fetch(`/api/employees/${employee.id}/toggle-status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          setEmployees(employees.map(e => e.id === employee.id ? { ...e, status: newStatus } : e));
          setFeedback({ message: `Employee ${newStatus === 'Active' ? 'enabled' : 'disabled'} successfully`, type: 'success' });
        }
      } catch (err) {
        setFeedback({ message: 'Failed to update status', type: 'error' });
      }
    } else if (type === 'resend') {
      try {
        const res = await fetch(`/api/employees/${employee.id}/resend-invite`, { method: 'POST' });
        if (res.ok) {
          setFeedback({ message: 'Invitation email resent successfully', type: 'success' });
        } else {
          const data = await res.json();
          setFeedback({ message: data.error || 'Failed to resend invite', type: 'error' });
        }
      } catch (err) {
        setFeedback({ message: 'Network error while resending invite', type: 'error' });
      }
    }

    if (feedback) setTimeout(() => setFeedback(null), 3000);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.firstName + ' ' + emp.lastName + ' ' + emp.employeeCode).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === 'All' || emp.department === filterDept;
    const matchesRole = filterRole === 'All' || emp.role === filterRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-zinc-900">Employee Directory</h3>
          <p className="text-zinc-500 text-sm">Manage and view all registered employees in the system.</p>
        </div>
        <button
          onClick={() => navigate('/employees/create')}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
        >
          <UserPlus size={18} />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or employee code..."
            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-zinc-400" />
          <select
            className="px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="All">All Departments</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm bg-white"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="All">All Roles</option>
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Joining Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-zinc-400 mb-2" size={24} />
                    <p className="text-zinc-500 text-sm">Loading employees...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-zinc-500 text-sm font-medium">No employees found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-sm border border-zinc-200">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-zinc-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded">
                        {emp.employeeCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {emp.department}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-zinc-600 px-2.5 py-1 rounded-full border border-zinc-200">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                        emp.status === 'Active'
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      )}>
                        {emp.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(emp.dateOfJoining).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionsMenu employee={emp} onAction={(type) => handleAction(emp, type)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-medium">
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
          <div className="flex gap-2">
            <button disabled className="px-3 py-1.5 text-xs font-semibold text-zinc-400 border border-zinc-200 rounded-lg bg-white opacity-50">Previous</button>
            <button disabled className="px-3 py-1.5 text-xs font-semibold text-zinc-400 border border-zinc-200 rounded-lg bg-white opacity-50">Next</button>
          </div>
        </div>
      </div>

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={(updates) => {
            setEmployees(employees.map(e => e.id === editingEmployee.id ? { ...e, ...updates } : e));
            setFeedback({ message: 'Employee updated successfully', type: 'success' });
          }}
        />
      )}

      {feedback && (
        <div className={cn(
          "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50",
          feedback.type === 'success' ? "bg-emerald-900 text-white" : "bg-red-900 text-white"
        )}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(setEmployees);
  }, []);

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Employees', value: employees.length.toString(), change: '+12%', icon: Users },
          { label: 'Active Projects', value: '45', change: '+3', icon: LayoutDashboard },
          { label: 'Pending Registrations', value: employees.filter(e => e.status === 'Pending').length.toString(), change: '-2', icon: Mail },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">
                <stat.icon size={20} className="text-zinc-600" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-sm text-zinc-500 font-medium">{stat.label}</p>
            <h3 className="text-3xl font-bold text-zinc-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <AIInsights employees={employees} />
    </div>
  );
};

const AIInsights = ({ employees }: { employees: Employee[] }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    if (employees.length === 0) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this employee list and provide 3 brief, professional strategic insights for the HR director. 
        Focus on department distribution, growth, or potential gaps.
        Data: ${JSON.stringify(employees.map(e => ({ dept: e.department, role: e.role, date: e.dateOfJoining })))}
        Keep it concise and formatted as a bulleted list.`,
      });
      setInsight(response.text || "No insights generated.");
    } catch (error) {
      console.error(error);
      setInsight("Failed to generate AI insights. Please check your Gemini API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Users size={120} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
            <Loader2 size={20} className={cn(loading && "animate-spin")} />
          </div>
          <div>
            <h4 className="text-lg font-bold">AI Strategic Insights</h4>
            <p className="text-zinc-400 text-xs">Powered by Gemini 2.0 Flash</p>
          </div>
        </div>

        {insight ? (
          <div className="prose prose-invert max-w-none">
            <div className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
              {insight}
            </div>
            <button
              onClick={() => setInsight('')}
              className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Clear Insights
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <p className="text-zinc-400 text-sm">Generate real-time organizational analysis based on your current workforce data.</p>
            <button
              onClick={generateInsight}
              disabled={loading || employees.length === 0}
              className="px-6 py-2.5 bg-white text-zinc-900 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all disabled:opacity-50"
            >
              {loading ? "Analyzing Data..." : "Generate Analysis"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PermissionsManager = () => {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const roles = ["Master Admin", "Admin", "Owner", "Partner", "Manager", "Employee"];
  const permissionTypes = ["view_dashboard", "create_employee", "view_employee_list", "manage_settings", "view_reports"];

  useEffect(() => {
    fetch('/api/permissions')
      .then(res => res.json())
      .then(data => {
        setPermissions(data);
        setLoading(false);
      });
  }, []);

  const togglePermission = async (role: string, permission: string, current: boolean) => {
    try {
      const res = await fetch('/api/permissions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permission, enabled: !current }),
      });
      if (res.ok) {
        setPermissions(prev => prev.map(p =>
          (p.role === role && p.permission === permission) ? { ...p, enabled: !current ? 1 : 0 } : p
        ));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-400" /></div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-100">
            <th className="py-4 px-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Permission</th>
            {roles.map(role => (
              <th key={role} className="py-4 px-4 text-xs font-bold text-zinc-400 uppercase tracking-widest text-center">{role}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {permissionTypes.map(perm => (
            <tr key={perm} className="hover:bg-zinc-50/50 transition-colors">
              <td className="py-4 px-4">
                <p className="text-sm font-semibold text-zinc-900 capitalize">{perm.replace(/_/g, ' ')}</p>
              </td>
              {roles.map(role => {
                const p = permissions.find(x => x.role === role && x.permission === perm);
                const isEnabled = p?.enabled === 1;
                return (
                  <td key={role} className="py-4 px-4 text-center">
                    <button
                      onClick={() => togglePermission(role, perm, isEnabled)}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        isEnabled ? "bg-emerald-500" : "bg-zinc-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        isEnabled ? "right-1" : "left-1"
                      )} />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EmployeeCreation = () => {
  const [formData, setFormData] = useState<Employee>({
    firstName: '',
    lastName: '',
    email: '',
    designation: '',
    dateOfJoining: '',
    role: UserRole.EMPLOYEE,
    department: DEPARTMENTS[0],
    reportingPartner: '',
    reportingManager: '',
  });
  const [partners, setPartners] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDropdownData = () => {
    // Fetch active/pending partners for the dropdown
    fetch(`/api/users/by-role/${UserRole.PARTNER}`)
      .then(res => res.json())
      .then(setPartners);

    // Fetch active/pending managers for the dropdown
    fetch(`/api/users/by-role/${UserRole.MANAGER}`)
      .then(res => res.json())
      .then(setManagers);
  };

  useEffect(() => {
    loadDropdownData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setWarning(null);
    setError(null);

    // Final check for mandatory fields based on role
    const isPartner = formData.role === UserRole.PARTNER;
    const isManager = formData.role === UserRole.MANAGER;

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.designation || !formData.dateOfJoining) {
      setError("All basic fields are mandatory.");
      setLoading(false);
      return;
    }

    if (!isPartner && !formData.reportingPartner) {
      setError("Reporting Partner is mandatory.");
      setLoading(false);
      return;
    }

    if (!isPartner && !isManager && !formData.reportingManager) {
      setError("Reporting Manager is mandatory.");
      setLoading(false);
      return;
    }

    const payload = { ...formData };
    if (isPartner) {
      payload.reportingPartner = '';
      payload.reportingManager = '';
    } else if (isManager) {
      payload.reportingManager = payload.reportingPartner;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        if (data.warning) setWarning(data.warning);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          designation: '',
          dateOfJoining: '',
          role: UserRole.EMPLOYEE,
          department: DEPARTMENTS[0],
          reportingPartner: '',
          reportingManager: '',
        });
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || "Failed to create employee");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isPartner = formData.role === UserRole.PARTNER;
  const isManager = formData.role === UserRole.MANAGER;

  return (
    <div className="p-8 max-w-4xl">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
          <h3 className="text-lg font-semibold text-zinc-900">Employee Creation & Invite</h3>
          <p className="text-sm text-zinc-500">Create a new employee record and trigger a registration email.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">First Name *</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Last Name *</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Email ID *</label>
              <input
                required
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Designation *</label>
              <input
                required
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                value={formData.designation}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Date of Joining *</label>
              <input
                required
                type="date"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                value={formData.dateOfJoining}
                onChange={e => setFormData({ ...formData, dateOfJoining: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Software Role *</label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                value={formData.role}
                onChange={e => {
                  const newRole = e.target.value as UserRole;
                  setFormData({
                    ...formData,
                    role: newRole,
                    // Clear reporting fields if they become irrelevant
                    reportingPartner: newRole === UserRole.PARTNER ? '' : formData.reportingPartner,
                    reportingManager: (newRole === UserRole.PARTNER || newRole === UserRole.MANAGER) ? '' : formData.reportingManager
                  });
                }}
              >
                {Object.values(UserRole).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Department *</label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {!isPartner && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Reporting Partner *</label>
                  <button
                    type="button"
                    onClick={loadDropdownData}
                    className="p-1 hover:bg-zinc-100 rounded text-zinc-400"
                    title="Refresh List"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={formData.reportingPartner}
                  onChange={e => setFormData({ ...formData, reportingPartner: e.target.value })}
                >
                  <option value="">Select Partner</option>
                  {partners.map(p => (
                    <option key={p.id} value={`${p.firstName} ${p.lastName}`}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
            )}

            {!isPartner && !isManager && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Reporting Manager *</label>
                <input
                  required
                  type="text"
                  placeholder="Enter Reporting Manager Name"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={formData.reportingManager}
                  onChange={e => setFormData({ ...formData, reportingManager: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 flex flex-col gap-4">
            {warning && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-700 text-sm">
                <AlertCircle size={18} />
                <span>{warning}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              {success ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-emerald-600 font-medium animate-in fade-in slide-in-from-left-4">
                    <CheckCircle2 size={18} />
                    <span>Employee created successfully!</span>
                  </div>
                  <Link to="/employees" className="text-sm font-semibold text-zinc-900 hover:underline flex items-center gap-1">
                    View Directory <ArrowRight size={14} />
                  </Link>
                </div>
              ) : <div />}

              <button
                disabled={loading}
                type="submit"
                className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                Create & Send Invite
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [outlookStatus, setOutlookStatus] = useState<{ connected: boolean; account?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStatus = () => {
    setLoading(true);
    fetch('/api/settings/outlook')
      .then(res => res.json())
      .then(setOutlookStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleConnectOutlook = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/outlook/url');
      const data = await res.json();

      if (data.url) {
        window.open(data.url, 'outlook_auth', 'width=600,height=700');
      } else {
        alert(data.error || 'Failed to get Outlook authentication URL. Please check if MICROSOFT_CLIENT_ID is set in the Secrets panel.');
      }
    } catch (error) {
      console.error('Outlook Connect Error:', error);
      alert('Network error while connecting to Outlook. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow messages from any origin during development, or check specific ones
      if (event.data?.type === 'OUTLOOK_AUTH_SUCCESS') {
        refreshStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="p-8 max-w-4xl">
      <div className="space-y-8">
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="text-lg font-semibold text-zinc-900">Outlook Integration</h3>
            <p className="text-sm text-zinc-500">Configure the email account used for system notifications and invites.</p>
          </div>
          <div className="p-8">
            {outlookStatus?.connected ? (
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Connected to Outlook</p>
                    <p className="text-xs text-emerald-700">{outlookStatus.account}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 flex items-center gap-1.5 slice-in-from-right-4 animate-in fade-in">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Connected
                      </div>
                      <button
                        onClick={refreshStatus}
                        className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                      >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleConnectOutlook}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Change Account
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-zinc-200 rounded-lg text-zinc-500">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Outlook Not Connected</p>
                    <p className="text-xs text-zinc-500">Connect an account to enable automated emails.</p>
                  </div>
                </div>
                <button
                  onClick={handleConnectOutlook}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-all"
                >
                  Connect Outlook
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="text-lg font-semibold text-zinc-900">Role Access Control</h3>
            <p className="text-sm text-zinc-500">Manage permissions for each administrative role.</p>
          </div>
          <div className="p-8">
            <PermissionsManager />
          </div>
        </section>
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-zinc-900 italic">MIS Portal</h1>
          <p className="text-zinc-500 mt-2">Sign in to your account to continue</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  required
                  type="email"
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          Don't have an account? <span className="text-zinc-900 font-semibold">Contact your HR manager</span>
        </p>
      </div>
    </div>
  );
};

const RegistrationPage = () => {
  const { token } = useParams<{ token: string }>();
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Additional Registration Fields
  const [regData, setRegData] = useState({
    gender: '',
    dateOfBirth: '',
    pan: '',
    aadhaar: '',
    maritalStatus: '',
    personalEmail: '',
    personalMobile: '',
    currentAddress: '',
    pin: '',
    permanentAddress: '',
    guardian1Name: '',
    guardian1Contact: '',
    guardian1Address: '',
    guardian2Name: '',
    guardian2Contact: '',
    guardian2Address: '',
    educationalQualification: '',
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
    }
  });

  // File Attachments (Base64)
  const [attachments, setAttachments] = useState({
    panAttachment: '',
    aadhaarAttachment: '',
    employeePhoto: '',
    chequeBookAttachment: ''
  });

  useEffect(() => {
    fetch(`/api/auth/verify-token/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      window.scrollTo(0, 0);
      return;
    }

    // Comprehensive validation for mandatory fields
    const requiredRegFields = [
      'gender', 'dateOfBirth', 'pan', 'aadhaar', 'maritalStatus',
      'personalEmail', 'personalMobile', 'currentAddress', 'pin',
      'permanentAddress', 'guardian1Name', 'guardian1Contact',
      'guardian1Address', 'guardian2Name', 'guardian2Contact',
      'guardian2Address', 'educationalQualification'
    ];

    for (const field of requiredRegFields) {
      if (!(regData as any)[field]) {
        setError(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is mandatory`);
        window.scrollTo(0, 0);
        return;
      }
    }

    if (!regData.bankDetails.accountNumber || !regData.bankDetails.ifscCode || !regData.bankDetails.bankName || !regData.bankDetails.branchName) {
      setError('All Bank Details are mandatory');
      window.scrollTo(0, 0);
      return;
    }

    if (!attachments.employeePhoto || !attachments.panAttachment || !attachments.aadhaarAttachment || !attachments.chequeBookAttachment) {
      setError('All attachments are mandatory');
      window.scrollTo(0, 0);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          ...regData,
          ...attachments
        }),
      });
      if (res.ok) {
        setSuccess(true);
        window.scrollTo(0, 0);
        setTimeout(() => navigate('/login'), 5000);
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
        window.scrollTo(0, 0);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      window.scrollTo(0, 0);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>;

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Invalid Link</h2>
          <p className="text-zinc-500 mt-2">This registration link is invalid or has expired. Please contact HR for a new invite.</p>
          <button onClick={() => navigate('/login')} className="mt-6 px-6 py-2 bg-zinc-900 text-white rounded-xl font-semibold">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 italic">MIS Portal</h1>
          <p className="text-zinc-500 mt-2 text-lg">Complete your employee registration, {user?.firstName}</p>
        </div>

        {success ? (
          <div className="bg-white p-12 rounded-3xl border border-zinc-200 shadow-xl text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Registration Complete!</h2>
            <p className="text-zinc-500 mt-3 text-lg">Your profile has been submitted and your account is now active.</p>
            <p className="text-zinc-400 mt-1">Redirecting to login in 5 seconds...</p>
            <button onClick={() => navigate('/login')} className="mt-8 px-8 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all">
              Go to Login Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 font-medium">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Section: Pre-filled Information */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Employment Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Full Name</label>
                  <p className="text-zinc-900 font-medium">{user?.firstName} {user?.lastName}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Work Email</label>
                  <p className="text-zinc-900 font-medium">{user?.email}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Designation</label>
                  <p className="text-zinc-900 font-medium">{user?.designation}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Department</label>
                  <p className="text-zinc-900 font-medium">{user?.department}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Date of Joining</label>
                  <p className="text-zinc-900 font-medium">{user?.dateOfJoining}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Software Role</label>
                  <p className="text-zinc-900 font-medium">{user?.role}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reporting Partner</label>
                  <p className="text-zinc-900 font-medium">{user?.reportingPartner || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reporting Manager</label>
                  <p className="text-zinc-900 font-medium">{user?.reportingManager || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Section: Personal Information */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                  <User size={20} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Gender *</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.gender}
                    onChange={e => setRegData({ ...regData, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Date of Birth *</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.dateOfBirth}
                    onChange={e => setRegData({ ...regData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">PAN Number *</label>
                  <input
                    required
                    type="text"
                    placeholder="ABCDE1234F"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.pan}
                    onChange={e => setRegData({ ...regData, pan: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Aadhaar Number *</label>
                  <input
                    required
                    type="text"
                    placeholder="1234 5678 9012"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.aadhaar}
                    onChange={e => setRegData({ ...regData, aadhaar: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Marital Status *</label>
                  <select
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.maritalStatus}
                    onChange={e => setRegData({ ...regData, maritalStatus: e.target.value })}
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Personal Email ID *</label>
                  <input
                    required
                    type="email"
                    placeholder="personal@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.personalEmail}
                    onChange={e => setRegData({ ...regData, personalEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Personal Mobile Number *</label>
                  <input
                    required
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.personalMobile}
                    onChange={e => setRegData({ ...regData, personalMobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Educational Qualification *</label>
                  <input
                    required
                    type="text"
                    placeholder="B.Tech, MBA, etc."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.educationalQualification}
                    onChange={e => setRegData({ ...regData, educationalQualification: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section: Address Details */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                  <Home size={20} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Address Details</h3>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Current Address *</label>
                    <textarea
                      required
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                      value={regData.currentAddress}
                      onChange={e => setRegData({ ...regData, currentAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">PIN Code *</label>
                    <input
                      required
                      type="text"
                      placeholder="123456"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      value={regData.pin}
                      onChange={e => setRegData({ ...regData, pin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Permanent Address *</label>
                    <button
                      type="button"
                      onClick={() => setRegData({ ...regData, permanentAddress: regData.currentAddress })}
                      className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest"
                    >
                      Same as current
                    </button>
                  </div>
                  <textarea
                    required
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                    value={regData.permanentAddress}
                    onChange={e => setRegData({ ...regData, permanentAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section: Guardian Details */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                  <Users size={20} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Guardian Details</h3>
              </div>
              <div className="space-y-8">
                {/* Guardian 1 */}
                <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Guardian 1</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Name *</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                        value={regData.guardian1Name}
                        onChange={e => setRegData({ ...regData, guardian1Name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Contact Number *</label>
                      <input
                        required
                        type="tel"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                        value={regData.guardian1Contact}
                        onChange={e => setRegData({ ...regData, guardian1Contact: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Address *</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                        value={regData.guardian1Address}
                        onChange={e => setRegData({ ...regData, guardian1Address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Guardian 2 */}
                <div className="p-6 bg-zinc-50 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Guardian 2</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Name *</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                        value={regData.guardian2Name}
                        onChange={e => setRegData({ ...regData, guardian2Name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Contact Number *</label>
                      <input
                        required
                        type="tel"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                        value={regData.guardian2Contact}
                        onChange={e => setRegData({ ...regData, guardian2Contact: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Address *</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                        value={regData.guardian2Address}
                        onChange={e => setRegData({ ...regData, guardian2Address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Bank Details */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                  <CreditCard size={20} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Bank Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Account Number *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.bankDetails.accountNumber}
                    onChange={e => setRegData({ ...regData, bankDetails: { ...regData.bankDetails, accountNumber: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">IFSC Code *</label>
                  <input
                    required
                    type="text"
                    placeholder="SBIN0001234"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.bankDetails.ifscCode}
                    onChange={e => setRegData({ ...regData, bankDetails: { ...regData.bankDetails, ifscCode: e.target.value.toUpperCase() } })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Bank Name *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.bankDetails.bankName}
                    onChange={e => setRegData({ ...regData, bankDetails: { ...regData.bankDetails, bankName: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Branch Name *</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={regData.bankDetails.branchName}
                    onChange={e => setRegData({ ...regData, bankDetails: { ...regData.bankDetails, branchName: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            {/* Section: Attachments & Security */}
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
                <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                  <Upload size={20} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Attachments & Security</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* File Uploads */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Professional Photo *</label>
                    <div className="flex items-center gap-4">
                      {attachments.employeePhoto ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200">
                          <img src={attachments.employeePhoto} alt="Preview" className="w-full h-full object-cover" />
                          <button onClick={() => setAttachments({ ...attachments, employeePhoto: '' })} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><AlertCircle size={12} /></button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center text-zinc-400">
                          <Camera size={24} />
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" id="photo-upload" onChange={e => handleFileChange(e, 'employeePhoto')} />
                      <label htmlFor="photo-upload" className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold cursor-pointer hover:bg-zinc-200 transition-all">
                        Upload Photo
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">PAN Card Attachment *</label>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${attachments.panAttachment ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
                        <FileText size={24} />
                      </div>
                      <input type="file" accept="image/*,application/pdf" className="hidden" id="pan-upload" onChange={e => handleFileChange(e, 'panAttachment')} />
                      <label htmlFor="pan-upload" className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold cursor-pointer hover:bg-zinc-200 transition-all">
                        {attachments.panAttachment ? 'Change File' : 'Upload PAN'}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Aadhaar Card Attachment *</label>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${attachments.aadhaarAttachment ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
                        <FileText size={24} />
                      </div>
                      <input type="file" accept="image/*,application/pdf" className="hidden" id="aadhaar-upload" onChange={e => handleFileChange(e, 'aadhaarAttachment')} />
                      <label htmlFor="aadhaar-upload" className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold cursor-pointer hover:bg-zinc-200 transition-all">
                        {attachments.aadhaarAttachment ? 'Change File' : 'Upload Aadhaar'}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Bank Cheque Book Attachment *</label>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${attachments.chequeBookAttachment ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
                        <FileText size={24} />
                      </div>
                      <input type="file" accept="image/*,application/pdf" className="hidden" id="cheque-upload" onChange={e => handleFileChange(e, 'chequeBookAttachment')} />
                      <label htmlFor="cheque-upload" className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold cursor-pointer hover:bg-zinc-200 transition-all">
                        {attachments.chequeBookAttachment ? 'Change File' : 'Upload Cheque'}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Password Setup */}
                <div className="space-y-6 pt-6 border-t md:border-t-0 md:pt-0 md:border-l border-zinc-100 md:pl-8">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Set Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-xl text-[10px] text-zinc-500 leading-relaxed">
                    <p className="font-bold uppercase tracking-widest mb-1">Security Note</p>
                    By clicking "Activate Account", you agree to the company's terms of service and privacy policy. Your data is encrypted and stored securely.
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={submitting}
              type="submit"
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 shadow-xl shadow-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {submitting ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Processing Registration...
                </>
              ) : (
                <>
                  <CheckCircle2 size={24} />
                  Activate Account & Complete Registration
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('mis_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to parse saved user', e);
      localStorage.removeItem('mis_user');
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('mis_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mis_user');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/register/:token" element={<RegistrationPage />} />

        <Route path="/*" element={
          !user ? <Navigate to="/login" /> : (
            <div className="min-h-screen bg-zinc-50 flex">
              <Sidebar onLogout={handleLogout} />
              <main className="flex-1 ml-64">
                <Routes>
                  <Route path="/" element={
                    <>
                      <Header title="Master Dashboard" user={user} />
                      <Dashboard />
                    </>
                  } />
                  <Route path="/employees/create" element={
                    <>
                      <Header title="Employee Creation" user={user} />
                      <EmployeeCreation />
                    </>
                  } />
                  <Route path="/settings" element={
                    <>
                      <Header title="System Settings" user={user} />
                      <SettingsPage />
                    </>
                  } />
                  <Route path="/employees" element={
                    <>
                      <Header title="Employee Directory" user={user} />
                      <EmployeeList />
                    </>
                  } />
                </Routes>
              </main>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}
