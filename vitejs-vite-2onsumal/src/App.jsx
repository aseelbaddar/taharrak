import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gqpegjnuxibxlszhnsnh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcGVnam51eGlieGxzemhuc25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODE0MDAsImV4cCI6MjA4OTc1NzQwMH0.iIoqTU83ERUO60jeLZ9CCKDU1xzf6WE4Tt-cMxFSNHo";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const COACH_PASS = "0000";
const CATEGORIES = ["Pull", "Push", "Legs", "Core", "Mobility", "Rehab", "Cardio", "Skills"];
const generateId = () => Math.random().toString(36).substr(2, 9);
const makeDay = (label) => ({ id: generateId(), label, exercises: [] });
const makeWeek = (n) => ({ id: generateId(), label: `Week ${n}`, days: [makeDay("Day 1"), makeDay("Day 2"), makeDay("Day 3")] });
const flattenDays = (weeks) => { const f = []; weeks?.forEach((w, wi) => w.days?.forEach((d, di) => f.push({ week: w, weekIndex: wi, day: d, dayIndex: di, globalIndex: f.length }))); return f; };

export default function CoachApp() {
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");
  const [activeTab, setActiveTab] = useState("exercises");
  const [exercises, setExercises] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [clients, setClients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState("");
  const [newEx, setNewEx] = useState({ name: "", video_url: "", category: "Pull", description: "" });
  const [editingExId, setEditingExId] = useState(null);
  const [filterExCat, setFilterExCat] = useState("All");
  const [progForm, setProgForm] = useState({ name: "", weeks: [makeWeek(1)] });
  const [editingProgId, setEditingProgId] = useState(null);
  const [filterCat, setFilterCat] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState({ 0: true });
  const [addClientModal, setAddClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", username: "", password: "" });
  const [assignModal, setAssignModal] = useState(null);
  const [selectedProg, setSelectedProg] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); };
  useEffect(() => { if (authed) loadAll(); }, [authed]);
  const loadAll = async () => { await Promise.all([loadExercises(), loadPrograms(), loadClients(), loadLogs()]); };
  const loadExercises = async () => { const { data } = await sb.from("exercises").select("*").order("name"); setExercises(data || []); };
  const loadPrograms = async () => { const { data } = await sb.from("programs").select("*").order("created_at"); setPrograms(data || []); };
  const loadClients = async () => { const { data } = await sb.from("clients").select("*").order("name"); setClients(data || []); };
  const loadLogs = async () => { const { data } = await sb.from("logs").select("*").order("created_at", { ascending: false }); setLogs(data || []); };

  const saveExercise = async () => {
    if (!newEx.name.trim()) return;
    setLoading(true);
    if (editingExId) {
      await sb.from("exercises").update({ name: newEx.name, video_url: newEx.video_url, category: newEx.category, description: newEx.description }).eq("id", editingExId);
      setEditingExId(null); notify("Exercise updated!");
    } else {
      await sb.from("exercises").insert({ name: newEx.name, video_url: newEx.video_url, category: newEx.category, description: newEx.description });
      notify("Exercise added!");
    }
    setNewEx({ name: "", video_url: "", category: "Pull", description: "" });
    await loadExercises(); setLoading(false);
  };
  const startEditEx = (ex) => { setEditingExId(ex.id); setNewEx({ name: ex.name, video_url: ex.video_url || "", category: ex.category || "Pull", description: ex.description || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); notify("Editing exercise."); };
  const cancelEditEx = () => { setEditingExId(null); setNewEx({ name: "", video_url: "", category: "Pull", description: "" }); };
  const deleteExercise = async (id) => { await sb.from("exercises").delete().eq("id", id); await loadExercises(); notify("Exercise removed."); };

  const updateExInDay = (wi, di, ei, field, value) => { const weeks = progForm.weeks.map((w, wIdx) => wIdx !== wi ? w : { ...w, days: w.days.map((d, dIdx) => dIdx !== di ? d : { ...d, exercises: d.exercises.map((ex, eIdx) => eIdx !== ei ? ex : { ...ex, [field]: value }) }) }); setProgForm({ ...progForm, weeks }); };
  const addExToDay = (wi, di, exId) => { const weeks = progForm.weeks.map((w, wIdx) => wIdx !== wi ? w : { ...w, days: w.days.map((d, dIdx) => dIdx !== di ? d : { ...d, exercises: d.exercises.find(e => e.id === exId) ? d.exercises : [...d.exercises, { id: exId, sets: "3", reps: "10", rest: "60", note: "" }] }) }); setProgForm({ ...progForm, weeks }); };
  const removeExFromDay = (wi, di, ei) => { const weeks = progForm.weeks.map((w, wIdx) => wIdx !== wi ? w : { ...w, days: w.days.map((d, dIdx) => dIdx !== di ? d : { ...d, exercises: d.exercises.filter((_, j) => j !== ei) }) }); setProgForm({ ...progForm, weeks }); };
  const addDay = (wi) => { const weeks = progForm.weeks.map((w, i) => i !== wi ? w : { ...w, days: [...w.days, makeDay(`Day ${w.days.length + 1}`)] }); setProgForm({ ...progForm, weeks }); };
  const removeDay = (wi, di) => { const weeks = progForm.weeks.map((w, i) => i !== wi ? w : { ...w, days: w.days.filter((_, j) => j !== di) }); setProgForm({ ...progForm, weeks }); };
  const duplicateDay = (wi, di) => { const weeks = progForm.weeks.map((w, i) => { if (i !== wi) return w; const orig = w.days[di]; const copy = { ...orig, id: generateId(), label: orig.label + " (Copy)", exercises: orig.exercises.map(e => ({ ...e })) }; const days = [...w.days.slice(0, di + 1), copy, ...w.days.slice(di + 1)]; return { ...w, days }; }); setProgForm({ ...progForm, weeks }); };
  const moveDay = (wi, di, dir) => { const weeks = progForm.weeks.map((w, i) => { if (i !== wi) return w; const days = [...w.days]; const t = di + dir; if (t < 0 || t >= days.length) return w; [days[di], days[t]] = [days[t], days[di]]; return { ...w, days }; }); setProgForm({ ...progForm, weeks }); };
  const addWeek = () => { const n = progForm.weeks.length + 1; setProgForm({ ...progForm, weeks: [...progForm.weeks, makeWeek(n)] }); setExpandedWeeks(prev => ({ ...prev, [n - 1]: true })); };
  const removeWeek = (wi) => { setProgForm({ ...progForm, weeks: progForm.weeks.filter((_, i) => i !== wi) }); };
  const duplicateWeek = (wi) => { const orig = progForm.weeks[wi]; const copy = { ...orig, id: generateId(), label: orig.label + " (Copy)", days: orig.days.map(d => ({ ...d, id: generateId(), exercises: d.exercises.map(e => ({ ...e })) })) }; const weeks = [...progForm.weeks.slice(0, wi + 1), copy, ...progForm.weeks.slice(wi + 1)]; setProgForm({ ...progForm, weeks }); notify("Week duplicated!"); };
  const moveWeek = (wi, dir) => { const weeks = [...progForm.weeks]; const t = wi + dir; if (t < 0 || t >= weeks.length) return; [weeks[wi], weeks[t]] = [weeks[t], weeks[wi]]; setProgForm({ ...progForm, weeks }); };

  const saveProgram = async () => {
    if (!progForm.name.trim()) return; setLoading(true);
    if (editingProgId) { await sb.from("programs").update({ name: progForm.name, weeks: progForm.weeks }).eq("id", editingProgId); setEditingProgId(null); notify("Program updated!"); }
    else { await sb.from("programs").insert({ name: progForm.name, weeks: progForm.weeks }); notify("Program created!"); }
    setProgForm({ name: "", weeks: [makeWeek(1)] }); await loadPrograms(); setLoading(false);
  };
  const startEditProg = (prog) => { setEditingProgId(prog.id); setProgForm({ name: prog.name, weeks: prog.weeks }); setActiveTab("programs"); window.scrollTo({ top: 0, behavior: "smooth" }); notify("Editing — save when done."); };
  const cancelEditProg = () => { setEditingProgId(null); setProgForm({ name: "", weeks: [makeWeek(1)] }); };
  const duplicateProgram = async (prog) => { await sb.from("programs").insert({ name: prog.name + " (Copy)", weeks: prog.weeks }); await loadPrograms(); notify("Program duplicated!"); };
  const deleteProgram = async (id) => { await sb.from("programs").delete().eq("id", id); if (editingProgId === id) cancelEditProg(); await loadPrograms(); notify("Program deleted."); };

  const saveClient = async () => {
    if (!newClient.name || !newClient.username || !newClient.password) return; setLoading(true);
    await sb.from("clients").insert({ name: newClient.name, username: newClient.username, password: newClient.password, current_day_index: 0, completed_days: [] });
    setNewClient({ name: "", username: "", password: "" }); setAddClientModal(false); await loadClients(); setLoading(false); notify("Client added!");
  };
  const assignProgram = async () => { await sb.from("clients").update({ assigned_program: selectedProg || null, current_day_index: 0, completed_days: [] }).eq("id", assignModal); setAssignModal(null); await loadClients(); notify("Program assigned!"); };
  const deleteClient = async (id) => { await sb.from("clients").delete().eq("id", id); await loadClients(); notify("Client removed."); };

  if (!authed) {
    return (
      <div style={s.root}>
        <div style={s.loginWrap}>
          <div style={s.logo}><span style={s.logoAr}>تحرك</span><span style={s.logoEn}>TAHARRAK — COACH</span></div>
          <div style={s.form}>
            <p style={s.loginLabel}>Coach Password</p>
            <input style={s.input} type="password" placeholder="Enter password" value={passInput} onChange={e => setPassInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { passInput === COACH_PASS ? (setAuthed(true), setPassError("")) : setPassError("Wrong password"); } }} />
            {passError && <p style={s.error}>{passError}</p>}
            <button style={s.btn} onClick={() => { passInput === COACH_PASS ? (setAuthed(true), setPassError("")) : setPassError("Wrong password"); }}>Enter</button>
          </div>
        </div>
      </div>
    );
  }

  const selClient = clients.find(c => c.id === selectedClientId);
  const selClientLogs = logs.filter(l => l.client_id === selectedClientId);
  const selClientProg = programs.find(p => p.id === selClient?.assigned_program);

  return (
    <div style={s.root}>
      {notification && <div style={s.notification}>{notification}</div>}
      <div style={s.header}>
        <div><div style={s.logo2}>تحرك <span style={{ fontSize: 11, color: "#1fe5ff" }}>COACH</span></div></div>
        <button style={s.logoutBtn} onClick={() => setAuthed(false)}>Logout</button>
      </div>
      <div style={s.tabRow}>
        {["exercises", "programs", "clients", "progress"].map(t => (
          <button key={t} style={activeTab === t ? s.tabActive : s.tabInactive} onClick={() => { setActiveTab(t); if (t !== "programs") cancelEditProg(); if (t !== "progress") setSelectedClientId(null); }}>
            {t === "exercises" ? "Exercises" : t === "programs" ? "Programs" : t === "clients" ? "Clients" : "Progress"}
          </button>
        ))}
      </div>

      <div style={s.content}>

        {activeTab === "exercises" && (
          <>
            <h2 style={s.sectionTitle}>Exercise Library</h2>
            <div style={{ ...s.card, border: editingExId ? "1px solid #1fe5ff" : "1px solid #363d52" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ ...s.formLabel, margin: 0 }}>{editingExId ? "Editing Exercise" : "Add Exercise"}</p>
                {editingExId && <button style={s.removeBtn} onClick={cancelEditEx}>Cancel</button>}
              </div>
              <input style={s.input} placeholder="Exercise name" value={newEx.name} onChange={e => setNewEx({ ...newEx, name: e.target.value })} />
              <input style={s.input} placeholder="YouTube URL" value={newEx.video_url} onChange={e => setNewEx({ ...newEx, video_url: e.target.value })} />
              <input style={s.input} placeholder="Description (optional)" value={newEx.description} onChange={e => setNewEx({ ...newEx, description: e.target.value })} />
              <select style={s.input} value={newEx.category} onChange={e => setNewEx({ ...newEx, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <button style={s.btn} onClick={saveExercise} disabled={loading}>{editingExId ? "Update Exercise" : "Add Exercise"}</button>
            </div>
            {/* Category filter */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {["All", ...CATEGORIES].map(cat => (
                <button key={cat}
                  style={filterExCat === cat ? s.catBtnActive : s.catBtn}
                  onClick={() => setFilterExCat(cat)}>
                  {cat}
                </button>
              ))}
            </div>

            {exercises.filter(ex => filterExCat === "All" || ex.category === filterExCat).length === 0 && <div style={s.empty}>No exercises in this category yet.</div>}
            {exercises.filter(ex => filterExCat === "All" || ex.category === filterExCat).map(ex => (
              <div key={ex.id} style={{ ...s.card, border: editingExId === ex.id ? "1px solid #1fe5ff" : "1px solid #363d52" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={s.exName}>{ex.name}</div>
                    <div style={s.exCat}>{ex.category}</div>
                    {ex.description && <div style={{ color: "#e0e0e0", fontSize: 12, marginTop: 4 }}>{ex.description}</div>}
                    {ex.video_url && <a href={ex.video_url} target="_blank" rel="noreferrer" style={s.videoLink}>Watch Video</a>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={s.editBtn} onClick={() => startEditEx(ex)}>Edit</button>
                    <button style={s.removeBtn} onClick={() => deleteExercise(ex.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "programs" && (
          <>
            <h2 style={s.sectionTitle}>Programs</h2>
            <div style={{ ...s.card, border: editingProgId ? "1px solid #1fe5ff" : "1px solid #363d52" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ ...s.formLabel, margin: 0 }}>{editingProgId ? "Editing Program" : "Create Program"}</p>
                {editingProgId && <button style={s.removeBtn} onClick={cancelEditProg}>Cancel</button>}
              </div>
              <input style={s.input} placeholder="Program name" value={progForm.name} onChange={e => setProgForm({ ...progForm, name: e.target.value })} />
              {progForm.weeks.map((week, wi) => (
                <div key={week.id} style={s.weekBlock}>
                  <div style={s.weekHeader}>
                    <button style={s.weekToggle} onClick={() => setExpandedWeeks(p => ({ ...p, [wi]: !p[wi] }))}>{expandedWeeks[wi] ? "▾" : "▸"}</button>
                    <input style={{ ...s.input, margin: 0, flex: 1, fontWeight: 700 }} value={week.label} onChange={e => { const weeks = progForm.weeks.map((w, i) => i === wi ? { ...w, label: e.target.value } : w); setProgForm({ ...progForm, weeks }); }} />
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button style={s.orderBtn} onClick={() => moveWeek(wi, -1)} disabled={wi === 0}>▲</button>
                      <button style={s.orderBtn} onClick={() => moveWeek(wi, 1)} disabled={wi === progForm.weeks.length - 1}>▼</button>
                      <button style={s.dupeBtn} onClick={() => duplicateWeek(wi)}>⧉</button>
                      <button style={s.addDayBtn} onClick={() => addDay(wi)}>+ Day</button>
                      {progForm.weeks.length > 1 && <button style={s.removeBtn} onClick={() => removeWeek(wi)}>✕</button>}
                    </div>
                  </div>
                  {expandedWeeks[wi] && week.days.map((day, di) => (
                    <div key={day.id} style={s.dayBlock}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <input style={{ ...s.input, margin: 0, flex: 1, marginRight: 8 }} value={day.label} onChange={e => { const weeks = progForm.weeks.map((w, i) => i !== wi ? w : { ...w, days: w.days.map((d, j) => j === di ? { ...d, label: e.target.value } : d) }); setProgForm({ ...progForm, weeks }); }} />
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={s.orderBtn} onClick={() => moveDay(wi, di, -1)} disabled={di === 0}>▲</button>
                          <button style={s.orderBtn} onClick={() => moveDay(wi, di, 1)} disabled={di === week.days.length - 1}>▼</button>
                          <button style={s.dupeBtn} onClick={() => duplicateDay(wi, di)}>⧉</button>
                          {week.days.length > 1 && <button style={s.removeBtn} onClick={() => removeDay(wi, di)}>✕</button>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                        {["All", ...CATEGORIES].map(cat => { const fk = `${wi}-${di}`; const active = (filterCat[fk] || "All") === cat; return <button key={cat} style={active ? s.catBtnActive : s.catBtn} onClick={() => setFilterCat({ ...filterCat, [fk]: cat })}>{cat}</button>; })}
                      </div>
                      <select style={s.input} value="" onChange={e => { if (e.target.value) addExToDay(wi, di, e.target.value); }}>
                        <option value="">+ Add exercise to {day.label}</option>
                        {exercises.filter(ex => { const fc = filterCat[`${wi}-${di}`] || "All"; return fc === "All" || ex.category === fc; }).map(ex => (<option key={ex.id} value={ex.id}>{ex.name} ({ex.category})</option>))}
                      </select>
                      {day.exercises.length === 0 && <p style={{ color: "#a0a0a0", fontSize: 12 }}>No exercises added</p>}
                      {day.exercises.map((exItem, ei) => {
                        const ex = exercises.find(e => e.id === exItem.id);
                        return (
                          <div key={ei} style={s.exPrescription}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{ex?.name || "Unknown"}</span>
                              <button style={{ ...s.removeBtn, color: "#ef4444" }} onClick={() => removeExFromDay(wi, di, ei)}>Remove</button>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <div style={s.prescField}><label style={s.prescLabel}>Sets</label><input style={s.prescInput} type="number" min="1" value={exItem.sets} onChange={e => updateExInDay(wi, di, ei, "sets", e.target.value)} /></div>
                              <div style={s.prescField}><label style={s.prescLabel}>Reps</label><input style={s.prescInput} type="text" value={exItem.reps} onChange={e => updateExInDay(wi, di, ei, "reps", e.target.value)} /></div>
                              <div style={s.prescField}><label style={s.prescLabel}>Weight (kg)</label><input style={s.prescInput} type="text" placeholder="e.g. 20 or 15-20" value={exItem.weight || ""} onChange={e => updateExInDay(wi, di, ei, "weight", e.target.value)} /></div>
                              <div style={s.prescField}><label style={s.prescLabel}>Hold (sec)</label><input style={s.prescInput} type="text" placeholder="e.g. 30" value={exItem.hold || ""} onChange={e => updateExInDay(wi, di, ei, "hold", e.target.value)} /></div>
                              <div style={s.prescField}><label style={s.prescLabel}>Rest (s)</label><input style={s.prescInput} type="number" min="0" value={exItem.rest} onChange={e => updateExInDay(wi, di, ei, "rest", e.target.value)} /></div>
                            </div>
                            <textarea style={s.noteInput} placeholder="Coach note for client (optional)..." value={exItem.note || ""} onChange={e => updateExInDay(wi, di, ei, "note", e.target.value)} />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
              <button style={{ ...s.btn, background: "#333a4d", color: "#fff", marginBottom: 10 }} onClick={addWeek}>+ Add Week</button>
              <button style={s.btn} onClick={saveProgram} disabled={loading}>{editingProgId ? "Update Program" : "Save Program"}</button>
            </div>
            {programs.length === 0 && <div style={s.empty}>No programs yet.</div>}
            {programs.map(prog => (
              <div key={prog.id} style={{ ...s.card, border: editingProgId === prog.id ? "1px solid #1fe5ff" : "1px solid #363d52" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={s.exName}>{prog.name}</div>
                    <div style={{ color: "#e0e0e0", fontSize: 12, marginTop: 2 }}>{prog.weeks?.length || 0} week(s) · {flattenDays(prog.weeks || []).length} total days</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button style={s.editBtn} onClick={() => startEditProg(prog)}>Edit</button>
                    <button style={s.dupeBtn} onClick={() => duplicateProgram(prog)}>Copy</button>
                    <button style={s.removeBtn} onClick={() => deleteProgram(prog.id)}>Delete</button>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {prog.weeks?.map((w, i) => <div key={i} style={s.weekSummaryBadge}>{w.label}: {w.days?.length} days</div>)}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "clients" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ ...s.sectionTitle, margin: 0 }}>Clients</h2>
              <button style={{ ...s.btn, padding: "8px 14px", fontSize: 13 }} onClick={() => setAddClientModal(true)}>+ Add Client</button>
            </div>
            {clients.length === 0 && <div style={s.empty}>No clients yet.</div>}
            {clients.map(client => {
              const prog = programs.find(p => p.id === client.assigned_program);
              const totalDays = flattenDays(prog?.weeks || []).length;
              const currentIdx = client.current_day_index || 0;
              return (
                <div key={client.id} style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={s.exName}>{client.name}</div>
                      <div style={{ color: "#e0e0e0", fontSize: 12 }}>@{client.username}</div>
                      <div style={{ color: prog ? "#1fe5ff" : "#a0a0a0", fontSize: 12, marginTop: 2 }}>{prog ? `${prog.name} — Day ${currentIdx + 1} of ${totalDays}` : "No program assigned"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={s.assignBtn} onClick={() => { setAssignModal(client.id); setSelectedProg(client.assigned_program || ""); }}>Assign</button>
                      <button style={s.removeBtn} onClick={() => deleteClient(client.id)}>Remove</button>
                    </div>
                  </div>
                  {prog && (<div style={{ marginTop: 8 }}><div style={s.progressTrack}><div style={{ ...s.progressFill, width: `${totalDays ? (currentIdx / totalDays) * 100 : 0}%` }} /></div><div style={{ color: "#a0a0a0", fontSize: 11, marginTop: 4 }}>{currentIdx} of {totalDays} days completed</div></div>)}
                </div>
              );
            })}
          </>
        )}

        {activeTab === "progress" && (
          <>
            <h2 style={s.sectionTitle}>Client Progress</h2>
            {!selectedClientId ? (
              <>
                {clients.length === 0 && <div style={s.empty}>No clients yet.</div>}
                {clients.map(client => {
                  const prog = programs.find(p => p.id === client.assigned_program);
                  const totalDays = flattenDays(prog?.weeks || []).length;
                  const currentIdx = client.current_day_index || 0;
                  const clientLogs = logs.filter(l => l.client_id === client.id);
                  const pct = totalDays ? Math.round((currentIdx / totalDays) * 100) : 0;
                  return (
                    <div key={client.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => setSelectedClientId(client.id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={s.exName}>{client.name}</div>
                          <div style={{ color: "#e0e0e0", fontSize: 12, marginTop: 2 }}>{prog ? prog.name : "No program"}</div>
                          <div style={{ color: "#a0a0a0", fontSize: 11, marginTop: 2 }}>{clientLogs.length} logs · {(client.completed_days || []).length} days done</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={s.progressRing}><span style={{ color: "#1fe5ff", fontWeight: 900, fontSize: 12 }}>{pct}%</span></div>
                          <div style={{ color: "#a0a0a0", fontSize: 10, marginTop: 4 }}>Day {currentIdx + 1}/{totalDays || "—"}</div>
                        </div>
                      </div>
                      {prog && <div style={{ marginTop: 8 }}><div style={s.progressTrack}><div style={{ ...s.progressFill, width: `${pct}%` }} /></div></div>}
                      <div style={{ color: "#a0a0a0", fontSize: 11, marginTop: 6 }}>Tap to view logs →</div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <button style={{ ...s.removeBtn, marginBottom: 14 }} onClick={() => setSelectedClientId(null)}>← Back</button>
                {selClient && (
                  <>
                    <div style={s.card}>
                      <div style={s.exName}>{selClient.name}</div>
                      <div style={{ color: "#e0e0e0", fontSize: 12 }}>@{selClient.username}</div>
                      {selClientProg && (
                        <>
                          <div style={{ color: "#1fe5ff", fontSize: 13, marginTop: 6 }}>{selClientProg.name}</div>
                          <div style={{ color: "#a0a0a0", fontSize: 12, marginTop: 2 }}>Day {(selClient.current_day_index || 0) + 1} of {flattenDays(selClientProg.weeks || []).length}</div>
                          <div style={{ marginTop: 8 }}><div style={s.progressTrack}><div style={{ ...s.progressFill, width: `${flattenDays(selClientProg.weeks || []).length ? Math.round(((selClient.current_day_index || 0) / flattenDays(selClientProg.weeks || []).length) * 100) : 0}%` }} /></div></div>
                        </>
                      )}
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <div style={s.weekSummaryBadge}>{selClientLogs.length} total logs</div>
                        <div style={s.weekSummaryBadge}>{(selClient.completed_days || []).length} days completed</div>
                      </div>
                    </div>
                    <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Workout Logs</h3>
                    {selClientLogs.length === 0 ? <div style={s.empty}>No logs yet.</div> : selClientLogs.map((log, i) => {
                      const ex = exercises.find(e => e.id === log.exercise_id);
                      return (
                        <div key={i} style={s.card}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={s.exName}>{ex?.name || "Exercise"}</div>
                            <div style={{ color: "#a0a0a0", fontSize: 12 }}>{log.log_date}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {log.sets?.map((set, si) => <div key={si} style={s.weekSummaryBadge}>Set {si + 1}: {set.reps} reps</div>)}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {assignModal && (
        <div style={s.modalBg}>
          <div style={s.modal}>
            <h3 style={{ color: "#fff", marginBottom: 12 }}>Assign Program</h3>
            <select style={s.input} value={selectedProg} onChange={e => setSelectedProg(e.target.value)}>
              <option value="">— Remove program —</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={s.btn} onClick={assignProgram}>Save</button>
              <button style={{ ...s.btn, background: "#333a4d", color: "#fff" }} onClick={() => setAssignModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {addClientModal && (
        <div style={s.modalBg}>
          <div style={s.modal}>
            <h3 style={{ color: "#fff", marginBottom: 12 }}>Add Client</h3>
            <input style={s.input} placeholder="Full name" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
            <input style={s.input} placeholder="Username" value={newClient.username} onChange={e => setNewClient({ ...newClient, username: e.target.value })} />
            <input style={s.input} placeholder="Password" value={newClient.password} onChange={e => setNewClient({ ...newClient, password: e.target.value })} />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={s.btn} onClick={saveClient} disabled={loading}>Add</button>
              <button style={{ ...s.btn, background: "#333a4d", color: "#fff" }} onClick={() => setAddClientModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#2a2e3c", fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#fff", paddingBottom: 60 },
  loginWrap: { maxWidth: 420, margin: "0 auto", padding: "60px 20px" },
  logo: { textAlign: "center", marginBottom: 32 },
  logoAr: { display: "block", fontSize: 44, fontWeight: 900, color: "#1fe5ff", letterSpacing: 2, lineHeight: 1 },
  logoEn: { display: "block", fontSize: 11, letterSpacing: 6, color: "#a0a0a0", marginTop: 4 },
  logo2: { fontSize: 20, fontWeight: 900, color: "#1fe5ff" },
  tabRow: { display: "flex", gap: 4, padding: "10px 12px", borderBottom: "1px solid #333a4d", background: "#232736", flexWrap: "wrap" },
  tabActive: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  tabInactive: { background: "#333a4d", color: "#e0e0e0", border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { background: "#232736", border: "1px solid #3d4560", borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 8, outline: "none" },
  btn: { background: "#1fe5ff", color: "#2a2e3c", border: "none", borderRadius: 8, padding: "11px 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, width: "100%" },
  loginLabel: { color: "#fff", fontSize: 13, margin: "0 0 4px" },
  error: { color: "#ef4444", fontSize: 13, margin: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #333a4d", background: "#232736" },
  logoutBtn: { background: "#333a4d", color: "#e0e0e0", border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13 },
  content: { maxWidth: 720, margin: "0 auto", padding: "16px 14px" },
  sectionTitle: { color: "#fff", fontSize: 20, fontWeight: 800, marginBottom: 16, marginTop: 0 },
  card: { background: "#232736", border: "1px solid #363d52", borderRadius: 12, padding: 14, marginBottom: 12 },
  exName: { color: "#fff", fontWeight: 700, fontSize: 15 },
  exCat: { color: "#1fe5ff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  videoLink: { color: "#60a5fa", fontSize: 12, textDecoration: "none", display: "inline-block", marginTop: 4 },
  formLabel: { color: "#fff", fontSize: 13, margin: "0 0 10px", fontWeight: 600 },
  removeBtn: { background: "#363d52", color: "#e0e0e0", border: "none", borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" },
  editBtn: { background: "#1a3040", color: "#4ade80", border: "1px solid #4ade80", borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  dupeBtn: { background: "#1a2a40", color: "#60a5fa", border: "1px solid #60a5fa", borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  assignBtn: { background: "#333a4d", color: "#1fe5ff", border: "1px solid #1fe5ff", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  modalBg: { position: "fixed", inset: 0, background: "rgba(20,24,40,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#2a2e3c", border: "1px solid #3d4560", borderRadius: 14, padding: 24, width: "100%", maxWidth: 380 },
  empty: { color: "#a0a0a0", textAlign: "center", padding: "40px 20px", fontSize: 15, lineHeight: 1.8 },
  notification: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1fe5ff", color: "#2a2e3c", borderRadius: 8, padding: "10px 24px", fontWeight: 800, fontSize: 14, zIndex: 999, whiteSpace: "nowrap" },
  weekBlock: { background: "#1e2232", border: "1px solid #3d4560", borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  weekHeader: { display: "flex", alignItems: "center", gap: 6, padding: 10, background: "#232736", borderBottom: "1px solid #3d4560", flexWrap: "wrap" },
  weekToggle: { background: "none", border: "none", color: "#1fe5ff", fontSize: 16, cursor: "pointer", fontWeight: 900, padding: "0 4px" },
  addDayBtn: { background: "#1a2535", color: "#1fe5ff", border: "1px solid #1fe5ff", borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  weekSummaryBadge: { background: "#333a4d", color: "#e0e0e0", borderRadius: 4, fontSize: 11, padding: "3px 8px", display: "inline-block" },
  dayBlock: { background: "#232736", borderLeft: "3px solid #1fe5ff", borderRadius: 8, padding: 12, margin: "10px 10px 10px" },
  exPrescription: { background: "#2a2e3c", border: "1px solid #3d4560", borderRadius: 8, padding: 12, marginBottom: 8 },
  prescField: { display: "flex", flexDirection: "column", flex: 1 },
  prescLabel: { color: "#e0e0e0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  prescInput: { background: "#232736", border: "1px solid #3d4560", borderRadius: 6, color: "#fff", padding: "7px 10px", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" },
  noteInput: { background: "#232736", border: "1px solid #3d4560", borderRadius: 6, color: "#fff", padding: "7px 10px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", marginTop: 8, resize: "vertical", minHeight: 44, fontFamily: "inherit" },
  orderBtn: { background: "#2a2e3c", color: "#1fe5ff", border: "1px solid #3d4560", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontSize: 12, fontWeight: 900 },
  catBtn: { background: "#333a4d", color: "#a0a0a0", border: "1px solid #3d4560", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  catBtnActive: { background: "#1fe5ff", color: "#2a2e3c", border: "1px solid #1fe5ff", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  progressTrack: { background: "#333a4d", borderRadius: 99, height: 5, overflow: "hidden" },
  progressFill: { background: "#1fe5ff", height: "100%", borderRadius: 99 },
  progressRing: { width: 44, height: 44, borderRadius: "50%", border: "3px solid #1fe5ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};
