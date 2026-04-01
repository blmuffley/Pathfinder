/**
 * Avennorth Pathfinder — ServiceNow Workspace Prototype (Demo Edition)
 * Full interactive prototype with search, filters, dialogs, toasts, and rich sample data.
 */
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, PieChart, Pie, Cell, ComposedChart } from "recharts";

// ── Design tokens ──
const T = {
  bg: "#0e0e0c", bgCard: "#1c1917", bgHover: "#292524", bgInput: "#151513",
  lime: "#39FF14", limeDim: "rgba(57,255,20,0.10)", limeBorder: "rgba(57,255,20,0.25)",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444", blue: "#3b82f6",
  purple: "#8b5cf6", cyan: "#06b6d4", pink: "#ec4899", white: "#fafaf9", text: "#d6d3d1",
  dim: "#78716c", border: "rgba(255,255,255,0.06)", borderLight: "rgba(255,255,255,0.10)",
};
const HC = { Healthy: T.green, Degraded: T.amber, Critical: T.red, Unknown: T.dim };
const PC = { Critical: T.red, High: T.amber, Medium: T.blue, Low: T.dim };
const AC = { Active: T.green, Stale: T.amber, Decommissioned: T.dim };
const EC = { Confirmed: T.green, Suggested: T.amber, Rejected: T.dim };

// ── Sample Data (expanded for demo) ──
const INTEGRATIONS = [
  { id:"i1", name:"Order Service \u2192 Payment Gateway", src:"Order Service", tgt:"Payment Gateway", type:"API", hs:"Healthy", score:92, conf:0.95, flows:48200, last:"2 min ago", ea:"Mapped", crit:"Critical", disc:"Pathfinder", owner:"J. Martinez", grp:"App Platform", ai:"High-frequency HTTPS integration handling ~1,200 transactions/hour with 99.97% availability. Latency stable at p50=45ms, p99=120ms. Critical-path dependency for e-commerce revenue. No anomalies detected in the last 30 days.", dc:"Confidential", first:"2026-01-15" },
  { id:"i2", name:"Inventory Mgr \u2192 Warehouse DB", src:"Inventory Manager", tgt:"Warehouse DB", type:"Database", hs:"Healthy", score:88, conf:0.92, flows:31500, last:"5 min ago", ea:"Mapped", crit:"High", disc:"Pathfinder", owner:"S. Chen", grp:"Data Engineering", ai:"PostgreSQL connection from inventory service. Steady request-reply pattern. 500 queries/min average. Connection pooling via PgBouncer detected.", dc:"Internal", first:"2026-01-18" },
  { id:"i3", name:"Auth Service \u2192 LDAP Directory", src:"Auth Service", tgt:"Corporate LDAP", type:"Directory", hs:"Degraded", score:67, conf:0.88, flows:12800, last:"8 min ago", ea:"Unmapped", crit:"Critical", disc:"Pathfinder", owner:"", grp:"", ai:"LDAP authentication showing elevated latency (p99=340ms, baseline 80ms). Error rate at 1.2%. Likely caused by directory replication lag. Recommend investigating LDAP server health and replication topology.", dc:"Restricted", first:"2026-01-20" },
  { id:"i4", name:"Shipping Platform \u2192 Carrier API", src:"Shipping Platform", tgt:"FedEx API", type:"API", hs:"Healthy", score:85, conf:0.90, flows:8900, last:"12 min ago", ea:"Suggested", crit:"Medium", disc:"Pathfinder", owner:"K. Patel", grp:"Logistics", ai:"External HTTPS integration to FedEx shipping API. Batch pattern detected \u2014 traffic spikes at 2pm and 6pm daily corresponding to shipping cutoff times.", dc:"Internal", first:"2026-02-01" },
  { id:"i5", name:"Analytics Engine \u2192 Data Lake", src:"Analytics Engine", tgt:"S3 Data Lake", type:"File Transfer", hs:"Healthy", score:94, conf:0.85, flows:2400, last:"1 hr ago", ea:"Unmapped", crit:"Low", disc:"Pathfinder", owner:"", grp:"Data Engineering", ai:"", dc:"", first:"2026-02-05" },
  { id:"i6", name:"Notification Svc \u2192 Email Gateway", src:"Notification Service", tgt:"SendGrid", type:"Email", hs:"Critical", score:34, conf:0.91, flows:67000, last:"45 min ago", ea:"Unmapped", crit:"High", disc:"Pathfinder", owner:"M. Johnson", grp:"Platform", ai:"SMTP integration showing 4.8% error rate (threshold: 5%). Availability dropped to 96.2% in last 24 hours. Likely hitting SendGrid rate limits. Immediate action: review sending volume, implement exponential backoff.", dc:"Internal", first:"2026-02-10" },
  { id:"i7", name:"CRM \u2192 Salesforce Sync", src:"Internal CRM", tgt:"Salesforce", type:"API", hs:"Degraded", score:62, conf:0.78, flows:5600, last:"3 hr ago", ea:"Disputed", crit:"Medium", disc:"Pathfinder", owner:"L. Williams", grp:"Sales Ops", ai:"REST API sync showing intermittent 429 (rate limit) responses. Bulk data sync pattern detected \u2014 nightly at 1am. Consider switching to Salesforce Bulk API 2.0.", dc:"Confidential", first:"2026-02-12" },
  { id:"i8", name:"Event Bus \u2192 Kafka Cluster", src:"Event Bus", tgt:"Kafka Production", type:"Messaging", hs:"Healthy", score:96, conf:0.97, flows:890000, last:"1 min ago", ea:"Mapped", crit:"Critical", disc:"Pathfinder", owner:"R. Kim", grp:"Platform", ai:"High-throughput Kafka producer. ~15k messages/sec sustained across 12 partitions. Consumer lag <100ms. This is the backbone event bus for the entire platform. Zero message loss in 90-day observation window.", dc:"Internal", first:"2026-01-12" },
  { id:"i9", name:"User Service \u2192 Redis Cache", src:"User Service", tgt:"Redis Cluster", type:"Database", hs:"Healthy", score:91, conf:0.94, flows:156000, last:"30s ago", ea:"Mapped", crit:"High", disc:"Pathfinder", owner:"A. Torres", grp:"App Platform", ai:"Redis cache layer for user session data. GET/SET pattern with 99.2% cache hit rate. Average response time 1.2ms.", dc:"Confidential", first:"2026-01-14" },
  { id:"i10", name:"Report Generator \u2192 SMTP Relay", src:"Report Generator", tgt:"Internal SMTP", type:"Email", hs:"Healthy", score:82, conf:0.86, flows:450, last:"6 hr ago", ea:"Unmapped", crit:"Low", disc:"Pathfinder", owner:"", grp:"", ai:"", dc:"Internal", first:"2026-02-20" },
  { id:"i11", name:"CI/CD Pipeline \u2192 Artifact Registry", src:"Jenkins", tgt:"Nexus Registry", type:"API", hs:"Healthy", score:89, conf:0.83, flows:3200, last:"20 min ago", ea:"Unmapped", crit:"Medium", disc:"Pathfinder", owner:"DevOps Team", grp:"Platform", ai:"", dc:"Internal", first:"2026-02-25" },
  { id:"i12", name:"Monitoring \u2192 PagerDuty", src:"Prometheus", tgt:"PagerDuty", type:"API", hs:"Healthy", score:95, conf:0.92, flows:1800, last:"2 min ago", ea:"Mapped", crit:"High", disc:"Pathfinder", owner:"SRE Team", grp:"Platform", ai:"Alert forwarding integration. Low volume but critical path for incident response. 100% delivery rate over 30 days.", dc:"Internal", first:"2026-01-10" },
  { id:"i13", name:"Billing Service \u2192 Stripe API", src:"Billing Service", tgt:"Stripe", type:"API", hs:"Healthy", score:93, conf:0.96, flows:22100, last:"1 min ago", ea:"Mapped", crit:"Critical", disc:"Pathfinder", owner:"J. Martinez", grp:"Payments", ai:"Payment processing integration. Handles subscription billing and one-time charges. PCI-DSS compliant data path. 99.99% availability.", dc:"Restricted", first:"2026-01-08" },
  { id:"i14", name:"Search Service \u2192 Elasticsearch", src:"Search Service", tgt:"ES Cluster", type:"Database", hs:"Degraded", score:71, conf:0.89, flows:45000, last:"3 min ago", ea:"Unmapped", crit:"High", disc:"Pathfinder", owner:"R. Kim", grp:"Platform", ai:"Elasticsearch queries showing increased latency (p99 jumped from 200ms to 850ms). Index size may need optimization. Recommend checking shard allocation and running force-merge on older indices.", dc:"Internal", first:"2026-01-22" },
];

