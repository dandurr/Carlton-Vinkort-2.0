// components/admin/SyncTab.tsx
'use client';
import React, { useState } from 'react';

const Activity = ({size=28, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

export default function SyncTab({ syncLogs }) {
    const [expandedSync, setExpandedSync] = useState(null);

    return (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 animate-in fade-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <div className="flex items-center gap-3">
                    <Activity className="text-[#991b1b]" size={28}/>
                    <h2 className="text-2xl font-bold font-serif text-gray-900">NemPOS Integration</h2>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">CRON Job Logs</span>
            </div>
            
            {syncLogs.length === 0 ? (
                <p className="text-gray-500 italic py-10 text-center">Ingen kørsler registreret endnu.</p>
            ) : (
                <div className="space-y-4">
                    {syncLogs.map(log => {
                        const isSuccess = log.status === 'success';
                        const isExpanded = expandedSync === log.id;
                        const hasDetails = log.details && log.details.length > 0;
                        
                        return (
                            <div key={log.id} className={`border p-5 rounded-xl transition-all ${!isSuccess ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => hasDetails && setExpandedSync(isExpanded ? null : log.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${!isSuccess ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                        <div>
                                            <div className="font-bold text-gray-900">{new Date(log.createdAt).toLocaleString('da-DK', { dateStyle: 'full', timeStyle: 'short' })}</div>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {!isSuccess ? (
                                                    <span className="text-red-600 font-medium">Fejl: {log.error}</span>
                                                ) : (
                                                    <span>{log.processedCount} {log.processedCount === 1 ? 'vare' : 'varer'} opdateret</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isSuccess && hasDetails && (
                                        <button className="text-sm font-medium text-[#991b1b] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200">
                                            {isExpanded ? 'Skjul detaljer' : 'Vis detaljer'}
                                        </button>
                                    )}
                                </div>
                                
                                {isExpanded && isSuccess && hasDetails && (
                                    <div className="mt-5 pt-5 border-t border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            Opdateret Lager
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-100 text-gray-500 font-bold uppercase tracking-wider text-xs">
                                                    <tr>
                                                        <th className="px-4 py-3">Varenavn</th>
                                                        <th className="px-4 py-3">PLU</th>
                                                        <th className="px-4 py-3 text-right">Fratrukket</th>
                                                        <th className="px-4 py-3 text-right">Nyt Lager</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {log.details.map((detail, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-medium text-gray-800">{detail.name}</td>
                                                            <td className="px-4 py-3 font-mono text-gray-500">{detail.plu || detail.sku}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-red-600">
                                                                -{parseFloat(Math.abs(detail.deducted).toFixed(2)).toString().replace('.', ',')}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                                {parseFloat(Number(detail.newStock).toFixed(2)).toString().replace('.', ',')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}