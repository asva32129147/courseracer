import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// =========================
// Course Racer configuration
// =========================
// Add future courses by adding another object to COURSES. Each course gets its
// own ID, modules, deadlines, and leaderboard. Claims are separated by courseId.
const COURSES = {
  pup01x: {
    id: "pup01x",
    name: "DelftX PUP01x · Pre-University Physics",
    shortName: "PUP01x",
    points: { unit: 4, finalMax: 10, moduleFirst: 2, moduleSecond: 1, overallFirst: 4, overallSecond: 2, checkpointPenalty: 1, deadlinePenalty: 3 },
    modules: [
      {name:"Mechanics", units:["Force and motion","Multiple forces","Work","Energy","Circular motion"], deadline:"2026-10-01T18:15:00-07:00", checkpoints:[
        {name:"Checkpoint 1", at:"2026-09-27T23:59:59-07:00", required:["Force and motion","Multiple forces"]},
        {name:"Checkpoint 2", at:"2026-09-29T23:59:59-07:00", required:["Work","Energy"]}
      ]},
      {name:"Electricity & magnetism", units:["Electric force and field","Electric potential and energy","Electric circuits","Magnetism","Capacitors"], deadline:"2026-10-08T18:15:00-07:00", checkpoints:[
        {name:"Checkpoint 1", at:"2026-10-04T23:59:59-07:00", required:["Electric force and field","Electric potential and energy"]},
        {name:"Checkpoint 2", at:"2026-10-06T23:59:59-07:00", required:["Electric circuits","Magnetism"]}
      ]},
      {name:"Waves", units:["Harmonic motion","Oscillations","Coupled oscillations","Traveling waves","Standing waves"], deadline:"2026-10-15T18:15:00-07:00", checkpoints:[
        {name:"Checkpoint 1", at:"2026-10-11T23:59:59-07:00", required:["Harmonic motion","Oscillations"]},
        {name:"Checkpoint 2", at:"2026-10-13T23:59:59-07:00", required:["Coupled oscillations","Traveling waves"]}
      ]}
    ]
  }
};
const DEFAULT_COURSE_ID = "pup01x";

// Paste the Firebase Web App config here.
const firebaseConfig = {
    apiKey: "AIzaSyAH8Lt8pnV000AHrmtjI3f-q1i71l3VYFU",
    authDomain: "course-racer.firebaseapp.com",
    projectId: "course-racer",
    storageBucket: "course-racer.firebasestorage.app",
    messagingSenderId: "491085898550",
    appId: "1:491085898550:web:7d5c266f7dba3dec074997"
  };

// Paste YOUR Firebase Auth UID here after creating your admin account.
const ADMIN_UID = "RcpTC3K2OpM5MfJDoNhOZhAx0K93";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentCourseId = DEFAULT_COURSE_ID;
let currentCourse = COURSES[currentCourseId];
let unsubClaims = null, unsubUsers = null, unsubMyClaims = null, unsubCourse = null, leaderboardTimer = null, currentUser = null, courseState = {};

const $ = id => document.getElementById(id);
const allUnits = () => currentCourse.modules.flatMap((m,mi)=>m.units.map((label,ui)=>({key:`unit-${mi}-${ui}`,label,module:mi})));
const finalPoints = p => p >= 95 ? 10 : p >= 90 ? 9 : p >= 80 ? 8 : p >= 70 ? 7 : p >= 60 ? 6 : 0;

function selectCourse(id){
  if(!COURSES[id]) return;
  currentCourseId = id;
  currentCourse = COURSES[id];
  courseState = {};
  if(currentUser) restartCourseListeners();
  updateCourseHeader();
}

function courseMaxScore(){
  const units=currentCourse.modules.reduce((s,m)=>s+m.units.length,0)*currentCourse.points.unit;
  const finals=currentCourse.modules.length*currentCourse.points.finalMax;
  const speed=currentCourse.modules.length*(currentCourse.points.moduleFirst+currentCourse.points.moduleSecond)+currentCourse.points.overallFirst+currentCourse.points.overallSecond;
  return units+finals+speed;
}

