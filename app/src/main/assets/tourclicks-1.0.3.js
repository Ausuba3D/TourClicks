(function tourClicks103Patch(){
'use strict';
const PATCH_VERSION='1.0.3';
let installed=false,liveRibbonTimer=null,active3971GroupId='';

function install(){
  if(installed)return;
  if(typeof state==='undefined'||typeof renderToday!=='function'||typeof renderLeave!=='function'||!document.getElementById('workDate')){
    setTimeout(install,80);return;
  }
  installed=true;
  state.settings.ps3971={payLocation:'',daCode:'',contact:'',doNotCall:false,...(state.settings.ps3971||{})};
  ensureVersionLabel();
  ensureTotalLeaveMetric();
  ensurePartialLeaveUi();
  ensurePartialLeaveCalculator();
  ensure3971Settings();
  ensure3971Panel();
  ensure3971Dialog();
  bindPartialLeaveEvents();
  bind3971Events();
  wrapRenderers();
  renderPatchViews();
  liveRibbonTimer=setInterval(()=>{
    const active=document.querySelector('.view.active')?.id;
    if(active==='today'&&(document.getElementById('workDate')?.value||'')===todayIso())renderChronologicalGlance();
  },30000);
}

function ensureVersionLabel(){
  const subtitle=document.querySelector('header .subtitle');
  if(subtitle)subtitle.textContent=subtitle.textContent.replace(/v\d+\.\d+\.\d+/,`v${PATCH_VERSION}`);
}

function ensureTotalLeaveMetric(){
  if(document.getElementById('totalLeaveMetric'))return;
  const grid=document.getElementById('workedMetric')?.closest('.metric-grid');
  if(!grid)return;
  const metric=document.createElement('div');
  metric.id='totalLeaveMetric';metric.className='metric';
  metric.innerHTML='<span>Total leave</span><strong id="totalLeaveMetricValue">0.00 h</strong>';
  grid.append(metric);
}

function ensurePartialLeaveUi(){
  if(document.getElementById('partialLeavePanel'))return;
  const note=document.getElementById('leaveNote')?.closest('.field');
  if(!note)return;
  const panel=document.createElement('div');panel.id='partialLeavePanel';panel.className='partial-leave-panel';
  panel.innerHTML=`<h3>Partial-day leave interval</h3>
    <div class="partial-time-row">
      <div><label>From</label><div class="partial-time-pair"><div><label>Regular clock</label><input id="leaveFromClock" inputmode="text" placeholder="5:00 AM"></div><div><label>USPS time</label><input id="leaveFromUsps" inputmode="decimal" placeholder="05.00"></div></div></div>
      <div><label>Thru</label><div class="partial-time-pair"><div><label>Regular clock</label><input id="leaveThruClock" inputmode="text" placeholder="6:00 AM"></div><div><label>USPS time</label><input id="leaveThruUsps" inputmode="decimal" placeholder="06.00"></div></div></div>
    </div>
    <div class="partial-leave-status" id="partialLeaveStatus">Optional. Leave both times blank for full-day or multi-day hour entries.</div>
    <div class="partial-leave-help">For a timed partial-day request, TourClicks calculates the hours from the interval. Regular clock and USPS hundredths stay synchronized. Timed intervals currently apply to a single calendar date; save another interval for a second partial absence on the same day.</div>`;
  note.before(panel);
}

function ensurePartialLeaveCalculator(){
  if(document.getElementById('partialLeaveCalculator'))return;
  const grid=document.querySelector('#calculator .grid');if(!grid)return;
  const card=document.createElement('div');card.id='partialLeaveCalculator';card.className='card span-12 partial-leave-calculator';
  card.innerHTML=`<h2>Partial leave interval</h2><div class="muted smalltext">Calculate a leave interval without changing the timecard. Copy it to Leave/FMLA when ready.</div>
    <div class="partial-time-row" style="margin-top:10px">
      <div><label>From</label><div class="partial-time-pair"><div><label>Regular clock</label><input id="calcLeaveFromClock" inputmode="text" placeholder="9:30 AM"></div><div><label>USPS time</label><input id="calcLeaveFromUsps" inputmode="decimal" placeholder="09.50"></div></div></div>
      <div><label>Thru</label><div class="partial-time-pair"><div><label>Regular clock</label><input id="calcLeaveThruClock" inputmode="text" placeholder="1:30 PM"></div><div><label>USPS time</label><input id="calcLeaveThruUsps" inputmode="decimal" placeholder="13.50"></div></div></div>
    </div><div class="partial-leave-calc-result" id="calcPartialLeaveHours">--</div><button class="btn secondary no-print" id="copyPartialLeaveToEntry" type="button">Use in Leave/FMLA</button>`;
  grid.append(card);
}

function ensure3971Settings(){
  if(document.getElementById('ps3971DefaultsPanel'))return;
  const grid=document.querySelector('#settings .grid');if(!grid)return;
  const panel=document.createElement('details');panel.id='ps3971DefaultsPanel';panel.className='card span-12 settings-panel';
  panel.innerHTML=`<summary><b>PS Form 3971 defaults</b><span class="settings-summary">Optional auto-fill</span></summary>
    <div class="row"><div class="field"><label>Pay Location No.</label><input id="ps3971PayLocation"></div><div class="field"><label>D/A Code</label><input id="ps3971DaCode"></div><div class="field"><label>Reachable at / phone</label><input id="ps3971Contact"></div></div>
    <label class="inline-check"><input id="ps3971DoNotCall" type="checkbox"> Default to "Do not call"</label>
    <div class="footer-note">Name, EIN, installation, schedule, punches, leave type, and FMLA case are pulled from existing TourClicks records. These optional fields fill the remaining employee-side boxes.</div>
    <button class="btn no-print" id="save3971Defaults" type="button">Save 3971 defaults</button>`;
  const dataPanel=document.querySelector('#settings .settings-panel:last-of-type');
  if(dataPanel)dataPanel.before(panel);else grid.append(panel);
}

function ensure3971Panel(){
  if(document.getElementById('ps3971Panel'))return;
  const leaveCard=document.getElementById('leavePreview')?.closest('.card');if(!leaveCard)return;
  const panel=document.createElement('div');panel.id='ps3971Panel';panel.className='ps3971-panel';
  panel.innerHTML='<h3>PS Form 3971</h3><div class="smalltext muted">Generate a filled employee-side 3971 from a saved leave request, then save it or share it to Adobe, email, Drive, or another Android app.</div><div id="ps3971Records" class="ps3971-record-list"></div>';
  leaveCard.append(panel);
}

function ensure3971Dialog(){
  if(document.getElementById('ps3971Dialog'))return;
  const dialog=document.createElement('dialog');dialog.id='ps3971Dialog';
  dialog.innerHTML=`<div class="dialog-head row between"><span>PS Form 3971 preview</span><button class="header-icon-btn no-print" id="close3971Dialog" type="button" aria-label="Close">x</button></div>
  <div class="dialog-body">
    <div class="ps3971-preview-grid">
      <div class="field"><label>Employee name</label><input id="p3971EmployeeName"></div><div class="field"><label>EIN</label><input id="p3971Ein"></div>
      <div class="field wide"><label>Installation</label><input id="p3971Installation"></div>
      <div class="field"><label>Date submitted</label><input id="p3971Submitted" type="date"></div><div class="field"><label>Hours requested</label><input id="p3971Hours" type="number" step="0.01" min="0"></div>
      <div class="field"><label>From date / time</label><input id="p3971From"></div><div class="field"><label>Thru date / time</label><input id="p3971Thru"></div>
      <div class="field"><label>Scheduled reporting time</label><input id="p3971Scheduled"></div><div class="field"><label>Pay Location No.</label><input id="p3971PayLocation"></div>
      <div class="field"><label>D/A Code</label><input id="p3971DaCode"></div><div class="field"><label>Reachable at / phone</label><input id="p3971Contact"></div>
      <div class="field wide"><label>Leave / protection</label><input id="p3971Type" readonly></div>
      <div class="field wide"><label>FMLA case number</label><input id="p3971FmlaCase"></div>
      <label class="inline-check"><input id="p3971Late" type="checkbox"> Mark Late</label>
      <label class="inline-check"><input id="p3971DoNotCallPreview" type="checkbox"> Do not call</label>
      <label class="inline-check wide"><input id="p3971IncludeWork" type="checkbox" checked> Include recorded Begin Work / Lunch / End Work / Total Hours</label>
      <div class="field wide"><label>Remarks</label><textarea id="p3971Remarks" placeholder="Do not enter medical information."></textarea></div>
    </div>
    <div class="ps3971-filename" id="p3971Filename"></div>
    <div class="ps3971-privacy">PS Form 3971 states that medical information should not be entered in Remarks. TourClicks leaves employee and supervisor signature/official-action fields blank for signing and management action.</div>
    <div class="ps3971-preview-actions no-print"><button class="btn" id="save3971Pdf" type="button">Save PDF</button><button class="btn secondary" id="share3971Pdf" type="button">Share / email PDF</button><button class="btn outline" id="cancel3971" type="button">Cancel</button></div>
  </div>`;
  document.body.append(dialog);
}

function syncTimePair(clockId,uspsId,source,callback){
  const clock=document.getElementById(clockId),usps=document.getElementById(uspsId);if(!clock||!usps)return null;
  let value='';
  if(source==='usps'){
    value=uspsToClock(usps.value);
    if(usps.value.trim()&&!value){usps.classList.add('field-error');return null}
    usps.classList.remove('field-error');clock.value=value?formatClock(value):'';
  }else{
    value=parseClockText(clock.value);
    if(clock.value.trim()&&!value){clock.classList.add('field-error');return null}
    clock.classList.remove('field-error');usps.value=value?formatUspsFromClock(value):'';
  }
  if(callback)callback();return value||'';
}

function pairValue(clockId,uspsId){
  const c=document.getElementById(clockId),u=document.getElementById(uspsId);if(!c||!u)return'';
  if(c.value.trim()){const v=parseClockText(c.value);return v||null}
  if(u.value.trim()){const v=uspsToClock(u.value);return v||null}
  return'';
}

function intervalHours(from,to){
  const a=minutesOf(from),b=minutesOf(to);if(a==null||b==null)return null;return Math.max(0,canonicalAfter(b,a)-a)/60;
}

function updatePartialStatus(){
  const from=pairValue('leaveFromClock','leaveFromUsps'),thru=pairValue('leaveThruClock','leaveThruUsps'),status=document.getElementById('partialLeaveStatus');
  if(from===null||thru===null){status.textContent='One of the interval times is not valid.';status.className='partial-leave-status bad';return}
  if(!from&&!thru){status.textContent='Optional. Leave both times blank for full-day or multi-day hour entries.';status.className='partial-leave-status';return}
  if(!from||!thru){status.textContent='Enter both From and Thru for a timed partial-day request.';status.className='partial-leave-status bad';return}
  const hours=intervalHours(from,thru);status.textContent=`Interval: ${formatClock(from)} to ${formatClock(thru)} | ${hours.toFixed(2)} h`;status.className='partial-leave-status good';
}

function updatePartialCalculator(){
  const from=pairValue('calcLeaveFromClock','calcLeaveFromUsps'),thru=pairValue('calcLeaveThruClock','calcLeaveThruUsps'),out=document.getElementById('calcPartialLeaveHours');
  if(!from||!thru||from===null||thru===null){out.textContent='--';return}
  out.textContent=`${intervalHours(from,thru).toFixed(2)} h`;
}

function bindPartialLeaveEvents(){
  for(const spec of [['leaveFromClock','leaveFromUsps'],['leaveThruClock','leaveThruUsps']]){
    document.getElementById(spec[0])?.addEventListener('change',()=>syncTimePair(spec[0],spec[1],'clock',updatePartialStatus));
    document.getElementById(spec[1])?.addEventListener('change',()=>syncTimePair(spec[0],spec[1],'usps',updatePartialStatus));
  }
  for(const spec of [['calcLeaveFromClock','calcLeaveFromUsps'],['calcLeaveThruClock','calcLeaveThruUsps']]){
    document.getElementById(spec[0])?.addEventListener('change',()=>syncTimePair(spec[0],spec[1],'clock',updatePartialCalculator));
    document.getElementById(spec[1])?.addEventListener('change',()=>syncTimePair(spec[0],spec[1],'usps',updatePartialCalculator));
  }
  document.getElementById('copyPartialLeaveToEntry')?.addEventListener('click',()=>{
    const from=pairValue('calcLeaveFromClock','calcLeaveFromUsps'),thru=pairValue('calcLeaveThruClock','calcLeaveThruUsps');
    if(!from||!thru||from===null||thru===null)return alert('Enter a valid From and Thru time first.');
    document.getElementById('leaveFromClock').value=formatClock(from);document.getElementById('leaveFromUsps').value=formatUspsFromClock(from);
    document.getElementById('leaveThruClock').value=formatClock(thru);document.getElementById('leaveThruUsps').value=formatUspsFromClock(thru);
    const selected=document.getElementById('workDate')?.value||todayIso();document.getElementById('leaveStart').value=selected;document.getElementById('leaveEnd').value=selected;updatePartialStatus();switchView('leave');
  });
  const preview=document.getElementById('previewLeave'),save=document.getElementById('addLeave');
  preview?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();buildPartialAwareLeavePreview()},true);
  save?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();savePartialAwareLeavePreview()},true);
}