const IFACES = {
  i1: [
    { proto:"HTTPS", port:443, dir:"Outbound", pat:"Request-Reply", flows:42100, p50:45, p99:120, err:0.03, last:"2 min ago" },
    { proto:"HTTPS", port:8443, dir:"Outbound", pat:"Request-Reply", flows:6100, p50:62, p99:180, err:0.01, last:"5 min ago" },
  ],
  i3: [
    { proto:"TCP", port:389, dir:"Outbound", pat:"Request-Reply", flows:11200, p50:85, p99:340, err:1.2, last:"8 min ago" },
    { proto:"TCP", port:636, dir:"Outbound", pat:"Request-Reply", flows:1600, p50:90, p99:310, err:0.8, last:"12 min ago" },
  ],
  i6: [
    { proto:"TCP", port:25, dir:"Outbound", pat:"Fire-and-Forget", flows:55000, p50:120, p99:2400, err:4.8, last:"45 min ago" },
    { proto:"TCP", port:587, dir:"Outbound", pat:"Fire-and-Forget", flows:12000, p50:95, p99:1800, err:3.2, last:"1 hr ago" },
  ],
  i8: [
    { proto:"TCP", port:9092, dir:"Outbound", pat:"Streaming", flows:890000, p50:2, p99:8, err:0.0, last:"1 min ago" },
  ],
};

const AGENTS = [
  { id:"a1b2c3d4", host:"prod-web-01", status:"Active", os:"Linux", ver:"0.1.0", tier:2, hb:"30s ago", flows:142000 },
  { id:"e5f6g7h8", host:"prod-web-02", status:"Active", os:"Linux", ver:"0.1.0", tier:2, hb:"28s ago", flows:138500 },
  { id:"i9j0k1l2", host:"prod-db-01", status:"Active", os:"Linux", ver:"0.1.0", tier:3, hb:"15s ago", flows:89200 },
  { id:"m3n4o5p6", host:"prod-app-win01", status:"Active", os:"Windows", ver:"0.1.0", tier:2, hb:"45s ago", flows:56700 },
  { id:"q7r8s9t0", host:"prod-kafka-01", status:"Active", os:"Linux", ver:"0.1.0", tier:3, hb:"12s ago", flows:920000 },
  { id:"r1s2t3u4", host:"prod-web-03", status:"Active", os:"Linux", ver:"0.1.0", tier:2, hb:"22s ago", flows:131200 },
  { id:"v5w6x7y8", host:"prod-app-win02", status:"Active", os:"Windows", ver:"0.1.0", tier:2, hb:"38s ago", flows:48900 },
  { id:"z9a0b1c2", host:"k8s-node-01", status:"Active", os:"Kubernetes", ver:"0.1.0", tier:3, hb:"8s ago", flows:345000 },
  { id:"d3e4f5g6", host:"k8s-node-02", status:"Active", os:"Kubernetes", ver:"0.1.0", tier:3, hb:"10s ago", flows:312000 },
  { id:"u1v2w3x4", host:"staging-web-01", status:"Stale", os:"Linux", ver:"0.0.9", tier:1, hb:"3 days ago", flows:12400 },
  { id:"y5z6a7b8", host:"dev-app-01", status:"Stale", os:"Linux", ver:"0.0.8", tier:1, hb:"5 days ago", flows:3200 },
  { id:"c9d0e1f2", host:"prod-ldap-01", status:"Active", os:"Linux", ver:"0.1.0", tier:2, hb:"20s ago", flows:45600 },
  { id:"h3i4j5k6", host:"prod-es-01", status:"Active", os:"Linux", ver:"0.1.0", tier:2, hb:"18s ago", flows:67800 },
  { id:"l7m8n9o0", host:"prod-redis-01", status:"Active", os:"Linux", ver:"0.1.0", tier:3, hb:"5s ago", flows:210000 },
];

const GAPS = [
  { server:"prod-mail-01", type:"NoAgent", pri:"Critical", status:"Open", det:"2 hr ago", env:"Production" },
  { server:"prod-etl-02", type:"NoAgent", pri:"High", status:"Open", det:"6 hr ago", env:"Production" },
  { server:"prod-cache-03", type:"StaleAgent", pri:"High", status:"Open", det:"1 day ago", env:"Production" },
  { server:"prod-api-gw-02", type:"WrongTier", pri:"Medium", status:"Open", det:"2 days ago", env:"Production" },
  { server:"staging-db-01", type:"NoAgent", pri:"Low", status:"Open", det:"3 days ago", env:"Staging" },
  { server:"prod-batch-03", type:"NoAgent", pri:"Medium", status:"Open", det:"4 days ago", env:"Production" },
  { server:"prod-web-05", type:"NoAgent", pri:"High", status:"InProgress", det:"1 day ago", env:"Production" },
  { server:"prod-batch-01", type:"StaleAgent", pri:"Medium", status:"InProgress", det:"4 days ago", env:"Production" },
  { server:"prod-legacy-01", type:"WrongTier", pri:"Medium", status:"Resolved", det:"5 days ago", env:"Production" },
  { server:"prod-web-04", type:"NoAgent", pri:"High", status:"Resolved", det:"3 days ago", env:"Production" },
  { server:"dev-test-01", type:"NoAgent", pri:"Low", status:"Waived", det:"7 days ago", env:"Development" },
  { server:"dev-test-02", type:"NoAgent", pri:"Low", status:"Waived", det:"8 days ago", env:"Development" },
  { server:"prod-mq-02", type:"NoAgent", pri:"Critical", status:"Failed", det:"3 days ago", env:"Production" },
];

