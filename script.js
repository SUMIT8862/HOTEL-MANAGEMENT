// -----------------------
// Background slideshow
// -----------------------
const bgImages = ['bg1.jpg','bg2.jpg','bg3.jpg']; // put these images in same folder
let bgIndex = 0;
function changeBg(){
  document.body.style.backgroundImage = `url('${bgImages[bgIndex]}')`;
  bgIndex = (bgIndex + 1) % bgImages.length;
}
changeBg();
setInterval(changeBg, 6000); // change every 6 seconds

// -----------------------
// Predefined rooms dataset
// -----------------------
// Each room: number, floor, type, servicer assigned
const rooms = [
  {no:101, floor:1, type:'Standard', servicer:'Rohan'},
  {no:102, floor:1, type:'Standard', servicer:'Aman'},
  {no:103, floor:1, type:'Standard', servicer:'Priya'},
  {no:201, floor:2, type:'Deluxe', servicer:'Karan'},
  {no:202, floor:2, type:'Deluxe', servicer:'Rohan'},
  {no:301, floor:3, type:'Suite', servicer:'Priya'},
  {no:302, floor:3, type:'Suite', servicer:'Aman'}
];

// -----------------------
// Helpers: storage & id
// -----------------------
function getBookings(){ return JSON.parse(localStorage.getItem('hotelBookings')||'[]'); }
function saveBookings(b){ localStorage.setItem('hotelBookings', JSON.stringify(b)); }
function genBookingID(){
  return 'BKG-'+Date.now().toString().slice(-8)+'-'+Math.floor(Math.random()*900+100);
}

// -----------------------
// Login / Logout
// -----------------------
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
loginBtn.addEventListener('click', () => {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  if(u==='admin' && p==='123'){
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    refreshAll();
  } else {
    document.getElementById('loginMsg').innerText = 'Incorrect credentials (use admin / 123)';
  }
});
logoutBtn.addEventListener('click', () => {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
});

// -----------------------
// Tabs
// -----------------------
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(tp=>tp.classList.add('hidden'));
    document.getElementById(tab).classList.remove('hidden');
    if(tab==='dashboardTab') renderBookingsTable();
  });
});

// -----------------------
// Availability check (date overlap)
// -----------------------
function datesOverlap(aStart, aEnd, bStart, bEnd){
  // convert to time
  const A1 = new Date(aStart).getTime();
  const A2 = new Date(aEnd).getTime();
  const B1 = new Date(bStart).getTime();
  const B2 = new Date(bEnd).getTime();
  // if any invalid, treat as no overlap
  if(isNaN(A1) || isNaN(A2) || isNaN(B1) || isNaN(B2)) return false;
  return (A1 <= B2) && (B1 <= A2);
}

document.getElementById('checkAvailBtn').addEventListener('click', ()=>{
  const type = document.getElementById('availRoomType').value;
  const inD = document.getElementById('availIn').value;
  const outD = document.getElementById('availOut').value;
  if(!inD || !outD || new Date(inD) > new Date(outD)){
    alert('Please choose valid check-in and check-out dates.');
    return;
  }
  const all = getBookings();
  const candidate = rooms.filter(r=>r.type===type);
  const free = candidate.filter(r=>{
    // check if r is free for requested dates
    for(const b of all){
      if(b.roomNo===r.no && datesOverlap(b.checkIn, b.checkOut, inD, outD)){
        return false; // not free
      }
    }
    return true;
  });
  const resBox = document.getElementById('availResults');
  resBox.classList.remove('hidden');
  if(free.length===0){
    resBox.innerHTML = `<p>No ${type} rooms available for selected dates.</p>`;
  } else {
    resBox.innerHTML = `<p>${free.length} available ${type} room(s): ${free.map(r=>r.no).join(', ')}</p>`;
  }
});