function canonicalNear(raw,anchor){
  let v=raw;if(anchor==null)return v;
  while(v<anchor-720)v+=1440;while(v>anchor+720)v-=1440;return v;
}

function leaveWorkOverlapMinutes(date,fromTime,thruTime){
  const day=state.days[date];if(!day||!fromTime||!thruTime)return 0;const c=calcDay(day),anchor=minutesOf(day.schedStart)??minutesOf(day.beginTour),raw=minutesOf(fromTime);if(raw==null)return 0;const a=canonicalNear(raw,anchor),b=canonicalAfter(minutesOf(thruTime),a);if(b==null)return 0;let total=0;for(const [x,y] of c.segments||[])total+=overlap(a,b,x,y);return total;
}

function buildPartialAwareLeavePreview(){
  const start=document.getElementById('leaveStart').value,end=document.getElementById('leaveEnd').value,daily=Number(document.getElementById('leaveDailyHours').value||0),markOff=document.getElementById('markOffUnavailable').checked;
  if(!start||!end||start>end)return alert('Choose a valid start and end date.');if(dateDiff(end,start)>120)return alert('Limit one leave entry to 121 calendar days.');
  const from=pairValue('leaveFromClock','leaveFromUsps'),thru=pairValue('leaveThruClock','leaveThruUsps'),timed=Boolean(from||thru);
  if(from===null||thru===null)return alert('Correct the partial leave time fields.');
  if(timed&&(!from||!thru))return alert('Enter both From and Thru, or leave both blank.');
  if(timed&&start!==end)return alert('A timed partial-day interval applies to one calendar date. Save each separate partial interval as its own request.');
  const timedHours=timed?intervalHours(from,thru):null;if(timed&&(!isFinite(timedHours)||timedHours<=0))return alert('The partial leave interval must be greater than zero.');
  let rows='';
  for(let d=parseDate(start);d<=parseDate(end);d=addDays(d,1)){
    const date=isoDate(d),scheduled=scheduledHoursForDate(date),day=state.days[date],worked=day?calcDay(day).worked:null,remaining=worked==null?Math.min(daily,scheduled):Math.max(0,scheduled-worked/60),off=scheduled<=0;
    const hours=timed?timedHours:(off?0:remaining),overlapMinutes=timed?leaveWorkOverlapMinutes(date,from,thru):0;
    rows+=`<tr data-date="${date}" data-off="${off?'1':'0'}" data-from="${timed?html(from):''}" data-thru="${timed?html(thru):''}"><td>${date}<br><span class="smalltext muted">${d.toLocaleDateString(undefined,{weekday:'long'})}</span></td><td>${off?'<span class="status-pill status-off">Nonscheduled</span>':`<span class="status-pill status-work">Scheduled ${scheduled.toFixed(2)} h</span>`}${timed?`<div class="interval-readout">${formatClock(from)} - ${formatClock(thru)}</div>`:''}${overlapMinutes>.5?`<span class="partial-row-warning">Review: ${Math.round(overlapMinutes)} min overlaps recorded work punches.</span>`:''}</td><td><input class="leave-row-hours" type="number" min="0" step="0.01" value="${hours.toFixed(2)}" ${timed?'readonly':''} ${off?'disabled':''}></td><td><input class="leave-row-unavailable" type="checkbox" ${off&&markOff?'checked':''}></td></tr>`;
  }
  document.getElementById('leavePreview').innerHTML=`<table><tr><th>Date</th><th>Schedule / interval</th><th>Leave hours</th><th>Unavailable</th></tr>${rows}</table><div class="footer-note">Timed leave keeps its From/Thru interval for the Today ribbon, reports, and PS Form 3971. A warning means the leave interval overlaps existing work punches; TourClicks does not silently change those punches.</div>`;leavePreviewBuilt=true;
}

