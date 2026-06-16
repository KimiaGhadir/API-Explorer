import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Plus, Trash2, Globe, Database, Activity, RotateCcw, Clock, Settings2, Download, Upload, X, Sun, Moon } from 'lucide-react';

const App = () => {
    const [tabs, setTabs] = useState([
        {
            id: Date.now().toString(),
            url: '',
            method: 'GET',
            headers: [{ key: '', value: '', enabled: true }],
            params: [{ key: '', value: '', enabled: true }],
            body: '',
            response: null,
            history: []
        }
    ]);
    const [activeTabId, setActiveTabId] = useState(tabs[0].id);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const [isDark, setIsDark] = useState(false);

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

    const updateActiveTab = (updates) => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
    };

    useEffect(() => {
        const savedTabs = localStorage.getItem("api_explorer_tabs");

        if (savedTabs) {
            const parsedTabs = JSON.parse(savedTabs);

            setTabs(parsedTabs);

            if (parsedTabs.length > 0) {
                setActiveTabId(parsedTabs[0].id);
            }
        }
    }, []);

    useEffect(() => {
        console.log("saving", tabs);
        localStorage.setItem(
            "api_explorer_tabs",
            JSON.stringify(tabs)
        );
    }, [tabs]);

    const addNewTab = () => {
        const newTab = {
            id: Date.now().toString(),
            url: '',
            method: 'GET',
            headers: [{ key: '', value: '', enabled: true }],
            params: [{ key: '', value: '', enabled: true }],
            body: '',
            response: null,
            history: []
        };
        setTabs([...tabs, newTab]);
        console.log("tabs after update", tabs);
        setActiveTabId(newTab.id);
    };

    const removeTab = (e, id) => {
        e.stopPropagation();
        if (tabs.length === 1) return;
        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);
        if (activeTabId === id) setActiveTabId(newTabs[0].id);
    };

    const handleSend = async () => {
        const currentTab = tabs.find((t) => t.id === activeTabId);
        let url = currentTab.url.trim();

        if (!url) {
            alert("لطفاً آدرس URL را وارد کنید.");
            return;
        }

        if (!/^https?:\/\//i.test(url)) {
            alert("لطفاً URL را با http:// یا https:// وارد کنید.");
            return;
        }


        try {
            new URL(url);
        } catch (e) {
            alert("آدرس وارد شده معتبر نیست. لطفاً یک آدرس صحیح وارد کنید.");
            return;
        }

        setLoading(true);
        try {
            const startTime = performance.now();

            const headers = currentTab.headers
                .filter(h => h.enabled && h.key)
                .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

            const params = currentTab.params
                .filter(p => p.enabled && p.key)
                .reduce((acc, p) => ({ ...acc, [p.key]: p.value }), {});

            const response = await axios({
                method: currentTab.method,
                url: url,
                data: currentTab.method !== 'GET' ? JSON.parse(currentTab.body || '{}') : undefined,
                headers: headers,
                params: params,
                validateStatus: () => true,
            });

            const endTime = performance.now();

            const responseData = {
                data: response.data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                time: Math.round(endTime - startTime),
                size: JSON.stringify(response.data).length,
            };

            setTabs(prev =>
                prev.map(tab =>
                    tab.id === activeTabId
                        ? {
                            ...tab,
                            response: responseData,
                            history: [
                                {
                                    id: Date.now(),
                                    method: currentTab.method,
                                    url: currentTab.url,
                                    status: response.status
                                },
                                ...(tab.history || [])
                            ]
                        }
                        : tab
                )
            );

        } catch (err) {
            console.error(err);

            if (err.code === "ERR_NETWORK") {
                alert("دامنه یافت نشد یا اتصال شبکه برقرار نیست.");
            } else if (err.code === "ECONNABORTED") {
                alert("زمان درخواست به پایان رسید.");
            } else if (err.response) {
                setError(`Server error: ${err.response.status} ${err.response.statusText}`);
            } else if (err.request) {
                alert("هیچ پاسخی از سرور دریافت نشد.");
            } else {
                alert(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const importHistory = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    updateActiveTab({ history: [...data, ...(activeTab.history || [])] });
                } else {
                    alert("فایل نامعتبر است: داده‌ها باید به صورت آرایه باشند.");
                }
            } catch (err) {
                alert("خطا در خواندن فایل JSON");
            }
        };
        reader.readAsText(file);
    };

    const exportHistory = () => {
        const historyData = activeTab.history || [];
        const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `history-${activeTab.id}.json`;
        a.click();
    };

    const addRow = (type) => {
        if (type === 'header') updateActiveTab({ headers: [...activeTab.headers, { key: '', value: '', enabled: true }] });
        else updateActiveTab({ params: [...activeTab.params, { key: '', value: '', enabled: true }] });
    };

    const updateRow = (type, index, field, value) => {
        const newData = type === 'header' ? [...activeTab.headers] : [...activeTab.params];
        newData[index][field] = value;
        type === 'header' ? updateActiveTab({ headers: newData }) : updateActiveTab({ params: newData });
    };

    const removeRow = (type, index) => {
        const data = type === 'header' ? activeTab.headers : activeTab.params;
        const newData = data.length > 1 ? data.filter((_, i) => i !== index) : [{ key: '', value: '', enabled: true }];
        type === 'header' ? updateActiveTab({ headers: newData }) : updateActiveTab({ params: newData });
    };

    return (
        <div className={`min-h-screen p-4 md:p-8 font-sans transition-colors duration-300 ${isDark
            ? "bg-[#0f172a] text-slate-200"
            : "bg-[#fff1f2] text-slate-800"
            }`} dir="ltr">

            <div className="max-w-7xl mx-auto space-y-6">

                <header className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-rose-500 p-2.5 rounded-2xl shadow-lg shadow-rose-500/20">
                                <Activity className="text-white w-6 h-6" />
                            </div>
                            <h1 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>API Explorer</h1>
                        </div>

                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${isDark
                                ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
                                : "bg-white text-rose-600 hover:bg-rose-50 border border-rose-100"
                                }`}
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                            {isDark ? "Light Mode" : "Dark Mode"}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar mt-4">
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={`group flex items-center gap-3 px-5 py-3 rounded-t-[20px] transition-all cursor-pointer min-w-[180px] border-b-2 ${activeTabId === tab.id
                                    ? (isDark ? 'bg-[#1e293b] border-rose-500 text-white shadow-lg' : 'bg-white border-rose-500 text-rose-700 shadow-sm')
                                    : (isDark ? 'bg-[#1e293b]/30 border-transparent text-slate-500 hover:bg-[#1e293b]/60' : 'bg-white/40 border-transparent text-slate-400 hover:bg-white/60')}`}
                            >
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>{tab.method}</span>
                                <span className="text-xs font-bold truncate flex-1">{tab.url ? tab.url.replace('https://', '') : 'New Request'}</span>
                                {tabs.length > 1 && <X size={14} className="opacity-0 group-hover:opacity-100 hover:text-rose-500" onClick={(e) => removeTab(e, tab.id)} />}
                            </div>
                        ))}
                        <button onClick={addNewTab} className={`p-3 transition-all rounded-xl ${isDark ? "text-slate-500 hover:text-rose-500 hover:bg-rose-500/10" : "text-rose-400 hover:text-rose-600 hover:bg-white"}`}>
                            <Plus size={20} />
                        </button>
                    </div>
                </header>

                <div className={`p-2.5 rounded-[24px] border shadow-xl flex flex-wrap md:flex-nowrap gap-3 items-center transition-all ${isDark ? "bg-[#1e293b] border-slate-800" : "bg-white border-rose-100"}`}>
                    <select value={activeTab.method} onChange={(e) => updateActiveTab({ method: e.target.value })} className={`font-bold px-6 py-3.5 rounded-xl outline-none cursor-pointer border transition-all ${isDark ? "bg-[#0f172a] text-slate-200 border-slate-800" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="relative flex-1 min-w-[200px]">
                        <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? "text-slate-600" : "text-rose-300"}`} />
                        <input type="text" value={activeTab.url} onChange={(e) => updateActiveTab({ url: e.target.value })} placeholder="https://api.example.com/v1" className={`w-full pl-12 pr-4 py-3.5 rounded-xl outline-none border transition-all font-medium ${isDark ? "bg-[#0f172a]/50 text-white border-slate-800 focus:bg-[#0f172a] focus:border-rose-500/50" : "bg-slate-50 text-slate-800 border-rose-100 focus:bg-white focus:border-rose-300"}`} />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => updateActiveTab({ url: '', method: 'GET', response: null, body: '' })} className={`p-3.5 rounded-xl transition-all border ${isDark ? "bg-[#0f172a] hover:bg-slate-800 text-slate-500 border-slate-800" : "bg-slate-50 hover:bg-rose-50 text-rose-400 border-rose-100"}`}><RotateCcw size={20} /></button>
                        <button onClick={handleSend} disabled={loading} className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-rose-500/20">
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} className="rotate-[-45deg]" />}
                            <span>SEND</span>
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                        <div className={`p-6 rounded-[28px] border shadow-sm transition-all ${isDark ? "bg-[#1e293b] border-slate-800" : "bg-white border-rose-100"}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-bold text-[14px] flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}><Clock size={16} className="text-rose-500" /> Recent History</h3>
                                <div className="flex gap-1 text-slate-500">
                                    <button
                                        onClick={exportHistory}
                                        className="p-2 hover:text-rose-500 rounded-lg"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <input
                                        type="file"
                                        accept=".json"
                                        ref={fileInputRef}
                                        onChange={importHistory}
                                        hidden
                                    />

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 hover:text-rose-500 rounded-lg"
                                    >
                                        <Upload size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                {(activeTab.history || []).map(item => (
                                    <div key={item.id} className="flex justify-between text-[12px] p-2 border-b border-slate-100 last:border-0">
                                        <span className="font-bold text-rose-500">{item.method}</span>
                                        <span className="truncate flex-1 mx-2">{item.url}</span>
                                        <span className="text-emerald-500">{item.status}</span>
                                    </div>
                                ))}

                            </div>
                        </div>

                        <div className={`p-6 rounded-[28px] border shadow-sm transition-all ${isDark ? "bg-[#1e293b] border-slate-800" : "bg-white border-rose-100"}`}>
                            <div className="flex justify-between items-center mb-5">
                                <h3 className={`font-bold text-[14px] flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}><Settings2 size={16} className="text-rose-500" /> Query Parameters</h3>
                                <button onClick={() => addRow('param')} className="bg-rose-500 text-white p-1.5 rounded-lg hover:bg-rose-600 transition-colors"><Plus size={16} /></button>
                            </div>
                            {activeTab.params.map((p, i) => (
                                <div key={i} className="flex gap-2 items-center mb-2">
                                    <input placeholder="Key" className={`w-1/2 p-2.5 border rounded-xl text-[13px] outline-none transition-all ${isDark ? "bg-[#0f172a]/50 border-slate-800 text-slate-200 focus:border-rose-500/30" : "bg-slate-50 border-rose-100 text-slate-800 focus:bg-white focus:border-rose-300"}`} value={p.key} onChange={(e) => updateRow('param', i, 'key', e.target.value)} />
                                    <input placeholder="Value" className={`w-1/2 p-2.5 border rounded-xl text-[13px] outline-none transition-all ${isDark ? "bg-[#0f172a]/50 border-slate-800 text-slate-200 focus:border-rose-500/30" : "bg-slate-50 border-rose-100 text-slate-800 focus:bg-white focus:border-rose-300"}`} value={p.value} onChange={(e) => updateRow('param', i, 'value', e.target.value)} />
                                    <button onClick={() => removeRow('param', i)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>

                        <div className={`p-6 rounded-[28px] border shadow-sm transition-all ${isDark ? "bg-[#1e293b] border-slate-800" : "bg-white border-rose-100"}`}>
                            <div className="flex justify-between items-center mb-5">
                                <h3 className={`font-bold text-[14px] flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}><Globe size={16} className="text-rose-500" /> Headers</h3>
                                <button onClick={() => addRow('header')} className="bg-rose-500 text-white p-1.5 rounded-lg hover:bg-rose-600 transition-colors"><Plus size={16} /></button>
                            </div>
                            {activeTab.headers.map((h, i) => (
                                <div key={i} className="flex gap-2 items-center mb-2">
                                    <input placeholder="Key" className={`w-1/2 p-2.5 border rounded-xl text-[13px] outline-none transition-all ${isDark ? "bg-[#0f172a]/50 border-slate-800 text-slate-200 focus:border-rose-500/30" : "bg-slate-50 border-rose-100 text-slate-800 focus:bg-white focus:border-rose-300"}`} value={h.key} onChange={(e) => updateRow('header', i, 'key', e.target.value)} />
                                    <input placeholder="Value" className={`w-1/2 p-2.5 border rounded-xl text-[13px] outline-none transition-all ${isDark ? "bg-[#0f172a]/50 border-slate-800 text-slate-200 focus:border-rose-500/30" : "bg-slate-50 border-rose-100 text-slate-800 focus:bg-white focus:border-rose-300"}`} value={h.value} onChange={(e) => updateRow('header', i, 'value', e.target.value)} />
                                    <button onClick={() => removeRow('header', i)} className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`lg:col-span-7 p-7 rounded-[32px] border shadow-sm flex flex-col min-h-[450px] transition-all ${isDark ? "bg-[#1e293b] border-slate-800" : "bg-white border-rose-100"}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`font-bold text-[15px] flex items-center gap-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}><Database size={18} className="text-rose-500" /> Body (JSON)</h3>
                            {activeTab.method === 'GET' && <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2 py-1 rounded-lg border border-amber-500/20">DISABLED</span>}
                        </div>
                        <textarea
                            disabled={activeTab.method === 'GET'}
                            value={activeTab.body}
                            onChange={(e) => updateActiveTab({ body: e.target.value })}
                            className={`flex-1 w-full p-8 font-mono text-[14px] rounded-[24px] outline-none transition-all resize-none border ${activeTab.method === 'GET'
                                ? (isDark ? 'bg-[#0f172a]/30 text-slate-700 border-transparent' : 'bg-slate-50 text-slate-300 border-transparent')
                                : (isDark ? 'bg-[#0f172a] text-emerald-400 border-slate-800 shadow-inner' : 'bg-slate-50 text-rose-700 border-rose-100 focus:bg-white focus:border-rose-300 shadow-sm')}`}
                            placeholder='{"key": "value"}'
                        />
                    </div>
                </div>

                <div className={`rounded-[32px] border shadow-2xl min-h-[350px] overflow-hidden transition-all ${isDark ? "bg-[#1e293b] border-slate-800" : "bg-white border-rose-100"}`}>
                    <div className={`px-10 py-6 border-b flex justify-between items-center ${isDark ? "border-slate-800" : "border-rose-100 bg-rose-50/30"}`}>
                        <h3 className={`font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>Response</h3>
                        {activeTab.response && <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>STATUS: {activeTab.response.status}</span>}
                    </div>
                    <div className={`p-8 md:p-12 min-h-[300px] ${isDark ? "bg-[#0f172a]/50" : "bg-slate-50/50"}`}>
                        {activeTab.response ? (
                            <pre className={`w-full text-sm font-mono overflow-auto text-left leading-relaxed ${isDark ? "text-slate-300" : "text-slate-800"}`}>
                                {JSON.stringify(activeTab.response.data, null, 2)}
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-20">
                                <Send size={84} strokeWidth={1} className={`${isDark ? "text-slate-400" : "text-rose-400"} rotate-[-45deg]`} />
                                <p className={`text-[18px] font-medium mt-4 ${isDark ? "text-slate-400" : "text-rose-500"}`}>No request executed yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { height: 5px; width: 5px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDark ? '#334155' : '#fecdd3'}; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                select option { background: ${isDark ? '#1e293b' : 'white'}; color: ${isDark ? 'white' : '#e11d48'}; }
            ` }} />
        </div>
    );
};

export default App;