// -----------------------
// Booking: check & assign
// -----------------------
const checkAssignBtn = document.getElementById('checkAndAssignBtn');
checkAssignBtn.addEventListener('click', ()=>{
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const type = document.getElementById('roomType').value;
  const servicer = document.getElementById('servicerSelect').value;
  const inD = document.getElementById('checkIn').value;
  const outD = document.getElementById('checkOut').value;

  if(!name || !phone || !inD || !outD){ alert('Please fill required fields.'); return; }
  if(new Date(inD) > new Date(outD)){ alert('Check-out must be after check-in.'); return; }

  const all = getBookings();
  const candidate = rooms.filter(r=>r.type===type);
  const free = candidate.filter(r=>{
    for(const b of all){
      if(b.roomNo===r.no && datesOverlap(b.checkIn, b.checkOut, inD, outD)) return false;
    }
    return true;
  });

  if(free.length===0){
    alert('No rooms of selected type are free for these dates. Try other dates or type.');
    return;
  }

  // assign first free room
  const room = free[0];
  const bookingID = genBookingID();

  document.getElementById('assignedText').innerText =
    `${room.no} (Floor ${room.floor}) — Servicer: ${room.servicer}`;

  document.getElementById('assignedID').innerText = bookingID;
  document.getElementById('assignedInfo').classList.remove('hidden');

  // store temporary assignment in DOM dataset for final save
  const assigned = {bookingID, name, phone, roomNo: room.no, floor: room.floor, type, servicer: room.servicer, checkIn: inD, checkOut: outD, paymentStatus: 'Pending', amount: getPrice(type)};
  document.getElementById('assignedInfo').dataset.temp = JSON.stringify(assigned);
});

// simple pricing
function getPrice(type){
  if(type==='Standard') return 1200;
  if(type==='Deluxe') return 2200;
  if(type==='Suite') return 4500;
  return 0;
}

// -----------------------
// Payment simulation
// -----------------------
document.getElementById('payBtn').addEventListener('click', ()=>{
  const d = document.getElementById('assignedInfo').dataset.temp;
  if(!d){ alert('Please assign a room first.'); return; }
  let assigned = JSON.parse(d);
  // simulate payment dialog
  const amt = assigned.amount;
  if(confirm(`Simulate payment of ₹${amt} for booking ${assigned.bookingID}? Click OK to mark as Paid.`)){
    assigned.paymentStatus = 'Paid';
    document.getElementById('assignedInfo').dataset.temp = JSON.stringify(assigned);
    alert('Payment marked as Paid (simulation).');
  }
});

// -----------------------
// Save booking permanently
// -----------------------
document.getElementById('confirmSaveBtn').addEventListener('click', ()=>{
  const d = document.getElementById('assignedInfo').dataset.temp;
  if(!d){ alert('No assigned booking to save.'); return; }
  let assigned = JSON.parse(d);
  // push to bookings
  const all = getBookings();
  all.push(assigned);
  saveBookings(all);
  document.getElementById('assignedInfo').classList.add('hidden');
  document.getElementById('bookingForm').reset();
  refreshAll();
  alert('Booking saved successfully.');
});