function savePartialAwareLeavePreview(){
  if(!leavePreviewBuilt||!document.querySelector('#leavePreview tr[data-date]'))buildPartialAwareLeavePreview();
  const rows=[...document.querySelectorAll('#leavePreview tr[data-date]')];if(!rows.length)return;
  const protection=document.getElementById('leaveProtection').value,caseId=document.getElementById('leaveCase').value;if(String(protection).startsWith('fmla')&&!caseId)return alert('Select the linked FMLA case for an FMLA entry.');
  const reason=document.getElementById('leaveReason').value,charge=document.getElementById('leaveCharge').value,code=document.getElementById('leaveCode').value.trim(),note=document.getElementById('leaveNote').value.trim(),groupId=uid(),records=[];
  for(const tr of rows){const hours=Number(tr.querySelector('.leave-row-hours').value||0),unavailable=tr.querySelector('.leave-row-unavailable').checked,date=tr.dataset.date,off=tr.dataset.off==='1',fromTime=tr.dataset.from||'',thruTime=tr.dataset.thru||'';if(off&&hours>0)return alert(`${date} is a nonscheduled day. Leave hours cannot be added to that date.`);if(hours>0||unavailable)records.push({id:uid(),groupId,date,hours,unavailable,reason,charge,hoursCharge:charge,protection,caseId,code,note,fromTime,thruTime,intervalVersion:fromTime&&thruTime?1:0,createdAt:new Date().toISOString()})}
  if(!records.length)return alert('The preview has no leave hours or unavailable dates to save.');
  const warn=prospectiveLeaveWarning(records);if(warn.negative&&!confirm(`This request projects a negative leave balance. Annual leave: ${warn.alAfter.toFixed(2)}. Sick leave: ${warn.slAfter.toFixed(2)}. Save it and mark the balance red?`))return;
  state.leaves.push(...records);document.getElementById('leaveNote').value='';document.getElementById('leavePreview').innerHTML='';for(const id of ['leaveFromClock','leaveFromUsps','leaveThruClock','leaveThruUsps'])document.getElementById(id).value='';leavePreviewBuilt=false;queueSave();renderLeave();renderCalendar();renderToday();if(warn.negative)alert('Saved. The projected negative balance is shown in red.');
}

