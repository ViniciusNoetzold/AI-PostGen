'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Calendar, ArrowRight, PenTool, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

type DashboardData = {
  totalContacts: number;
  totalInteractions: number;
  activeLeads: number;
  conversionRate: number;
  statusCounts: { name: string; value: number }[];
  upcomingReminders: { id: string, message: string, date: string, contact: { name: string } }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(err => setError(err.message));
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-slate-400 mt-1">Track your interactions and AI insights.</p>
        </div>
        
        {/* Quick Access Buttons */}
        <div className="flex gap-4">
          <Link href="/ai-post-gen" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-pink-500/20">
            <PenTool className="w-5 h-5" />
            AI Post Gen
          </Link>
          <Link href="/studio" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20">
            <ImageIcon className="w-5 h-5" />
            Product Studio
          </Link>
        </div>
      </header>

      {error ? (
        <div className="p-8 text-pink-400 bg-slate-900 rounded-2xl border border-slate-800">Error: {error}</div>
      ) : !data ? (
        <div className="p-8 text-slate-400 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-t-transparent border-slate-400 rounded-full animate-spin"></div>
          Loading dashboard...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Contacts', value: data.totalContacts },
              { label: 'Interactions', value: data.totalInteractions },
              { label: 'Active Leads', value: data.activeLeads },
              { label: 'Conversion Rate', value: `${data.conversionRate}%` },
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col relative overflow-hidden group hover:border-slate-700 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-800/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500 ease-out"></div>
                <span className="text-sm font-medium text-slate-400 relative z-10">{stat.label}</span>
                <span className="text-3xl font-bold text-white mt-2 relative z-10">{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 h-[400px] flex flex-col lg:col-span-1">
              <h2 className="text-lg font-semibold text-white mb-4">Leads by Status</h2>
              <div className="flex-1 flex items-center justify-center text-slate-500">
                Chart Placeholder
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 h-[400px] flex flex-col lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" /> Upcoming Reminders & Actions
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {data.upcomingReminders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <Calendar className="w-8 h-8 mb-2 opacity-50" />
                    <p>No pending reminders.</p>
                  </div>
                ) : (
                  data.upcomingReminders.map(rem => (
                    <div key={rem.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center group hover:border-pink-500/50 transition-colors">
                      <div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          <span className="text-pink-400">{rem.contact.name}</span>
                        </div>
                        <div className="text-slate-400 text-sm mt-1">{rem.message}</div>
                        <div className="text-xs text-slate-500 mt-2">{new Date(rem.date).toLocaleDateString()}</div>
                      </div>
                      <Link href={`/contacts`} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