// -----------------------
// Render bookings table & manager actions
// -----------------------
function renderBookingsTable(){
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = '';
  const all = getBookings();
  // apply filters
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const typeFilter = document.getElementById('filterType').value;
  const payFilter = document.getElementById('filterPayment').value;

  const filtered = all.filter(b=>{
    if(typeFilter && b.type!==typeFilter) return false;
    if(payFilter && b.paymentStatus!==payFilter) return false;
    if(!q) return true;
    return (b.name.toLowerCase().includes(q) || b.phone.toLowerCase().includes(q) || b.bookingID.toLowerCase().includes(q));
  });

  filtered.forEach((b, i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.bookingID}</td>
      <td>${b.name}</td>
      <td>${b.phone}</td>
      <td>${b.roomNo}</td>
      <td>${b.floor}</td>
      <td>${b.type}</td>
      <td>${b.servicer}</td>
      <td>${b.checkIn}</td>
      <td>${b.checkOut}</td>
      <td>${b.paymentStatus}</td>
      <td>
        <button onclick="deleteBooking('${b.bookingID}')">Cancel</button>
        <button onclick="printReceipt('${b.bookingID}')">Receipt</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // update quick stats
  document.getElementById('totalBookings').innerText = all.length;
  const now = new Date();
  const occupied = all.filter(b => new Date(b.checkIn) <= now && new Date(b.checkOut) >= now).length;
  document.getElementById('occupiedRooms').innerText = occupied;
  document.getElementById('availableRooms').innerText = rooms.length - occupied;
}

// filters & search events
document.getElementById('searchBox').addEventListener('input', renderBookingsTable);
document.getElementById('filterType').addEventListener('change', renderBookingsTable);
document.getElementById('filterPayment').addEventListener('change', renderBookingsTable);
document.getElementById('clearFilters').addEventListener('click', ()=>{
  document.getElementById('searchBox').value='';
  document.getElementById('filterType').value='';
  document.getElementById('filterPayment').value='';
  renderBookingsTable();
});

// -----------------------
// delete booking (cancel)
// -----------------------
function deleteBooking(bookingID){
  if(!confirm('Cancel this booking?')) return;
  let all = getBookings();
  all = all.filter(b => b.bookingID !== bookingID);
  saveBookings(all);
  renderBookingsTable();
}

// -----------------------
// print receipt for one booking
// -----------------------
function printReceipt(bookingID){
  const all = getBookings();
  const b = all.find(x=>x.bookingID===bookingID);
  if(!b) { alert('Booking not found'); return; }
  const html = buildReceiptHTML(b);
  const area = document.getElementById('receiptPrintArea');
  area.innerHTML = html;
  area.classList.remove('hidden');
  window.print();
  area.classList.add('hidden');
}

function buildReceiptHTML(b){
  return `
    <div style="padding:20px; font-family:Arial; color:#000;">
      <h1 style="color:#bfa06d">Sunrise Grand Hotel</h1>
      <h2>Booking Receipt</h2>
      <p><b>Booking ID:</b> ${b.bookingID}</p>
      <p><b>Name:</b> ${b.name}</p>
      <p><b>Phone:</b> ${b.phone}</p>
      <p><b>Room:</b> ${b.roomNo} (Floor ${b.floor})</p>
      <p><b>Room Type:</b> ${b.type}</p>
      <p><b>Servicer:</b> ${b.servicer}</p>
      <p><b>Check-in:</b> ${b.checkIn}</p>
      <p><b>Check-out:</b> ${b.checkOut}</p>
      <p><b>Payment Status:</b> ${b.paymentStatus}</p>
      <hr>
      <p>Thank you for choosing Sunrise Grand Hotel.</p>
    </div>
  `;
}

// quick print all bookings
document.getElementById('printAllBtn').addEventListener('click', ()=>{
  const all = getBookings();
  let html = `<div style="font-family:Arial;color:#000;padding:20px"><h1 style="color:#bfa06d">All Bookings</h1>`;
  all.forEach(b=> html += `<div style="margin-bottom:8px">${b.bookingID} - ${b.name} - ${b.roomNo} - ${b.checkIn} to ${b.checkOut} - ${b.paymentStatus}</div>`);
  html += '</div>';
  const area = document.getElementById('receiptPrintArea');
  area.innerHTML = html;
  area.classList.remove('hidden');
  window.print();
  area.classList.add('hidden');
});

// export CSV
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const all = getBookings();
  if(all.length===0) { alert('No bookings to export'); return; }
  const rows = [
    ['BookingID','Name','Phone','RoomNo','Floor','Type','Servicer','CheckIn','CheckOut','Payment']
  ];
  all.forEach(b => rows.push([b.bookingID,b.name,b.phone,b.roomNo,b.floor,b.type,b.servicer,b.checkIn,b.checkOut,b.paymentStatus]));
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bookings.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// -----------------------
// Refresh main UI
// -----------------------
function refreshAll(){
  renderBookingsTable();
  // update available rooms stat
  document.getElementById('availableRooms').innerText = rooms.length - getBookings().filter(b=>{
    const now = new Date(); return new Date(b.checkIn) <= now && new Date(b.checkOut) >= now;
  }).length;
}

// initial render on load (if already logged in)
window.addEventListener('load', ()=>{
  if(localStorage.getItem('hotelBookings')===null) saveBookings([]); // init
  renderBookingsTable();
});