function clockFromMinute(value){let total=Math.round(value*60);total=((total%86400)+86400)%86400;const h=Math.floor(total/3600);total%=3600;const m=Math.floor(total/60),s=total%60;return `${pad(h)}:${pad(m)}:${pad(s)}`}
function minuteLabel(value){return formatClock(clockFromMinute(value)).replace(/:00 (?=[AP]M$)/,' ')}
function currentCanonical(anchor){const d=new Date(),raw=d.getHours()*60+d.getMinutes()+d.getSeconds()/60;return canonicalNear(raw,anchor)}

function liveDaySegments(day,date){
  const b=minutesOf(day.beginTour);if(b==null)return{work:[],lunch:null,workedMinutes:0};
  const anchor=b,o=minutesOf(day.outLunch),i=minutesOf(day.inLunch),e=minutesOf(day.endTour),isToday=date===todayIso(),now=isToday?currentCanonical(anchor):null;
  const work=[];let lunch=null;
  if(o!=null){const oa=canonicalAfter(o,anchor);if(oa>=anchor)work.push([anchor,oa]);if(i!=null){const ia=canonicalAfter(i,oa);const end=e!=null?canonicalAfter(e,ia):now!=null&&now>=ia?now:null;if(end!=null&&end>=ia)work.push([ia,end]);lunch=[oa,ia]}else if(now!=null&&now>=oa){lunch=[oa,now]}}
  else {const end=e!=null?canonicalAfter(e,anchor):now!=null&&now>=anchor?now:null;if(end!=null)work.push([anchor,end])}
  return{work,lunch,workedMinutes:work.reduce((s,[a,z])=>s+Math.max(0,z-a),0)};
}

