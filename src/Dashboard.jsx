import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from "recharts";
import {
  RefreshCw, Mail, FolderOpen, UploadCloud, MapPin, Clock3,
  CheckCircle2, XCircle, MinusCircle, ChevronDown,
} from "lucide-react";
import ChatPanel from "./ChatPanel";

/* ============================================================================
   DATA LAYER
   ----------------------------------------------------------------------------
   Everything the dashboard reads flows through fetchIncidents() and
   fetchSourceStatus() below. Right now they resolve fabricated demo records
   after a short simulated delay. To go live, replace the body of each
   function with a real call — nothing else in this file needs to change,
   since every component downstream just consumes the returned shape.

     async function fetchIncidents() {
       const res = await fetch('https://<your-n8n-host>/webhook/kpi-feed');
       if (!res.ok) throw new Error('kpi-feed request failed');
       return res.json(); // must match the RAW_INCIDENTS shape below
     }

   A natural production source is the W5 "Reporting & dashboard feed"
   workflow: an n8n webhook node reading the `documents` / structured-record
   table in Postgres and returning JSON in this shape.
============================================================================ */

const TODAY = new Date("2026-08-19"); // demo "as-of" date

const RAW_INCIDENTS = [
  {
    id: "INC-2026-014", type: "Flash Flood", region: "Riyadh", severity: "High",
    status: "Closed", eventDate: "2026-08-08", detectionDate: "2026-08-09",
    notificationDate: "2026-08-09", responseDate: "2026-08-16",
  },
  {
    id: "INC-2026-021", type: "Industrial Fire", region: "Makkah (Jeddah)", severity: "Critical",
    status: "Closed", eventDate: "2026-08-11", detectionDate: "2026-08-11",
    notificationDate: "2026-08-13", responseDate: "2026-08-19",
  },
  {
    id: "INC-2026-009", type: "Chemical Spill", region: "Makkah (Industrial City)", severity: "High",
    status: "Open", eventDate: "2026-08-05", detectionDate: "2026-08-12",
    notificationDate: "2026-08-13", responseDate: null,
  },
  {
    id: "INC-2026-033", type: "Structural Collapse", region: "Eastern Province", severity: "Medium",
    status: "Closed", eventDate: "2026-08-14", detectionDate: "2026-08-14",
    notificationDate: "2026-08-14", responseDate: "2026-08-17",
  },
  {
    id: "INC-2026-027", type: "Flooding", region: "Asir", severity: "Medium",
    status: "Open", eventDate: "2026-08-10", detectionDate: "2026-08-16",
    notificationDate: "2026-08-19", responseDate: null,
  },
];

const SOURCES = [
  { key: "email", label: "Email inbox", icon: Mail, docs: 5, mins: 6 },
  { key: "folder", label: "Watched shared folder", icon: FolderOpen, docs: 4, mins: 22 },
  { key: "upload", label: "Manual / portal upload", icon: UploadCloud, docs: 6, mins: 41 },
];

const dDiff = (a, b) => {
  if (!a || !b) return null;
  const val = Math.round((new Date(b) - new Date(a)) / 86400000);
  return isNaN(val) ? null : val;
};

function deriveIncident(raw) {
  const detectionDays = dDiff(raw.eventDate, raw.detectionDate);
  const notificationDays = dDiff(raw.detectionDate, raw.notificationDate);
  const responseDays = raw.responseDate ? dDiff(raw.notificationDate, raw.responseDate) : null;
  const responseDaysSoFar = raw.responseDate ? responseDays : dDiff(raw.notificationDate, TODAY.toISOString().slice(0, 10));
  return {
    ...raw,
    detectionDays,
    notificationDays,
    responseDays,
    responseDaysSoFar,
    // Only compliant if the days are accurately calculated and within target
    detectionOk: detectionDays !== null && detectionDays <= 7,
    notificationOk: notificationDays !== null && notificationDays <= 1,
    responseOk: raw.responseDate ? (responseDays !== null && responseDays <= 7) : (responseDaysSoFar !== null && responseDaysSoFar <= 7),
    responsePending: !raw.responseDate,
  };
}

