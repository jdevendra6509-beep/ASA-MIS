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
  Building2,
  FolderKanban,
  ClipboardList,
  X
} from 'lucide-react';
import { UserRole, Employee, DEPARTMENTS, ProjectStatus, JobStatus, JobPriority, Timesheet } from './types';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';

const ai = new (GoogleGenAI as any)({
  apiKey: process.env.GEMINI_API_KEY || "",
  fetch: (...args: any[]) => (window.fetch as any)(...args)
});

// --- Excel Utilities ---
const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

const downloadTemplate = (columns: string[], fileName: string) => {
  const templateData = [columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {})];
  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `${fileName}_template.xlsx`);
};

const importFromExcel = (file: File, callback: (data: any[]) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const bstr = e.target?.result;
    const wb = XLSX.read(bstr, { type: 'binary' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws);
    callback(data);
  };
  reader.readAsBinaryString(file);
};

// --- Components ---

const Sidebar = ({ onLogout }: { onLogout: () => void }) => {
  const location = window.location.pathname;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Employee Master', path: '/employees' },
    { icon: Building2, label: 'Client Master', path: '/clients' },
    { icon: FolderKanban, label: 'Project Master', path: '/projects' },
    { icon: ClipboardList, label: 'Job Master', path: '/jobs' },
    { icon: Calendar, label: 'Timesheet Entry', path: '/timesheets' },
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

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-0 max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Pages ---

const EmployeeMaster = ({ user }: { user: any }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const fetchEmployees = () => {
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
    fetchEmployees();
  }, []);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToExcel(employees, "Employees")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
          >
            <Upload size={16} className="rotate-180" />
            <span>Export</span>
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
            >
              <Upload size={16} />
              <span>Import</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 hidden group-hover:block z-50">
              <button
                onClick={() => downloadTemplate(["firstName", "lastName", "email", "designation", "dateOfJoining", "role", "department", "reportingPartner", "reportingManager"], "Employee")}
                className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <FileText size={14} /> Download Template
              </button>
              <label className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer">
                <Upload size={14} /> Upload Data
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      importFromExcel(file, async (data) => {
                        // Bulk import logic
                        for (const row of data) {
                          await fetch('/api/employees', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(row)
                          });
                        }
                        fetchEmployees();
                      });
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <UserPlus size={18} />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen || !!editingEmployee}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? "Edit Employee" : "Add New Employee"}
      >
        <EmployeeCreation
          user={user}
          initialData={editingEmployee || undefined}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingEmployee(null);
            fetchEmployees();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        title="Employee Details"
      >
        {viewingEmployee && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">First Name</label>
                <p className="text-zinc-900 font-medium">{viewingEmployee.firstName}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Last Name</label>
                <p className="text-zinc-900 font-medium">{viewingEmployee.lastName}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Email</label>
                <p className="text-zinc-900 font-medium">{viewingEmployee.email}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Employee Code</label>
                <p className="text-zinc-900 font-mono">{viewingEmployee.employeeCode}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Role</label>
                <p className="text-zinc-900">{viewingEmployee.role}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Department</label>
                <p className="text-zinc-900">{viewingEmployee.department}</p>
              </div>
            </div>
            <button
              onClick={() => setViewingEmployee(null)}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold"
            >
              Close Details
            </button>
          </div>
        )}
      </Modal>

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
        <div className="overflow-x-auto pb-32">
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
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === emp.id ? null : (emp.id || null))}
                        className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {actionMenuId === emp.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-2xl border border-zinc-200 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                          <button
                            onClick={() => {
                              setViewingEmployee(emp);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Eye size={14} /> View Details
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmployee(emp);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Settings size={14} /> Edit Employee
                          </button>
                          <div className="border-t border-zinc-100 my-1" />
                          <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <LogOut size={14} /> Deactivate
                          </button>
                        </div>
                      )}
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
    </div>
  );
};