function premiumMinutesForRibbon(day,date,workedMinutes){
  if(workedMinutes<=0)return{regular:0,ot:0,pot:0};
  const hours=workedMinutes/60,isOff=day.status==='off',exStart=state.settings.penaltyExclusionStart||'',exEnd=state.settings.penaltyExclusionEnd||'',excluded=Boolean(exStart&&exEnd&&date>=exStart&&date<=exEnd);let regular,ot,pot;
  if(isOff){regular=0;ot=Math.min(hours,8);pot=Math.max(0,hours-8)}else{regular=Math.min(hours,8);ot=Math.min(Math.max(0,hours-8),2);pot=Math.max(0,hours-10)}
  if(excluded&&pot>0){ot+=pot;pot=0}
  if(day.premiumOverride){ot=Math.max(0,Number(day.regularOt||0));pot=Math.max(0,Number(day.penaltyOt||0));regular=Math.max(0,hours-ot-pot)}
  return{regular:regular*60,ot:ot*60,pot:pot*60};
}

function allocateWork(work,totals){
  let ot=totals.ot,pot=totals.pot;const out=[];
  for(let idx=work.length-1;idx>=0;idx--){let [a,b]=work[idx],end=b;const potTake=Math.min(pot,Math.max(0,end-a));if(potTake>0){out.push({kind:'pot',start:end-potTake,end});end-=potTake;pot-=potTake}const otTake=Math.min(ot,Math.max(0,end-a));if(otTake>0){out.push({kind:'ot',start:end-otTake,end});end-=otTake;ot-=otTake}if(end>a)out.push({kind:'regular',start:a,end})}
  return out.reverse();
}

function timedLeavesForDate(date,anchor){
  const list=[];for(const l of state.leaves.filter(x=>x.date===date&&Number(x.hours||0)>0)){if(!l.fromTime||!l.thruTime)continue;const raw=minutesOf(l.fromTime);if(raw==null)continue;const a=canonicalNear(raw,anchor),rawEnd=minutesOf(l.thruTime),b=rawEnd==null?null:canonicalAfter(rawEnd,a);if(b==null)continue;list.push({kind:'leave',start:a,end:b,leave:l})}return list;
}

function intersectionMinutes(a,b,segments){let total=0;for(const s of segments)total+=overlap(a,b,s.start,s.end);return total}

