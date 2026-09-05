import React, { useState } from 'react';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Shield,
  UserCheck,
  Building2,
  Mail,
  MoreVertical,
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'Inventory Manager' | 'Storekeeper' | 'Procurement Officer' | 'Auditor';
  location: string;
  status: 'Active' | 'Suspended';
  last_login: string;
}

const INITIAL_USERS: StaffUser[] = [
  { id: 'usr_1', name: 'Abhishek Sharma', email: 'abhishek@zolexora.com', role: 'Inventory Manager', location: 'ALL (Enterprise)', status: 'Active', last_login: 'Today at 10:45 AM' },
  { id: 'usr_2', name: 'Rohan Deshmukh', email: 'rohan.d@zolexora.com', role: 'Storekeeper', location: 'S_001 (Main Warehouse)', status: 'Active', last_login: 'Today at 08:30 AM' },
  { id: 'usr_3', name: 'Megha Iyer', email: 'megha.i@zolexora.com', role: 'Procurement Officer', location: 'ALL (Enterprise)', status: 'Active', last_login: 'Yesterday at 04:15 PM' },
  { id: 'usr_4', name: 'Sanjay Rawat', email: 'sanjay.r@zolexora.com', role: 'Storekeeper', location: 'S_002 (Branch Store)', status: 'Active', last_login: 'Sep 03 at 11:20 AM' },
  { id: 'usr_5', name: 'Kavita Menon', email: 'kavita.m@zolexora.com', role: 'Auditor', location: 'ALL (Enterprise)', status: 'Active', last_login: 'Aug 29 at 02:00 PM' },
];

export default function Users() {
  const [users, setUsers] = useState<StaffUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Storekeeper' as const,
    location: 'S_001 (Main Warehouse)',
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;

    const created: StaffUser = {
      id: `usr_${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      location: newUser.location,
      status: 'Active',
      last_login: 'Invited (Pending)',
    };

    setUsers([...users, created]);
    setIsAddModalOpen(false);
    setNewUser({
      name: '',
      email: '',
      role: 'Storekeeper',
      location: 'S_001 (Main Warehouse)',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-indigo-400" />
            Inventory Users & Staff Permissions
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage storekeepers, procurement officers, auditors, and warehouse access roles
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#12141f] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name or email address..."
            className="w-full bg-[#181a28] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#181a28] border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2 outline-hidden cursor-pointer"
          >
            <option value="All">All Staff Roles</option>
            <option value="Inventory Manager">Inventory Manager</option>
            <option value="Storekeeper">Storekeeper</option>
            <option value="Procurement Officer">Procurement Officer</option>
            <option value="Auditor">Auditor</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#12141f] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#161826] border-b border-white/10 text-slate-400 font-medium">
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-4">Assigned Location</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <span>{user.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{user.email}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{user.location}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{user.last_login}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#12141f] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-indigo-400" />
              Invite Team Member
            </h2>

            <form onSubmit={handleAddUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Anand Joshi"
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@zolexora.com"
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Role / Permissions</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                >
                  <option value="Storekeeper">Storekeeper (Issuance & Receipts)</option>
                  <option value="Inventory Manager">Inventory Manager (Full SKU & Valuation)</option>
                  <option value="Procurement Officer">Procurement Officer (POs & Suppliers)</option>
                  <option value="Auditor">Auditor (Read-only reports)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Location</label>
                <select
                  value={newUser.location}
                  onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                  className="w-full bg-[#181a28] border border-white/10 rounded-xl px-3 py-2 text-white outline-hidden focus:border-indigo-500"
                >
                  <option value="ALL (Enterprise)">ALL (Enterprise / All Sites)</option>
                  <option value="S_001 (Main Warehouse)">Store 1 (Main Warehouse S_001)</option>
                  <option value="S_002 (Branch Store)">Store 2 (Branch Store S_002)</option>
                  <option value="Central Hub">Central Distribution Hub</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md transition"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