async function fetchIncidents() {
  try {
    // Fetch live data from the W5 n8n Webhook
    const res = await fetch('https://logicmount.app.n8n.cloud/webhook/kpi-feed');
    if (!res.ok) throw new Error('Failed to fetch KPI feed');
    
    const data = await res.json();
    
    // n8n returns an array of objects
    const rows = Array.isArray(data) ? data : (data.data || []);
    
    // Pass the rows through the logic engine
    return rows.map(row => deriveIncident({
      id: row.incident_id || row.id || row.Id,
      type: row.type || row.Type || row.incident_type || 'Unspecified',
      region: row.region || row.Region || 'Unspecified',
      severity: row.severity || row.Severity || 'Unknown',
      status: row.status || row.Status || 'Open',
      // If the sheet leaves eventDate blank, fallback to detectionDate
      eventDate: row.eventDate || row.EventDate || row.detectionDate || row.DetectionDate || row.detection_date, 
      detectionDate: row.detectionDate || row.DetectionDate || row.detection_date,
      notificationDate: row.notificationDate || row.NotificationDate || row.notification_date,
      responseDate: row.responseDate || row.ResponseDate || row.response_date || null,
      source: row.source || row.Source || 'portal_upload' // Capture the source for the UI counts!
    }));
  } catch (error) {
    console.error("Error fetching live incidents:", error);
    return []; // Return empty array on failure so dashboard doesn't crash
  }
}

async function fetchSourceStatus() {
  await new Promise((r) => setTimeout(r, 350));
  return SOURCES;
}

/* ============================================================================
   DESIGN TOKENS
============================================================================ */

const C = {
  navy: "#0b2545",
  navyDeep: "#071a33",
  teal: "#0f8b8d",
  tealLight: "#5fb8ba",
  amber: "#b9770e",
  red: "#c0392b",
  green: "#1e8449",
  bg: "#eef2f5",
  card: "#ffffff",
  ink: "#10243e",
  muted: "#5b7083",
  line: "#dde6ea",
};

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

/* ============================================================================
   SMALL UI PRIMITIVES
============================================================================ */

function Tag({ tone, children }) {
  const map = {
    high: { bg: "#fdecea", fg: C.red }, critical: { bg: "#f6dedb", fg: "#7b241c" },
    medium: { bg: "#fdf3e3", fg: C.amber }, low: { bg: "#e9f6ee", fg: C.green },
    open: { bg: "#e6f0fa", fg: "#2874a6" }, closed: { bg: "#e9f6ee", fg: C.green },
  };
  const s = map[tone] || { bg: C.bg, fg: C.muted };
  return (
    <span style={{
      background: s.bg, color: s.fg, fontWeight: 600, fontSize: 11,
      padding: "3px 9px", borderRadius: 999, letterSpacing: 0.3, textTransform: "uppercase",
      fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function LegDot({ ok, pending }) {
  if (pending) return <MinusCircle size={16} color={C.muted} style={{ verticalAlign: "middle" }} />;
  return ok
    ? <CheckCircle2 size={16} color={C.green} style={{ verticalAlign: "middle" }} />
    : <XCircle size={16} color={C.red} style={{ verticalAlign: "middle" }} />;
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 14, border: `1px solid ${C.line}`,
      boxShadow: "0 1px 2px rgba(11,37,69,0.04)", ...style,
    }}>{children}</div>
  );
}

/* ============================================================================
   KPI CARD
============================================================================ */

function KpiCard({ label, value, sub, accent }) {
  return (
    <Card style={{ padding: "18px 20px", flex: 1, minWidth: 150 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: accent || C.navy, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.muted, marginTop: 8 }}>{sub}</div>}
    </Card>
  );
}

/* ============================================================================
   7-1-7 PIPELINE — signature element
   Three chained stages with a connecting flow line whose color reflects the
   compliance rate on that leg. This is the one domain-specific visual: it
   encodes the actual KPI structure PHA asked about, not a generic donut.
============================================================================ */

function stageColor(rate) {
  if (rate >= 80) return C.green;
  if (rate >= 50) return C.amber;
  return C.red;
}

