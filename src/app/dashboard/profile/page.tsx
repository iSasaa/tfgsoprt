"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, LogOut, Shield, ChevronRight, Check, X, Trash2, AlertTriangle } from "lucide-react";
import { api } from "~/trpc/react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [activeSection, setActiveSection] = useState<"general" | "security">("general");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.search) {
      router.replace("/dashboard/profile");
    }
  }, [router]);

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async () => {
      await updateSession();
      window.location.reload();
    }
  });

  const updatePassword = api.user.updatePassword.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const deleteAccount = api.user.deleteAccount.useMutation({
    onSuccess: () => {
      signOut({ callbackUrl: "/" });
    },
    onError: (err) => {
      alert("Error deleting account: " + err.message);
    }
  });

  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ name, email });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    updatePassword.mutate({ oldPassword, newPassword });
  };

  return (
    <div className="min-h-full bg-[#f8fafc] py-10 relative z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">

          <div className="w-full md:w-64 flex-shrink-0 space-y-2">
            <div className="p-4 mb-6 bg-slate-900 rounded-2xl text-center shadow-xl shadow-slate-200">
              <div className="h-16 w-16 bg-orange-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-black">
                {session?.user?.name?.[0]?.toUpperCase() || <User />}
              </div>
              <h3 className="text-white font-black uppercase tracking-tighter truncate">{session?.user?.name}</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{session?.user?.email}</p>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveSection("general")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSection === "general" ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-slate-400 hover:bg-slate-100"}`}
              >
                <div className="flex items-center gap-3">
                  <User size={16} />
                  General
                </div>
                <ChevronRight size={14} className={activeSection === "general" ? "opacity-100" : "opacity-0"} />
              </button>
              <button
                onClick={() => setActiveSection("security")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSection === "security" ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-slate-400 hover:bg-slate-100"}`}
              >
                <div className="flex items-center gap-3">
                  <Shield size={16} />
                  Security
                </div>
                <ChevronRight size={14} className={activeSection === "security" ? "opacity-100" : "opacity-0"} />
              </button>

              <div className="h-px bg-slate-100 my-4" />

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </nav>
          </div>

          <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeSection === "general" ? (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-8"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Account Settings</h2>
                    <p className="text-sm text-slate-400 font-medium">Manage your personal information and preferences.</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={updateProfile.isPending}
                        className="px-8 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {updateProfile.isPending ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-8"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Security & Privacy</h2>
                    <p className="text-sm text-slate-400 font-medium">Update your password and protect your account.</p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                          type="password"
                          required
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={updatePassword.isPending}
                        className="w-full px-8 py-4 bg-orange-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-orange-100 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {updatePassword.isPending ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>

                  <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex gap-4">
                      <Shield className="text-orange-500" size={24} />
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest mb-1">Account Protection</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          We recommend using a strong password that you don't use for other online accounts.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-red-100">
                    <div className="flex items-center justify-between p-6 bg-red-50 rounded-3xl border border-red-100">
                      <div>
                        <h4 className="text-sm font-black uppercase text-red-600 tracking-tight">Danger Zone</h4>
                        <p className="text-[11px] text-red-400 font-bold">Permanently delete your account and all associated data.</p>
                      </div>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="px-6 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-100 active:scale-95"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDeleteModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-[40px] shadow-2xl p-8 w-full max-w-sm border-t-8 border-red-500"
              >
                <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto">
                  <AlertTriangle size={32} />
                </div>

                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight text-center mb-2">Delete Account?</h3>
                <p className="text-sm text-slate-500 text-center leading-relaxed mb-8">
                  This action is <span className="text-red-500 font-black italic">permanent</span>. All your drills, sessions, teams and clubs will be lost forever.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => deleteAccount.mutate()}
                    disabled={deleteAccount.isPending}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-red-100 disabled:opacity-50"
                  >
                    {deleteAccount.isPending ? "Deleting..." : "Confirm Deletion"}
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