function renderChronologicalGlance(){
  const el=document.getElementById('dailyTimeGlance');if(!el)return;const date=document.getElementById('workDate').value||todayIso(),day=getDay(date),leaveRecords=state.leaves.filter(l=>l.date===date&&Number(l.hours||0)>0),totalLeave=leaveRecords.reduce((s,l)=>s+Number(l.hours||0),0);
  const metric=document.getElementById('totalLeaveMetricValue');if(metric)metric.textContent=`${totalLeave.toFixed(2)} h`;
  const scheduleStart=minutesOf(day.schedStart),bt=minutesOf(day.beginTour),anchor=scheduleStart??bt??0,live=liveDaySegments(day,date),prem=premiumMinutesForRibbon(day,date,live.workedMinutes),workSegments=allocateWork(live.work,prem),leaves=timedLeavesForDate(date,anchor),timedLeaveHours=leaves.reduce((s,x)=>s+(x.end-x.start)/60,0),untimedLeave=Math.max(0,totalLeave-timedLeaveHours);
  const conflictMinutes=leaves.reduce((s,l)=>s+intersectionMinutes(l.start,l.end,workSegments),0);for(const l of leaves)l.conflict=intersectionMinutes(l.start,l.end,workSegments)>.5;
  const items=[...workSegments];if(live.lunch)items.push({kind:'lunch',start:live.lunch[0],end:live.lunch[1]});items.push(...leaves);
  let ss=scheduleStart,rawSe=minutesOf(day.schedEnd),se=ss!=null&&rawSe!=null?canonicalAfter(rawSe,ss):null;
  let min=ss,max=se;for(const x of items){min=min==null?x.start:Math.min(min,x.start);max=max==null?x.end:Math.max(max,x.end)}
  if(date===todayIso()&&bt!=null&&!day.endTour){const now=currentCanonical(anchor);min=min==null?now:Math.min(min,now);max=max==null?now:Math.max(max,now)}
  if(min==null||max==null){el.innerHTML='<div class="tc-glance-card"><div class="tc-glance-head"><div><div class="tc-glance-title">At-a-glance time composition</div><div class="tc-glance-date">'+date+'</div></div></div><div class="tc-glance-note">Enter punches or leave to build the chronological day ribbon.</div></div>';return}
  if(max-min<60)max=min+60;const span=max-min,pct=v=>Math.max(0,Math.min(100,(v-min)/span*100));
  const ordered=[...items].sort((a,b)=>a.start-b.start||a.end-b.end);const segmentHtml=ordered.map(x=>`<div class="tc-ribbon-segment ${x.kind}${x.conflict?' conflict':''}" style="left:${pct(x.start).toFixed(3)}%;width:${Math.max(.18,pct(x.end)-pct(x.start)).toFixed(3)}%" title="${x.kind}: ${minuteLabel(x.start)} - ${minuteLabel(x.end)}"></div>`).join('');
  const six=bt==null?null:canonicalNear(bt,anchor)+360,sixHtml=six!=null&&six>=min&&six<=max?`<div class="tc-six-hour-marker" style="left:${pct(six).toFixed(3)}%"></div>`:'';const now=date===todayIso()?currentCanonical(anchor):null,nowHtml=now!=null&&now>=min&&now<=max?`<div class="tc-now-marker" style="left:${pct(now).toFixed(3)}%"></div>`:'';
  const lunchMinutes=live.lunch?live.lunch[1]-live.lunch[0]:0,accounted=Math.max(0,live.workedMinutes/60+totalLeave-conflictMinutes/60),legend=[];if(prem.regular>0)legend.push(['regular','Regular',prem.regular/60]);if(totalLeave>0)legend.push(['leave','Leave',totalLeave]);if(lunchMinutes>0)legend.push(['lunch','Lunch',lunchMinutes/60]);if(prem.ot>0)legend.push(['ot','OT',prem.ot/60]);if(prem.pot>0)legend.push(['pot','Penalty OT',prem.pot/60]);
  let note='The ribbon is chronological. Blank track means no recorded work, lunch, or timed leave for that interval.';if(untimedLeave>.005)note+=` ${untimedLeave.toFixed(2)} h of older/hour-only leave is included in Total leave but cannot be positioned on the ribbon.`;if(conflictMinutes>.5)note+=` Review ${Math.round(conflictMinutes)} min where timed leave overlaps recorded work punches; TourClicks did not alter either record.`;
  el.innerHTML=`<div class="tc-glance-card"><div class="tc-glance-head"><div><div class="tc-glance-title">At-a-glance time composition</div><div class="tc-glance-date">${date}</div></div><div class="tc-glance-total">${accounted.toFixed(2)} accounted hours<br>${lunchMinutes?Math.round(lunchMinutes)+' min lunch':'No lunch recorded'}</div></div><div class="tc-ribbon-wrap"><div class="tc-ribbon-track">${segmentHtml}${sixHtml}${nowHtml}</div><div class="tc-time-scale"><span>${minuteLabel(min)}</span><span>${minuteLabel(max)}</span></div></div><div class="tc-time-legend">${legend.map(([kind,label,value])=>`<span><i class="tc-swatch ${kind}"></i>${label} ${value.toFixed(2)} h</span>`).join('')}</div><div class="tc-glance-note${conflictMinutes>.5?' warn':''}">${html(note)}</div></div>`;
}

function groupRecords(leave){return state.leaves.filter(x=>(leave.groupId&&x.groupId===leave.groupId)||(!leave.groupId&&x.id===leave.id)).sort((a,b)=>a.date.localeCompare(b.date))}
function uniqueLeaveGroups(){const seen=new Set(),out=[];for(const l of [...state.leaves].filter(x=>Number(x.hours||0)>0).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))){const key=l.groupId||l.id;if(seen.has(key))continue;seen.add(key);out.push({key,first:l,records:groupRecords(l)})}return out}
function requestNumberFor(group){const firstDate=group.records[0]?.date||group.first.date,groups=uniqueLeaveGroups().filter(g=>(g.records[0]?.date||g.first.date)===firstDate).sort((a,b)=>String(a.first.createdAt).localeCompare(String(b.first.createdAt)));return Math.max(1,groups.findIndex(g=>g.key===group.key)+1)}
function fileToken(value,hyphenSpaces=false){let s=String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 _-]/g,'').trim();s=s.replace(/\s+/g,hyphenSpaces?'-':'-').replace(/-+/g,'-');return s||'Unknown'}
function leaveTypeToken(l){const map={annual:'Annual',sick:'Sick',lwop:'LWOP','union-lwop':'Union-LWOP','wounded-warrior':'Wounded-Warrior',military:'Military','military-lwop':'Military-LWOP',holiday:'Holiday',admin:'Administrative',other:'Other',none:'No-Leave'};let token=map[leaveCharge(l)]||fileToken(leaveCharge(l));if(String(leaveProtection(l)||'').startsWith('fmla'))token+='-FMLA';return token}
function filenameForGroup(group){const p=state.settings.profile||{},first=fileToken(p.firstName),last=fileToken(p.lastName,true),ein=String(p.ein||'').replace(/\D/g,'')||'NoEIN',date=group.records[0]?.date||group.first.date,type=leaveTypeToken(group.first),n=String(requestNumberFor(group)).padStart(2,'0');return `PS3971_${first}_${last}_${ein}_${date}_${type}_${n}.pdf`}
function usDate(iso){if(!iso)return'';const [y,m,d]=iso.split('-');return `${m}/${d}/${y}`}
function fullEmployeeNameFor3971(){const p=state.settings.profile||{},mi=p.middleInitial?` ${p.middleInitial}.`:'';return `${p.lastName||''}, ${p.firstName||''}${mi}`.trim().replace(/^,\s*/, '')}