const ClientMaster = ({ user }: { user: any }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [viewingClient, setViewingClient] = useState<any | null>(null);

  const fetchClients = () => {
    setLoading(true);
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        setClients(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c =>
    (c.name + ' ' + (c.email || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-zinc-900">Client Master</h3>
          <p className="text-zinc-500 text-sm">Manage your business clients and their contact information.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToExcel(clients, "Clients")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
          >
            <Upload size={16} className="rotate-180" />
            <span>Export</span>
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
            >
              <Upload size={16} />
              <span>Import</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 hidden group-hover:block z-50">
              <button
                onClick={() => downloadTemplate(["name", "email", "phone", "address", "gstNumber", "panNumber"], "Client")}
                className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <FileText size={14} /> Download Template
              </button>
              <label className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer">
                <Upload size={14} /> Upload Data
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      importFromExcel(file, async (data) => {
                        for (const row of data) {
                          await fetch('/api/clients', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(row)
                          });
                        }
                        fetchClients();
                      });
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <Building2 size={18} />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen || !!editingClient}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? "Edit Client" : "Add New Client"}
      >
        <ClientCreation
          user={user}
          initialData={editingClient || undefined}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingClient(null);
            fetchClients();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!viewingClient}
        onClose={() => setViewingClient(null)}
        title="Client Details"
      >
        {viewingClient && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Client Name</label>
                <p className="text-zinc-900 font-medium">{viewingClient.name}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Email</label>
                <p className="text-zinc-900 font-medium">{viewingClient.email}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Phone</label>
                <p className="text-zinc-900">{viewingClient.phone}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">GST Number</label>
                <p className="text-zinc-900 font-mono">{viewingClient.gstNumber || 'N/A'}</p>
              </div>
            </div>
            <button onClick={() => setViewingClient(null)} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold">Close Details</button>
          </div>
        )}
      </Modal>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search by client name or email..."
            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto pb-32">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">GST/PAN</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">Loading...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">No clients found.</td></tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-900">{client.name}</p>
                      <p className="text-xs text-zinc-500">{client.address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-zinc-600 font-medium">{client.email}</p>
                      <p className="text-xs text-zinc-500">{client.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-zinc-600">GST: {client.gst || 'N/A'}</p>
                      <p className="text-xs font-medium text-zinc-600">PAN: {client.pan || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === client.id ? null : client.id)}
                        className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {actionMenuId === client.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-2xl border border-zinc-200 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                          <button
                            onClick={() => {
                              setViewingClient(client);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Eye size={14} /> View Details
                          </button>
                          <button
                            onClick={() => {
                              setEditingClient(client);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Settings size={14} /> Edit Client
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ProjectMaster = ({ user }: { user: any }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [viewingProject, setViewingProject] = useState<any | null>(null);

  const fetchProjects = () => {
    setLoading(true);
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(p =>
    (p.name + ' ' + (p.clientName || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-zinc-900">Project Master</h3>
          <p className="text-zinc-500 text-sm">Organize and manage projects across your client base.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToExcel(projects, "Projects")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
          >
            <Upload size={16} className="rotate-180" />
            <span>Export</span>
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
            >
              <Upload size={16} />
              <span>Import</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 hidden group-hover:block z-50">
              <button
                onClick={() => downloadTemplate(["name", "clientId", "description", "managerId", "startDate", "endDate", "status"], "Project")}
                className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <FileText size={14} /> Download Template
              </button>
              <label className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer">
                <Upload size={14} /> Upload Data
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      importFromExcel(file, async (data) => {
                        for (const row of data) {
                          await fetch('/api/projects', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(row)
                          });
                        }
                        fetchProjects();
                      });
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <FolderKanban size={18} />
            <span>Add New Project</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen || !!editingProject}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        title={editingProject ? "Edit Project" : "Add New Project"}
      >
        <ProjectCreation
          user={user}
          initialData={editingProject || undefined}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingProject(null);
            fetchProjects();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!viewingProject}
        onClose={() => setViewingProject(null)}
        title="Project Details"
      >
        {viewingProject && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Project Name</label>
                <p className="text-zinc-900 font-medium">{viewingProject.name}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Client</label>
                <p className="text-zinc-900">{viewingProject.clientName}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Status</label>
                <p className="text-zinc-900">{viewingProject.status}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Manager</label>
                <p className="text-zinc-900">{viewingProject.managerName}</p>
              </div>
            </div>
            <button onClick={() => setViewingProject(null)} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold">Close Details</button>
          </div>
        )}
      </Modal>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search by project name or client..."
            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto pb-32">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Manager</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading projects...</td></tr>
              ) : filteredProjects.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No projects found.</td></tr>
              ) : (
                filteredProjects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-900">{proj.name}</p>
                      <p className="text-xs text-zinc-500">Code: {proj.code}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{proj.clientName}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{proj.managerId}</td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {proj.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === proj.id ? null : proj.id)}
                        className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {actionMenuId === proj.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-2xl border border-zinc-200 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                          <button
                            onClick={() => {
                              setViewingProject(proj);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Eye size={14} /> View Details
                          </button>
                          <button
                            onClick={() => {
                              setEditingProject(proj);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Settings size={14} /> Edit Project
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const JobMaster = ({ user }: { user: any }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [viewingJob, setViewingJob] = useState<any | null>(null);

  const fetchJobs = () => {
    setLoading(true);
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(j =>
    (j.title + ' ' + (j.projectName || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-zinc-900">Job Master</h3>
          <p className="text-zinc-500 text-sm">Track and assign specific tasks and jobs within projects.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToExcel(jobs, "Jobs")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
          >
            <Upload size={16} className="rotate-180" />
            <span>Export</span>
          </button>
          <div className="relative group">
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
            >
              <Upload size={16} />
              <span>Import</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 hidden group-hover:block z-50">
              <button
                onClick={() => downloadTemplate(["title", "projectId", "description", "assigneeId", "dueDate", "status", "priority"], "Job")}
                className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
              >
                <FileText size={14} /> Download Template
              </button>
              <label className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer">
                <Upload size={14} /> Upload Data
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      importFromExcel(file, async (data) => {
                        for (const row of data) {
                          await fetch('/api/jobs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(row)
                          });
                        }
                        fetchJobs();
                      });
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <ClipboardList size={18} />
            <span>Add New Job</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen || !!editingJob}
        onClose={() => {
          setIsModalOpen(false);
          setEditingJob(null);
        }}
        title={editingJob ? "Edit Job" : "Add New Job"}
      >
        <JobCreation
          user={user}
          initialData={editingJob || undefined}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingJob(null);
            fetchJobs();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!viewingJob}
        onClose={() => setViewingJob(null)}
        title="Job Details"
      >
        {viewingJob && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Job Title</label>
                <p className="text-zinc-900 font-medium">{viewingJob.title}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Project</label>
                <p className="text-zinc-900">{viewingJob.projectName}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Assignee</label>
                <p className="text-zinc-900">{viewingJob.assigneeName}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase">Status</label>
                <p className="text-zinc-900">{viewingJob.status}</p>
              </div>
            </div>
            <button onClick={() => setViewingJob(null)} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-semibold">Close Details</button>
          </div>
        )}
      </Modal>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search by job title or project..."
            className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto pb-32">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading jobs...</td></tr>
              ) : filteredJobs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No jobs found.</td></tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-zinc-900">{job.title}</p>
                      <p className="text-xs text-zinc-500">{job.description?.substring(0, 40)}...</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{job.projectName}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border",
                        job.priority === 'High' ? "bg-red-50 text-red-700 border-red-100" : "bg-zinc-50 text-zinc-700 border-zinc-100"
                      )}>
                        {job.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === job.id ? null : job.id)}
                        className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {actionMenuId === job.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-2xl border border-zinc-200 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                          <button
                            onClick={() => {
                              setViewingJob(job);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Eye size={14} /> View Details
                          </button>
                          <button
                            onClick={() => {
                              setEditingJob(job);
                              setActionMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                          >
                            <Settings size={14} /> Edit Job
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TimesheetEntry = ({ user }: { user: any }) => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    hours: 8,
    status: 'Draft',
    employeeId: user?.id || user?.employeeCode,
    clientId: '',
    projectId: '',
    jobId: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tsRes, clRes, projRes, jobRes] = await Promise.all([
        fetch('/api/timesheets'),
        fetch('/api/clients'),
        fetch('/api/projects'),
        fetch('/api/jobs')
      ]);
      const [tsData, clData, projData, jobData] = await Promise.all([
        tsRes.json(),
        clRes.json(),
        projRes.json(),
        jobRes.json()
      ]);
      setTimesheets(tsData);
      setClients(clData);
      setProjects(projData);
      setJobs(jobData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.date || !formData.hours || !formData.jobId) {
      alert("Please fill all required fields");
      return;
    }

    const project = projects.find(p => p.id === formData.projectId);
    const job = jobs.find(j => j.id === formData.jobId);
    const client = clients.find(c => c.id === formData.clientId);

    const submission = {
      ...formData,
      employeeId: user?.id || user?.employeeCode,
      employeeName: `${user?.firstName} ${user?.lastName}`,
      projectName: project?.name,
      jobTitle: job?.title,
      clientName: client?.name
    };

    try {
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({
          date: new Date().toISOString().split('T')[0],
          hours: 8,
          status: 'Draft',
          employeeId: user?.id || user?.employeeCode,
          clientId: '',
          projectId: '',
          jobId: '',
          description: ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProjects = projects.filter(p => p.clientId === formData.clientId);
  const filteredJobs = jobs.filter(j => j.projectId === formData.projectId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-zinc-900">Timesheet Entry</h3>
          <p className="text-zinc-500 text-sm">Log and track daily work hours across different projects.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToExcel(timesheets, "Timesheets")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all text-sm"
          >
            <Upload size={16} className="rotate-180" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <Calendar size={18} />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Work Hours"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-zinc-700">Employee</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-500 outline-none cursor-not-allowed"
                value={`${user?.firstName} ${user?.lastName}`}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Client</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none"
                value={formData.clientId}
                onChange={e => setFormData({ ...formData, clientId: e.target.value, projectId: '', jobId: '' })}
                required
              >
                <option value="">Select Client</option>
                {clients.map(cl => (
                  <option key={cl.id} value={cl.id}>{cl.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Project</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
                value={formData.projectId}
                onChange={e => setFormData({ ...formData, projectId: e.target.value, jobId: '' })}
                required
                disabled={!formData.clientId}
              >
                <option value="">Select Project</option>
                {filteredProjects.map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Job</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
                value={formData.jobId}
                onChange={e => setFormData({ ...formData, jobId: e.target.value })}
                required
                disabled={!formData.projectId}
              >
                <option value="">Select Job</option>
                {filteredJobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Date</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Hours</label>
              <input
                type="number"
                step="0.5"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none"
                value={formData.hours}
                onChange={e => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Status</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
              </select>
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-zinc-700">Work Description</label>
              <textarea
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none h-24 resize-none"
                placeholder="Describe what you worked on..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all shadow-lg shadow-zinc-200"
            >
              Save Entry
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Client & Project</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Job</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Loading timesheets...</td></tr>
              ) : timesheets.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No entries recorded yet.</td></tr>
              ) : (
                timesheets.map((ts) => (
                  <tr key={ts.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">{ts.date}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{ts.employeeName}</td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      <div className="font-medium text-zinc-900">{(ts as any).clientName}</div>
                      <div className="text-xs text-zinc-400">{ts.projectName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{ts.jobTitle || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-900">{ts.hours}h</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border",
                        ts.status === 'Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          ts.status === 'Submitted' ? "bg-blue-50 text-blue-700 border-blue-100" :
                            "bg-zinc-50 text-zinc-700 border-zinc-100"
                      )}>
                        {ts.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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

  const roles = [
    { key: "MASTER_ADMIN", label: "MASTER ADMIN" },
    { key: "ADMIN", label: "ADMIN" },
    { key: "OWNER", label: "OWNER" },
    { key: "PARTNER", label: "PARTNER" },
    { key: "MANAGER", label: "MANAGER" },
    { key: "EMPLOYEE", label: "EMPLOYEE" }
  ];

  const permissionTypes = [
    { key: "view_dashboard", label: "View Dashboard" },
    { key: "create_employee", label: "Create Employee" },
    { key: "view_employee_list", label: "View Employee List" },
    { key: "manage_settings", label: "Manage Settings" },
    { key: "view_reports", label: "View Reports" }
  ];

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
        setPermissions(prev => {
          const exists = prev.find(p => p.role === role && p.permission === permission);
          if (exists) {
            return prev.map(p => (p.role === role && p.permission === permission) ? { ...p, enabled: !current ? 1 : 0 } : p);
          } else {
            return [...prev, { role, permission, enabled: !current ? 1 : 0 }];
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isEnabled = (role: string, permission: string) => {
    return permissions.find(p => p.role === role && p.permission === permission)?.enabled === 1;
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-400" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mt-8">
      <div className="p-6 border-b border-zinc-100 pb-2">
        <h3 className="text-xl font-bold text-zinc-900">Role Access Control</h3>
        <p className="text-sm text-zinc-500">Manage permissions for each administrative role.</p>
      </div>
      <div className="overflow-x-auto p-6 pt-2">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="py-6 px-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">PERMISSION</th>
              {roles.map(role => (
                <th key={role.key} className="py-6 px-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-center">{role.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {permissionTypes.map(perm => (
              <tr key={perm.key} className="group hover:bg-zinc-50/50 transition-colors">
                <td className="py-6 px-4">
                  <span className="text-sm font-bold text-zinc-700">{perm.label}</span>
                </td>
                {roles.map(role => {
                  const enabled = isEnabled(role.key, perm.key);
                  return (
                    <td key={role.key} className="py-6 px-4 text-center">
                      <button
                        onClick={() => togglePermission(role.key, perm.key, enabled)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none",
                          enabled ? "bg-zinc-900" : "bg-zinc-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            enabled ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LoginProfileManager = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        setEmployees(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const profiles = {
    'Partner Login Profiles': employees.filter(e => e.role === UserRole.PARTNER || e.role === UserRole.OWNER),
    'Manager Login Profiles': employees.filter(e => e.role === UserRole.MANAGER),
    'User Login Profiles': employees.filter(e => e.role === UserRole.EMPLOYEE || e.role === UserRole.ADMIN),
  };

  const toggleStatus = async (user: any) => {
    const newStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const resendInvite = async (user: any) => {
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Invitation link for ${user.firstName} has been prepared. Token: ${data.token}`);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 mt-8">
      {Object.entries(profiles).map(([title, users]) => (
        <div key={title} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
            <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
            <p className="text-sm text-zinc-500">Manage login credentials and access for {title.toLowerCase()}.</p>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No profiles found in this category.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-zinc-900">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-zinc-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{u.role}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                          u.status === 'Active' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        )}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => toggleStatus(u)} className="text-xs font-bold text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white shadow-sm transition-all hover:bg-zinc-50">
                          {u.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => resendInvite(u)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50 shadow-sm transition-all hover:bg-emerald-100/50">
                          Re-invite
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmployeeCreation = ({ user, onSuccess, initialData }: { user: any, onSuccess?: () => void, initialData?: Employee }) => {
  const [formData, setFormData] = useState<Employee>(initialData || {
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

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    const loadDropdownData = () => {
      // Fetch partners for the dropdown
      fetch(`/api/users/by-role/${UserRole.PARTNER}`)
        .then(res => res.json())
        .then(setPartners)
        .catch(err => console.error('Error fetching partners:', err));

      // Fetch active managers for the dropdown
      fetch(`/api/users/by-role/${UserRole.MANAGER}`)
        .then(res => res.json())
        .then(setManagers)
        .catch(err => console.error('Error fetching managers:', err));
    }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setWarning(null);
    setError(null);

    // Final check for mandatory fields based on role
    const isPartner = formData.role === UserRole.PARTNER;
    const isManager = formData.role === UserRole.MANAGER;

    if (!isPartner && !formData.reportingPartner) {
      setError("Reporting Partner is mandatory");
      setLoading(false);
      return;
    }

    if (!isPartner && !isManager && !formData.reportingManager) {
      setError("Reporting Manager is mandatory");
      setLoading(false);
      return;
    }

    try {
      const url = initialData?.id ? `/api/users/${initialData.id}` : '/api/employees';
      const method = initialData?.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, adminId: user?.id }),
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
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
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
    <div className="bg-white">
      <div className="p-8 space-y-6">
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
                <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Reporting Partner *</label>
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
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={formData.reportingManager}
                  onChange={e => setFormData({ ...formData, reportingManager: e.target.value })}
                >
                  <option value="">Select Manager</option>
                  {managers.map(m => (
                    <option key={m.id} value={`${m.firstName} ${m.lastName}`}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
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

const ClientCreation = ({ user, onSuccess, initialData }: { user: any, onSuccess?: () => void, initialData?: any }) => {
  const [formData, setFormData] = useState(initialData || { name: '', email: '', phone: '', address: '', gstNumber: '', panNumber: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = initialData?.id ? `/ api / clients / ${initialData.id}` : '/api/clients';
      const method = initialData?.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccess(true);
        setFormData({ name: '', email: '', phone: '', address: '', gstNumber: '', panNumber: '' });
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
        setTimeout(() => setSuccess(false), 5000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create client");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18} />{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 size={18} />Client created successfully!</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Client Name *</label>
            <input required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Email ID *</label>
            <input required type="email" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Phone Number *</label>
            <input required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">GST Number</label>
            <input className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Address *</label>
            <textarea required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>
        </div>
        <button disabled={loading} type="submit" className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-xl shadow-zinc-200">
          {loading && <Loader2 size={18} className="animate-spin" />}
          Create Client
        </button>
      </form>
    </div>
  );
};

const ProjectCreation = ({ user, onSuccess, initialData }: { user: any, onSuccess?: () => void, initialData?: any }) => {
  const [formData, setFormData] = useState(initialData || { name: '', description: '', clientId: '', clientName: '', managerId: '', managerName: '', startDate: '', status: ProjectStatus.NOT_STARTED });
  const [clients, setClients] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    fetch('/api/clients').then(res => res.json()).then(setClients);
    fetch(`/api/users/by-role/${UserRole.MANAGER}`).then(res => res.json()).then(setManagers);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = initialData?.id ? `/ api / projects / ${initialData.id}` : '/api/projects';
      const method = initialData?.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccess(true);
        setFormData({ name: '', description: '', clientId: '', clientName: '', managerId: '', managerName: '', startDate: '', status: ProjectStatus.NOT_STARTED });
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
        setTimeout(() => setSuccess(false), 5000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create project");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18} />{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 size={18} />Project created successfully!</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Project Name *</label>
            <input required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Client *</label>
            <select required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none bg-white focus:ring-2 focus:ring-zinc-500/10" value={formData.clientId} onChange={e => {
              const client = clients.find(c => c.id === e.target.value);
              setFormData({ ...formData, clientId: e.target.value, clientName: client?.name || '' });
            }}>
              <option value="">Select Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Project Manager *</label>
            <select required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none bg-white focus:ring-2 focus:ring-zinc-500/10" value={formData.managerId} onChange={e => {
              const mgr = managers.find(m => m.id === e.target.value);
              setFormData({ ...formData, managerId: e.target.value, managerName: `${mgr?.firstName} ${mgr?.lastName}` });
            }}>
              <option value="">Select Manager</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Start Date *</label>
            <input required type="date" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Description</label>
            <textarea className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>
        <button disabled={loading} type="submit" className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-xl shadow-zinc-200">
          {loading && <Loader2 size={18} className="animate-spin" />}
          Create Project
        </button>
      </form>
    </div>
  );
};

const JobCreation = ({ user, onSuccess, initialData }: { user: any, onSuccess?: () => void, initialData?: any }) => {
  const [formData, setFormData] = useState(initialData || { title: '', description: '', projectId: '', projectName: '', assigneeId: '', assigneeName: '', dueDate: '', status: JobStatus.OPEN, priority: JobPriority.MEDIUM });
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setProjects);
    fetch('/api/employees').then(res => res.json()).then(setEmployees);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = initialData?.id ? `/ api / jobs / ${initialData.id}` : '/api/jobs';
      const method = initialData?.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSuccess(true);
        setFormData({ title: '', description: '', projectId: '', projectName: '', assigneeId: '', assigneeName: '', dueDate: '', status: JobStatus.OPEN, priority: JobPriority.MEDIUM });
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
        setTimeout(() => setSuccess(false), 5000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create job");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18} />{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 size={18} />Job created successfully!</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Job Title *</label>
            <input required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Project *</label>
            <select required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none bg-white focus:ring-2 focus:ring-zinc-500/10" value={formData.projectId} onChange={e => {
              const project = projects.find(p => p.id === e.target.value);
              setFormData({ ...formData, projectId: e.target.value, projectName: project?.name || '' });
            }}>
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Assign To *</label>
            <select required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none bg-white focus:ring-2 focus:ring-zinc-500/10" value={formData.assigneeId} onChange={e => {
              const emp = employees.find(emp => (emp.id || emp.employeeCode) === e.target.value);
              setFormData({ ...formData, assigneeId: e.target.value, assigneeName: emp ? `${emp.firstName} ${emp.lastName}` : '' });
            }}>
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id || emp.employeeCode} value={emp.id || emp.employeeCode}>{emp.firstName} {emp.lastName}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Due Date *</label>
            <input required type="date" className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Priority *</label>
            <select required className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none bg-white focus:ring-2 focus:ring-zinc-500/10" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as JobPriority })}>
              {Object.values(JobPriority).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">Description</label>
            <textarea className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-500/10" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
        </div>
        <button disabled={loading} type="submit" className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-xl shadow-zinc-200">
          {loading && <Loader2 size={18} className="animate-spin" />}
          Create Job
        </button>
      </form>
    </div>
  );
};

const SettingsPage = ({ user }: { user: any }) => {
  const [outlookStatus, setOutlookStatus] = useState<{ connected: boolean; account?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetch(`/ api / settings / outlook / ${user.id}`)
        .then(res => res.json())
        .then(setOutlookStatus);
    }
  }, [user?.id]);

  const handleConnectOutlook = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/ api / auth / outlook / url ? userId = ${user?.id}`);
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
      if (event.data?.type === 'OUTLOOK_AUTH_SUCCESS' && user?.id) {
        fetch(`/ api / settings / outlook / ${user.id}`)
          .then(res => res.json())
          .then(setOutlookStatus);
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
            <h3 className="text-lg font-semibold text-zinc-900">Personal Outlook Account</h3>
            <p className="text-sm text-zinc-500">Connect your Outlook account to sync work logs and communications.</p>
          </div>
          <div className="p-8">
            {outlookStatus?.connected ? (
              <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                    <Mail size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">{outlookStatus.account}</div>
                    <div className="text-xs text-emerald-600 font-medium">Successfully Connected</div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to disconnect your Outlook account?')) {
                      await fetch('/api/settings/outlook/disconnect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user?.id })
                      });
                      setOutlookStatus({ connected: false });
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="w-20 h-20 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300">
                  <Mail size={40} />
                </div>
                <div className="text-center space-y-1">
                  <div className="text-lg font-bold text-zinc-900">Connect your Outlook</div>
                  <p className="text-sm text-zinc-500 max-w-xs">Allow MIS to access your work logs and calendar for better synchronization.</p>
                </div>
                <button
                  onClick={handleConnectOutlook}
                  disabled={loading}
                  className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 flex items-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                  <span>Connect with Outlook</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-zinc-900">Login Profiles Management</h3>
          </div>
          <LoginProfileManager />
        </section>

        <PermissionsManager />
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

    // Basic validation for attachments
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
                      <div className={`p - 3 rounded - xl ${attachments.panAttachment ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
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
                      <div className={`p - 3 rounded - xl ${attachments.aadhaarAttachment ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
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
                      <div className={`p - 3 rounded - xl ${attachments.chequeBookAttachment ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
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
                  <Route path="/employees" element={
                    <>
                      <Header title="Employee Master" user={user} />
                      <EmployeeMaster user={user} />
                    </>
                  } />
                  <Route path="/clients" element={
                    <>
                      <Header title="Client Master" user={user} />
                      <ClientMaster user={user} />
                    </>
                  } />
                  <Route path="/projects" element={
                    <>
                      <Header title="Project Master" user={user} />
                      <ProjectMaster user={user} />
                    </>
                  } />
                  <Route path="/jobs" element={
                    <>
                      <Header title="Job Master" user={user} />
                      <JobMaster user={user} />
                    </>
                  } />
                  <Route path="/timesheets" element={
                    <>
                      <Header title="Timesheet Entry" user={user} />
                      <TimesheetEntry user={user} />
                    </>
                  } />
                  <Route path="/settings" element={
                    <>
                      <Header title="System Settings" user={user} />
                      <SettingsPage user={user} />
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
