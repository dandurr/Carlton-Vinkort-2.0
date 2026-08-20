'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot, setDoc } from "firebase/firestore";
import { app, auth, db } from '@/lib/firebase';
import Link from 'next/link';

// --- VORES BYGGEKLODSER ---
import WineFormModal from '@/components/admin/WineFormModal';
import WineTable from '@/components/admin/WineTable';
import FilterManager from '@/components/admin/FilterManager';
import ArchiveTab from '@/components/admin/ArchiveTab';
import HistoryTab from '@/components/admin/HistoryTab'; // NY
import SyncTab from '@/components/admin/SyncTab'; // NY
import FeedbackTab from '@/components/admin/FeedbackTab'; // NY

// --- ICONS ---
const Search = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const X = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const LogOut = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const Printer = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>;
const Download = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const Plus = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const Check = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>;
const Settings = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const HistoryIcon = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const MessageSquare = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const Activity = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const ArchiveIcon = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>;

export default function AdminVinkort() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  const [wines, setWines] = useState([]);
  const [filters, setFilters] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  const [adminTab, setAdminTab] = useState('wines');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false); 
  const [editingWine, setEditingWine] = useState(null);
  const [stockAdjustWine, setStockAdjustWine] = useState(null); 
  
  const [adminSort, setAdminSort] = useState('producer_asc');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminTypeFilter, setAdminTypeFilter] = useState('all');
  const [showSoldOut, setShowSoldOut] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertDialog, setAlertDialog] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const unsubConfig = onSnapshot(doc(db, 'wines', 'config'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().filters) setFilters(docSnap.data().filters);
    });

    const unsubWines = onSnapshot(collection(db, 'wines'), (snapshot) => {
      const loadedWines = [];
      snapshot.forEach(doc => { if (doc.id !== 'config') loadedWines.push({ id: doc.id, ...doc.data() }); });
      setWines(loadedWines);
    });

    const unsubFeedback = onSnapshot(collection(db, 'feedback'), (snapshot) => {
        const fb = [];
        snapshot.forEach(doc => fb.push({ id: doc.id, ...doc.data() }));
        fb.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setFeedbacks(fb);
    });

    const unsubSync = onSnapshot(collection(db, 'sync_logs'), (snapshot) => {
        const logs = [];
        snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
        logs.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setSyncLogs(logs);
    });

    const unsubHistory = onSnapshot(collection(db, 'history_logs'), (snapshot) => {
        const logs = [];
        snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
        logs.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setHistoryLogs(logs.slice(0, 100));
    });

    return () => { unsubConfig(); unsubWines(); unsubFeedback(); unsubSync(); unsubHistory(); };
  }, [user]);

  const adminSuggestions = useMemo(() => {
    const s = { producers: new Set(), classifications: new Set(), regions: new Set(), countries: new Set() };
    wines.forEach(w => {
      if(w.producer) s.producers.add(w.producer);
      if(w.classification) s.classifications.add(w.classification);
      if(w.region) s.regions.add(w.region);
      if(w.country) s.countries.add(w.country);
    });
    return { producers: Array.from(s.producers).sort(), classifications: Array.from(s.classifications).sort(), regions: Array.from(s.regions).sort(), countries: Array.from(s.countries).sort() };
  }, [wines]);

  const adminWines = useMemo(() => {
      let res = [...wines].filter(w => !w.isArchived);
      if (showSoldOut) res = res.filter(w => w.isSoldOut);
      if (adminSearch) {
          const lower = adminSearch.toLowerCase();
          const terms = lower.split(/\s+/).filter(Boolean);
          res = res.filter(w => terms.every(t => [w.producer, w.name, w.classification, w.description, w.grapes, w.type, w.sku].join(' ').toLowerCase().includes(t)));
      }
      if (adminTypeFilter !== 'all') res = res.filter(w => w.type === adminTypeFilter);
      
      res.sort((a, b) => {
          let comparison = 0;
          if (adminSort === 'producer_asc') comparison = (a.producer || '').localeCompare(b.producer || '');
          else if (adminSort === 'name_asc') comparison = (a.name || a.classification || '').localeCompare(b.name || a.classification || '');
          else if (adminSort === 'stock_asc') comparison = (a.stockCount || 0) - (b.stockCount || 0);
          else if (adminSort === 'sku_asc') {
             const skuA = (a.sku || '').trim();
             const skuB = (b.sku || '').trim();
             if (skuA && !skuB) comparison = -1; 
             else if (!skuA && skuB) comparison = 1;  
             else comparison = skuA.localeCompare(skuB, undefined, { numeric: true }); 
          }
          return comparison || a.id.localeCompare(b.id);
      });
      return res;
  }, [wines, adminSearch, adminTypeFilter, adminSort, showSoldOut]);

  const archivedWinesList = useMemo(() => {
      return [...wines].filter(w => w.isArchived).sort((a, b) => (a.producer || '').localeCompare(b.producer || ''));
  }, [wines]);

  const logAdminAction = async (wineName, producer, actionDescription) => {
      try {
          await addDoc(collection(db, 'history_logs'), {
              wineName: `${producer} ${wineName || ''}`.trim(),
              action: actionDescription,
              createdAt: new Date().toISOString()
          });
      } catch (error) { console.error("Fejl:", error); }
  };

  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, loginEmail, loginPassword); } catch (err) { setLoginError('Forkert email eller adgangskode.'); }};
  const handleLogout = async () => { await signOut(auth); };

  // --- FILTER FUNKTIONER ---
  const saveFilter = async (label) => {
      if(!label) return setAlertDialog({ message: "Udfyld venligst knaptekst."});
      const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (filters.some(f => f.id === id)) return setAlertDialog({ message: "Et filter med dette navn findes allerede." });
      
      const newFilter = { id, label };
      try {
          await setDoc(doc(db, 'wines', 'config'), { filters: [...filters, newFilter] }, { merge: true });
          setAlertDialog({ message: "Filteret er nu oprettet!"});
      } catch (error) { setAlertDialog({ message: "Kunne ikke gemme filter." }); }
  };

  const deleteFilter = (filterIdToDelete) => {
      setConfirmDialog({
          message: "Er du sikker på, at du vil slette dette filter? (Vine mister deres tilknytning til filteret)",
          onConfirm: async () => {
              try { await setDoc(doc(db, 'wines', 'config'), { filters: filters.filter(f => f.id !== filterIdToDelete) }, { merge: true }); } 
              catch (error) { setAlertDialog({ message: "Kunne ikke slette filter." }); }
          }
      });
  };

  const restoreDefaultFilters = async () => {
      const fasteFiltre = [ { id: 'carltons_udvalgte', label: "Carlton's Udvalgte" } ];
      const mergedFilters = [...filters, ...fasteFiltre.filter(hf => !filters.some(f => f.id === hf.id))];
      await setDoc(doc(db, 'wines', 'config'), { filters: mergedFilters }, { merge: true });
      setAlertDialog({message: "Carltons Udvalgte er gendannet i databasen."});
  };

  const deleteFeedback = (id) => {
      setConfirmDialog({ message: "Slet besked?", onConfirm: async () => { await deleteDoc(doc(db, 'feedback', id)); } });
  };

  const archiveWine = (wine) => { 
      setConfirmDialog({ message: `Flyt "${wine.producer}" til arkiv?`, onConfirm: async () => { await updateDoc(doc(db, 'wines', wine.id), { isArchived: true, isSoldOut: true, updatedAt: new Date().toISOString() }); logAdminAction(wine.name, wine.producer, 'Flyttet til arkivet'); } });
  };
  const restoreWine = (wine) => { 
      setConfirmDialog({ message: `Gendan "${wine.producer}"?`, onConfirm: async () => { await updateDoc(doc(db, 'wines', wine.id), { isArchived: false, updatedAt: new Date().toISOString() }); logAdminAction(wine.name, wine.producer, 'Gendannet'); } });
  };
  const deleteWine = (wine) => { 
      setConfirmDialog({ message: "ADVARSEL: Slet PERMANENT?", onConfirm: async () => { await deleteDoc(doc(db, 'wines', wine.id)); logAdminAction(wine.name, wine.producer, 'Slettet permanent'); } });
  };
  
  const toggleSoldOut = async (wine) => { 
      const newStatus = !wine.isSoldOut;
      await updateDoc(doc(db, 'wines', wine.id), { isSoldOut: newStatus, updatedAt: new Date().toISOString() }); 
      logAdminAction(wine.name, wine.producer, `Markeret som ${newStatus ? 'UDSOLGT' : 'PÅ LAGER'}`);
  };

  const updateStock = async (wine, val) => { 
      const newVal = parseFloat(val) || 0;
      if (wine.stockCount === newVal) return;
      await updateDoc(doc(db, 'wines', wine.id), { stockCount: newVal, updatedAt: new Date().toISOString() }); 
      logAdminAction(wine.name, wine.producer, `Lager ændret fra ${wine.stockCount || 0} til ${newVal}`);
  };

  const updatePurchasePrice = async (wine, val) => { 
      const newVal = parseFloat(val) || 0;
      if (wine.purchasePrice === newVal) return;
      await updateDoc(doc(db, 'wines', wine.id), { purchasePrice: newVal, updatedAt: new Date().toISOString() }); 
  };

  const updatePrice = async (wine, val) => { 
      const newVal = parseFloat(val) || 0;
      if (wine.price === newVal) return;
      await updateDoc(doc(db, 'wines', wine.id), { price: newVal, updatedAt: new Date().toISOString() }); 
  };

  const updateSku = async (wine, val) => { 
      const newSku = val.trim();
      if ((wine.sku || '') === newSku) return;
      await updateDoc(doc(db, 'wines', wine.id), { sku: newSku, updatedAt: new Date().toISOString() }); 
  };

  const handleStockAdjustment = async (e) => {
      e.preventDefault();
      const amount = parseFloat(e.target.amount.value);
      if (!amount || isNaN(amount)) return setStockAdjustWine(null);

      const currentStock = parseFloat(stockAdjustWine.stockCount) || 0;
      const newStock = currentStock + amount;

      try {
          await updateDoc(doc(db, 'wines', stockAdjustWine.id), { 
              stockCount: newStock, 
              isSoldOut: newStock <= 0, 
              updatedAt: new Date().toISOString() 
          });
          logAdminAction(stockAdjustWine.name, stockAdjustWine.producer, `Lager justeret med ${amount > 0 ? '+' : ''}${amount} (fra ${currentStock} til ${newStock})`);
          setStockAdjustWine(null);
      } catch (error) {
          setAlertDialog({ message: "Kunne ikke opdatere lageret." });
      }
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,PLU/SKU;Producent;Navn;År;Salgspris;Indkøbspris;Antal\n";
    adminWines.forEach(w => { csvContent += `"${w.sku || ''}";"${w.producer}";"${w.name}";"${w.year}";${w.price};${w.purchasePrice};${w.stockCount}\n`; });
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "lager_eksport.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const printMenu = () => { 
    const printWindow = window.open('', '_blank');
    const activeWines = wines.filter(w => !w.isSoldOut && !w.isArchived);
    let html = `<html><head><title>Vinkort</title><style>body{font-family:sans-serif;}</style></head><body><h1 style="text-align:center;">Vinkort - Carlton</h1>`;
    activeWines.forEach(w => html += `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc;"><div style="padding-right:1rem;"><p style="font-weight:bold;margin:0;">${w.producer}</p><p style="margin:2px 0;">${w.name || ''}</p><p style="font-size:0.8em;color:#666;margin:0;">${w.year}</p></div><div style="text-align:right;"><p style="font-weight:600;margin:0;">${w.price},-</p></div></div>`);
    html += `</body></html>`;
    printWindow.document.write(html); printWindow.document.close(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-[#991b1b] border-t-transparent rounded-full"></div></div>;

  if (!user || user.isAnonymous) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] font-sans">
            <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
                <h2 className="text-3xl font-bold text-center mb-8 font-serif text-[#1b4332]">Kælder Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none" type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                    <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none" type="password" placeholder="Kode" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    <button className="w-full bg-[#991b1b] text-white py-4 rounded-xl font-bold text-lg hover:bg-red-900 mt-4 shadow-md transition-colors">Log ind</button>
                    {loginError && <p className="text-red-500 text-sm mt-4 text-center font-bold bg-red-50 p-2 rounded-lg">{loginError}</p>}
                </form>
                <div className="mt-8 text-center border-t pt-6">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 font-medium">← Tilbage til vinkortet</Link>
                </div>
            </div>
        </div>
    );
  }

  return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
          <div className="mx-auto p-4 lg:p-8 w-full max-w-[1600px]">
          
          <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div>
                <h1 className="text-3xl font-bold font-serif text-[#1b4332]">Vinkælder Admin</h1>
                <p className="text-sm text-gray-500 mt-1">Logget ind som: {user.email}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowFilterSettings(!showFilterSettings)} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-200 flex items-center gap-2 font-medium transition-colors">
                    <Settings size={18}/> Filtre
                </button>
                <Link href="/" className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 font-medium transition-colors">Vis Vinkort</Link>
                <button onClick={handleLogout} className="bg-gray-800 text-white px-5 py-2.5 rounded-xl hover:bg-black flex items-center gap-2 font-medium transition-colors"><LogOut size={18}/> Log ud</button>
              </div>
          </header>

          <div className="flex gap-4 border-b border-gray-300 mb-8 overflow-x-auto">
              <button onClick={() => setAdminTab('wines')} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors border-b-2 ${adminTab === 'wines' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Varelager</button>
              <button onClick={() => setAdminTab('archived')} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${adminTab === 'archived' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}><ArchiveIcon size={18}/> Arkiv</button>
              <button onClick={() => setAdminTab('history')} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${adminTab === 'history' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}><HistoryIcon size={18}/> Historik</button>
              <button onClick={() => setAdminTab('sync')} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${adminTab === 'sync' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}><Activity size={18}/> Synkronisering</button>
              <button onClick={() => setAdminTab('feedback')} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 ${adminTab === 'feedback' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}><MessageSquare size={18}/> Feedback</button>
          </div>

          {/* VORES NYE BYGGEKLODS KALD 🪄 */}
          {adminTab === 'archived' && <ArchiveTab wines={archivedWinesList} onRestore={restoreWine} onDelete={deleteWine} />}
          {adminTab === 'history' && <HistoryTab historyLogs={historyLogs} />}
          {adminTab === 'sync' && <SyncTab syncLogs={syncLogs} />}
          {adminTab === 'feedback' && <FeedbackTab feedbacks={feedbacks} onDelete={deleteFeedback} />}

          {/* TAB: WINES */}
          {adminTab === 'wines' && (
          <div className="animate-in fade-in">
              
              {showFilterSettings && (
                  <FilterManager 
                      filters={filters} 
                      onSave={saveFilter} 
                      onDelete={deleteFilter} 
                      onRestore={restoreDefaultFilters}
                      onClose={() => setShowFilterSettings(false)} 
                  />
              )}

              {!showFilterSettings && (
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                      <div>
                          <h2 className="text-2xl font-bold font-serif text-[#1b4332]">Kælderens Indhold</h2>
                          <p className="text-gray-500 mt-1">{adminWines.filter(w=>!w.isSoldOut).length} aktive varer</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                          <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Søg..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl w-full outline-none focus:border-[#991b1b]" />
                          </div>
                          <select value={adminSort} onChange={e => setAdminSort(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl w-full sm:w-auto outline-none focus:border-[#991b1b]">
                              <option value="producer_asc">Sorter: Producent (A-Å)</option>
                              <option value="name_asc">Sorter: Navn (A-Å)</option>
                              <option value="stock_asc">Sorter: Lager (Lavest)</option>
                              <option value="sku_asc">Sorter: PLU-nummer</option>
                          </select>
                          <button onClick={() => setShowSoldOut(!showSoldOut)} className={`px-4 py-3 text-sm font-bold rounded-xl border transition-colors ${showSoldOut ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                            {showSoldOut ? 'Viser Udsolgte' : 'Filtrér Udsolgte'}
                          </button>
                      </div>
                  </div>

                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                      {['all', 'Mousserende', 'Hvidvin', 'Rødvin', 'Rosévin', 'Dessertvin'].map(type => (
                          <button key={type} onClick={() => setAdminTypeFilter(type)} className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${adminTypeFilter === type ? 'bg-[#991b1b] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{type === 'all' ? 'Alle Typer' : type}</button>
                      ))}
                  </div>

                  <div className="mb-6 flex gap-4">
                      <button onClick={() => setShowAddForm(true)} className="bg-[#1b4332] text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#123023] transition-colors shadow-sm">
                          <Plus size={20}/> Tilføj Ny Vin
                      </button>
                  </div>

                  <WineTable 
                      wines={adminWines} 
                      onUpdateSku={updateSku} 
                      onUpdatePrice={updatePrice} 
                      onUpdatePurchasePrice={updatePurchasePrice} 
                      onUpdateStock={updateStock} 
                      onToggleSoldOut={toggleSoldOut} 
                      onEdit={setEditingWine} 
                      onArchive={archiveWine} 
                      onAdjustStock={setStockAdjustWine} 
                  />

              </div>
              )}
          </div>
          )}

          {(showAddForm || editingWine) && (
              <WineFormModal 
                  wineToEdit={editingWine} 
                  filters={filters} 
                  suggestions={adminSuggestions} 
                  onClose={() => { setShowAddForm(false); setEditingWine(null); }} 
                  onSuccess={(name, producer, action) => { 
                      logAdminAction(name, producer, action); 
                      setAlertDialog({message: 'Vinen blev gemt i databasen!'}); 
                  }} 
                  onError={(msg) => setAlertDialog({message: msg})} 
              />
          )}

          {stockAdjustWine && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                  <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border-t-4 border-green-600">
                      <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-bold font-serif text-gray-900">Modtag varer</h3>
                          <button onClick={() => setStockAdjustWine(null)} className="text-gray-400 hover:bg-gray-100 rounded-full p-1"><X size={20}/></button>
                      </div>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                          Hvor mange flasker vil du lægge til <strong className="text-gray-900">{stockAdjustWine.producer}</strong>? 
                          (Nuværende lager: {stockAdjustWine.stockCount || 0})
                      </p>
                      
                      <form onSubmit={handleStockAdjustment}>
                          <input 
                              name="amount" 
                              type="number" 
                              placeholder="F.eks. 12" 
                              autoFocus
                              className="w-full p-4 border border-gray-300 rounded-xl mb-6 text-xl text-center font-bold outline-none focus:border-green-600" 
                              required 
                          />
                          <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md">
                              Læg til lager
                          </button>
                      </form>
                  </div>
              </div>
          )}
          
          {confirmDialog && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                      <h3 className="text-xl font-bold mb-2">Bekræft</h3>
                      <p className="text-gray-600 mb-8">{confirmDialog.message}</p>
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setConfirmDialog(null)} className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Annuller</button>
                          <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-sm transition-colors">Bekræft</button>
                      </div>
                  </div>
              </div>
          )}
          
          {alertDialog && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
                      <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><Check size={24}/></div>
                      <h3 className="text-xl font-bold mb-2">Information</h3>
                      <p className="text-gray-600 mb-8">{alertDialog.message}</p>
                      <button onClick={() => setAlertDialog(null)} className="w-full py-3 bg-[#1b4332] hover:bg-[#123023] text-white rounded-xl font-bold transition-colors">Forstået</button>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
}