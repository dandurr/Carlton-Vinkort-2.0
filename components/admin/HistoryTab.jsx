// components/admin/HistoryTab.tsx
'use client';
import React from 'react';

const HistoryIcon = ({size=28, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;

export default function HistoryTab({ historyLogs }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 animate-in fade-in">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <HistoryIcon className="text-[#991b1b]" size={28}/>
                <h2 className="text-2xl font-bold font-serif text-gray-900">Sladrhank (Handlingslog)</h2>
            </div>
            {historyLogs.length === 0 ? (
                <p className="text-gray-500 italic py-10 text-center">Ingen handlinger registreret endnu.</p>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tidspunkt</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vin</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hvad skete der?</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {historyLogs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.createdAt).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{log.wineName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">{log.action}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}