function updateCourseHeader(){
  $("courseName").textContent = currentCourse.name;
  $("courseSelector").value = currentCourseId;
  $("maxScore").textContent = `${courseMaxScore()} pts possible`;
  $("myScore").textContent = `0 / ${courseMaxScore()}`;
  $("rulesList").innerHTML = [
    `<li><b>${currentCourse.modules.reduce((s,m)=>s+m.units.length,0)*currentCourse.points.unit}</b> points — unit completion</li>`,
    `<li><b>${currentCourse.modules.length*currentCourse.points.finalMax}</b> points — final exercises</li>`,
    `<li><b>${currentCourse.modules.length*(currentCourse.points.moduleFirst+currentCourse.points.moduleSecond)+currentCourse.points.overallFirst+currentCourse.points.overallSecond}</b> points — speed bonuses</li>`,
    `<li><b>−${currentCourse.points.checkpointPenalty}</b> per missed checkpoint</li>`,
    `<li><b>−${currentCourse.points.deadlinePenalty}</b> per missed module deadline</li>`
  ].join("");
}

function buildCourseSelector(){
  const entries = Object.values(COURSES);
  $("courseSelector").innerHTML = entries.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.shortName)} — ${escapeHtml(c.name.replace(/^.*?·\s*/,""))}</option>`).join("");
  $("courseSelector").onchange = e => selectCourse(e.target.value);
  updateCourseHeader();
}

$("signupBtn").onclick = async () => {
  try {
    const name = $("name").value.trim();
    if (!name) throw new Error("Enter a display name.");
    const email = $("email").value.trim();
    const password = $("password").value;
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    const cred = await createUserWithEmailAndPassword(auth,email,password);
    await setDoc(doc(db,"users",cred.user.uid),{name,email:cred.user.email,role:"racer",createdAt:serverTimestamp()});
    $("authMsg").textContent = "Account created.";
  } catch(e){ $("authMsg").textContent = friendlyError(e); }
};

$("loginBtn").onclick = async () => {
  try { await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value); $("authMsg").textContent=""; }
  catch(e){ $("authMsg").textContent=friendlyError(e); }
};
$("googleBtn").onclick = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const ref = doc(db, "users", cred.user.uid);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        name: cred.user.displayName || cred.user.email?.split("@")[0] || "Racer",
        email: cred.user.email || "",
        role: "racer",
        createdAt: serverTimestamp()
      });
    }
    $("authMsg").textContent = "";
  } catch(e) {
    $("authMsg").textContent = friendlyError(e);
  }
};
$("logoutBtn").onclick = () => signOut(auth);
$("closeLightbox").onclick = closeLightbox;
$("lightbox").onclick = e => { if(e.target.id === "lightbox") closeLightbox(); };

onAuthStateChanged(auth, async user => {
  cleanupListeners();
  currentUser = user;
  if(!user){
    $("authCard").classList.remove("hidden"); $("app").classList.add("hidden"); $("logoutBtn").classList.add("hidden"); return;
  }
  $("authCard").classList.add("hidden"); $("app").classList.remove("hidden"); $("logoutBtn").classList.remove("hidden");
  const isAdmin = user.uid === ADMIN_UID;
  $("adminCard").classList.toggle("hidden",!isAdmin);
  $("courseAdmin").classList.toggle("hidden",!isAdmin);
  subscribeCourseState();
  subscribeMyClaims(user);
  subscribeLeaderboard();
  if(!leaderboardTimer) leaderboardTimer=setInterval(refreshLeaderboard,60000);
  if(isAdmin) subscribePendingClaims();
});

function restartCourseListeners(){
  [unsubClaims,unsubUsers,unsubMyClaims,unsubCourse].forEach(fn=>{if(fn)fn();});
  unsubClaims=unsubUsers=unsubMyClaims=unsubCourse=null;
  subscribeCourseState();
  subscribeMyClaims(currentUser);
  subscribeLeaderboard();
  if(currentUser?.uid===ADMIN_UID) subscribePendingClaims();
}

function subscribeCourseState(){
  unsubCourse = onSnapshot(doc(db,"courses",currentCourseId), snap => {
    courseState = snap.exists() ? snap.data() : {};
    renderCourseState();
    renderProgressCache();
  }, showDbError);
}

function renderCourseState(){
  const winner = courseState.winnerName ? `🏆 Winner: ${escapeHtml(courseState.winnerName)} (${courseState.winnerScore} pts)` : "No winner declared";
  $("winnerStatus").innerHTML = winner;
  $("lockedBadge").classList.toggle("hidden", !courseState.locked);
  $("declareWinnerBtn").disabled = !!courseState.locked;
  $("declareWinnerBtn").textContent = courseState.locked ? "Winner declared" : "Declare winner";
  $("raceLockedMsg").classList.toggle("hidden", !courseState.locked);
  if(courseState.locked) $("raceLockedMsg").textContent = "This course is locked. No new submissions or approvals can change the result.";
}

let latestMyClaims = [];
function subscribeMyClaims(user){
  unsubMyClaims = onSnapshot(query(collection(db,"claims"),where("uid","==",user.uid),where("courseId","==",currentCourseId)), snap => {
    latestMyClaims = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderProgressCache();
  }, showDbError);
}
function renderProgressCache(){ renderProgress(latestMyClaims); }

function renderProgress(claims){
  const byKey = new Map();
  for(const c of claims){
    const old=byKey.get(c.itemKey);
    if(!old || statusRank(c.verified)>statusRank(old.verified)) byKey.set(c.itemKey,c);
  }
  let html="";
  currentCourse.modules.forEach((m,mi)=>{
    html += `<div class="module"><h3>${escapeHtml(m.name)}</h3><div class="deadline">Deadline: ${formatDate(m.deadline)}</div>`;
    m.units.forEach((label,ui)=>{
      const key=`unit-${mi}-${ui}`; const c=byKey.get(key);
      const state=c?.verified===true?"verified":c?.verified===false?"rejected":c?"pending":"";
      const icon=state==="verified"?"✅":state==="pending"?"🕒":state==="rejected"?"❌":"⬜";
      html += `<div class="unit"><span class="state ${state}">${icon}</span><span>${escapeHtml(label)}</span><button data-unit="${key}" ${courseState.locked||state==="verified"||state==="pending"?"disabled":""}>${state==="verified"?"Verified":state==="pending"?"Pending":state==="rejected"?"Resubmit":"Submit proof"}</button></div>`;
    });
    const fk=`final-${mi}`; const c=byKey.get(fk);
    const state=c?.verified===true?"verified":c?.verified===false?"rejected":c?"pending":"";
    const label=c?.percentage!=null?`Final: ${c.percentage}%`:"Final exercise";
    html += `<div class="unit"><span class="state ${state}">${state==="verified"?"🏁":state==="pending"?"🕒":state==="rejected"?"❌":"⬜"}</span><span><b>${label}</b></span><button data-final="${mi}" ${courseState.locked||(c&&c.verified!==false)?"disabled":""}>${state==="verified"?"Verified":state==="pending"?"Pending":state==="rejected"?"Resubmit":"Submit final"}</button></div>`;
    html += `</div>`;
  });
  $("progress").innerHTML=html;
  document.querySelectorAll("[data-unit]").forEach(b=>b.onclick=()=>submitUnit(b.dataset.unit));
  document.querySelectorAll("[data-final]").forEach(b=>b.onclick=()=>submitFinal(Number(b.dataset.final)));
}

async function submitUnit(key){
  if(courseState.locked) return alert("This course has already declared a winner.");
  const existing=await getDocs(query(collection(db,"claims"),where("uid","==",currentUser.uid),where("courseId","==",currentCourseId),where("itemKey","==",key)));
  if(existing.docs.some(d=>d.data().verified===true || d.data().verified===null)) return alert("You already have a claim for this item waiting for approval.");
  const file=await chooseImage(); if(!file)return;
  const image=await compressImage(file);
  await addDoc(collection(db,"claims"),{courseId:currentCourseId,uid:currentUser.uid,itemKey:key,label:allUnits().find(x=>x.key===key).label,type:"unit",evidence:image,verified:null,createdAt:serverTimestamp()});
}

async function submitFinal(mi){
  if(courseState.locked) return alert("This course has already declared a winner.");
  const pct=prompt("Enter the final-exercise percentage shown by edX (0–100):");
  const n=Number(pct); if(!Number.isFinite(n)||n<0||n>100)return alert("Enter a number from 0 to 100.");
  const file=await chooseImage(); if(!file)return;
  const image=await compressImage(file);
  await addDoc(collection(db,"claims"),{courseId:currentCourseId,uid:currentUser.uid,itemKey:`final-${mi}`,label:`${currentCourse.modules[mi].name} final exercise`,type:"final",percentage:n,points:finalPoints(n),evidence:image,verified:null,createdAt:serverTimestamp()});
}

function chooseImage(){return new Promise(resolve=>{const input=document.createElement("input");input.type="file";input.accept="image/png,image/jpeg,image/webp";input.onchange=()=>resolve(input.files?.[0]||null);input.click();});}
function compressImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader(); reader.onerror=reject; reader.onload=()=>{
      const img=new Image(); img.onload=()=>{
        const max=1800, scale=Math.min(1,max/Math.max(img.width,img.height)); const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
        const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
        let quality=.82, out=c.toDataURL("image/jpeg",quality);
        while(out.length>850000 && quality>.45){quality-=.07;out=c.toDataURL("image/jpeg",quality);}
        if(out.length>950000) reject(new Error("Screenshot is too large. Crop it or use a smaller screenshot.")); else resolve(out);
      }; img.onerror=reject; img.src=reader.result;
    }; reader.readAsDataURL(file);
  });
}

function subscribeLeaderboard(){
  unsubUsers=onSnapshot(collection(db,"users"),async snap=>{
    const racers=snap.docs.filter(d=>d.id!==ADMIN_UID && (d.data().role||"racer")==="racer");
    renderLeaderboardRows(racers);
  },showDbError);
}
async function refreshLeaderboard(){
  if(!currentUser)return;
  const snap=await getDocs(collection(db,"users"));
  const racers=snap.docs.filter(d=>d.id!==ADMIN_UID && (d.data().role||"racer")==="racer");
  await renderLeaderboardRows(racers);
}
async function renderLeaderboardRows(racers){
  const rows=[];
  for(const d of racers){
    const cs=await getDocs(query(collection(db,"claims"),where("uid","==",d.id),where("courseId","==",currentCourseId),where("verified","==",true)));
    rows.push(calculateScore(d.id,d.data().name||"Racer",cs.docs.map(x=>({id:x.id,...x.data()}))));
  }
  applySpeedBonuses(rows);
  rows.sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name));
  $("leaderboard").innerHTML=rows.map((r,i)=>leaderHtml(r,i)).join("") || `<div class="empty">No racers yet.</div>`;
  const mine=rows.find(r=>r.uid===currentUser?.uid); if(mine) $("myScore").textContent=`${mine.total} / ${courseMaxScore()}`;
  renderAdminWinnerControls(rows);
}

function calculateScore(uid,name,claims){
  const approved=claims.filter(c=>c.verified===true);
  const unitCount=new Set(approved.filter(c=>c.type==="unit").map(c=>c.itemKey)).size;
  const finals=approved.filter(c=>c.type==="final");
  const progress=unitCount*currentCourse.points.unit;
  const finalsPoints=finals.reduce((s,c)=>s+Number(c.points||0),0);
  const deductions=deadlineDeductions(approved);
  return {uid,name,approved,unitCount,progress,finalsPoints,deductions,speed:0,total:progress+finalsPoints-deductions};
}
function deadlineDeductions(approved){
  let penalty=0;
  currentCourse.modules.forEach((m,mi)=>{
    const unitClaims=approved.filter(c=>c.type==="unit" && c.itemKey.startsWith(`unit-${mi}-`));
    const labels=new Set(unitClaims.map(c=>c.label));
    for(const cp of m.checkpoints){
      if(Date.now()>new Date(cp.at).getTime() && !cp.required.every(x=>labels.has(x))) penalty+=currentCourse.points.checkpointPenalty;
    }
    const allDone=m.units.every(u=>labels.has(u)) && approved.some(c=>c.itemKey===`final-${mi}`);
    if(Date.now()>new Date(m.deadline).getTime() && !allDone) penalty+=currentCourse.points.deadlinePenalty;
  });
  return penalty;
}
function applySpeedBonuses(rows){
  rows.forEach(r=>r.speed=0);
  for(let mi=0;mi<currentCourse.modules.length;mi++){
    const completed=rows.map(r=>({r,t:moduleFinishTime(r,mi)})).filter(x=>x.t).sort((a,b)=>a.t-b.t);
    if(completed[0]) completed[0].r.speed+=currentCourse.points.moduleFirst;
    if(completed[1]) completed[1].r.speed+=currentCourse.points.moduleSecond;
  }
  const overall=rows.map(r=>({r,t:overallFinishTime(r)})).filter(x=>x.t).sort((a,b)=>a.t-b.t);
  if(overall[0]) overall[0].r.speed+=currentCourse.points.overallFirst;
  if(overall[1]) overall[1].r.speed+=currentCourse.points.overallSecond;
  rows.forEach(r=>r.total=r.progress+r.finalsPoints+r.speed-r.deductions);
}
function moduleFinishTime(r,mi){
  const needed=new Set(currentCourse.modules[mi].units.map((_,ui)=>`unit-${mi}-${ui}`)); needed.add(`final-${mi}`);
  const got=r.approved.filter(c=>needed.has(c.itemKey)); if(got.length!==needed.size)return null;
  return Math.max(...got.map(c=>timestamp(c.verifiedAt)));
}
function overallFinishTime(r){
  const needed=new Set(allUnits().map(x=>x.key).concat(currentCourse.modules.map((_,i)=>`final-${i}`)));
  const got=r.approved.filter(c=>needed.has(c.itemKey)); if(got.length!==needed.size)return null;
  return Math.max(...got.map(c=>timestamp(c.verifiedAt)));
}
function timestamp(v){return v?.toMillis?v.toMillis():v?new Date(v).getTime():Infinity}
function leaderHtml(r,i){
  const crown=i===0?"👑 ":"";
  return `<div class="leader"><div class="rank">#${i+1}</div><div><b>${crown}${escapeHtml(r.name)}</b><div class="small">${r.progress} progress · ${r.finalsPoints} finals · ${r.speed} speed · −${r.deductions} deadlines</div><div class="bar"><div class="fill" style="width:${Math.max(0,Math.min(100,r.total))}%"></div></div></div><div class="score">${r.total}</div></div>`;
}

