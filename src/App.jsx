import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, UserCircle2, MapPin, Loader2, RefreshCw, AlertCircle,
  ChevronRight, Home, Circle, Calendar, Clock, FileText, ArrowUpRight,
  ZoomIn, Network, Church, Eye, LayoutDashboard, ClipboardList, Plus,
  Phone, Filter
} from "lucide-react";

// ── Consolidation (First Timer / VIP) backend — paste the Web App URL
//    you get after deploying ConsolidationBackend.gs here.
const CONSOLIDATION_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxnFrOjZJ1bg4_BgkmY7QttrZKGT1GTojtcqqZ9REJGEtT8q3XwQRTqinGgyz9MrM/exec";

const FOLLOWUP_STATUSES = ["Not Yet Contacted","Contacted","Invited to Cell","Attending Cell","Inactive"];
const DECISIONS = ["Accepted Christ","Rededication","Just Visiting","Follow Up Needed"];

async function apiGetC() {
  const res  = await fetch(CONSOLIDATION_SCRIPT_URL, { method:"GET" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

// ── Every network leader's existing live report — same Google Sheet /
//    Apps Script backend that each leader's own app already reads from.
//    Pastors get a read-only window into the exact same live data;
//    nothing here can edit, add, or delete a single record.
const NETWORKS = [
  { id:"abraham",  label:"Abraham Network",     boys:"Deonie Abraham",     girls:"Elva Abraham",
    scriptUrl:"https://script.google.com/macros/s/AKfycbwBvdt9wEsAHqea57M1wPS8JPMTFK9sdvNu1RNAHDkwxhAzF78S4GZQIvFPFjjsnJNe/exec" },
  { id:"claudio",  label:"Claudio Network",     boys:"Sonny Claudio",      girls:"",
    scriptUrl:"https://script.google.com/macros/s/AKfycbzAzO7jPP0gzGS2soah3AVCIXLFMwtxVMHc37gqHRJZPQm1Dcvpd3-SLOOF0V6wQRjkGg/exec" },
  { id:"flores",   label:"Flores Network",      boys:"Franklin Flores",    girls:"",
    scriptUrl:"https://script.google.com/macros/s/AKfycbw5HBNL9iHRT296NSNG4030rQpj_FGKv7ZmEBj1ESAluAJSqfEc_eQFVKCel-GpWNWQWQ/exec" },
  { id:"imeepatal",label:"Patal Network (Imee)",boys:"",                   girls:"Imee Patal",
    scriptUrl:"https://script.google.com/macros/s/AKfycbzbSRoiJgMOEH4QhoBYk6tyus4Ds07DG-18NzwP4MBuweHrKahcvQ7202ddXkwI3v2eFg/exec" },
  { id:"jacaria",  label:"Jacaria Network",     boys:"Anthony Jacaria",    girls:"",
    scriptUrl:"https://script.google.com/macros/s/AKfycbyZmtUELfNbZsEFDJthrm9NkSKlRg4wwMaSjT1SHD7Jdq7_glLsB_VAJm5jGuReFCJhcA/exec" },
  { id:"jayabraham",label:"Jay Abraham Network",boys:"Jay Abraham",        girls:"",
    scriptUrl:"https://script.google.com/macros/s/AKfycby1mNbWb7waZLjz1qU9-1ISXXHmsM0gIDtvb_K0QcP5lPRvr-SRK8Lni5-VSYgAGzSB9g/exec" },
  { id:"jotoy",    label:"Jotoy Network",       boys:"Emerson P. Patal",   girls:"Joan Z. Patal",
    scriptUrl:"https://script.google.com/macros/s/AKfycbxQ0Lgp_NhBJgWZHbxA5q4Php-F5VaqMrfw270PBDHc-65fBmg-pOkig5m32PQYyTutig/exec" },
  { id:"laparan",  label:"Laparan Network",     boys:"",                   girls:"Avril Lee Laparan",
    scriptUrl:"https://script.google.com/macros/s/AKfycbxlwelJ7TvGQKbHEQumKkn8BwLt86mdbDRj15A9ksmoD75ii82pvm0LK5CEy5JjAofW/exec" },
  { id:"pendon",   label:"Pendon Network",      boys:"Richard Pendon",     girls:"Joy Pendon",
    scriptUrl:"https://script.google.com/macros/s/AKfycbyHT-7DX2yHRz0_BTgt036YCkByWFO2uNE0rMKpxXqWZfLE6hadUT5baeoFVGaRVdCf/exec" },
  { id:"rodemio",  label:"Rodemio Network",     boys:"Jaime Rodemio",      girls:"Ledelyn Rodemio",
    scriptUrl:"https://script.google.com/macros/s/AKfycbx8IDnNCq076gNZZt1BCRSJUD9KqGr9u6JiblO1MtcJzaV0t7oo_qkZSMv_m1Z9OGe5Nw/exec" },
];

const ASSIGNABLE_LEADERS = NETWORKS.reduce((acc, n) => {
  if (n.boys)  acc.push({ id:`${n.id}-Boys`,  networkId:n.id, networkLabel:n.label, gender:"Boys",  name:n.boys  });
  if (n.girls) acc.push({ id:`${n.id}-Girls`, networkId:n.id, networkLabel:n.label, gender:"Girls", name:n.girls });
  return acc;
}, []);

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const TRACKS = [
  { key:"SUYNL",       label:"SUYNL"         },
  { key:"LIFECLASS",   label:"Life Class"     },
  { key:"ENCOUNTER",   label:"Encounter"      },
  { key:"WATERBAPTISM",label:"Water Baptism"  },
  { key:"SOL1",        label:"SOL 1"          },
  { key:"SOL2",        label:"SOL 2"          },
  { key:"REENCOUNTER", label:"Re-Encounter"   },
  { key:"SOL3",        label:"SOL 3"          },
  { key:"LGLEADER",    label:"LG Leader"      },
];

function toBool(v) { return v === true || v === "TRUE" || v === "true" || v === 1; }
function trackCount(member) { return TRACKS.filter(t => toBool(member[t.key])).length; }
function isLGLeader(member) { return toBool(member.LGLEADER); }
function countLifegroups(list) {
  return new Set(list.map(m => {
    const d = (m.ScheduleDay||"").trim();
    const t = (m.ScheduleTime||"").trim();
    return d||t ? `${d}|${t}` : `__nosch__${m.ID}`;
  })).size;
}
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,"0")} ${ampm}`;
}

async function apiGet(url) {
  const res  = await fetch(url, { method:"GET" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

// ── Shared read-only presentational bits ──────────────────────────────
function TrackList({ member }) {
  const done = TRACKS.filter(t => toBool(member[t.key]));
  if (done.length === 0) return <span className="track-list-empty">No tracks yet</span>;
  return (
    <div className="track-pills">
      {done.map(t => (
        <span key={t.key} className={`track-pill${t.key==="LGLEADER"?" track-pill-lgl":""}`}>{t.label}</span>
      ))}
    </div>
  );
}

function Breadcrumb({ crumbs, current }) {
  return (
    <div className="bc">
      {crumbs.map((c,i) => (
        <React.Fragment key={i}>
          <button className="bc-btn" onClick={c.onClick}>{c.label}</button>
          <ChevronRight size={12}/>
        </React.Fragment>
      ))}
      <span className="bc-cur">{current}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={status==="Active"?"badge badge-green":"badge badge-red"}><Circle size={6} style={{fill:"currentColor"}}/>{status}</span>;
}
function NotesBadge({ notes }) {
  if (!notes) return null;
  return <span className="badge badge-notes"><FileText size={9}/>{notes}</span>;
}
function LGLeaderBadge() {
  return <span className="badge badge-lgl"><Users size={9}/>LG Leader</span>;
}
function TimothyBadge() {
  return <span className="badge badge-timothy"><UserCircle2 size={9}/>Timothy</span>;
}

function lgLabel(n) { return `${n} lifegroup${n !== 1 ? "s" : ""}`; }

// ── Read-only member row (no edit / delete — pastors are viewing only) ─
function MemberRow({ member, allMembers, onViewCell, rank, isTimothy }) {
  const isClose = member.Status === "Close Cell";
  const hasLGL = isLGLeader(member);
  const hasTimothy = isTimothy;
  const ownOpenMembers = allMembers.filter(m =>
    String(m.ParentID) === String(member.ID) && (m.Status||"Open Cell") === "Open Cell"
  );
  return (
    <div className={`member-row${isClose?" member-row-close":""}${hasLGL?" member-row-lgl":""}`}>
      <div className="member-rank">{rank}</div>
      <div className="member-main">
        <div className="member-name-line">
          <span className="member-name">{member.Name}</span>
          {isClose && <span className="badge badge-close">Close Cell</span>}
          {hasLGL && <LGLeaderBadge/>}
          {hasTimothy && <TimothyBadge/>}
          <StatusBadge status={member.LifegroupStatus}/>
          {member.Notes && <NotesBadge notes={member.Notes}/>}
          {member.LifegroupLocation && <span className="member-loc"><MapPin size={11}/>{member.LifegroupLocation}</span>}
        </div>
        <TrackList member={member}/>
        {hasLGL && !isClose && (
          <div className="lgl-action-row">
            <button className="btn-view-cell" onClick={()=>onViewCell(member)}>
              <Users size={12}/>View Cell ({ownOpenMembers.length} member{ownOpenMembers.length!==1?"s":""})<ChevronRight size={12}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupedMembers({ members, allMembers, onViewCell }) {
  const groups = {};
  members.forEach(m => {
    const day  = (m.ScheduleDay||"").trim()  || "";
    const time = (m.ScheduleTime||"").trim() || "";
    const key  = day || time ? `${day}||${time}` : "||";
    if (!groups[key]) groups[key] = { day, time, members: [] };
    groups[key].members.push(m);
  });
  Object.values(groups).forEach(g => g.members.sort((a, b) => trackCount(b) - trackCount(a)));
  const sorted = Object.keys(groups).sort((a, b) => {
    const ga = groups[a], gb = groups[b];
    if (!ga.day && !ga.time) return 1;
    if (!gb.day && !gb.time) return -1;
    const ai = DAYS.indexOf(ga.day), bi = DAYS.indexOf(gb.day);
    if (ai !== bi) { if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi; }
    return (ga.time||"").localeCompare(gb.time||"");
  });
  return (
    <div className="groups">
      {sorted.map(key => {
        const { day, time, members: list } = groups[key];
        const hasSchedule = day || time;
        const soloIsTimothy = list.length === 1;
        return (
          <div key={key} className="day-group">
            <div className="day-group-head">
              <span className="day-group-label">
                {hasSchedule ? (<>{day && <><Calendar size={13}/>{day}</>}{time && <><Clock size={13} style={{marginLeft: day ? 6 : 0}}/>{formatTime(time)}</>}</>) : (<span style={{color:"var(--faint)"}}>No schedule</span>)}
              </span>
              <div className="day-group-right">
                <span className="day-group-count">{list.length} {list.length===1?"member":"members"}</span>
              </div>
            </div>
            <div className="member-list">
              {list.map((m, i) => (
                <MemberRow key={m.ID} member={m} allMembers={allMembers} rank={i+1}
                  isTimothy={soloIsTimothy ? true : toBool(m.TIMOTHY)} onViewCell={onViewCell}/>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Networks Overview — the pastors' front door ────────────────────────
function NetworksScreen({ dataByNet, onEnter }) {
  const totals = useMemo(() => {
    let disciples=0, leaders=0, closed=0, ok=0;
    NETWORKS.forEach(n => {
      const d = dataByNet[n.id];
      if (!d || !d.ok) return;
      ok++;
      const members = d.members;
      const nonRoot = members.filter(m=>m.ParentID);
      disciples += nonRoot.length;
      leaders += members.filter(m=>!m.ParentID || String(m.ParentID).trim()==="").length;
      closed += nonRoot.filter(m=>m.Status==="Close Cell").length;
    });
    return { disciples, leaders, closed, ok };
  }, [dataByNet]);

  return (
    <div className="home-wrap">
      <div className="home-hero">
        <span className="eyebrow">Senior Pastors' Overview</span>
        <h1>Every network,<br/>one view.</h1>
        <p className="lede">Pastor Bong Quilos &amp; Pastora Anna Quilos — live progress across all
          {" "}{NETWORKS.length} network leaders' cell reports, straight from each leader's own sheet.</p>
      </div>
      <div className="stats">
        {[
          {n: totals.disciples, l:"Total disciples"},
          {n: totals.leaders,   l:"Lifegroup leaders"},
          {n: totals.closed,    l:"Leading their own cell"},
        ].map(s=>(
          <div key={s.l} className="stat">
            <span className="stat-n">{totals.ok===0?"—":s.n}</span>
            <span className="stat-l">{s.l}</span>
          </div>
        ))}
      </div>
      <div className="net-grid">
        {NETWORKS.map(n => {
          const d = dataByNet[n.id];
          const loading = !d || d.loading;
          const error = d && d.error;
          const members = d && d.ok ? d.members : [];
          const nonRoot = members.filter(m=>m.ParentID);
          const leaders = members.filter(m=>!m.ParentID || String(m.ParentID).trim()==="");
          const closed = nonRoot.filter(m=>m.Status==="Close Cell").length;
          return (
            <button key={n.id} className={`net-card${error?" net-card-error":""}`} onClick={()=>onEnter(n)} disabled={loading && !error}>
              <div className="net-card-top">
                <Network size={18}/>
                <span className="net-card-name">{n.label}</span>
              </div>
              <div className="net-card-leaders">
                {n.boys && <span className="net-leader-line"><UserCircle2 size={12}/>{n.boys}</span>}
                {n.girls && <span className="net-leader-line"><Users size={12}/>{n.girls}</span>}
              </div>
              {loading ? (
                <span className="net-card-status"><Loader2 size={13} className="spin"/>Loading…</span>
              ) : error ? (
                <span className="net-card-status net-card-status-err"><AlertCircle size={13}/>Couldn't load</span>
              ) : (
                <div className="net-card-counts">
                  <span className="net-pill">{nonRoot.length} disciples</span>
                  <span className="net-pill">{leaders.length} LG leaders</span>
                  <span className="net-pill">{closed} closed</span>
                </div>
              )}
              <span className="go-lnk"><Eye size={13}/>View progress <ChevronRight size={13}/></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Per-network Boys/Girls doors (mirrors each leader's own home screen) ─
function NetworkHomeScreen({ net, members, loading, error, goNetworks, onEnter }) {
  const leaders = members.filter(m => !m.ParentID || String(m.ParentID).trim() === "");
  const allNonRoot = members.filter(m => m.ParentID);
  const closed = allNonRoot.filter(m=>m.Status==="Close Cell").length;
  const boysLeaders  = leaders.filter(l=>l.Gender==="Boys").length;
  const girlsLeaders = leaders.filter(l=>l.Gender==="Girls").length;
  const doors = [
    {g:"Boys", Icon:UserCircle2, networkLeader:net.boys,  count:boysLeaders,  cls:"door-boys"},
    {g:"Girls",Icon:Users,       networkLeader:net.girls, count:girlsLeaders, cls:"door-girls"},
  ].filter(d => d.networkLeader && d.networkLeader.trim() !== "");
  return (
    <div className="home-wrap">
      <Breadcrumb crumbs={[{label:"Networks",onClick:goNetworks}]} current={net.label}/>
      <div className="home-hero">
        <span className="eyebrow">{net.label}</span>
        <h1>Every disciple,<br/>walking the path.</h1>
        <p className="lede">Read-only view of every lifegroup leader's disciples under this network —
          who's still under discipleship, and who's already leading a lifegroup of their own.</p>
      </div>
      {error && <div className="error-box"><AlertCircle size={15}/>{error}</div>}
      <div className="stats">
        {[
          {n: allNonRoot.length, l:"Total disciples"},
          {n: leaders.length,    l:"Lifegroup leaders"},
          {n: closed,            l:"Leading their own cell"},
        ].map(s=>(
          <div key={s.l} className="stat">
            <span className="stat-n">{loading?"—":s.n}</span>
            <span className="stat-l">{s.l}</span>
          </div>
        ))}
      </div>
      <div className="doors">
        {doors.map(({g,Icon,networkLeader,count,cls})=>(
          <button key={g} className={`door ${cls}`} onClick={()=>onEnter(g)}>
            <Icon size={34} strokeWidth={1.6}/>
            <span className="door-network-label">Network Leader</span>
            <span className="door-title">{networkLeader}</span>
            <span className="door-count">{loading?"…":`${count} lifegroup leader${count!==1?"s":""}`}</span>
            <span className="door-go">Open <ChevronRight size={14}/></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GenderScreen({ net, gender, leaders, members, loading, goHome, onPickLeader }) {
  const list = leaders.filter(l=>l.Gender===gender).sort((a,b)=>{
    const ca = members.filter(m=>String(m.ParentID)===String(a.ID)&&m.Status==="Close Cell").length;
    const cb = members.filter(m=>String(m.ParentID)===String(b.ID)&&m.Status==="Close Cell").length;
    return cb - ca;
  });
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const networkLeader = (gender==="Boys"?net.boys:net.girls) || gender;
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome}]} current={gender}/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Network Leader · {networkLeader}</span>
          <h1>{gender}</h1>
          <p className="sub">{list.length} lifegroup {list.length===1?"leader":"leaders"}</p>
        </div>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (
        <div className="empty"><p className="empty-title">No leaders yet</p></div>
      ) : (
        <div className="card-grid">
          {list.map(l=>{
            const mine       = members.filter(m=>String(m.ParentID)===String(l.ID));
            const openList   = mine.filter(m=>(m.Status||"Open Cell")==="Open Cell");
            const closeList  = mine.filter(m=>m.Status==="Close Cell");
            const openLG     = countLifegroups(openList);
            const closeLG    = countLifegroups(closeList);
            const schedules  = [...new Map(mine.map(m=>{
              const d=(m.ScheduleDay||"").trim(), t=(m.ScheduleTime||"").trim();
              return [`${d}|${t}`,{day:d,time:t}];
            })).values()].filter(s=>s.day||s.time);
            return (
              <button key={l.ID} className="leader-card" onClick={()=>onPickLeader(l)}>
                <span className="lc-tag">Lifegroup Leader</span>
                <span className="lc-name">{l.Name}</span>
                <div className="lc-counts">
                  <span className="lc-pill lc-open">{openLG} Open Cell</span>
                  <span className="lc-pill lc-close">{closeLG} Close Cell</span>
                </div>
                {schedules.length>0 && (
                  <div className="lc-days">
                    {schedules.slice(0,3).map((s,i)=>(
                      <span key={i} className="day-badge">
                        {s.day && <><Calendar size={10}/>{s.day}</>}
                        {s.time && <><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}
                      </span>
                    ))}
                    {schedules.length>3 && <span className="day-badge">+{schedules.length-3}</span>}
                  </div>
                )}
                <span className="go-lnk">View <ChevronRight size={13}/></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeaderScreen({ net, gender, leader, members, goHome, goGender, onPickCell }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const mine = members.filter(m=>String(m.ParentID)===String(leader.ID));
  const open  = mine.filter(m=>(m.Status||"Open Cell")==="Open Cell");
  const close = mine.filter(m=>m.Status==="Close Cell");
  const networkLeader = (gender==="Boys"?net.boys:net.girls) || gender;
  const getSchedules = list => [...new Map(list.map(m=>{
    const d=(m.ScheduleDay||"").trim(), t=(m.ScheduleTime||"").trim();
    return [`${d}|${t}`,{day:d,time:t}];
  })).values()].filter(s=>s.day||s.time);
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender}]} current={leader.Name}/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Lifegroup Leader · under {networkLeader}</span>
          <h1>{leader.Name}</h1>
          <p className="sub">{mine.length} {mine.length===1?"disciple":"disciples"} total</p>
        </div>
      </div>
      <div className="cell-split">
        <button className="cell-card cell-open" onClick={()=>onPickCell("Open Cell")}>
          <div className="cc-top"><span className="cc-count">{countLifegroups(open)}</span><span className="cc-label">Open Cell</span></div>
          {getSchedules(open).length>0&&<div className="cc-days">{getSchedules(open).map((s,i)=><span key={i} className="day-badge">{s.day&&<><Calendar size={10}/>{s.day}</>}{s.time&&<><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}</span>)}</div>}
          <p className="cc-desc">Members still under {leader.Name}'s discipleship.</p>
          <span className="go-lnk">View members <ChevronRight size={13}/></span>
        </button>
        <button className="cell-card cell-close" onClick={()=>onPickCell("Close Cell")}>
          <div className="cc-top"><span className="cc-count">{countLifegroups(close)}</span><span className="cc-label">Close Cell</span></div>
          {getSchedules(close).length>0&&<div className="cc-days">{getSchedules(close).map((s,i)=><span key={i} className="day-badge">{s.day&&<><Calendar size={10}/>{s.day}</>}{s.time&&<><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}</span>)}</div>}
          <p className="cc-desc">Disciples who now lead their own lifegroup.</p>
          <span className="go-lnk">View leaders <ChevronRight size={13}/></span>
        </button>
      </div>
    </div>
  );
}

function OpenCellScreen({ gender, leader, members, loading, goHome, goGender, goLeader, onViewLGLeaderCell }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>String(m.ParentID)===String(leader.ID)&&(m.Status||"Open Cell")==="Open Cell");
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender},{label:leader.Name,onClick:goLeader}]} current="Open Cell"/>
      <div className="screen-head">
        <div><span className="eyebrow-sm">Open Cell · {leader.Name}</span><h1>Members</h1><p className="sub">Sorted by track progress — most advanced first.</p></div>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (<div className="empty"><p className="empty-title">No open cell members yet</p></div>)
      : <GroupedMembers members={list} allMembers={members} onViewCell={onViewLGLeaderCell}/>}
    </div>
  );
}

function CloseCellScreen({ gender, leader, members, loading, goHome, goGender, goLeader, onPickSubLeader }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>String(m.ParentID)===String(leader.ID)&&m.Status==="Close Cell")
    .sort((a,b)=>{
      const ca = members.filter(x=>String(x.ParentID)===String(a.ID)).length;
      const cb = members.filter(x=>String(x.ParentID)===String(b.ID)).length;
      return cb - ca;
    });
  const groups={};
  list.forEach(m=>{
    const day=(m.ScheduleDay||"").trim(), time=(m.ScheduleTime||"").trim();
    const key=day||time?`${day}||${time}`:"||";
    if(!groups[key]) groups[key]={day,time,members:[]};
    groups[key].members.push(m);
  });
  const sorted=Object.keys(groups).sort((a,b)=>{
    const ga=groups[a],gb=groups[b];
    if(!ga.day&&!ga.time) return 1; if(!gb.day&&!gb.time) return -1;
    const ai=DAYS.indexOf(ga.day),bi=DAYS.indexOf(gb.day);
    if(ai!==bi){if(ai===-1) return 1; if(bi===-1) return -1; return ai-bi;}
    return (ga.time||"").localeCompare(gb.time||"");
  });
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender},{label:leader.Name,onClick:goLeader}]} current="Close Cell"/>
      <div className="screen-head">
        <div><span className="eyebrow-sm">Close Cell · {leader.Name}</span><h1>Leaders</h1><p className="sub">Disciples who now lead their own lifegroup.</p></div>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (<div className="empty"><p className="empty-title">No close cell leaders yet</p></div>)
      : (
        <div className="groups">
          {sorted.map(key=>{
            const{day,time,members:grpMembers}=groups[key];
            const hasSchedule=day||time;
            return(
              <div key={key} className="day-group">
                <div className="day-group-head">
                  <span className="day-group-label">{hasSchedule?(<>{day&&<><Calendar size={13}/>{day}</>}{time&&<><Clock size={13} style={{marginLeft:day?6:0}}/>{formatTime(time)}</>}</>):<span style={{color:"var(--faint)"}}>No schedule</span>}</span>
                  <span className="day-group-count">{grpMembers.length} {grpMembers.length===1?"leader":"leaders"}</span>
                </div>
                <div className="subldr-list">
                  {grpMembers.map(m=>{
                    const ownMembers=members.filter(x=>String(x.ParentID)===String(m.ID));
                    const ownLG=countLifegroups(ownMembers);
                    return(
                      <div key={m.ID} className="subldr-row">
                        <button className="subldr-main" onClick={()=>onPickSubLeader(m)}>
                          <div className="subldr-info">
                            <span className="subldr-name">{m.Name}</span>
                            {m.LifegroupLocation&&<span className="subldr-loc"><MapPin size={11}/>{m.LifegroupLocation}</span>}
                          </div>
                          <div className="subldr-meta">
                            <StatusBadge status={m.LifegroupStatus}/>
                            {m.Notes&&<NotesBadge notes={m.Notes}/>}
                            <span className="subldr-count">{lgLabel(ownLG)}</span>
                            <ChevronRight size={15} style={{color:"var(--faint)"}}/>
                          </div>
                        </button>
                        <div className="subldr-actions">
                          <TrackList member={m}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubLeaderScreen({ gender, leader, subLeader, members, goHome, goGender, goLeader, goCloseCell, onPickCell }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const mine = members.filter(m=>String(m.ParentID)===String(subLeader.ID));
  const open  = mine.filter(m=>(m.Status||"Open Cell")==="Open Cell");
  const close = mine.filter(m=>m.Status==="Close Cell");
  const getSchedules = list => [...new Map(list.map(m=>{
    const d=(m.ScheduleDay||"").trim(),t=(m.ScheduleTime||"").trim();
    return [`${d}|${t}`,{day:d,time:t}];
  })).values()].filter(s=>s.day||s.time);
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender},{label:leader.Name,onClick:goLeader},{label:"Close Cell",onClick:goCloseCell}]} current={subLeader.Name}/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Close Cell Leader · under {leader.Name}</span>
          <h1>{subLeader.Name}</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
            <StatusBadge status={subLeader.LifegroupStatus}/>
            {subLeader.Notes&&<NotesBadge notes={subLeader.Notes}/>}
            {subLeader.LifegroupLocation&&(<span className="sub" style={{display:"flex",alignItems:"center",gap:4}}><MapPin size={12}/>{subLeader.LifegroupLocation}</span>)}
          </div>
          <p className="sub" style={{marginTop:6}}>{mine.length} {mine.length===1?"disciple":"disciples"} total</p>
        </div>
      </div>
      <div className="cell-split">
        <button className="cell-card cell-open" onClick={()=>onPickCell("Open Cell")}>
          <div className="cc-top"><span className="cc-count">{countLifegroups(open)}</span><span className="cc-label">Open Cell</span></div>
          {getSchedules(open).length>0&&<div className="cc-days">{getSchedules(open).map((s,i)=><span key={i} className="day-badge">{s.day&&<><Calendar size={10}/>{s.day}</>}{s.time&&<><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}</span>)}</div>}
          <p className="cc-desc">Members still under {subLeader.Name}'s discipleship.</p>
          <span className="go-lnk">View members <ChevronRight size={13}/></span>
        </button>
        <button className="cell-card cell-close" onClick={()=>onPickCell("Close Cell")}>
          <div className="cc-top"><span className="cc-count">{countLifegroups(close)}</span><span className="cc-label">Close Cell</span></div>
          {getSchedules(close).length>0&&<div className="cc-days">{getSchedules(close).map((s,i)=><span key={i} className="day-badge">{s.day&&<><Calendar size={10}/>{s.day}</>}{s.time&&<><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}</span>)}</div>}
          <p className="cc-desc">Disciples who now lead their own lifegroup.</p>
          <span className="go-lnk">View leaders <ChevronRight size={13}/></span>
        </button>
      </div>
    </div>
  );
}

function SubLeaderOpenScreen({ gender, leader, subLeader, members, loading, goHome, goGender, goLeader, goCloseCell, goSubLeader, onViewLGLeaderCell }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>String(m.ParentID)===String(subLeader.ID)&&(m.Status||"Open Cell")==="Open Cell");
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender},{label:leader.Name,onClick:goLeader},{label:"Close Cell",onClick:goCloseCell},{label:subLeader.Name,onClick:goSubLeader}]} current="Open Cell"/>
      <div className="screen-head">
        <div><span className="eyebrow-sm">Open Cell · {subLeader.Name}</span><h1>Members</h1><p className="sub">Sorted by track progress — most advanced first.</p></div>
      </div>
      {loading?<div className="empty"><Loader2 size={22} className="spin"/></div>
      :list.length===0?(<div className="empty"><p className="empty-title">No open cell members yet</p></div>)
      :<GroupedMembers members={list} allMembers={members} onViewCell={onViewLGLeaderCell}/>}
    </div>
  );
}

function SubLeaderCloseScreen({ gender, leader, subLeader, members, loading, goHome, goGender, goLeader, goCloseCell, goSubLeader, onPickDeepLeader }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>String(m.ParentID)===String(subLeader.ID)&&m.Status==="Close Cell")
    .sort((a,b)=>{
      const ca = members.filter(x=>String(x.ParentID)===String(a.ID)).length;
      const cb = members.filter(x=>String(x.ParentID)===String(b.ID)).length;
      return cb - ca;
    });
  const groups={};
  list.forEach(m=>{
    const day=(m.ScheduleDay||"").trim(),time=(m.ScheduleTime||"").trim();
    const key=day||time?`${day}||${time}`:"||";
    if(!groups[key]) groups[key]={day,time,members:[]};
    groups[key].members.push(m);
  });
  const sorted=Object.keys(groups).sort((a,b)=>{
    const ga=groups[a],gb=groups[b];
    if(!ga.day&&!ga.time) return 1; if(!gb.day&&!gb.time) return -1;
    const ai=DAYS.indexOf(ga.day),bi=DAYS.indexOf(gb.day);
    if(ai!==bi){if(ai===-1) return 1; if(bi===-1) return -1; return ai-bi;}
    return (ga.time||"").localeCompare(gb.time||"");
  });
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender},{label:leader.Name,onClick:goLeader},{label:"Close Cell",onClick:goCloseCell},{label:subLeader.Name,onClick:goSubLeader}]} current="Close Cell"/>
      <div className="screen-head">
        <div><span className="eyebrow-sm">Close Cell · {subLeader.Name}</span><h1>Leaders</h1><p className="sub">Disciples who now lead their own lifegroup.</p></div>
      </div>
      {loading?<div className="empty"><Loader2 size={22} className="spin"/></div>
      :list.length===0?(<div className="empty"><p className="empty-title">No close cell leaders yet</p></div>)
      :<div className="groups">
        {sorted.map(key=>{
          const{day,time,members:grpMembers}=groups[key];
          const hasSchedule=day||time;
          return(
            <div key={key} className="day-group">
              <div className="day-group-head">
                <span className="day-group-label">{hasSchedule?(<>{day&&<><Calendar size={13}/>{day}</>}{time&&<><Clock size={13} style={{marginLeft:day?6:0}}/>{formatTime(time)}</>}</>):<span style={{color:"var(--faint)"}}>No schedule</span>}</span>
                <span className="day-group-count">{grpMembers.length} {grpMembers.length===1?"leader":"leaders"}</span>
              </div>
              <div className="subldr-list">
                {grpMembers.map(m=>{
                  const ownMembers=members.filter(x=>String(x.ParentID)===String(m.ID));
                  return(
                    <div key={m.ID} className="subldr-row">
                      <button className="subldr-main" onClick={()=>onPickDeepLeader(m)}>
                        <div className="subldr-info"><span className="subldr-name">{m.Name}</span>{m.LifegroupLocation&&<span className="subldr-loc"><MapPin size={11}/>{m.LifegroupLocation}</span>}</div>
                        <div className="subldr-meta"><StatusBadge status={m.LifegroupStatus}/>{m.Notes&&<NotesBadge notes={m.Notes}/>}<span className="subldr-count">{lgLabel(countLifegroups(ownMembers))}</span><ChevronRight size={15} style={{color:"var(--faint)"}}/></div>
                      </button>
                      <div className="subldr-actions"><TrackList member={m}/></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

function LGLeaderCellScreen({ gender, leader, lglMember, members, loading, goHome, goGender, goLeader, goOpenCell }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>String(m.ParentID)===String(lglMember.ID)&&(m.Status||"Open Cell")==="Open Cell");
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender},{label:leader.Name,onClick:goLeader},{label:"Open Cell",onClick:goOpenCell}]} current={`${lglMember.Name}'s Cell`}/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">LG Leader Cell · under {leader.Name}</span>
          <h1>{lglMember.Name}'s Cell</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
            <LGLeaderBadge/>
            <StatusBadge status={lglMember.LifegroupStatus}/>
            {lglMember.LifegroupLocation&&(<span className="sub" style={{display:"flex",alignItems:"center",gap:4}}><MapPin size={12}/>{lglMember.LifegroupLocation}</span>)}
          </div>
          <p className="sub" style={{marginTop:6}}>{list.length} open cell {list.length===1?"member":"members"}</p>
        </div>
      </div>
      <div className="lgl-notice">
        <Users size={14}/>
        <span>This member handles their own lifegroup while still in Open Cell. Only their Open Cell members are shown here — Close Cell members will appear after seeding up.</span>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (<div className="empty"><p className="empty-title">No cell members yet</p></div>)
      : <GroupedMembers members={list} allMembers={members} onViewCell={()=>{}}/>}
    </div>
  );
}