const EA_SUGS = {
  i3: [
    { rel:"Auth Service \u2194 Corporate LDAP (EA-2024-088)", conf:0.85, reason:"Fuzzy name match: 'auth service' ~ 'authentication service' (dist=1), 'corporate ldap' exact match.", status:"Suggested" },
    { rel:"Identity Provider \u2194 Directory (EA-2023-201)", conf:0.52, reason:"Group match: both CIs belong to 'Identity & Access Management' business service.", status:"Suggested" },
  ],
  i7: [
    { rel:"CRM \u2194 Salesforce (EA-2024-041)", conf:0.92, reason:"Exact CI match: source_ci and target_ci match EA parent and child.", status:"Suggested" },
    { rel:"CRM \u2194 SF Integration (EA-2023-118)", conf:0.71, reason:"Fuzzy name match: 'salesforce' ~ 'sf integration' (dist=2).", status:"Suggested" },
  ],
  i14: [
    { rel:"Search \u2194 Elasticsearch (EA-2025-003)", conf:0.88, reason:"Exact CI match on target. Source matched by fuzzy name.", status:"Suggested" },
  ],
};

const mkTrend = () => Array.from({length:30}, (_,i) => ({
  day: `Mar ${i+1}`, avail: 99.2+Math.random()*0.7-(i>25?1.5:0), lat: 60+Math.random()*30+(i>22?40:0),
  err: 0.3+Math.random()*0.4+(i>25?2.5:0), tput: 4500+Math.random()*800+(i>20?-500:0),
}));
const TREND = mkTrend();

const HDIST = [{name:"Healthy",value:9,color:T.green},{name:"Degraded",value:3,color:T.amber},{name:"Critical",value:1,color:T.red},{name:"Unknown",value:1,color:T.dim}];
const TDIST = [{name:"API",value:5,color:T.blue},{name:"Database",value:3,color:T.purple},{name:"Messaging",value:1,color:T.amber},{name:"Directory",value:1,color:T.cyan},{name:"Email",value:2,color:T.red},{name:"File Transfer",value:1,color:T.green},{name:"Other",value:1,color:T.dim}];

