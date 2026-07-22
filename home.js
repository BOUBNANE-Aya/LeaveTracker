<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
  import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
  import { getFirestore, collection, addDoc, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

  // 1. PASTE YOUR CONFIG HERE
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_DOMAIN.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_BUCKET.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // --- DATABASE STATE ---
  let globalRequests = [];
  window.getDb = function() { return { requests: globalRequests }; }

  async function fetchRequests() {
    const querySnapshot = await getDocs(collection(db, "requests"));
    globalRequests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // --- THEME LOGIC ---
  window.toggleTheme = function() {
    document.documentElement.classList.toggle('dark');
    const icon = document.getElementById('theme-icon');
    icon.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  }

  // --- AUTH LOGIC ---
  window.handleLogin = async function() {
    const email = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      await fetchRequests(); 
      
      // Update this email to whatever Admin email you created in Firebase
      if (email === 'admin@telus.com') { 
        window.switchScreen('login-screen', 'admin-screen');
        window.renderAdminDashboard();
      } else {
        window.switchScreen('login-screen', 'employee-screen');
        window.renderEmployeeDashboard();
      }
    } catch (error) {
      document.getElementById('login-error').classList.remove('hidden');
      console.error(error);
    }
  }

  window.logout = function() {
    signOut(auth).then(() => {
      document.getElementById('username').value = '';
      document.getElementById('password').value = '';
      document.getElementById('login-error').classList.add('hidden');
      window.switchScreen('employee-screen', 'login-screen');
      document.getElementById('admin-screen').classList.add('hidden');
    });
  }

  window.switchScreen = function(hideId, showId) {
    document.getElementById(hideId).classList.add('hidden');
    document.getElementById(showId).classList.remove('hidden');
  }

  // --- MODAL LOGIC ---
  window.openModal = function(reqId) {
    const dbData = window.getDb();
    const req = dbData.requests.find(r => r.id === reqId);
    if (!req) return;

    const modalBody = document.getElementById('modal-body');
    
    let statusBadge = `<span class="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700">Pending</span>`;
    if(req.status === 'Approved') statusBadge = `<span class="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border border-green-300 dark:border-green-700">Approved</span>`;
    if(req.status === 'Rejected') statusBadge = `<span class="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 border border-red-300 dark:border-red-700">Rejected</span>`;

    modalBody.innerHTML = `
      <div class="space-y-4">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="text-xl font-bold text-gray-900 dark:text-white">${req.name}</h4>
            <p class="text-sm text-telus-purple dark:text-telus-green font-semibold mt-1">${req.type}</p>
          </div>
          ${statusBadge}
        </div>
        
        <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Dates</p>
          <p class="text-gray-900 dark:text-white font-medium">${req.start} <span class="text-gray-400 mx-1">&rarr;</span> ${req.end}</p>
        </div>

        ${req.reason ? `
        <div class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Reason provided</p>
          <p class="text-gray-800 dark:text-gray-300 italic">"${req.reason}"</p>
        </div>` : ''}
      </div>
      
      ${req.status === 'Pending' ? `
      <div class="flex space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onclick="updateStatusFromModal('${req.id}', 'Rejected')" class="flex-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 py-2.5 rounded-lg border border-red-200 dark:border-red-800 font-bold transition hover:bg-red-50 dark:hover:bg-red-900/30">Reject</button>
        <button onclick="updateStatusFromModal('${req.id}', 'Approved')" class="flex-1 bg-telus-green text-white py-2.5 rounded-lg border border-telus-green font-bold transition hover:bg-opacity-90">Approve</button>
      </div>` : ''}
    `;

    const modal = document.getElementById('request-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('modal-active'), 10);
  }

  window.closeModal = function() {
    const modal = document.getElementById('request-modal');
    modal.classList.remove('modal-active');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }

  window.updateStatusFromModal = function(id, status) {
    window.updateStatus(id, status);
    window.closeModal();
  }

  // --- EMPLOYEE LOGIC ---
  window.renderEmployeeDashboard = function() {
    const selectedName = document.getElementById('employee-selector').value;
    const dbData = window.getDb();
    const myRequests = dbData.requests.filter(req => req.name === selectedName);
    const container = document.getElementById('my-requests-list');
    container.innerHTML = '';

    if (myRequests.length === 0) {
      container.innerHTML = `<div class="text-center py-8 px-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700"><p class="text-sm text-gray-500 font-medium">No requests found.</p></div>`;
      return;
    }

    myRequests.sort((a, b) => new Date(b.start) - new Date(a.start)).forEach(req => {
      let badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-200";
      if (req.status === "Approved") badgeColor = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/80 dark:text-green-200";
      if (req.status === "Rejected") badgeColor = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/80 dark:text-red-200";
      
      container.innerHTML += `
        <div class="border border-gray-200 dark:border-gray-700 p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <p class="font-bold">${req.start} <span class="text-gray-400 font-normal mx-1">to</span> ${req.end}</p>
            <span class="px-2.5 py-1 rounded-md border ${badgeColor} text-[10px] sm:text-xs font-bold uppercase">${req.status}</span>
          </div>
          <p class="text-sm"><span class="font-semibold text-telus-purple dark:text-telus-green">${req.type}</span> ${req.reason ? '— ' + req.reason : ''}</p>
        </div>`;
    });
  }

  window.submitRequest = async function() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const type = document.getElementById('leave-type').value;
    const reason = document.getElementById('leave-reason').value;
    const name = document.getElementById('employee-selector').value;
    
    if(!start || !end) return alert("⚠️ Please select both a start and end date.");
    if(start > end) return alert("⚠️ Start date cannot be after the end date.");

    try {
      await addDoc(collection(db, "requests"), {
        name: name,
        start: start,
        end: end,
        type: type,
        reason: reason,
        status: "Pending"
      });
      
      await fetchRequests(); 
      window.renderEmployeeDashboard(); 
      
      document.getElementById('start-date').value = '';
      document.getElementById('end-date').value = '';
      document.getElementById('leave-reason').value = '';
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  }

  // --- ADMIN CALENDAR LOGIC ---
  let calView = 'month';
  let viewDate = new Date();

  window.setCalendarView = function(view) {
    calView = view;
    window.renderAdminDashboard();
  }

  window.navigateCalendar = function(step) {
    if (calView === 'month') {
      viewDate.setMonth(viewDate.getMonth() + step);
    } else if (calView === 'week') {
      viewDate.setDate(viewDate.getDate() + (step * 7));
    } else if (calView === 'year') {
      viewDate.setFullYear(viewDate.getFullYear() + step);
    }
    window.renderAdminDashboard();
  }

  window.getPillColor = function(status) {
    if (status === "Approved") return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/80 dark:text-green-200 dark:border-green-700";
    return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/80 dark:text-yellow-200 dark:border-yellow-700";
  }

  window.renderAdminDashboard = function() {
    const dbData = window.getDb();
    
    const pending = dbData.requests.filter(req => req.status === "Pending");
    const listContainer = document.getElementById('pending-requests-list');
    listContainer.innerHTML = '';

    if (pending.length === 0) {
      listContainer.innerHTML = `<div class="text-center py-8 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700"><p class="text-gray-500 font-medium">All caught up! No pending requests.</p></div>`;
    }

    pending.forEach(req => {
      listContainer.innerHTML += `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center p-5 border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl shadow-sm">
          <div class="mb-4 md:mb-0 cursor-pointer" onclick="openModal('${req.id}')">
            <p class="font-bold text-lg hover:text-telus-purple transition">${req.name} <span class="font-medium text-sm text-gray-600 dark:text-gray-400 ml-2 py-0.5 px-2 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">${req.type}</span></p>
            <p class="text-gray-700 dark:text-gray-200 font-medium mt-2">📅 ${req.start} to ${req.end}</p>
          </div>
          <div class="flex space-x-3 w-full md:w-auto">
            <button onclick="updateStatus('${req.id}', 'Rejected')" class="flex-1 md:flex-none bg-white dark:bg-gray-800 text-red-600 px-5 py-2 rounded-lg border border-red-200 font-bold transition shadow-sm">Reject</button>
            <button onclick="updateStatus('${req.id}', 'Approved')" class="flex-1 md:flex-none bg-telus-green text-white px-5 py-2 rounded-lg font-bold transition shadow-sm">Approve</button>
          </div>
        </div>`;
    });

    ['week', 'month', 'year'].forEach(v => {
      const btn = document.getElementById(`btn-view-${v}`);
      if(v === calView) {
        btn.className = "px-4 py-1.5 rounded-md font-bold text-sm transition bg-white dark:bg-gray-700 text-telus-purple dark:text-telus-green shadow-sm";
      } else {
        btn.className = "px-4 py-1.5 rounded-md font-medium text-sm transition text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white";
      }
    });

    const container = document.getElementById('calendar-container');
    const title = document.getElementById('calendar-title');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    container.innerHTML = '';
    
    if (calView === 'month') {
      title.innerText = `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
      container.innerHTML = renderMonthlyGrid(viewDate, dbData.requests);
    } else if (calView === 'week') {
      title.innerText = `Week of ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
      container.innerHTML = renderWeeklyGrid(viewDate, dbData.requests);
    } else if (calView === 'year') {
      title.innerText = `${viewDate.getFullYear()}`;
      container.innerHTML = renderYearlyGrid(viewDate.getFullYear(), dbData.requests, monthNames);
    }
  }

  // --- CALENDAR GRID GENERATORS ---
  function getDaysRequests(dateStr, requests) {
    return requests.filter(req => req.start <= dateStr && req.end >= dateStr && req.status !== "Rejected");
  }

  function renderMonthlyGrid(dateObj, requests) {
    const year = dateObj.getFullYear(), month = dateObj.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `<div class="grid grid-cols-7 bg-gray-100 dark:bg-gray-900/80 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
      <div class="py-3 border-r border-gray-200 dark:border-gray-700">Mon</div><div class="py-3 border-r border-gray-200 dark:border-gray-700">Tue</div>
      <div class="py-3 border-r border-gray-200 dark:border-gray-700">Wed</div><div class="py-3 border-r border-gray-200 dark:border-gray-700">Thu</div>
      <div class="py-3 border-r border-gray-200 dark:border-gray-700">Fri</div><div class="py-3 border-r border-gray-200 dark:border-gray-700 opacity-60">Sat</div>
      <div class="py-3 opacity-60">Sun</div></div><div class="grid grid-cols-7 text-sm">`;

    for (let i = 0; i < startOffset; i++) {
      html += `<div class="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 calendar-cell"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isWeekend = new Date(year, month, day).getDay() % 6 === 0;
      const dayReqs = getDaysRequests(dateStr, requests);
      
      let reqsHtml = dayReqs.map(req => `<button onclick="openModal('${req.id}')" class="w-full text-left text-[10px] sm:text-[11px] px-1.5 py-1 mb-1 rounded border ${window.getPillColor(req.status)} truncate shadow-sm font-semibold hover:opacity-80 transition cursor-pointer">${req.name}</button>`).join('');
      
      html += `<div class="border-b border-r border-gray-200 dark:border-gray-700 ${isWeekend ? 'bg-gray-100/50 dark:bg-gray-900/60' : 'bg-white dark:bg-gray-800'} p-1.5 calendar-cell flex flex-col hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <span class="text-right ${isWeekend ? 'text-gray-400' : 'text-gray-900 dark:text-gray-200'} text-xs font-bold mb-1.5">${day}</span>
        <div class="flex-grow space-y-1">${reqsHtml}</div>
      </div>`;
    }
    
    const totalCells = startOffset + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remaining; i++) html += `<div class="border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 calendar-cell"></div>`;
    
    return html + `</div>`;
  }

  function renderWeeklyGrid(dateObj, requests) {
    let d = new Date(dateObj);
    let day = d.getDay();
    let diff = d.getDate() - day + (day === 0 ? -6 : 1);
    let monday = new Date(d.setDate(diff));

    let html = `<div class="grid grid-cols-7 text-sm">`;
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      let currDay = new Date(monday);
      currDay.setDate(monday.getDate() + i);
      
      const dateStr = `${currDay.getFullYear()}-${String(currDay.getMonth() + 1).padStart(2, '0')}-${String(currDay.getDate()).padStart(2, '0')}`;
      const dayReqs = getDaysRequests(dateStr, requests);
      const isWeekend = i >= 5;

      let reqsHtml = dayReqs.map(req => `<button onclick="openModal('${req.id}')" class="w-full text-left text-xs px-2 py-1.5 mb-1.5 rounded border ${window.getPillColor(req.status)} truncate shadow-sm font-semibold hover:opacity-80 transition cursor-pointer">${req.name}<br><span class="font-normal opacity-80 text-[10px]">${req.type}</span></button>`).join('');

      html += `<div class="border-r border-gray-200 dark:border-gray-700 ${isWeekend ? 'bg-gray-100/50 dark:bg-gray-900/60' : 'bg-white dark:bg-gray-800'} p-2 calendar-cell-week flex flex-col hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <div class="text-center pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
          <span class="block text-xs font-bold text-gray-500 uppercase">${dayNames[i]}</span>
          <span class="block text-lg font-bold ${isWeekend ? 'text-gray-400' : 'text-gray-900 dark:text-white'}">${currDay.getDate()}</span>
        </div>
        <div class="flex-grow space-y-1">${reqsHtml}</div>
      </div>`;
    }
    return html + `</div>`;
  }

  function renderYearlyGrid(year, requests, monthNames) {
    let html = `<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-700">`;
    
    for(let m = 0; m < 12; m++) {
      html += `<div class="bg-white dark:bg-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition cursor-pointer" onclick="viewDate.setMonth(${m}); setCalendarView('month');">
        <h3 class="text-center font-bold text-sm mb-3 text-telus-purple dark:text-telus-green">${monthNames[m]}</h3>
        <div class="grid grid-cols-7 gap-1 text-center">`;
        
      ['M','T','W','T','F','S','S'].forEach(d => html += `<div class="text-[9px] font-bold text-gray-400">${d}</div>`);
      
      let firstDay = new Date(year, m, 1).getDay();
      let startOffset = firstDay === 0 ? 6 : firstDay - 1;
      let daysInMonth = new Date(year, m + 1, 0).getDate();
      
      for (let i = 0; i < startOffset; i++) html += `<div></div>`;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayReqs = getDaysRequests(dateStr, requests);
        
        let indicator = '';
        if(dayReqs.length > 0) {
          let color = "bg-green-400";
          if (dayReqs.some(r => r.status === 'Pending')) color = "bg-yellow-400";
          indicator = `<div class="w-1.5 h-1.5 rounded-full ${color} mx-auto mt-0.5 shadow-sm"></div>`;
        }
        
        html += `<div class="text-[10px] py-0.5 text-gray-700 dark:text-gray-300 font-medium">${day}${indicator}</div>`;
      }
      html += `</div></div>`;
    }
    return html + `</div>`;
  }

  window.updateStatus = async function(id, newStatus) {
    try {
      const requestRef = doc(db, "requests", id);
      await updateDoc(requestRef, {
        status: newStatus
      });
      
      await fetchRequests(); 
      window.renderAdminDashboard(); 
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  }
</script>