function renderAdminWinnerControls(rows){
  if(currentUser?.uid!==ADMIN_UID) return;
  const top=rows[0];
  $("declareWinnerBtn").disabled=!!courseState.locked || !top;
  $("declareWinnerBtn").dataset.uid=top?.uid||"";
  $("declareWinnerBtn").dataset.name=top?.name||"";
  $("declareWinnerBtn").dataset.score=top?.total ?? "";
}

$("declareWinnerBtn").onclick = async () => {
  if(currentUser?.uid!==ADMIN_UID || courseState.locked) return;
  const uid=$("declareWinnerBtn").dataset.uid, name=$("declareWinnerBtn").dataset.name, score=Number($("declareWinnerBtn").dataset.score);
  if(!uid) return alert("There are no racers to declare as winner.");
  if(!confirm(`Declare ${name} the winner of ${currentCourse.shortName} with ${score} points?\n\nThis will lock the course and stop further submissions and approvals.`)) return;
  await setDoc(doc(db,"courses",currentCourseId),{winnerUid:uid,winnerName:name,winnerScore:score,declaredAt:serverTimestamp(),declaredBy:currentUser.uid,locked:true},{merge:true});
};

function subscribePendingClaims(){
  unsubClaims=onSnapshot(query(collection(db,"claims"),where("courseId","==",currentCourseId),where("verified","==",null)),async snap=>{
    const arr=[];
    for(const d of snap.docs){const c={id:d.id,...d.data()};const u=await getDoc(doc(db,"users",c.uid));arr.push({...c,name:u.data()?.name||"Racer"});}
    arr.sort((a,b)=>timestamp(a.createdAt)-timestamp(b.createdAt));
    $("pendingCount").textContent=`${arr.length} pending`;
    $("claims").innerHTML=arr.length?arr.map(c=>`<div class="claim"><div class="claim-top"><div><b>${escapeHtml(c.name)}</b><div class="small">${escapeHtml(c.label)} · submitted ${formatTimestamp(c.createdAt)}</div></div>${c.percentage!=null?`<span class="pill">${c.percentage}% → ${c.points} pts</span>`:"<span class="pill">+${currentCourse.points.unit} pts</span>"}</div><img src="${c.evidence}" data-img="${c.evidence}" alt="edX evidence screenshot"><div class="claim-actions"><button data-approve="${c.id}" ${courseState.locked?"disabled":""}>Approve</button><button class="danger" data-reject="${c.id}" ${courseState.locked?"disabled":""}>Reject</button></div></div>`).join(""):`<div class="empty">No pending submissions.</div>`;
    document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>reviewClaim(b.dataset.approve,true));
    document.querySelectorAll("[data-reject]").forEach(b=>b.onclick=()=>reviewClaim(b.dataset.reject,false));
    document.querySelectorAll("[data-img]").forEach(img=>img.onclick=()=>openLightbox(img.dataset.img));
  },showDbError);
}
async function reviewClaim(id,approved){
  if(courseState.locked) return alert("This course is locked.");
  await updateDoc(doc(db,"claims",id),{verified:approved,verifiedAt:serverTimestamp(),verifiedBy:auth.currentUser.uid});
}

function cleanupListeners(){[unsubClaims,unsubUsers,unsubMyClaims,unsubCourse].forEach(fn=>{if(fn)fn();});unsubClaims=unsubUsers=unsubMyClaims=unsubCourse=null;if(leaderboardTimer){clearInterval(leaderboardTimer);leaderboardTimer=null;}}
function statusRank(v){return v===true?3:v===null?2:v===false?1:0}
function openLightbox(src){$("lightboxImg").src=src;$("lightbox").classList.remove("hidden")}
function closeLightbox(){$("lightbox").classList.add("hidden");$("lightboxImg").src=""}
function formatDate(s){return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(s))}
function formatTimestamp(v){return v?.toDate?formatDate(v.toDate().toISOString()):v?formatDate(v):"just now"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function friendlyError(e){const m=e?.code||e?.message||"Something went wrong.";return m.replace("Firebase:","").replace(/\(auth\/[^)]+\)/g,"").trim()}
function showDbError(e){console.error(e);$("connection").textContent="Connection issue";$("connection").classList.add("error")}

buildCourseSelector();