function render3971Panel(){
  const target=document.getElementById('ps3971Records');if(!target)return;const groups=uniqueLeaveGroups().slice(0,12);
  if(!groups.length){target.innerHTML='<div class="smalltext muted">Save a leave request first. Its 3971 action will appear here.</div>';return}
  target.innerHTML=groups.map(g=>{const a=g.records[0],z=g.records[g.records.length-1],hours=g.records.reduce((s,l)=>s+Number(l.hours||0),0),range=a.date===z.date?a.date:`${a.date} to ${z.date}`,timed=a.fromTime&&z.thruTime?` | ${formatClock(a.fromTime)}-${formatClock(z.thruTime)}`:'';return `<div class="ps3971-record" data-3971-group="${html(g.key)}"><div class="ps3971-record-head"><div><div class="ps3971-record-title">${html(leaveTypeToken(a))}</div><div class="ps3971-record-meta">${range}${timed} | ${hours.toFixed(2)} h</div></div><span class="tag">${String(requestNumberFor(g)).padStart(2,'0')}</span></div><div class="ps3971-record-actions"><button class="btn small secondary" type="button" data-generate-3971="${html(g.key)}">Preview 3971</button></div></div>`}).join('');
}

function ensure3971SettingsValues(){const s=state.settings.ps3971||{};for(const [id,key] of [['ps3971PayLocation','payLocation'],['ps3971DaCode','daCode'],['ps3971Contact','contact']]){const el=document.getElementById(id);if(el)el.value=s[key]||''}const no=document.getElementById('ps3971DoNotCall');if(no)no.checked=Boolean(s.doNotCall)}

function groupByKey(key){return uniqueLeaveGroups().find(g=>g.key===key)}
function inferLate(group,day){const first=group.records[0];if(!first.fromTime||!first.thruTime||!day?.beginTour||!day?.schedStart)return false;const ss=minutesOf(day.schedStart),bt=minutesOf(day.beginTour),lf=minutesOf(first.fromTime),lt=minutesOf(first.thruTime);if([ss,bt,lf,lt].some(v=>v==null))return false;const btA=canonicalAfter(bt,ss),lfA=canonicalNear(lf,ss),ltA=canonicalAfter(lt,lfA);return btA>ss+.5&&Math.abs(lfA-ss)<=2&&Math.abs(ltA-btA)<=2}

function open3971Preview(key){
  const group=groupByKey(key);if(!group)return;active3971GroupId=key;const p=state.settings.profile||{},s=state.settings.ps3971||{},first=group.records[0],last=group.records[group.records.length-1],day=state.days[first.date]||getDay(first.date),caseRec=state.fmlaCases.find(c=>c.id===first.caseId),hours=group.records.reduce((sum,l)=>sum+Number(l.hours||0),0),single=first.date===last.date;
  document.getElementById('p3971EmployeeName').value=fullEmployeeNameFor3971();document.getElementById('p3971Ein').value=p.ein||'';document.getElementById('p3971Installation').value=p.installation||'';document.getElementById('p3971Submitted').value=todayIso();document.getElementById('p3971Hours').value=hours.toFixed(2);
  document.getElementById('p3971From').value=`${usDate(first.date)}${first.fromTime?' '+formatUspsFromClock(first.fromTime):''}`;document.getElementById('p3971Thru').value=`${usDate(last.date)}${last.thruTime?' '+formatUspsFromClock(last.thruTime):''}`;document.getElementById('p3971Scheduled').value=single&&day?.schedStart?formatUspsFromClock(day.schedStart):'';document.getElementById('p3971PayLocation').value=s.payLocation||'';document.getElementById('p3971DaCode').value=first.code||s.daCode||'';document.getElementById('p3971Contact').value=s.contact||'';document.getElementById('p3971Type').value=leaveDisplay(first);document.getElementById('p3971FmlaCase').value=caseRec?.reference||'';document.getElementById('p3971Remarks').value=first.note||'';document.getElementById('p3971Late').checked=inferLate(group,day);document.getElementById('p3971DoNotCallPreview').checked=Boolean(s.doNotCall);document.getElementById('p3971IncludeWork').checked=single&&Boolean(day?.beginTour||day?.endTour);update3971Filename();
  const dialog=document.getElementById('ps3971Dialog');if(!dialog.open)dialog.showModal();
}