// ── Shared Components ──
const Pill = ({children,color=T.dim,sm}) => <span style={{fontFamily:"'Space Mono',monospace",fontSize:sm?9:10,padding:sm?"2px 6px":"3px 8px",borderRadius:4,background:`${color}20`,color,whiteSpace:"nowrap",fontWeight:600}}>{children}</span>;
const KPI = ({label,value,color=T.white,sub,onClick}) => <div onClick={onClick} style={{background:T.bgCard,borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${color}`,minWidth:120,cursor:onClick?"pointer":"default",transition:"all 0.15s"}}><div style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:T.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{label}</div><div style={{fontSize:24,fontWeight:700,color}}>{value}</div>{sub&&<div style={{fontSize:10,color:T.dim,marginTop:2}}>{sub}</div>}</div>;
const SearchBox = ({value,onChange,placeholder}) => <div style={{position:"relative",marginBottom:12}}><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Search..."} style={{width:"100%",padding:"8px 12px 8px 32px",borderRadius:8,border:`1px solid ${T.borderLight}`,background:T.bgInput,color:T.white,fontSize:11,outline:"none"}} /><span style={{position:"absolute",left:10,top:9,fontSize:12,color:T.dim}}>&#x1F50D;</span></div>;
const Progress = ({value,color}) => <div style={{height:6,borderRadius:3,background:T.bgHover,width:"100%"}}><div style={{height:6,borderRadius:3,width:`${Math.min(value,100)}%`,background:color||T.green,transition:"width 0.3s"}} /></div>;

function Dialog({open,title,children,onClose,onConfirm,confirmLabel="Confirm",confirmColor=T.green}) {
  if(!open) return null;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.bgCard,borderRadius:14,padding:24,minWidth:380,maxWidth:480,border:`1px solid ${T.borderLight}`}}>
      <div style={{fontSize:16,fontWeight:700,color:T.white,marginBottom:14}}>{title}</div>
      {children}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18}}>
        <button onClick={onClose} style={{padding:"8px 16px",borderRadius:6,border:`1px solid ${T.dim}`,background:"transparent",color:T.dim,fontSize:11,cursor:"pointer"}}>Cancel</button>
        <button onClick={onConfirm} style={{padding:"8px 16px",borderRadius:6,border:"none",background:confirmColor,color:T.bg,fontSize:11,fontWeight:600,cursor:"pointer"}}>{confirmLabel}</button>
      </div>
    </div>
  </div>;
}

function Toast({message,color,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[onDone]);
  return <div style={{position:"fixed",bottom:20,right:20,background:T.bgCard,border:`1px solid ${color||T.green}`,borderRadius:10,padding:"12px 20px",color:T.white,fontSize:12,fontWeight:500,zIndex:1001,boxShadow:`0 4px 20px rgba(0,0,0,0.5)`,display:"flex",alignItems:"center",gap:8}}>
    <div style={{width:8,height:8,borderRadius:"50%",background:color||T.green}} />{message}
  </div>;
}

// ── Overview Page ──
function OverviewPage({goTo}) {
  const healthy=INTEGRATIONS.filter(i=>i.hs==="Healthy").length;
  const degraded=INTEGRATIONS.filter(i=>i.hs==="Degraded").length;
  const critical=INTEGRATIONS.filter(i=>i.hs==="Critical").length;
  const activeAgents=AGENTS.filter(a=>a.status==="Active").length;
  const openGaps=GAPS.filter(g=>g.status==="Open").length;

  return <div>
    <h2 style={{fontSize:20,fontWeight:700,color:T.white,marginBottom:4}}>Overview</h2>
    <p style={{fontSize:12,color:T.dim,marginBottom:16}}>Real-time integration discovery and CMDB intelligence</p>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
      <KPI label="Total Integrations" value={INTEGRATIONS.length} color={T.lime} onClick={()=>goTo("integrations")} />
      <KPI label="Healthy" value={healthy} color={T.green} />
      <KPI label="Degraded" value={degraded} color={T.amber} />
      <KPI label="Critical" value={critical} color={T.red} onClick={()=>goTo("integrations")} />
      <KPI label="Active Agents" value={activeAgents} color={T.cyan} sub={`of ${AGENTS.length} total`} onClick={()=>goTo("agents")} />
      <KPI label="Open Gaps" value={openGaps} color={T.red} sub="remediation needed" onClick={()=>goTo("gaps")} />
      <KPI label="Avg Health" value={Math.round(INTEGRATIONS.reduce((s,i)=>s+i.score,0)/INTEGRATIONS.length)} color={T.lime} sub="across all integrations" />
      <KPI label="EA Mapped" value={`${Math.round(INTEGRATIONS.filter(i=>i.ea==="Mapped").length/INTEGRATIONS.length*100)}%`} color={T.amber} onClick={()=>goTo("ea")} />
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
      <div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:12}}>Health Distribution</div>
        <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={HDIST} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">{HDIST.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip contentStyle={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11}}/></PieChart></ResponsiveContainer>
        <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:6}}>{HDIST.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:d.color}}/><span style={{fontSize:10,color:T.text}}>{d.name}: {d.value}</span></div>)}</div>
      </div>
      <div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:12}}>Integration Types</div>
        <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={TDIST} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">{TDIST.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip contentStyle={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11}}/></PieChart></ResponsiveContainer>
        <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginTop:6}}>{TDIST.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:d.color}}/><span style={{fontSize:10,color:T.text}}>{d.name}: {d.value}</span></div>)}</div>
      </div>
    </div>
    {/* Trend sparkline */}
    <div style={{background:T.bgCard,borderRadius:12,padding:16,marginBottom:20}}>
      <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:10}}>Health Trend (30 days)</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={TREND}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="day" stroke={T.dim} fontSize={9} interval={5}/><YAxis stroke={T.dim} fontSize={9}/><Tooltip contentStyle={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,fontSize:10}}/><Area type="monotone" dataKey="avail" stroke={T.green} fill={`${T.green}15`} strokeWidth={2} dot={false} name="Availability"/></AreaChart>
      </ResponsiveContainer>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:600,color:T.white}}>Recently Discovered</span>
          <button onClick={()=>goTo("integrations")} style={{fontSize:10,color:T.lime,background:"none",border:"none",cursor:"pointer"}}>View all &rarr;</button>
        </div>
        {INTEGRATIONS.slice(0,6).map((i,x)=><div key={x} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}><span style={{flex:1,fontSize:11,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.name}</span><Pill color={HC[i.hs]} sm>{i.hs}</Pill><Pill sm>{i.type}</Pill></div>)}
      </div>
      <div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:600,color:T.white}}>Critical Coverage Gaps</span>
          <button onClick={()=>goTo("gaps")} style={{fontSize:10,color:T.lime,background:"none",border:"none",cursor:"pointer"}}>View all &rarr;</button>
        </div>
        {GAPS.filter(g=>g.status==="Open").slice(0,6).map((g,x)=><div key={x} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}><span style={{flex:1,fontSize:11,color:T.text}}>{g.server}</span><Pill color={PC[g.pri]} sm>{g.pri}</Pill><Pill sm>{g.type}</Pill><span style={{fontSize:9,color:T.dim}}>{g.det}</span></div>)}
      </div>
    </div>
  </div>;
}

// ── Integrations Page ──
function IntegrationsPage({addToast}) {
  const [search,setSearch]=useState("");
  const [filterHS,setFilterHS]=useState("All");
  const [filterType,setFilterType]=useState("All");
  const [sel,setSel]=useState(null);
  const [tab,setTab]=useState("overview");
  const [refreshing,setRefreshing]=useState(false);

  const filtered=INTEGRATIONS.filter(i=>{
    if(search&&!i.name.toLowerCase().includes(search.toLowerCase())&&!i.src.toLowerCase().includes(search.toLowerCase())&&!i.tgt.toLowerCase().includes(search.toLowerCase())) return false;
    if(filterHS!=="All"&&i.hs!==filterHS) return false;
    if(filterType!=="All"&&i.type!==filterType) return false;
    return true;
  });
  const s=INTEGRATIONS.find(i=>i.id===sel);
  const ifaces=IFACES[sel]||[];

  const handleRefreshAI=()=>{setRefreshing(true);setTimeout(()=>{setRefreshing(false);addToast("AI summary refreshed successfully",T.lime);},1500);};

  return <div style={{display:"flex",gap:14,height:"calc(100vh - 80px)"}}>
    <div style={{width:sel?"42%":"100%",overflowY:"auto",transition:"width 0.2s"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <h2 style={{fontSize:20,fontWeight:700,color:T.white}}>Integrations</h2>
        <span style={{fontSize:11,color:T.dim}}>{filtered.length} of {INTEGRATIONS.length}</span>
      </div>
      <SearchBox value={search} onChange={setSearch} placeholder="Search integrations..." />
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {["All","Healthy","Degraded","Critical"].map(h=><button key={h} onClick={()=>setFilterHS(h)} style={{padding:"4px 10px",borderRadius:5,border:"none",fontSize:10,fontWeight:filterHS===h?600:400,color:filterHS===h?T.bg:T.dim,background:filterHS===h?(h==="All"?T.lime:HC[h]||T.lime):"transparent",cursor:"pointer"}}>{h}</button>)}
        <span style={{width:1,background:T.border,margin:"0 4px"}} />
        {["All","API","Database","Messaging","Email","Directory","File Transfer"].map(t=><button key={t} onClick={()=>setFilterType(t)} style={{padding:"4px 10px",borderRadius:5,border:"none",fontSize:10,fontWeight:filterType===t?600:400,color:filterType===t?T.bg:T.dim,background:filterType===t?T.lime:"transparent",cursor:"pointer"}}>{t}</button>)}
      </div>
      <div style={{background:T.bgCard,borderRadius:12,overflow:"hidden"}}>
        {filtered.map(i=><div key={i.id} onClick={()=>{setSel(i.id);setTab("overview");}} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:sel===i.id?T.limeDim:"transparent",transition:"background 0.1s"}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:T.white,fontWeight:sel===i.id?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.name}</div><div style={{fontSize:9,color:T.dim,marginTop:2}}>{i.src} &rarr; {i.tgt}</div></div>
          <Pill sm>{i.type}</Pill>
          <Pill color={HC[i.hs]} sm>{i.hs}</Pill>
          <div style={{width:50}}><Progress value={i.score} color={HC[i.hs]}/></div>
          <span style={{fontSize:9,color:T.dim,minWidth:50,textAlign:"right"}}>{(i.flows/1000).toFixed(1)}k</span>
        </div>)}
        {filtered.length===0&&<div style={{padding:30,textAlign:"center",color:T.dim,fontSize:12}}>No integrations match your filters</div>}
      </div>
    </div>

    {s&&<div style={{flex:1,overflowY:"auto"}}>
      <div style={{background:T.bgCard,borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
          <span style={{fontSize:17,fontWeight:700,color:T.white}}>{s.name}</span>
          <Pill color={HC[s.hs]}>{s.hs}</Pill><Pill>{s.type}</Pill><Pill color={T.dim}>{s.crit}</Pill>
        </div>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {[["Score",`${s.score}/100`,HC[s.hs]],["Confidence",`${(s.conf*100).toFixed(0)}%`,T.white],["Flows",s.flows.toLocaleString(),T.white],["Last Seen",s.last,T.dim],["EA Status",s.ea,EC[s.ea]||T.dim],["Discovered",s.first,T.dim]].map(([l,v,c])=><div key={l}><div style={{fontSize:8,color:T.dim,fontFamily:"'Space Mono',monospace",letterSpacing:1,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:c}}>{v}</div></div>)}
        </div>
      </div>
      <div style={{display:"flex",gap:2,marginBottom:12}}>
        {["overview","interfaces","health","ea","activity"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"6px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:tab===t?600:400,color:tab===t?T.bg:T.dim,background:tab===t?T.lime:T.bgCard,transition:"all 0.15s"}}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
      </div>

      {tab==="overview"&&<div>
        {s.ai?<div style={{background:T.bgCard,borderRadius:12,padding:16,marginBottom:12,borderLeft:`3px solid ${T.lime}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:11,fontWeight:600,color:T.lime}}>AI Summary</span>
            <button onClick={handleRefreshAI} style={{fontSize:10,color:T.lime,background:`${T.lime}15`,border:"none",borderRadius:4,padding:"3px 10px",cursor:"pointer"}}>{refreshing?"Refreshing...":"Refresh"}</button>
          </div>
          <div style={{fontSize:11,color:T.text,lineHeight:1.7}}>{s.ai}</div>
        </div>:<div style={{background:T.bgCard,borderRadius:12,padding:20,marginBottom:12,textAlign:"center"}}>
          <div style={{fontSize:20,color:T.dim,marginBottom:6}}>&#x2728;</div>
          <div style={{fontSize:12,color:T.dim,marginBottom:8}}>No AI summary generated yet</div>
          <button onClick={handleRefreshAI} style={{fontSize:10,color:T.bg,background:T.lime,border:"none",borderRadius:6,padding:"6px 16px",cursor:"pointer",fontWeight:600}}>{refreshing?"Generating...":"Generate AI Summary"}</button>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{background:T.bgCard,borderRadius:12,padding:14}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white,marginBottom:10}}>Classification</div>
            {[["Source",s.src],["Target",s.tgt],["Type",s.type],["Confidence",`${(s.conf*100).toFixed(0)}%`],["Discovery",s.disc]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:10,color:T.dim}}>{l}</span><span style={{fontSize:10,color:T.white,fontWeight:500}}>{v}</span></div>)}
          </div>
          <div style={{background:T.bgCard,borderRadius:12,padding:14}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white,marginBottom:10}}>Governance</div>
            {[["Criticality",s.crit],["Data Classification",s.dc||"Not set"],["Owner",s.owner||"Unassigned"],["Support Group",s.grp||"Unassigned"],["EA Status",s.ea]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:10,color:T.dim}}>{l}</span><span style={{fontSize:10,color:(!v||v==="Unassigned"||v==="Not set")?T.amber:T.white,fontWeight:500}}>{v}</span></div>)}
          </div>
        </div>
      </div>}

      {tab==="interfaces"&&<div style={{background:T.bgCard,borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"60px 50px 80px 90px 60px 65px 55px 65px",padding:"8px 12px",borderBottom:`1px solid ${T.border}`}}>
          {["Proto","Port","Direction","Pattern","Flows","P50","Err%","Last"].map(h=><span key={h} style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:T.dim,letterSpacing:1}}>{h}</span>)}
        </div>
        {ifaces.length>0?ifaces.map((f,x)=><div key={x} style={{display:"grid",gridTemplateColumns:"60px 50px 80px 90px 60px 65px 55px 65px",padding:"8px 12px",borderBottom:`1px solid ${T.border}`}}>
          <Pill color={T.blue} sm>{f.proto}</Pill><span style={{fontSize:10,color:T.white}}>{f.port}</span><span style={{fontSize:10,color:T.text}}>{f.dir}</span><span style={{fontSize:10,color:T.dim}}>{f.pat}</span><span style={{fontSize:10,color:T.text}}>{(f.flows/1000).toFixed(1)}k</span><span style={{fontSize:10,color:f.p50>200?T.amber:T.text}}>{f.p50}ms</span><span style={{fontSize:10,color:f.err>1?T.red:T.text}}>{f.err.toFixed(2)}%</span><span style={{fontSize:10,color:T.dim}}>{f.last}</span>
        </div>):<div style={{padding:30,textAlign:"center",color:T.dim,fontSize:11}}>Interface data loading from gateway classification...</div>}
      </div>}

      {tab==="health"&&<div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:T.white,marginBottom:12}}>Health Metrics (30 days)</div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={TREND}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="day" stroke={T.dim} fontSize={9} interval={4}/><YAxis stroke={T.dim} fontSize={9}/><Tooltip contentStyle={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,fontSize:10}}/><Legend wrapperStyle={{fontSize:10}}/>
            <Line type="monotone" dataKey="avail" stroke={T.green} strokeWidth={2} dot={false} name="Availability" />
            <Line type="monotone" dataKey="lat" stroke={T.blue} strokeWidth={2} dot={false} name="Latency (ms)" />
            <Line type="monotone" dataKey="err" stroke={T.red} strokeWidth={2} dot={false} name="Error Rate %" />
          </LineChart>
        </ResponsiveContainer>
      </div>}

      {tab==="ea"&&<div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:T.white,marginBottom:12}}>EA Match Suggestions</div>
        {(EA_SUGS[sel]||[]).length>0?(EA_SUGS[sel]).map((sg,x)=><div key={x} style={{padding:12,background:T.bgHover,borderRadius:8,marginBottom:8,borderLeft:`3px solid ${T.amber}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:11,fontWeight:600,color:T.white}}>{sg.rel}</span><Pill color={EC[sg.status]} sm>{sg.status}</Pill></div>
          <div style={{fontSize:10,color:T.dim,marginBottom:8,lineHeight:1.5}}>{sg.reason}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:T.dim}}>Confidence</span>
            <div style={{flex:1,maxWidth:140}}><Progress value={sg.conf*100} color={sg.conf>0.8?T.green:T.amber}/></div>
            <span style={{fontSize:10,fontWeight:600,color:T.white}}>{(sg.conf*100).toFixed(0)}%</span>
            <button onClick={()=>addToast("EA mapping confirmed",T.green)} style={{padding:"4px 12px",borderRadius:4,border:"none",background:T.green,color:T.bg,fontSize:10,fontWeight:600,cursor:"pointer"}}>Confirm</button>
            <button onClick={()=>addToast("EA mapping rejected",T.red)} style={{padding:"4px 12px",borderRadius:4,border:`1px solid ${T.dim}`,background:"transparent",color:T.dim,fontSize:10,cursor:"pointer"}}>Reject</button>
          </div>
        </div>):<div style={{padding:30,textAlign:"center"}}><div style={{fontSize:11,color:T.dim}}>EA mapping is {s.ea.toLowerCase()}. {s.ea==="Unmapped"?"No suggestions available yet.":""}</div></div>}
      </div>}

      {tab==="activity"&&<div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:T.white,marginBottom:12}}>Activity Stream</div>
        {[{time:"2 min ago",msg:"Health score updated: 92/100",color:T.green},{time:"15 min ago",msg:"Flow count refreshed: 48,200 total",color:T.blue},{time:"1 hr ago",msg:"AI summary regenerated by J. Martinez",color:T.lime},{time:"2 hr ago",msg:"Classification confidence adjusted: 0.95",color:T.purple},{time:"1 day ago",msg:"EA mapping confirmed by L. Williams",color:T.cyan},{time:"3 days ago",msg:"First discovered by Pathfinder agent",color:T.lime}].map((a,x)=><div key={x} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:a.color,marginTop:4,flexShrink:0}} />
          <div><div style={{fontSize:11,color:T.text}}>{a.msg}</div><div style={{fontSize:9,color:T.dim}}>{a.time}</div></div>
        </div>)}
      </div>}
    </div>}
  </div>;
}

// ── Agent Fleet ──
function AgentFleetPage({addToast}) {
  const [search,setSearch]=useState("");
  const [dlg,setDlg]=useState(null);
  const active=AGENTS.filter(a=>a.status==="Active").length;
  const stale=AGENTS.filter(a=>a.status==="Stale").length;
  const totalFlows=AGENTS.reduce((s,a)=>s+a.flows,0);
  const osDist=[{name:"Linux",value:AGENTS.filter(a=>a.os==="Linux"&&a.status==="Active").length,color:T.green},{name:"Windows",value:AGENTS.filter(a=>a.os==="Windows"&&a.status==="Active").length,color:T.blue},{name:"Kubernetes",value:AGENTS.filter(a=>a.os==="Kubernetes"&&a.status==="Active").length,color:T.purple}];

  const filtered=AGENTS.filter(a=>!search||a.host.toLowerCase().includes(search.toLowerCase())||a.id.includes(search.toLowerCase()));

  return <div>
    <h2 style={{fontSize:20,fontWeight:700,color:T.white,marginBottom:16}}>Agent Fleet</h2>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
      <KPI label="Active" value={active} color={T.green} sub={`of ${AGENTS.length} total`} />
      <KPI label="Stale" value={stale} color={T.amber} sub="heartbeat missed" />
      <KPI label="Total Flows" value={`${(totalFlows/1000000).toFixed(2)}M`} color={T.cyan} />
      <div style={{background:T.bgCard,borderRadius:10,padding:14,minWidth:180}}>
        <div style={{fontSize:9,color:T.dim,fontFamily:"'Space Mono',monospace",letterSpacing:1,marginBottom:4}}>OS DISTRIBUTION</div>
        <div style={{display:"flex",gap:12}}>{osDist.map(o=><div key={o.name} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:o.color}}/><span style={{fontSize:11,color:T.white,fontWeight:600}}>{o.value}</span><span style={{fontSize:9,color:T.dim}}>{o.name}</span></div>)}</div>
      </div>
    </div>
    <SearchBox value={search} onChange={setSearch} placeholder="Search by hostname or agent ID..." />
    <div style={{background:T.bgCard,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1.4fr 70px 70px 55px 35px 75px 65px 50px",padding:"8px 12px",borderBottom:`1px solid ${T.border}`}}>
        {["Hostname","Agent ID","Status","OS","Version","Tier","Heartbeat","Flows",""].map(h=><span key={h} style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:T.dim,letterSpacing:1,textTransform:"uppercase"}}>{h}</span>)}
      </div>
      {filtered.map((a,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1.4fr 1.4fr 70px 70px 55px 35px 75px 65px 50px",padding:"8px 12px",borderBottom:`1px solid ${T.border}`,background:a.status==="Stale"?`${T.amber}08`:"transparent"}}>
        <span style={{fontSize:11,color:T.white}}>{a.host}</span>
        <span style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:T.dim}}>{a.id}</span>
        <Pill color={AC[a.status]} sm>{a.status}</Pill>
        <span style={{fontSize:10,color:T.text}}>{a.os}</span>
        <span style={{fontSize:10,color:T.dim}}>{a.ver}</span>
        <span style={{fontSize:10,color:T.white}}>{a.tier}</span>
        <span style={{fontSize:10,color:a.status==="Stale"?T.amber:T.dim}}>{a.hb}</span>
        <span style={{fontSize:10,color:T.dim}}>{(a.flows/1000).toFixed(1)}k</span>
        {a.status!=="Decommissioned"&&<button onClick={()=>setDlg(a)} style={{fontSize:9,color:T.red,background:"transparent",border:`1px solid ${T.red}30`,borderRadius:4,padding:"2px 6px",cursor:"pointer"}}>&#x23FB;</button>}
      </div>)}
    </div>
    <Dialog open={!!dlg} title="Decommission Agent?" onClose={()=>setDlg(null)} onConfirm={()=>{setDlg(null);addToast(`Agent ${dlg?.host} decommissioned`,T.amber);}} confirmLabel="Decommission" confirmColor={T.red}>
      <div style={{fontSize:12,color:T.text,lineHeight:1.6}}>This will mark <strong style={{color:T.white}}>{dlg?.host}</strong> ({dlg?.id}) as decommissioned. A coverage gap may be created for the linked server.</div>
    </Dialog>
  </div>;
}

// ── Coverage Gaps (Kanban) ──
function CoverageGapsPage({addToast}) {
  const [waiveDlg,setWaiveDlg]=useState(null);
  const [waiveReason,setWaiveReason]=useState("");
  const lanes=["Open","InProgress","Resolved","Waived","Failed"];
  const lc={Open:T.red,InProgress:T.amber,Resolved:T.green,Waived:T.dim,Failed:T.red};

  return <div>
    <h2 style={{fontSize:20,fontWeight:700,color:T.white,marginBottom:16}}>Coverage Gaps</h2>
    <div style={{display:"flex",gap:10,marginBottom:20}}>
      <KPI label="Open" value={GAPS.filter(g=>g.status==="Open").length} color={T.red} />
      <KPI label="In Progress" value={GAPS.filter(g=>g.status==="InProgress").length} color={T.amber} />
      <KPI label="Resolved" value={GAPS.filter(g=>g.status==="Resolved").length} color={T.green} />
      <KPI label="Failed" value={GAPS.filter(g=>g.status==="Failed").length} color={T.red} />
    </div>
    <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:10}}>
      {lanes.map(lane=>{
        const items=GAPS.filter(g=>g.status===lane);
        return <div key={lane} style={{minWidth:210,flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"8px 10px",background:T.bgCard,borderRadius:8,borderTop:`3px solid ${lc[lane]}`}}>
            <span style={{fontSize:12,fontWeight:600,color:lc[lane]}}>{lane==="InProgress"?"In Progress":lane}</span>
            <span style={{fontSize:10,color:T.dim,background:`${T.dim}20`,borderRadius:10,padding:"1px 7px"}}>{items.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {items.map((g,i)=><div key={i} style={{background:T.bgCard,borderRadius:8,padding:12,borderLeft:`3px solid ${PC[g.pri]}`}}>
              <div style={{fontSize:11,fontWeight:600,color:T.white,marginBottom:4}}>{g.server}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Pill color={T.dim} sm>{g.type}</Pill><Pill color={PC[g.pri]} sm>{g.pri}</Pill></div>
              <div style={{fontSize:9,color:T.dim,marginBottom:6}}>{g.env} &middot; {g.det}</div>
              {lane==="Open"&&<div style={{display:"flex",gap:4}}>
                <button onClick={()=>addToast(`Change request created for ${g.server}`,T.blue)} style={{flex:1,padding:"4px 0",borderRadius:4,border:"none",background:T.blue,color:T.white,fontSize:9,fontWeight:600,cursor:"pointer"}}>Create CR</button>
                <button onClick={()=>{setWaiveDlg(g);setWaiveReason("");}} style={{flex:1,padding:"4px 0",borderRadius:4,border:`1px solid ${T.dim}`,background:"transparent",color:T.dim,fontSize:9,cursor:"pointer"}}>Waive</button>
              </div>}
            </div>)}
            {items.length===0&&<div style={{fontSize:10,color:T.dim,textAlign:"center",padding:20,background:T.bgCard,borderRadius:8}}>Empty</div>}
          </div>
        </div>;
      })}
    </div>
    <Dialog open={!!waiveDlg} title="Waive Coverage Gap" onClose={()=>setWaiveDlg(null)} onConfirm={()=>{setWaiveDlg(null);addToast(`Gap waived for ${waiveDlg?.server}`,T.dim);}} confirmLabel="Waive" confirmColor={T.amber}>
      <div style={{fontSize:12,color:T.text,marginBottom:12}}>Waiving coverage gap for <strong style={{color:T.white}}>{waiveDlg?.server}</strong></div>
      <textarea value={waiveReason} onChange={e=>setWaiveReason(e.target.value)} placeholder="Reason for waiver (required)..." rows={3} style={{width:"100%",padding:10,borderRadius:8,border:`1px solid ${T.borderLight}`,background:T.bgInput,color:T.white,fontSize:11,resize:"vertical",outline:"none"}} />
    </Dialog>
  </div>;
}

// ── EA Reconciliation ──
function EAReconciliationPage({addToast}) {
  const unmapped=INTEGRATIONS.filter(i=>i.ea==="Unmapped"||i.ea==="Disputed");
  const [selEA,setSelEA]=useState(null);

  return <div>
    <h2 style={{fontSize:20,fontWeight:700,color:T.white,marginBottom:16}}>EA Reconciliation</h2>
    <div style={{display:"flex",gap:10,marginBottom:20}}>
      <KPI label="Unmapped" value={INTEGRATIONS.filter(i=>i.ea==="Unmapped").length} color={T.amber} />
      <KPI label="Mapped" value={INTEGRATIONS.filter(i=>i.ea==="Mapped").length} color={T.green} />
      <KPI label="Suggested" value={INTEGRATIONS.filter(i=>i.ea==="Suggested").length} color={T.cyan} />
      <KPI label="Disputed" value={INTEGRATIONS.filter(i=>i.ea==="Disputed").length} color={T.red} />
      <div style={{background:T.bgCard,borderRadius:10,padding:14,flex:1}}>
        <div style={{fontSize:9,color:T.dim,fontFamily:"'Space Mono',monospace",letterSpacing:1,marginBottom:4}}>RECONCILIATION PROGRESS</div>
        <Progress value={Math.round(INTEGRATIONS.filter(i=>i.ea==="Mapped").length/INTEGRATIONS.length*100)} color={T.green} />
        <div style={{fontSize:10,color:T.dim,marginTop:4}}>{Math.round(INTEGRATIONS.filter(i=>i.ea==="Mapped").length/INTEGRATIONS.length*100)}% complete</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:10}}>Unmapped / Disputed Integrations</div>
        <div style={{background:T.bgCard,borderRadius:12,overflow:"hidden"}}>
          {unmapped.map(i=><div key={i.id} onClick={()=>setSelEA(i.id)} style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:selEA===i.id?T.limeDim:"transparent"}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white,marginBottom:4}}>{i.name}</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><Pill sm>{i.type}</Pill><Pill color={i.ea==="Disputed"?T.red:T.amber} sm>{i.ea}</Pill><span style={{fontSize:9,color:T.dim}}>{i.flows.toLocaleString()} flows</span></div>
          </div>)}
        </div>
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:T.white,marginBottom:10}}>EA Match Suggestions</div>
        {selEA&&(EA_SUGS[selEA]||[]).length>0?<div style={{background:T.bgCard,borderRadius:12,padding:16}}>
          {(EA_SUGS[selEA]||[]).map((sg,x)=><div key={x} style={{padding:14,background:T.bgHover,borderRadius:8,marginBottom:8,borderLeft:`3px solid ${sg.conf>0.8?T.green:T.amber}`}}>
            <div style={{fontSize:11,fontWeight:600,color:T.white,marginBottom:4}}>{sg.rel}</div>
            <div style={{fontSize:10,color:T.dim,marginBottom:8,lineHeight:1.5}}>{sg.reason}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1}}><Progress value={sg.conf*100} color={sg.conf>0.8?T.green:T.amber}/></div>
              <span style={{fontSize:11,fontWeight:700,color:T.white}}>{(sg.conf*100).toFixed(0)}%</span>
              <button onClick={()=>addToast("EA mapping confirmed",T.green)} style={{padding:"5px 14px",borderRadius:5,border:"none",background:T.green,color:T.bg,fontSize:10,fontWeight:600,cursor:"pointer"}}>Confirm</button>
              <button onClick={()=>addToast("EA mapping rejected",T.red)} style={{padding:"5px 14px",borderRadius:5,border:`1px solid ${T.dim}`,background:"transparent",color:T.dim,fontSize:10,cursor:"pointer"}}>Reject</button>
            </div>
          </div>)}
        </div>:selEA?<div style={{background:T.bgCard,borderRadius:12,padding:16}}>
          <div style={{padding:30,textAlign:"center"}}><div style={{fontSize:11,color:T.dim}}>No EA match suggestions found for this integration.</div>
            <button onClick={()=>addToast("Manual mapping created",T.blue)} style={{marginTop:10,padding:"6px 16px",borderRadius:6,border:"none",background:T.blue,color:T.white,fontSize:10,fontWeight:600,cursor:"pointer"}}>Create Manual Mapping</button>
          </div>
        </div>:<div style={{background:T.bgCard,borderRadius:12,padding:40,textAlign:"center"}}>
          <div style={{fontSize:28,color:T.dim,marginBottom:8}}>&#x21C6;</div>
          <div style={{fontSize:12,color:T.dim}}>Select an unmapped integration to see EA match suggestions</div>
        </div>}
      </div>
    </div>
  </div>;
}

// ── Health Dashboard ──
function HealthDashboardPage({goTo}) {
  const [range,setRange]=useState(30);
  const data=TREND.slice(-range);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{fontSize:20,fontWeight:700,color:T.white}}>Health Dashboard</h2>
      <div style={{display:"flex",gap:2,background:T.bgCard,borderRadius:6,padding:2}}>
        {[{l:"24h",v:1},{l:"7d",v:7},{l:"30d",v:30}].map(r=><button key={r.l} onClick={()=>setRange(r.v)} style={{padding:"4px 12px",borderRadius:4,border:"none",fontSize:10,fontWeight:range===r.v?600:400,color:range===r.v?T.bg:T.dim,background:range===r.v?T.lime:"transparent",cursor:"pointer"}}>{r.l}</button>)}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
      <div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:T.white,marginBottom:12}}>Health Score Trend</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="day" stroke={T.dim} fontSize={9} interval={Math.max(1,Math.floor(data.length/6))}/><YAxis stroke={T.dim} fontSize={9}/><Tooltip contentStyle={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,fontSize:10}}/><Legend wrapperStyle={{fontSize:10}}/>
            <Line type="monotone" dataKey="avail" stroke={T.green} strokeWidth={2} dot={false} name="Availability"/>
            <Line type="monotone" dataKey="lat" stroke={T.blue} strokeWidth={2} dot={false} name="Latency (ms)"/>
            <Line type="monotone" dataKey="err" stroke={T.red} strokeWidth={2} dot={false} name="Error Rate %"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:T.bgCard,borderRadius:12,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:T.white,marginBottom:12}}>Distribution</div>
        <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={HDIST} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">{HDIST.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip contentStyle={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:8,fontSize:10}}/></PieChart></ResponsiveContainer>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:14}}>
      {[{l:"Availability",v:"99.7%",c:T.green,k:"avail"},{l:"Latency",v:"72ms",c:T.blue,k:"lat"},{l:"Error Rate",v:"0.8%",c:T.red,k:"err"},{l:"Throughput",v:"5.1k/s",c:T.purple,k:"tput"}].map(m=><div key={m.l} style={{background:T.bgCard,borderRadius:10,padding:12,borderTop:`3px solid ${m.c}`}}>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:8,color:T.dim,letterSpacing:1,textTransform:"uppercase"}}>{m.l}</div>
        <div style={{fontSize:22,fontWeight:700,color:m.c}}>{m.v}</div>
        <ResponsiveContainer width="100%" height={40}><AreaChart data={data.map(d=>({v:d[m.k]}))}><Area type="monotone" dataKey="v" stroke={m.c} fill={`${m.c}15`} strokeWidth={1.5} dot={false}/></AreaChart></ResponsiveContainer>
      </div>)}
    </div>
    <div style={{background:T.bgCard,borderRadius:12,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:13,fontWeight:600,color:T.white}}>Attention Required</span>
        <button onClick={()=>goTo("integrations")} style={{fontSize:10,color:T.lime,background:"none",border:"none",cursor:"pointer"}}>View all &rarr;</button>
      </div>
      {INTEGRATIONS.filter(i=>i.hs==="Critical"||i.hs==="Degraded").map((i,x)=><div key={x} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
        <span style={{flex:1,fontSize:11,color:T.white}}>{i.name}</span><Pill color={HC[i.hs]} sm>{i.hs}</Pill><span style={{fontSize:12,fontWeight:700,color:HC[i.hs]}}>{i.score}</span><Pill sm>{i.type}</Pill><span style={{fontSize:9,color:T.dim}}>{i.last}</span>
      </div>)}
    </div>
  </div>;
}

// ── Main Shell ──
const NAV=[
  {id:"overview",label:"Overview",icon:"\u2302"},
  {id:"integrations",label:"Integrations",icon:"\u21CC",badge:1,bc:T.red},
  {id:"agents",label:"Agent Fleet",icon:"\u25C9",badge:2,bc:T.amber},
  {id:"gaps",label:"Coverage Gaps",icon:"\u25B2",badge:GAPS.filter(g=>g.status==="Open").length,bc:T.red},
  {id:"ea",label:"EA Reconciliation",icon:"\u2295"},
  {id:"health",label:"Health Dashboard",icon:"\uD83D\uDCC8"},
];

export default function PathfinderWorkspace({ embeddedPage }) {
  const [page,setPage]=useState("overview");
  const activePage = embeddedPage || page;
  const [toast,setToast]=useState(null);
  const addToast=useCallback((msg,color)=>setToast({msg,color,key:Date.now()}),[]);
  const goTo=useCallback((p)=>setPage(p),[]);

  const Page = {
    overview: ()=><OverviewPage goTo={goTo}/>,
    integrations: ()=><IntegrationsPage addToast={addToast}/>,
    agents: ()=><AgentFleetPage addToast={addToast}/>,
    gaps: ()=><CoverageGapsPage addToast={addToast}/>,
    ea: ()=><EAReconciliationPage addToast={addToast}/>,
    health: ()=><HealthDashboardPage goTo={goTo}/>,
  }[activePage]||OverviewPage;

  // When embedded in the clinical extension Layout, render content only (no sidebar)
  if (embeddedPage) {
    return <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.bgHover};border-radius:3px}button{font-family:inherit}input,textarea{font-family:inherit}`}</style>
      <Page />
      {toast&&<Toast key={toast.key} message={toast.msg} color={toast.color} onDone={()=>setToast(null)} />}
    </>;
  }

  return <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:T.bg,color:T.text,minHeight:"100vh",display:"flex"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.bgHover};border-radius:3px}button{font-family:inherit}input,textarea{font-family:inherit}`}</style>

    {/* Sidebar */}
    <div style={{width:240,background:T.bgCard,borderRight:`1px solid ${T.border}`,padding:"16px 10px",flexShrink:0,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 6px",marginBottom:24}}>
        <div style={{width:10,height:10,background:T.lime,borderRadius:"50%",boxShadow:`0 0 10px ${T.lime}`}} />
        <div><div style={{fontSize:14,fontWeight:700,color:T.white}}>Pathfinder</div><div style={{fontSize:9,color:T.dim}}>Integration Intelligence</div></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:2,flex:1}}>
        {NAV.map(n=><button key={n.id} onClick={()=>setPage(n.id)} style={{width:"100%",padding:"10px 14px",border:"none",cursor:"pointer",borderRadius:8,background:page===n.id?T.limeDim:"transparent",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s"}}>
          <span style={{fontSize:14,opacity:page===n.id?1:0.5}}>{n.icon}</span>
          <span style={{fontSize:12,fontWeight:page===n.id?600:400,color:page===n.id?T.lime:T.text,flex:1,textAlign:"left"}}>{n.label}</span>
          {n.badge>0&&<span style={{fontSize:9,fontWeight:700,color:T.white,background:n.bc||T.red,borderRadius:10,padding:"2px 7px",minWidth:18,textAlign:"center"}}>{n.badge}</span>}
        </button>)}
      </div>
      <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12,marginTop:12}}>
        <div style={{padding:"4px 8px"}}><span style={{fontSize:9,color:T.dim,fontFamily:"'Space Mono',monospace",letterSpacing:1}}>AVENNORTH</span></div>
        <div style={{padding:"2px 8px"}}><span style={{fontSize:8,color:T.dim}}>Pathfinder v0.1.0 &middot; 14 integrations &middot; 12 agents</span></div>
      </div>
    </div>

    {/* Main */}
    <div style={{flex:1,padding:20,overflowY:"auto"}}><Page /></div>

    {/* Toast */}
    {toast&&<Toast key={toast.key} message={toast.msg} color={toast.color} onDone={()=>setToast(null)} />}
  </div>;
}
