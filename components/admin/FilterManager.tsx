// components/admin/FilterManager.tsx
'use client';

import React, { useState } from 'react';

// Ikoner
const Plus = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const Trash2 = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const X = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;

export default function FilterManager({ filters, onSave, onDelete, onClose, onRestore }: any) {
    const [newFilterLabel, setNewFilterLabel] = useState('');

    const handleSave = () => {
        onSave(newFilterLabel);
        setNewFilterLabel('');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm mb-8 p-8 border-t-4 border-[#991b1b]">
            <div className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold font-serif text-gray-900">Administrer Genveje (Filtre)</h2>
                    <p className="text-gray-600 mt-1">Knapper der oprettes her, dukker nu automatisk op som afkrydsningsbokse på dine vine!</p>
                    <button onClick={onRestore} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors">
                        🛠️ Gendan Carltons Udvalgte
                    </button>
                </div>
                <button onClick={onClose} className="text-gray-400 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus size={20} className="text-[#991b1b]"/> Opret ny knap</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Knaptekst (f.eks. Naturvin)</label>
                            <input className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#991b1b] outline-none" value={newFilterLabel} onChange={e => setNewFilterLabel(e.target.value)} />
                        </div>
                        <button onClick={handleSave} className="w-full bg-[#991b1b] hover:bg-red-900 text-white p-3 rounded-lg font-bold transition-colors">Gem Knap</button>
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-4">Aktive Knapper</h3>
                    <div className="space-y-3">
                        {filters.map((f, idx) => (
                            <div key={idx} className="flex justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div className="font-bold text-gray-800">{f.label}</div>
                                <button onClick={() => onDelete(f.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={20}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}