function update3971Filename(){const group=groupByKey(active3971GroupId);const el=document.getElementById('p3971Filename');if(group&&el)el.textContent=filenameForGroup(group)}
function selected3971Payload(){
  const group=groupByKey(active3971GroupId);if(!group)return null;const first=group.records[0],last=group.records[group.records.length-1],day=state.days[first.date]||getDay(first.date),c=day?calcDay(day):{},includeWork=document.getElementById('p3971IncludeWork').checked,caseRec=state.fmlaCases.find(x=>x.id===first.caseId);return{
    fileName:filenameForGroup(group),employeeName:document.getElementById('p3971EmployeeName').value.trim(),employeeId:document.getElementById('p3971Ein').value.trim(),dateSubmitted:usDate(document.getElementById('p3971Submitted').value),hoursRequested:Number(document.getElementById('p3971Hours').value||0).toFixed(2),installation:document.getElementById('p3971Installation').value.trim(),nonScheduledDay:day?.status==='off'?'Yes':'',payLocation:document.getElementById('p3971PayLocation').value.trim(),daCode:document.getElementById('p3971DaCode').value.trim(),fromDateTime:document.getElementById('p3971From').value.trim(),thruDateTime:document.getElementById('p3971Thru').value.trim(),scheduledReportingTime:document.getElementById('p3971Scheduled').value.trim(),contact:document.getElementById('p3971Contact').value.trim(),doNotCall:document.getElementById('p3971DoNotCallPreview').checked,charge:leaveCharge(first),protection:leaveProtection(first),reason:first.reason||'',otherType:leaveCharge(first)==='other'?(reasonLabels[first.reason]||first.reason||'Other'):'',remarks:document.getElementById('p3971Remarks').value.trim(),fmlaCaseNumber:document.getElementById('p3971FmlaCase').value.trim()||(caseRec?.reference||''),late:document.getElementById('p3971Late').checked,includeWork,revisedScheduleDate:includeWork?usDate(first.date):'',beginWork:includeWork&&day?.beginTour?formatUspsFromClock(day.beginTour):'',lunchOut:includeWork&&day?.outLunch?formatUspsFromClock(day.outLunch):'',lunchIn:includeWork&&day?.inLunch?formatUspsFromClock(day.inLunch):'',endWork:includeWork&&day?.endTour?formatUspsFromClock(day.endTour):'',totalHours:includeWork&&c?.worked!=null?(Number(c.worked)/60).toFixed(2):'',fmlaNewCondition:false
  }
}

function invoke3971(action){const payload=selected3971Payload();if(!payload)return;const bridge=window.AndroidBridge;if(!bridge||typeof bridge[action]!=='function')return alert('PS Form 3971 PDF generation is available in the Android build.');try{bridge[action](JSON.stringify(payload));document.getElementById('ps3971Dialog').close()}catch(error){console.error(error);alert('TourClicks could not start the 3971 PDF action.')}}

function bind3971Events(){
  document.getElementById('save3971Defaults')?.addEventListener('click',()=>{state.settings.ps3971={payLocation:document.getElementById('ps3971PayLocation').value.trim(),daCode:document.getElementById('ps3971DaCode').value.trim(),contact:document.getElementById('ps3971Contact').value.trim(),doNotCall:document.getElementById('ps3971DoNotCall').checked};queueSave();alert('3971 defaults saved.')});
  document.getElementById('ps3971Panel')?.addEventListener('click',e=>{const b=e.target.closest('[data-generate-3971]');if(b)open3971Preview(b.dataset.generate3971)});
  document.getElementById('close3971Dialog')?.addEventListener('click',()=>document.getElementById('ps3971Dialog').close());document.getElementById('cancel3971')?.addEventListener('click',()=>document.getElementById('ps3971Dialog').close());document.getElementById('save3971Pdf')?.addEventListener('click',()=>invoke3971('save3971'));document.getElementById('share3971Pdf')?.addEventListener('click',()=>invoke3971('share3971'));
}

function wrapRenderers(){
  const priorToday=renderToday;renderToday=function(){priorToday();ensureTotalLeaveMetric();renderChronologicalGlance()};
  const priorLeave=renderLeave;renderLeave=function(){priorLeave();ensurePartialLeaveUi();ensure3971Panel();render3971Panel()};
  const priorSettings=renderSettings;renderSettings=function(){priorSettings();ensure3971Settings();ensure3971SettingsValues()};
}

function renderPatchViews(){ensure3971SettingsValues();render3971Panel();renderChronologicalGlance();updatePartialStatus();updatePartialCalculator()}

install();
})();
