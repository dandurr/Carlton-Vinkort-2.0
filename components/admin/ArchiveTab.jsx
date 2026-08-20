// components/admin/ArchiveTab.tsx
'use client';

import React from 'react';

// Ikoner
const ArchiveIcon = ({size=28, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>;
const Undo = ({size=18, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>;
const Trash2 = ({size=18, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

export default function ArchiveTab({ wines, onRestore, onDelete }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 animate-in fade-in">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <ArchiveIcon className="text-[#991b1b]" size={28}/>
                <h2 className="text-2xl font-bold font-serif text-gray-900">Arkiverede Vine</h2>
            </div>
            
            {wines.length === 0 ? (
                <p className="text-gray-500 italic py-10 text-center">Arkivet er tomt.</p>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {wines.map(wine => (
                                <tr key={wine.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 opacity-75">
                                        <div className="font-bold text-gray-900">{wine.producer}</div>
                                        <div className="text-gray-500 text-sm">{wine.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onRestore(wine)} className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors" title="Gendan til varelager">
                                                <Undo size={18}/>
                                            </button>
                                            <button onClick={() => onDelete(wine)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title="Slet permanent">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}