// ── Consolidation (First Timer / VIP) module ───────────────────────────
function statusClass(status) {
  if (status === "Attending Cell") return "status-good";
  if (status === "Invited to Cell" || status === "Contacted") return "status-mid";
  if (status === "Inactive") return "status-bad";
  return "status-new";
}

// Dates come back from the sheet as UTC timestamps (e.g. "2026-07-11T16:00:00.000Z"
// for a date entered as July 12 in Manila). Always re-render them in the church's
// local timezone so the calendar day shown matches what was actually entered.
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d); // YYYY-MM-DD
  const [y, m, day] = iso.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
}

function ConsolidationScreen() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterNetwork, setFilterNetwork] = useState("All");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await apiGetC(); setRecords(data.records || []); }
    catch { setError("Couldn't load First Timer records. Check the Consolidation script URL is set."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const notConfigured = CONSOLIDATION_SCRIPT_URL.indexOf("PASTE_YOUR") === 0;

  const filtered = records.filter(r =>
    (filterStatus==="All" || r.FollowUpStatus===filterStatus) &&
    (filterNetwork==="All" || r.AssignedNetworkId===filterNetwork)
  ).sort((a,b)=> String(b.DateEncoded||"").localeCompare(String(a.DateEncoded||"")));

  const stats = useMemo(() => ({
    total: records.length,
    notYet: records.filter(r=>r.FollowUpStatus==="Not Yet Contacted").length,
    attending: records.filter(r=>r.FollowUpStatus==="Attending Cell").length,
  }), [records]);

  if (notConfigured) {
    return (
      <div className="home-wrap">
        <div className="home-hero">
          <span className="eyebrow">Consolidation</span>
          <h1>First Timers &amp; VIPs</h1>
        </div>
        <div className="empty">
          <ClipboardList size={28}/>
          <p className="empty-title">Not connected yet</p>
          <p className="empty-sub">Deploy <code>ConsolidationBackend.gs</code> as a Web App, then paste its URL into
            <code> CONSOLIDATION_SCRIPT_URL</code> near the top of <code>src/App.jsx</code>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-wrap">
      <div className="home-hero">
        <span className="eyebrow">Consolidation</span>
        <h1>First Timers &amp; VIPs</h1>
        <p className="lede">A live, read-only view of every First Timer logged at TRCF and who they're assigned to for
          follow-up. New records and edits are made in the separate Consolidation System app.</p>
      </div>

      {error && <div className="error-box"><AlertCircle size={15}/>{error}</div>}

      <div className="stats">
        {[
          {n: stats.total,     l:"Total First Timers"},
          {n: stats.notYet,    l:"Not Yet Contacted"},
          {n: stats.attending, l:"Now Attending a Cell"},
        ].map(s=>(
          <div key={s.l} className="stat">
            <span className="stat-n">{loading?"—":s.n}</span>
            <span className="stat-l">{s.l}</span>
          </div>
        ))}
      </div>

      <div className="screen-head">
        <div className="filter-row">
          <span className="filter-label"><Filter size={13}/>Filter</span>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="All">All statuses</option>
            {FOLLOWUP_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterNetwork} onChange={e=>setFilterNetwork(e.target.value)}>
            <option value="All">All networks</option>
            {NETWORKS.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : filtered.length===0 ? (
        <div className="empty">
          <p className="empty-title">No First Timers logged yet</p>
          <p className="empty-sub">Click "Add First Timer" to log the first record.</p>
        </div>
      ) : (
        <div className="ft-list">
          {filtered.map(r=>(
            <div key={r.ID} className="ft-card">
              <div className="ft-main">
                <div className="ft-name-line">
                  <span className="ft-name">{r.Name}</span>
                  <span className={`ft-status ${statusClass(r.FollowUpStatus)}`}>{r.FollowUpStatus}</span>
                  {r.Decision && <span className="badge badge-notes">{r.Decision}</span>}
                </div>
                <div className="ft-meta">
                  {r.ContactNumber && <span><Phone size={11}/>{r.ContactNumber}</span>}
                  {r.DateVisited && <span><Calendar size={11}/>{formatDate(r.DateVisited)}</span>}
                  {r.InvitedBy && <span>Invited by {r.InvitedBy}</span>}
                </div>
                <div className="ft-assign">
                  Assigned to <strong>{r.AssignedLeaderName || "—"}</strong>
                  {r.AssignedNetworkId && <> · {(NETWORKS.find(n=>n.id===r.AssignedNetworkId)||{}).label}</>}
                  {r.EncodedBy && <span className="ft-encoder"> · logged by {r.EncodedBy}</span>}
                </div>
              </div>
              <div className="ft-actions">
                <span className={`ft-status ${statusClass(r.FollowUpStatus)}`}>{r.FollowUpStatus}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── App shell ───────────────────────────────────────────────────────────
export default function App() {
  const [dataByNet, setDataByNet] = useState({});
  const [route, setRoute] = useState({ screen: "networks" });
  const [section, setSection] = useState("networks"); // "networks" | "consolidation"
  const [textSize, setTextSize] = useState("normal");
  const SIZE_STEPS = ["normal", "large", "xlarge"];
  const SIZE_LABELS = { normal: "Normal", large: "Large", xlarge: "Extra Large" };
  function cycleTextSize() {
    setTextSize(prev => SIZE_STEPS[(SIZE_STEPS.indexOf(prev) + 1) % SIZE_STEPS.length]);
  }

  const anyLoading = NETWORKS.some(n => !dataByNet[n.id] || dataByNet[n.id].loading);

  const load = useCallback(() => {
    NETWORKS.forEach(n => {
      setDataByNet(prev => ({ ...prev, [n.id]: { ...(prev[n.id]||{}), loading:true, error:null } }));
      apiGet(n.scriptUrl)
        .then(data => setDataByNet(prev => ({ ...prev, [n.id]: { members: data.members||[], loading:false, error:null, ok:true } })))
        .catch(() => setDataByNet(prev => ({ ...prev, [n.id]: { members:[], loading:false, error:"Couldn't load from this network's sheet.", ok:false } })));
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const navigate = useCallback((newRoute) => {
    setRoute(newRoute);
    window.history.pushState({ pdRoute: newRoute }, "");
  }, []);

  useEffect(() => { window.history.replaceState({ pdRoute: { screen: "networks" } }, ""); }, []);
  useEffect(() => {
    function onPopState(event) {
      const r = event.state && event.state.pdRoute;
      setRoute(r || { screen: "networks" });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goNetworks  = ()            => navigate({screen:"networks"});
  const goHome      = (net)         => navigate({screen:"home", net});
  const goGender    = (net,g)       => navigate({screen:"gender",net,gender:g});
  const goLeader    = (net,g,l)     => navigate({screen:"leader",net,gender:g,leader:l});
  const goOpenCell  = (net,g,l)     => navigate({screen:"open",net,gender:g,leader:l});
  const goCloseCell = (net,g,l)     => navigate({screen:"close",net,gender:g,leader:l});
  const goSubLeader = (net,g,l,sub)=> navigate({screen:"subleader",net,gender:g,leader:l,subLeader:sub});
  const goSubOpen   = (net,g,l,sub)=> navigate({screen:"subopen",net,gender:g,leader:l,subLeader:sub});
  const goSubClose  = (net,g,l,sub)=> navigate({screen:"subclose",net,gender:g,leader:l,subLeader:sub});
  const goLGLeaderCell = (net,g,l,lglm) => navigate({screen:"lglcell",net,gender:g,leader:l,lglMember:lglm});

  const currentNetData = route.net ? (dataByNet[route.net.id] || {}) : {};
  const members = currentNetData.members || [];
  const loading = currentNetData.loading !== false;
  const error = currentNetData.error;
  const leaders = members.filter(m => !m.ParentID || String(m.ParentID).trim() === "");

  return (
    <div className="shell" data-textsize={textSize}>
      <style>{CSS}</style>
      <div className="shell-body">
        <nav className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark">TRCF</span>
            <span className="sidebar-brand-name">NETWORK LEADERS</span>
          </div>
          <button className={`sidebar-item${section==="networks"?" sidebar-item-active":""}`}
            onClick={()=>{setSection("networks");goNetworks();}}>
            <LayoutDashboard size={16}/>Network Reports
          </button>
          <button className={`sidebar-item${section==="consolidation"?" sidebar-item-active":""}`}
            onClick={()=>setSection("consolidation")}>
            <ClipboardList size={16}/>Consolidation
          </button>
        </nav>

        <div className="content-area">
          <header className="topbar">
            <button className="brand" onClick={()=>{setSection("networks");goNetworks();}}>
              <span className="brand-mark topbar-mark">TRCF</span>
              <span className="brand-name">{section==="consolidation" ? "Consolidation — First Timers" : "NETWORK LEADERS DASHBOARD"}</span>
            </button>
            <div style={{display:"flex",gap:6}}>
              <button className={`icon-btn resize-btn${textSize!=="normal"?" resize-btn-active":""}`} onClick={cycleTextSize} title="Resize text">
                <ZoomIn size={15}/><span className="resize-btn-label">{SIZE_LABELS[textSize]}</span>
              </button>
              {section==="networks" && route.screen!=="networks" && <button className="icon-btn" onClick={goNetworks} title="Networks"><Home size={15}/></button>}
              {section==="networks" && <button className="icon-btn" onClick={load} title="Refresh all"><RefreshCw size={15} className={anyLoading?"spin":""}/></button>}
            </div>
          </header>

          <main className="main">
            {section==="consolidation" && <ConsolidationScreen/>}

            {section==="networks" && route.screen==="networks" &&
              <NetworksScreen dataByNet={dataByNet} onEnter={goHome}/>}

            {section==="networks" && route.screen==="home" &&
          <NetworkHomeScreen net={route.net} members={members} loading={loading} error={error}
            goNetworks={goNetworks} onEnter={g=>goGender(route.net,g)}/>}

        {section==="networks" && route.screen==="gender" &&
          <GenderScreen net={route.net} gender={route.gender} leaders={leaders} members={members} loading={loading}
            goHome={()=>goHome(route.net)} onPickLeader={l=>goLeader(route.net,route.gender,l)}/>}

        {section==="networks" && route.screen==="leader" &&
          <LeaderScreen net={route.net} gender={route.gender} leader={route.leader} members={members}
            goHome={()=>goHome(route.net)} goGender={()=>goGender(route.net,route.gender)}
            onPickCell={cell=>cell==="Open Cell"?goOpenCell(route.net,route.gender,route.leader):goCloseCell(route.net,route.gender,route.leader)}/>}

        {section==="networks" && route.screen==="open" &&
          <OpenCellScreen gender={route.gender} leader={route.leader} members={members} loading={loading}
            goHome={()=>goHome(route.net)} goGender={()=>goGender(route.net,route.gender)} goLeader={()=>goLeader(route.net,route.gender,route.leader)}
            onViewLGLeaderCell={m=>goLGLeaderCell(route.net,route.gender,route.leader,m)}/>}

        {section==="networks" && route.screen==="close" &&
          <CloseCellScreen gender={route.gender} leader={route.leader} members={members} loading={loading}
            goHome={()=>goHome(route.net)} goGender={()=>goGender(route.net,route.gender)} goLeader={()=>goLeader(route.net,route.gender,route.leader)}
            onPickSubLeader={sub=>goSubLeader(route.net,route.gender,route.leader,sub)}/>}

        {section==="networks" && route.screen==="subleader" &&
          <SubLeaderScreen gender={route.gender} leader={route.leader} subLeader={route.subLeader} members={members}
            goHome={()=>goHome(route.net)} goGender={()=>goGender(route.net,route.gender)} goLeader={()=>goLeader(route.net,route.gender,route.leader)}
            goCloseCell={()=>goCloseCell(route.net,route.gender,route.leader)}
            onPickCell={cell=>cell==="Open Cell"?goSubOpen(route.net,route.gender,route.leader,route.subLeader):goSubClose(route.net,route.gender,route.leader,route.subLeader)}/>}

        {section==="networks" && route.screen==="subopen" &&
          <SubLeaderOpenScreen gender={route.gender} leader={route.leader} subLeader={route.subLeader} members={members} loading={loading}
            goHome={()=>goHome(route.net)} goGender={()=>goGender(route.net,route.gender)} goLeader={()=>goLeader(route.net,route.gender,route.leader)}
            goCloseCell={()=>goCloseCell(route.net,route.gender,route.leader)} goSubLeader={()=>goSubLeader(route.net,route.gender,route.leader,route.subLeader)}
            onViewLGLeaderCell={m=>goLGLeaderCell(route.net,route.gender,route.leader,m)}/>}

        {section==="networks" && route.screen==="subclose" &&
          <SubLeaderCloseScreen gender={route.gender} leader={route.leader} subLeader={route.subLeader} members={members} loading={loading}
            goHome={()=>goHome(route.net)} goGender={()=>goGender(route.net,route.gender)} goLeader={()=>goLeader(route.net,route.gender,route.leader)}
            goCloseCell={()=>goCloseCell(route.net,route.gender,route.leader)} goSubLeader={()=>goSubLeader(route.net,route.gender,route.leader,route.subLeader)}
            onPickDeepLeader={deep=>navigate({screen:"subleader",net:route.net,gender:route.gender,leader:route.leader,subLeader:deep})}/>}

        {section==="networks" && route.screen==="lglcell" &&
          <LGLeaderCellScreen gender={route.gender} leader={route.leader} lglMember={route.lglMember} members={members} loading={loading}
            goHome={()=>goHome(route.net)} goGender={()=>goGender(route.net,route.gender)} goLeader={()=>goLeader(route.net,route.gender,route.leader)}
            goOpenCell={()=>goOpenCell(route.net,route.gender,route.leader)}/>}
          </main>
        </div>
      </div>
    </div>
  );
}

const CSS = `
:root {
  color-scheme: light;
  --paper:  #FAF6EE; --raised: #FFFFFF; --ink: #1F2A24;
  --faint:  #9C9485; --line:   #E4DDCC;
  --sage:   #5B7A63; --sage-d: #44604C;
  --gold:   #C99A4B;
  --rose:   #B8757A; --rose-d: #9C5B61;
  --blue:   #5C7C9C; --blue-d: #46647F;
  --danger: #B23B3B; --green:  #3A7D5C;
  --amber:  #8B6914;
  --lgl:    #6B4FA0; --lgl-d:  #52388A;
  --tim:    #B8850C; --tim-d:  #8A6208;
  --navy:   #1F2A44;
}
*{box-sizing:border-box;margin:0;padding:0;}
html{color-scheme:light;}
body{background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color-scheme:light;}
.shell{color-scheme:light;overflow-x:hidden;}
.spin{animation:spin .9s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}

.topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid var(--line);background:var(--paper);}
.brand{display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;}
.brand-mark{background:var(--navy);color:#fff;font-weight:700;font-size:13px;letter-spacing:.04em;padding:6px 9px;border-radius:6px;}
.brand-name{font-size:16px;font-weight:700;color:var(--ink);}
.main{max-width:880px;margin:0 auto;padding:40px 24px 80px;}

.bc{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--faint);margin-bottom:22px;flex-wrap:wrap;}
.bc-btn{background:none;border:none;font-size:13px;color:var(--faint);cursor:pointer;}
.bc-btn:hover{color:var(--ink);text-decoration:underline;}
.bc-cur{font-size:13px;color:var(--ink);font-weight:600;}

.screen-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;gap:16px;flex-wrap:wrap;}
.screen-head h1{font-size:30px;font-weight:700;margin-bottom:4px;}
.eyebrow-sm{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);display:block;margin-bottom:4px;}
.sub{font-size:14px;color:var(--faint);}
.acc-boys  .screen-head h1{color:var(--blue-d);}
.acc-girls .screen-head h1{color:var(--rose-d);}

.error-box{display:flex;align-items:center;gap:8px;background:#F8E9E5;color:var(--danger);border:1px solid #E5BDB5;border-radius:10px;padding:12px 16px;font-size:14px;margin-bottom:28px;}
.link-btn{background:none;border:none;font-size:13px;color:var(--faint);cursor:pointer;}

.home-wrap{max-width:720px;}
.home-hero{margin-bottom:36px;}
.eyebrow{display:inline-block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--navy);font-weight:700;margin-bottom:14px;}
.home-hero h1{font-size:42px;line-height:1.08;font-weight:700;letter-spacing:-.01em;margin-bottom:16px;}
.lede{font-size:16px;line-height:1.6;color:#5B5447;}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--line);}
.stat{display:flex;flex-direction:column;padding:0 20px 0 0;border-right:1px solid var(--line);}
.stat:not(:first-child){padding:0 20px;}
.stat:last-child{border-right:none;}
.stat-n{font-size:34px;font-weight:700;color:var(--navy);}
.stat-l{font-size:13px;color:var(--faint);margin-top:2px;}

/* Networks grid (top-level pastor overview cards) */
.net-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}
.net-card{text-align:left;background:var(--raised);border:1px solid var(--line);border-radius:16px;padding:22px;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:transform .15s,box-shadow .15s,border-color .15s;}
.net-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(31,42,36,.08);border-color:var(--navy);}
.net-card:disabled{cursor:default;opacity:.7;}
.net-card-error{border-color:#E5BDB5;}
.net-card-top{display:flex;align-items:center;gap:8px;color:var(--navy);}
.net-card-name{font-size:17px;font-weight:700;color:var(--ink);}
.net-card-leaders{display:flex;flex-direction:column;gap:2px;}
.net-leader-line{display:flex;align-items:center;gap:5px;font-size:12.5px;color:var(--faint);}
.net-card-status{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--faint);}
.net-card-status-err{color:var(--danger);}
.net-card-counts{display:flex;gap:6px;flex-wrap:wrap;}
.net-pill{font-size:11px;font-weight:700;border-radius:20px;padding:3px 10px;background:#EEF1F6;color:var(--navy);}

.doors{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.door{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;background:var(--raised);border:1px solid var(--line);border-radius:16px;padding:28px 24px;cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;}
.door:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(31,42,36,.08);}
.door-boys{color:var(--blue-d);} .door-boys:hover{border-color:var(--blue);}
.door-girls{color:var(--rose-d);} .door-girls:hover{border-color:var(--rose);}
.door-network-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--faint);margin-top:10px;}
.door-title{font-size:20px;font-weight:700;color:var(--ink);line-height:1.2;}
.door-count{font-size:13px;color:var(--faint);margin-top:2px;}
.door-go{margin-top:12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:2px;}

.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.leader-card{text-align:left;background:var(--raised);border:1px solid var(--line);border-radius:14px;padding:20px;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:transform .15s,box-shadow .15s;}
.leader-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(31,42,36,.08);}
.lc-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--faint);}
.lc-name{font-size:18px;font-weight:700;}
.lc-counts{display:flex;gap:6px;flex-wrap:wrap;}
.lc-pill{font-size:11px;font-weight:700;border-radius:20px;padding:3px 10px;}
.lc-open{background:#EAF4F0;color:var(--sage-d);}
.lc-close{background:#F0F4FA;color:var(--blue-d);}
.lc-days{display:flex;gap:4px;flex-wrap:wrap;}
.go-lnk{font-size:12px;font-weight:700;color:var(--navy);display:flex;align-items:center;gap:4px;margin-top:4px;}

.cell-split{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.cell-card{text-align:left;background:var(--raised);border:1px solid var(--line);border-radius:16px;padding:24px;cursor:pointer;display:flex;flex-direction:column;gap:12px;transition:transform .15s,box-shadow .15s;}
.cell-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(31,42,36,.08);}
.cell-open:hover{border-color:var(--sage);}
.cell-close:hover{border-color:var(--blue);}
.cc-top{display:flex;align-items:baseline;gap:10px;}
.cc-count{font-size:36px;font-weight:700;}
.cell-open  .cc-count{color:var(--sage-d);}
.cell-close .cc-count{color:var(--blue-d);}
.cc-label{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);}
.cc-days{display:flex;gap:4px;flex-wrap:wrap;}
.cc-desc{font-size:14px;color:#5B5447;line-height:1.5;}

.groups{display:flex;flex-direction:column;gap:24px;}
.day-group{display:flex;flex-direction:column;gap:10px;}
.day-group-head{display:flex;align-items:center;justify-content:space-between;padding:0 2px;gap:10px;flex-wrap:wrap;}
.day-group-label{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--ink);}
.day-group-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.day-group-count{font-size:12px;color:var(--faint);}

.day-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;background:#EEF4FF;color:var(--blue-d);border-radius:20px;padding:3px 8px;}

.member-list{display:flex;flex-direction:column;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.member-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;background:var(--raised);padding:14px 18px;}
.member-row-lgl{background:#FAF6FF;border-left:3px solid var(--lgl);}
.member-rank{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--paper);border:1px solid var(--line);font-size:11px;font-weight:700;color:var(--faint);display:flex;align-items:center;justify-content:center;margin-top:2px;}
.member-main{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;}
.member-name-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.member-name{font-weight:700;font-size:15px;}
.member-loc{display:flex;align-items:center;gap:3px;font-size:12px;color:var(--faint);}
.member-side{display:flex;align-items:center;gap:8px;flex-shrink:0;}

.lgl-action-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:4px;}
.btn-view-cell{display:inline-flex;align-items:center;gap:5px;background:#F2EEF9;border:1px solid #C9B8E8;color:var(--lgl-d);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s;}
.btn-view-cell:hover{background:#E8E0F7;}

.lgl-notice{display:flex;align-items:flex-start;gap:10px;background:#F2EEF9;border:1px solid #C9B8E8;border-radius:10px;padding:12px 16px;font-size:13px;color:var(--lgl-d);line-height:1.5;margin-bottom:24px;}
.lgl-notice svg{flex-shrink:0;margin-top:1px;}

.track-pills{display:flex;flex-wrap:wrap;gap:5px;}
.track-pill{font-size:11px;font-weight:700;color:var(--ink);background:#FBF0DC;border:1px solid var(--gold);border-radius:6px;padding:3px 8px;line-height:1.2;}
.track-pill-lgl{background:#F2EEF9;border-color:#C9B8E8;color:var(--lgl-d);}
.track-list-empty{font-size:12px;color:var(--faint);font-weight:400;font-style:italic;}

.subldr-list{display:flex;flex-direction:column;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.subldr-row{background:var(--raised);display:flex;flex-direction:column;}
.subldr-main{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 8px;cursor:pointer;background:none;border:none;text-align:left;width:100%;gap:12px;}
.subldr-main:hover{background:#F8F5EF;}
.subldr-info{display:flex;flex-direction:column;gap:2px;}
.subldr-name{font-size:15px;font-weight:700;}
.subldr-loc{font-size:12px;color:var(--faint);display:flex;align-items:center;gap:3px;}
.subldr-meta{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.subldr-count{font-size:12px;color:var(--faint);font-weight:700;}
.subldr-actions{display:flex;align-items:center;gap:10px;padding:4px 18px 12px;border-top:1px solid var(--line);flex-wrap:wrap;}
.subldr-actions .track-pills{flex:1;min-width:120px;}

.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;border-radius:20px;padding:3px 8px;}
.badge-green{background:#E6F4ED;color:var(--green);}
.badge-red{background:#F8E9E5;color:var(--danger);}
.badge-close{background:#EEF4FF;color:var(--blue-d);}
.badge-notes{background:#FEF3C7;color:var(--amber);}
.badge-lgl{background:#F2EEF9;color:var(--lgl-d);}
.badge-timothy{background:#FCF3DE;color:var(--tim-d);}
.member-row-close{background:#F5F8FF;}

.icon-btn{display:inline-flex;align-items:center;justify-content:center;background:none;border:none;color:var(--faint);cursor:pointer;padding:6px;border-radius:6px;}
.icon-btn:hover{background:#F1ECDF;color:var(--ink);}

.resize-btn{width:auto;gap:5px;padding:6px 10px;border:1px solid var(--line);}
.resize-btn-label{font-size:11px;font-weight:700;}
.resize-btn-active{background:#EAF4F0;border-color:var(--sage);color:var(--sage-d);}
.resize-btn-active:hover{background:#DCEEE3;}

.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:60px 20px;text-align:center;border:1px dashed var(--line);border-radius:14px;color:var(--faint);}
.empty-title{font-weight:700;color:var(--ink);}
.empty-sub{font-size:14px;margin-bottom:4px;}

/* Resize / text-size scaling */
.main{max-width:880px;}
.shell[data-textsize="large"] .main{zoom:1.12;}
.shell[data-textsize="large"] .topbar .brand-name,
.shell[data-textsize="large"] .topbar .resize-btn-label{font-size:115%;}
.shell[data-textsize="xlarge"] .main{zoom:1.25;}
.shell[data-textsize="xlarge"] .topbar .brand-name,
.shell[data-textsize="xlarge"] .topbar .resize-btn-label{font-size:128%;}

@media(max-width:480px){
  .shell[data-textsize="large"] .main{zoom:1.08;}
  .shell[data-textsize="xlarge"] .main{zoom:1.15;}
}

@media(max-width:560px){
  .doors,.cell-split{grid-template-columns:1fr;}
  .home-hero h1{font-size:32px;}
  .main{padding:28px 16px 60px;}
  .member-row{flex-wrap:wrap;}
  .stats{grid-template-columns:repeat(3,1fr);gap:10px;}
  .stat{padding:0 4px 0 0;border-right:none;}
  .stat:not(:first-child){padding:0 4px;}
  .stat-n{font-size:26px;}
  .stat-l{font-size:11px;line-height:1.3;}
  .net-grid{grid-template-columns:1fr;}
  .shell-body{flex-direction:column;}
  .sidebar{width:100%;flex-direction:row;padding:10px 14px;gap:8px;overflow-x:auto;}
  .sidebar-brand{display:none;}
  .sidebar-item{white-space:nowrap;}
}

/* ── Sidebar layout ─────────────────────────────────────────────────── */
.shell-body{display:flex;min-height:100vh;}
.sidebar{width:230px;flex-shrink:0;background:var(--raised);border-right:1px solid var(--line);
  display:flex;flex-direction:column;gap:4px;padding:20px 14px;position:sticky;top:0;height:100vh;overflow-y:auto;}
.sidebar-brand{display:flex;align-items:center;gap:8px;padding:6px 10px 18px;}
.sidebar-brand-name{font-size:13px;font-weight:700;color:var(--ink);line-height:1.3;}
.sidebar-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;
  font-size:14px;font-weight:700;color:var(--faint);cursor:pointer;background:none;border:none;font-family:inherit;text-align:left;}
.sidebar-item:hover{background:#F1ECDF;color:var(--ink);}
.sidebar-item-active{background:#EEF1F6;color:var(--navy);}
.content-area{flex:1;min-width:0;}
.topbar-mark{display:none;}
@media(min-width:561px){ .topbar-mark{display:none;} }

/* ── Modal / form controls (Consolidation) ─────────────────────────── */
.overlay{position:fixed;inset:0;background:rgba(31,42,36,.45);display:flex;align-items:center;justify-content:center;padding:20px;z-index:50;overflow:auto;}
.modal{background:var(--raised);border-radius:16px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 12px;}
.modal-head h2{font-size:19px;font-weight:700;}
.modal-body{padding:4px 22px 22px;display:flex;flex-direction:column;gap:14px;}
.modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:0 22px 22px;}
.field{display:flex;flex-direction:column;gap:6px;}
.field>span{font-size:13px;font-weight:700;}
.field input,.field select{font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--paper);color:var(--ink);font-family:inherit;}
.field input:focus,.field select:focus{outline:2px solid var(--navy);outline-offset:1px;}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.btn-primary{display:inline-flex;align-items:center;gap:6px;background:var(--navy);color:#fff;border:none;border-radius:9px;padding:10px 16px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s;}
.btn-primary:hover{background:#141b30;}
.btn-primary:disabled{opacity:.6;cursor:default;}
.btn-ghost{background:none;border:1px solid var(--line);border-radius:9px;padding:10px 16px;font-size:14px;font-weight:700;color:var(--ink);cursor:pointer;font-family:inherit;}
.btn-ghost:hover{background:#F1ECDF;}

/* ── Consolidation list ─────────────────────────────────────────────── */
.filter-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.filter-label{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--faint);}
.filter-row select{font-size:13px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--raised);color:var(--ink);font-family:inherit;}
.ft-list{display:flex;flex-direction:column;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.ft-card{background:var(--raised);padding:16px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.ft-main{display:flex;flex-direction:column;gap:6px;flex:1;min-width:220px;}
.ft-name-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ft-name{font-weight:700;font-size:15px;}
.ft-status{font-size:11px;font-weight:700;border-radius:20px;padding:3px 10px;}
.status-new{background:#EEF1F6;color:var(--navy);}
.status-mid{background:#FEF3C7;color:var(--amber);}
.status-good{background:#E6F4ED;color:var(--green);}
.status-bad{background:#F8E9E5;color:var(--danger);}
.ft-meta{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--faint);}
.ft-meta span{display:flex;align-items:center;gap:4px;}
.ft-assign{font-size:12.5px;color:var(--faint);}
.ft-encoder{font-style:italic;}
.ft-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.status-select{font-size:12px;font-weight:700;padding:6px 10px;border:1px solid var(--line);border-radius:20px;background:var(--paper);color:var(--ink);font-family:inherit;}
`;