function Stage717({ title, target, rate, compliant, total, breaches }) {
  const col = stageColor(rate);
  return (
    <div style={{ flex: 1, textAlign: "center", position: "relative" }}>
      <div style={{
        width: 84, height: 84, borderRadius: "50%", margin: "0 auto", position: "relative",
        background: `conic-gradient(${col} ${rate * 3.6}deg, ${C.line} 0deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 66, height: 66, borderRadius: "50%", background: C.card,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: C.navy,
        }}>{rate}%</div>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.navy, marginTop: 10 }}>{title}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.muted, marginTop: 2 }}>Target: {target}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.muted, marginTop: 2 }}>{compliant}/{total} compliant{breaches > 0 && <span style={{ color: C.red, fontWeight: 600 }}> · {breaches} breach{breaches > 1 ? "es" : ""}</span>}</div>
    </div>
  );
}

function Pipeline717({ incidents }) {
  const legs = useMemo(() => {
    const withPast = (pred) => incidents.filter(pred);
    const detCompliant = incidents.filter((i) => i.detectionOk).length;
    const notCompliant = incidents.filter((i) => i.notificationOk).length;
    const respRelevant = incidents; // all incidents count toward response, pending or not
    const respCompliant = respRelevant.filter((i) => i.responseOk).length;
    const total = incidents.length;
    return [
      { title: "Detection", target: "≤ 7 days", rate: Math.round((detCompliant / total) * 100), compliant: detCompliant, total, breaches: total - detCompliant },
      { title: "Notification", target: "≤ 1 day", rate: Math.round((notCompliant / total) * 100), compliant: notCompliant, total, breaches: total - notCompliant },
      { title: "Response", target: "≤ 7 days", rate: Math.round((respCompliant / respRelevant.length) * 100), compliant: respCompliant, total: respRelevant.length, breaches: respRelevant.length - respCompliant },
    ];
  }, [incidents]);

  return (
    <Card style={{ padding: "22px 28px" }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: C.navy, marginBottom: 18 }}>
        7-1-7 Compliance Pipeline
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
        {legs.map((leg, i) => (
          <React.Fragment key={leg.title}>
            <Stage717 {...leg} />
            {i < legs.length - 1 && (
              <div style={{
                flex: 0.4, height: 2, background: `linear-gradient(90deg, ${stageColor(legs[i].rate)}, ${stageColor(legs[i + 1].rate)})`,
                marginTop: 42, position: "relative",
              }}>
                <div style={{
                  position: "absolute", right: -1, top: -4, width: 0, height: 0,
                  borderTop: "5px solid transparent", borderBottom: "5px solid transparent",
                  borderLeft: `7px solid ${stageColor(legs[i + 1].rate)}`,
                }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================================
   CHARTS
============================================================================ */

function TypeChart({ incidents }) {
  const data = useMemo(() => {
    const m = {};
    incidents.forEach((i) => { m[i.type] = (m[i.type] || 0) + 1; });
    return Object.entries(m).map(([type, count]) => ({ type, count }));
  }, [incidents]);
  return (
    <Card style={{ padding: "18px 20px", flex: 1 }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.navy, marginBottom: 12 }}>Incidents by Type</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: -18, right: 8 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis dataKey="type" tick={{ fontSize: 10, fill: C.muted, fontFamily: "Inter" }} interval={0} angle={-18} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11, fill: C.muted, fontFamily: "Inter" }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
          <Bar dataKey="count" fill={C.teal} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function RegionChart({ incidents }) {
  const data = useMemo(() => {
    const m = {};
    incidents.forEach((i) => { m[i.region] = (m[i.region] || 0) + 1; });
    return Object.entries(m).map(([region, count]) => ({ region, count }));
  }, [incidents]);
  return (
    <Card style={{ padding: "18px 20px", flex: 1 }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.navy, marginBottom: 12 }}>Incidents by Region</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
          <CartesianGrid stroke={C.line} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: C.muted, fontFamily: "Inter" }} allowDecimals={false} />
          <YAxis type="category" dataKey="region" width={140} tick={{ fontSize: 11, fill: C.muted, fontFamily: "Inter" }} />
          <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
          <Bar dataKey="count" fill={C.navy} radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function ResponseTrendChart({ incidents }) {
  const data = useMemo(() => {
    return incidents
      .slice()
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .map((i) => ({
        id: i.id.replace("INC-2026-", "#"),
        days: i.responseDays ?? i.responseDaysSoFar,
        pending: i.responsePending,
      }));
  }, [incidents]);
  return (
    <Card style={{ padding: "18px 20px", flex: 1 }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.navy, marginBottom: 12 }}>
        Response Time by Incident <span style={{ fontWeight: 400, color: C.muted, fontSize: 11 }}>(days from notification; dashed = 7-day target)</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ left: -18, right: 16 }}>
          <CartesianGrid stroke={C.line} vertical={false} />
          <XAxis dataKey="id" tick={{ fontSize: 11, fill: C.muted, fontFamily: "Inter" }} />
          <YAxis tick={{ fontSize: 11, fill: C.muted, fontFamily: "Inter" }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
          <ReferenceLine y={7} stroke={C.red} strokeDasharray="4 4" />
          <Line type="monotone" dataKey="days" stroke={C.teal} strokeWidth={2.5} dot={{ r: 4, fill: C.teal }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

/* ============================================================================
   SOURCE STATUS STRIP
============================================================================ */

function SourceStrip({ sources }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {sources.map((s) => (
        <div key={s.key} style={{
          display: "flex", alignItems: "center", gap: 8, background: C.card,
          border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 14px",
        }}>
          <s.icon size={15} color={C.teal} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.ink, fontWeight: 500 }}>{s.label}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.muted }}>· {s.docs} docs · synced {s.mins}m ago</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   INCIDENT TABLE
============================================================================ */

function IncidentTable({ incidents }) {
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const regions = ["All", ...Array.from(new Set(incidents.map((i) => i.region)))];
  const statuses = ["All", "Open", "Closed"];

  const filtered = incidents.filter((i) =>
    (regionFilter === "All" || i.region === regionFilter) &&
    (statusFilter === "All" || i.status === statusFilter)
  );

  const selectStyle = {
    fontFamily: "Inter, sans-serif", fontSize: 12, padding: "6px 10px", borderRadius: 8,
    border: `1px solid ${C.line}`, background: C.card, color: C.ink, appearance: "none",
  };

  return (
    <Card style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.navy }}>Incident Log</div>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={selectStyle} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.line}` }}>
              {["ID", "Type", "Region", "Severity", "Status", "Detect", "Notify", "Respond"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: "9px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: C.navy }}>{i.id}</td>
                <td style={{ padding: "9px 10px" }}>{i.type}</td>
                <td style={{ padding: "9px 10px", color: C.muted }}><MapPin size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{i.region}</td>
                <td style={{ padding: "9px 10px" }}><Tag tone={i.severity.toLowerCase()}>{i.severity}</Tag></td>
                <td style={{ padding: "9px 10px" }}><Tag tone={i.status.toLowerCase()}>{i.status}</Tag></td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}><LegDot ok={i.detectionOk} /></td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}><LegDot ok={i.notificationOk} /></td>
                <td style={{ padding: "9px 10px", textAlign: "center" }}><LegDot ok={i.responseOk} pending={i.responsePending} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ============================================================================
   MAIN
============================================================================ */

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const inc = await fetchIncidents();
    
    // Tally the dynamic sources from the incident rows!
    const counts = { email: 0, folder: 0, upload: 0 };
    inc.forEach(i => {
      if (i.source === 'email') counts.email++;
      // Map google_drive to the folder bucket
      else if (i.source === 'watched_folder' || i.source === 'google_drive') counts.folder++;
      else counts.upload++; // fallback for portal_upload or empty
    });
    
    setIncidents(inc);
    setSources([
      { key: "email", label: "Email inbox", icon: Mail, docs: counts.email, mins: 0 },
      { key: "folder", label: "Watched shared folder", icon: FolderOpen, docs: counts.folder, mins: 0 },
      { key: "upload", label: "Manual / portal upload", icon: UploadCloud, docs: counts.upload, mins: 0 },
    ]);
    setLastSync(new Date());
    setLoading(false);
  }, []);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const formData = new FormData();
    // Append all files to the SAME request with unique keys
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });
    
    try {
      setLoading(true);
      await fetch('https://logicmount.app.n8n.cloud/webhook/pha-upload', {
        method: 'POST',
        body: formData
      });

      alert(`Successfully sent ${files.length} document(s) in a single trigger to n8n!`);
      
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
      event.target.value = null; 
    }
  };

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => {
    const total = incidents.length;
    // Count both 'Open' and 'Active' as open incidents
    const open = incidents.filter((i) => i.status === "Open" || i.status === "Active" || i.status === "ACTIVE").length;
    const closed = total - open;
    const closedResp = incidents.filter((i) => i.responseDays != null);
    const avgResp = closedResp.length
      ? (closedResp.reduce((s, i) => s + i.responseDays, 0) / closedResp.length).toFixed(1)
      : "—";
    const breaches = incidents.filter((i) => !i.detectionOk || !i.notificationOk || !i.responseOk).length;
    return { total, open, closed, avgResp, breaches };
  }, [incidents]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style>{fontImport}{`
        * { box-sizing: border-box; }
        ::selection { background: ${C.teal}33; }
        select:focus, button:focus { outline: 2px solid ${C.teal}; outline-offset: 1px; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(120deg, ${C.navyDeep}, ${C.navy} 55%, ${C.teal})`, padding: "22px 32px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: -0.5,
            }}>W</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, letterSpacing: 0.2 }}>PUBLIC HEALTH AUTHORITY (WEQAYA)</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, opacity: 0.85, marginTop: 2 }}>Public Health Events Center — Emergency &amp; ICS Leadership Dashboard</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontFamily: "Inter, sans-serif", fontSize: 10.5, fontWeight: 600, background: "rgba(192,57,43,0.85)",
              padding: "4px 10px", borderRadius: 999, letterSpacing: 0.4, textTransform: "uppercase",
            }}>Fabricated Demo Data</span>
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              id="fileUpload" 
              style={{ display: "none" }} 
              onChange={handleFileUpload} 
              multiple
            />
            
            {/* Upload Button */}
            <button onClick={() => document.getElementById("fileUpload").click()} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 8,
              padding: "7px 12px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500,
              cursor: loading ? "default" : "pointer",
            }}>
              <UploadCloud size={13} />
              Upload Document
            </button>

            <button onClick={load} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 8,
              padding: "7px 12px", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500,
              cursor: loading ? "default" : "pointer",
            }}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 0.9s linear infinite" : "none" }} />
              {loading ? "Syncing…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: "22px 32px 40px", maxWidth: "100%", margin: "0 auto" }}>
        {/* Source status */}
        <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <SourceStrip sources={sources} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontFamily: "Inter, sans-serif", fontSize: 11.5 }}>
            <Clock3 size={13} />
            {lastSync ? `Dashboard last synced ${lastSync.toLocaleTimeString()}` : "Loading…"}
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
          <KpiCard label="Total Incidents" value={kpis.total || "—"} sub="Emergency / ICS domain, current window" />
          <KpiCard label="Open" value={kpis.open || "—"} accent={C.amber} sub="Response in progress" />
          <KpiCard label="Closed" value={kpis.closed || "—"} accent={C.green} sub="Response complete" />
          <KpiCard label="Avg. Response Time" value={kpis.avgResp === "—" ? "—" : `${kpis.avgResp}d`} sub="Closed incidents, notification → response" />
          <KpiCard label="7-1-7 Breaches" value={kpis.breaches || "0"} accent={kpis.breaches ? C.red : C.green} sub="Incidents missing ≥1 target leg" />
        </div>

        {/* Pipeline */}
        <div style={{ marginBottom: 18 }}>
          {incidents.length > 0 && <Pipeline717 incidents={incidents} />}
        </div>

        {/* Charts */}
        <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}><TypeChart incidents={incidents} /></div>
          <div style={{ flex: "1 1 300px" }}><RegionChart incidents={incidents} /></div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <ResponseTrendChart incidents={incidents} />
        </div>

        {/* Table */}
        {incidents.length > 0 && <IncidentTable incidents={incidents} />}

        <div style={{ marginTop: 24, fontFamily: "Inter, sans-serif", fontSize: 11, color: C.muted, textAlign: "center" }}>
          FABRICATED DEMO DATA — Logic Mount / PHA discovery demo — not a real PHA record.
          Production path: this view reads from a self-hosted API/webhook over PHA's own corpus, no data leaves their environment.
        </div>
      </div>
      <ChatPanel />
    </div>
  );
}
