/* =========================================================
   SILVORA ADMIN DASHBOARD
========================================================= */

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

let allBookings = [];
let allRooms = [];
let allMemberships = [];


/* =========================================================
   ELEMENTS
========================================================= */

const loginScreen =
  document.getElementById("adminLogin");

const adminApp =
  document.getElementById("adminApp");

const loginForm =
  document.getElementById("loginForm");

const loginMessage =
  document.getElementById("loginMessage");

const adminUsernameInput =
  document.getElementById("adminUsername");

const adminPasswordInput =
  document.getElementById("adminPassword");

const adminUsernameDisplay =
  document.getElementById("adminUsernameDisplay");

const logoutButton =
  document.getElementById("logoutButton");


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener("submit", function (event) {

  event.preventDefault();

  const username =
    adminUsernameInput.value.trim();

  const password =
    adminPasswordInput.value;

  if (
    username === ADMIN_USERNAME &&
    password === ADMIN_PASSWORD
  ) {

    sessionStorage.setItem(
      "silvoraAdminLoggedIn",
      "true"
    );

    sessionStorage.setItem(
      "silvoraAdminUsername",
      username
    );

    loginMessage.textContent = "";
    loginMessage.classList.remove("error");

    showAdminDashboard();

  } else {

    loginMessage.textContent =
      "Invalid username or password.";

    loginMessage.classList.add("error");

  }

});


/* =========================================================
   SHOW DASHBOARD
========================================================= */

function showAdminDashboard() {

  loginScreen.classList.add("hidden");

  adminApp.classList.remove("hidden");

  const username =
    sessionStorage.getItem(
      "silvoraAdminUsername"
    ) || "Admin";

  adminUsernameDisplay.textContent =
    username;

  loadDashboard();

}


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
  "click",
  function () {

    sessionStorage.removeItem(
      "silvoraAdminLoggedIn"
    );

    sessionStorage.removeItem(
      "silvoraAdminUsername"
    );

    adminApp.classList.add("hidden");

    loginScreen.classList.remove("hidden");

    loginForm.reset();

  }
);


/* =========================================================
   CHECK LOGIN
========================================================= */

if (
  sessionStorage.getItem(
    "silvoraAdminLoggedIn"
  ) === "true"
) {

  showAdminDashboard();

}


/* =========================================================
   NAVIGATION
========================================================= */

const sidebarLinks =
  document.querySelectorAll(
    ".sidebar-link"
  );

const sections = {

  dashboard:
    document.getElementById(
      "dashboardSection"
    ),

  bookings:
    document.getElementById(
      "bookingsSection"
    ),

  rooms:
    document.getElementById(
      "roomsSection"
    ),

  memberships:
    document.getElementById(
      "membershipsSection"
    )

};

const pageTitle =
  document.getElementById("pageTitle");


function openSection(sectionName) {

  Object.values(sections).forEach(
    section => {

      section.classList.remove(
        "active"
      );

    }
  );


  sidebarLinks.forEach(link => {

    link.classList.remove("active");

  });


  if (sections[sectionName]) {

    sections[sectionName]
      .classList.add("active");

  }


  const activeLink =
    document.querySelector(
      `.sidebar-link[data-section="${sectionName}"]`
    );


  if (activeLink) {

    activeLink.classList.add("active");

  }


  const titles = {

    dashboard: "Dashboard",

    bookings: "Reservations",

    rooms: "Rooms",

    memberships: "Memberships"

  };


  pageTitle.textContent =
    titles[sectionName] || "Dashboard";


  if (sectionName === "dashboard") {

    loadDashboard();

  }


  if (sectionName === "bookings") {

    loadBookings();

  }


  if (sectionName === "rooms") {

    loadRooms();

  }


  if (sectionName === "memberships") {

    loadMemberships();

  }

}


sidebarLinks.forEach(link => {

  link.addEventListener(
    "click",
    function () {

      openSection(
        this.dataset.section
      );

    }
  );

});


document
  .querySelectorAll("[data-go]")
  .forEach(button => {

    button.addEventListener(
      "click",
      function () {

        openSection(
          this.dataset.go
        );

      }
    );

  });


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

  try {

    const [
      bookingsResponse,
      roomsResponse,
      membershipsResponse
    ] = await Promise.all([

      fetch("/api/admin/bookings"),

      fetch("/api/rooms"),

      fetch("/api/admin/memberships")

    ]);


    if (
      !bookingsResponse.ok ||
      !roomsResponse.ok ||
      !membershipsResponse.ok
    ) {

      throw new Error(
        "Unable to load admin data."
      );

    }


    allBookings =
      await bookingsResponse.json();

    allRooms =
      await roomsResponse.json();

    allMemberships =
      await membershipsResponse.json();


    updateDashboardStats();

    renderRecentBookings();


  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );

    showToast(
      "Unable to load dashboard data.",
      true
    );

  }

}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateDashboardStats() {

  const confirmed =
    allBookings.filter(
      booking =>
        booking.booking_status ===
        "Confirmed"
    );


  const revenue =
    allBookings
      .filter(
        booking =>
          booking.booking_status ===
            "Confirmed" ||
          booking.booking_status ===
            "Completed"
      )
      .reduce(
        (sum, booking) =>
          sum +
          Number(
            booking.total_price || 0
          ),
        0
      );


  const availableRooms =
    allRooms.filter(
      room =>
        room.status === "Available"
    ).length;


  const maintenanceRooms =
    allRooms.filter(
      room =>
        room.status === "Maintenance"
    ).length;


  const today =
    new Date()
      .toISOString()
      .slice(0, 10);


  const occupiedRooms =
    confirmed.filter(
      booking =>
        booking.check_in <= today &&
        booking.check_out > today
    ).length;


  const checkIns =
    confirmed.filter(
      booking =>
        booking.check_in === today
    ).length;


  const checkOuts =
    confirmed.filter(
      booking =>
        booking.check_out === today
    ).length;


  setText(
    "statTotalBookings",
    allBookings.length
  );


  setText(
    "statConfirmed",
    confirmed.length
  );


  setText(
    "statRevenue",
    formatMoney(revenue)
  );


  setText(
    "statOccupied",
    occupiedRooms
  );


  setText(
    "statAvailable",
    availableRooms
  );


  setText(
    "statMaintenance",
    maintenanceRooms
  );


  setText(
    "statCheckIns",
    checkIns
  );


  setText(
    "statCheckOuts",
    checkOuts
  );


  const totalPoints =
    allMemberships.reduce(
      (sum, member) =>
        sum +
        Number(member.points || 0),
      0
    );


  setText(
    "statMembers",
    allMemberships.length
  );


  setText(
    "statPoints",
    totalPoints
  );

}


/* =========================================================
   RECENT BOOKINGS
========================================================= */

function renderRecentBookings() {

  const container =
    document.getElementById(
      "recentBookings"
    );


  if (!container) return;


  const recent =
    [...allBookings]
      .sort(
        (a, b) =>
          Number(b.id) -
          Number(a.id)
      )
      .slice(0, 5);


  if (recent.length === 0) {

    container.innerHTML =
      `<p class="empty-state">
        No reservations yet.
      </p>`;

    return;

  }


  container.innerHTML =
    recent.map(booking => {

      return `

        <div class="recent-booking">

          <div>

            <strong>
              ${escapeHTML(
                booking.guest_name
              )}
            </strong>

            <small>
              #${booking.id}
              ·
              ${escapeHTML(
                booking.room_type || ""
              )}
            </small>

          </div>


          <div>

            <strong>
              ${formatMoney(
                booking.total_price
              )}
            </strong>

            <small>
              ${escapeHTML(
                booking.booking_status
              )}
            </small>

          </div>

        </div>

      `;

    }).join("");

}


/* =========================================================
   BOOKINGS
========================================================= */

async function loadBookings() {

  try {

    const response =
      await fetch(
        "/api/admin/bookings"
      );


    if (!response.ok) {

      throw new Error(
        "Bookings request failed."
      );

    }


    allBookings =
      await response.json();


    renderBookings();

    updateDashboardStats();


  } catch (error) {

    console.error(error);

    showToast(
      "Unable to load reservations.",
      true
    );

  }

}


function renderBookings() {

  const container =
    document.getElementById(
      "bookingsTable"
    );


  if (!container) return;


  const search =
    (
      document.getElementById(
        "bookingSearch"
      )?.value || ""
    )
      .trim()
      .toLowerCase();


  const status =
    document.getElementById(
      "bookingStatusFilter"
    )?.value || "all";


  const filtered =
    allBookings.filter(
      booking => {

        const text =
          `${booking.id}
           ${booking.guest_name}
           ${booking.email}
           ${booking.room_number}
           ${booking.room_type}`
            .toLowerCase();


        const matchesSearch =
          !search ||
          text.includes(search);


        const matchesStatus =
          status === "all" ||
          booking.booking_status ===
            status;


        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );


  if (filtered.length === 0) {

    container.innerHTML =
      `<div class="empty-state">
        No reservations found.
      </div>`;

    return;

  }


  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>ID</th>
          <th>Guest</th>
          <th>Room</th>
          <th>Stay</th>
          <th>Guests</th>
          <th>Total</th>
          <th>Status</th>
          <th>Action</th>

        </tr>

      </thead>


      <tbody>

        ${filtered.map(
          booking => `

          <tr>

            <td>
              #${booking.id}
            </td>


            <td>

              <strong>
                ${escapeHTML(
                  booking.guest_name
                )}
              </strong>

              <small>
                ${escapeHTML(
                  booking.email
                )}
              </small>

            </td>


            <td>

              ${escapeHTML(
                booking.room_type || ""
              )}

              <small>
                Room ${escapeHTML(
                  booking.room_number || ""
                )}
              </small>

            </td>


            <td>

              ${escapeHTML(
                booking.check_in
              )}

              →

              ${escapeHTML(
                booking.check_out
              )}

            </td>


            <td>
              ${booking.guests || 1}
            </td>


            <td>
              ${formatMoney(
                booking.total_price
              )}
            </td>


            <td>

              <span class="status-badge">
                ${escapeHTML(
                  booking.booking_status
                )}
              </span>

            </td>


            <td>

              ${
                booking.booking_status ===
                "Confirmed"

                ? `

                  <button
                    class="small-action"
                    onclick="completeBooking(${booking.id})"
                  >
                    Complete
                  </button>

                  <button
                    class="small-danger"
                    onclick="cancelBooking(${booking.id})"
                  >
                    Cancel
                  </button>

                `

                : "-"
              }

            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}


/* =========================================================
   COMPLETE BOOKING
========================================================= */

async function completeBooking(id) {

  if (
    !confirm(
      `Mark reservation #${id} as completed?`
    )
  ) return;


  try {

    const response =
      await fetch(
        `/api/admin/bookings/${id}/status`,
        {

          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            status: "Completed"
          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to complete booking."
      );

    }


    showToast(
      "Reservation completed."
    );


    loadBookings();


  } catch (error) {

    showToast(
      error.message,
      true
    );

  }

}


/* =========================================================
   CANCEL BOOKING
========================================================= */

async function cancelBooking(id) {

  if (
    !confirm(
      `Cancel reservation #${id}?`
    )
  ) return;


  try {

    const response =
      await fetch(
        `/api/admin/bookings/${id}/status`,
        {

          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            status: "Cancelled"
          })

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to cancel booking."
      );

    }


    showToast(
      "Reservation cancelled."
    );


    loadBookings();


  } catch (error) {

    showToast(
      error.message,
      true
    );

  }

}


/* =========================================================
   ROOMS
========================================================= */

async function loadRooms() {

  try {

    const response =
      await fetch(
        "/api/rooms"
      );


    if (!response.ok) {

      throw new Error(
        "Unable to load rooms."
      );

    }


    allRooms =
      await response.json();


    renderRooms();

    updateDashboardStats();


  } catch (error) {

    console.error(error);

    showToast(
      "Unable to load rooms.",
      true
    );

  }

}


/* =========================================================
   RENDER ROOMS
========================================================= */

function renderRooms() {

  const container =
    document.getElementById(
      "roomsGrid"
    );


  if (!container) return;


  if (allRooms.length === 0) {

    container.innerHTML =
      `<div class="empty-state">
        No rooms found.
      </div>`;

    return;

  }


  container.innerHTML =
    allRooms.map(room => {

      return `

        <div class="room-admin-card">

          <div class="room-number">
            Room ${escapeHTML(
              room.room_number
            )}
          </div>


          <h3>
            ${escapeHTML(
              room.room_type
            )}
          </h3>


          <div class="room-price-editor">

            <label>
              Price per night
            </label>


            <div class="price-input-row">

              <span class="currency-symbol">
                ₹
              </span>


              <input
                type="number"
                min="1"
                step="1"
                value="${Number(room.price || 0)}"
                id="room-price-${room.id}"
                class="room-price-input"
              />


              <button
                type="button"
                class="small-action"
                onclick="saveRoomPrice(${room.id})"
              >
                Save Price
              </button>

            </div>

          </div>


          <span class="status-badge">
            ${escapeHTML(
              room.status
            )}
          </span>

        </div>

      `;

    }).join("");

}


/* =========================================================
   SAVE ROOM PRICE
========================================================= */

async function saveRoomPrice(roomId) {

  const input =
    document.getElementById(
      `room-price-${roomId}`
    );


  if (!input) {

    showToast(
      "Price input not found.",
      true
    );

    return;

  }


  const price =
    Number(input.value);


  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    showToast(
      "Please enter a valid price.",
      true
    );

    return;

  }


  try {

    const response =
      await fetch(
        `/api/admin/rooms/${roomId}/price`,
        {

          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            price: price
          })

        }
      );


    /*
      IMPORTANT:
      Do not blindly call response.json().
      If the server returns HTML, this gives us
      a useful error instead of:

      Unexpected token '<'
    */

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    let data;


    if (
      contentType.includes(
        "application/json"
      )
    ) {

      data =
        await response.json();

    } else {

      const text =
        await response.text();

      console.error(
        "Non-JSON server response:",
        text
      );

      throw new Error(
        `Server returned ${response.status} instead of JSON. Check the room price API route in server.js.`
      );

    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to update room price."
      );

    }


    /*
      Update local room data.
    */

    const room =
      allRooms.find(
        item =>
          Number(item.id) ===
          Number(roomId)
      );


    if (room) {

      room.price = price;

    }


    showToast(
      "Room price updated successfully."
    );


    /*
      Re-render so the new price is shown.
    */

    renderRooms();


  } catch (error) {

    console.error(
      "Save room price error:",
      error
    );


    showToast(
      error.message ||
      "Unable to save room price.",
      true
    );

  }

}


/* =========================================================
   MEMBERSHIPS
========================================================= */

async function loadMemberships() {

  try {

    const response =
      await fetch(
        "/api/admin/memberships"
      );


    if (!response.ok) {

      throw new Error(
        "Unable to load memberships."
      );

    }


    allMemberships =
      await response.json();


    renderMemberships();

    updateDashboardStats();


  } catch (error) {

    console.error(error);

    showToast(
      "Unable to load memberships.",
      true
    );

  }

}


function renderMemberships() {

  const container =
    document.getElementById(
      "membershipsTable"
    );


  if (!container) return;


  const search =
    (
      document.getElementById(
        "membershipSearch"
      )?.value || ""
    )
      .trim()
      .toLowerCase();


  const filtered =
    allMemberships.filter(
      member => {

        const text =
          `${member.guest_name}
           ${member.email}`
            .toLowerCase();


        return (
          !search ||
          text.includes(search)
        );

      }
    );


  if (filtered.length === 0) {

    container.innerHTML =
      `<div class="empty-state">
        No members found.
      </div>`;

    return;

  }


  container.innerHTML = `

    <table>

      <thead>

        <tr>

          <th>ID</th>
          <th>Member</th>
          <th>Email</th>
          <th>Points</th>

        </tr>

      </thead>


      <tbody>

        ${filtered.map(
          member => `

          <tr>

            <td>
              #${member.id}
            </td>


            <td>

              <strong>
                ${escapeHTML(
                  member.guest_name
                )}
              </strong>

            </td>


            <td>
              ${escapeHTML(
                member.email
              )}
            </td>


            <td>

              <strong>
                ${Number(
                  member.points || 0
                ).toLocaleString()}
              </strong>

            </td>

          </tr>

        `
        ).join("")}

      </tbody>

    </table>

  `;

}


/* =========================================================
   SEARCH EVENTS
========================================================= */

document
  .getElementById("bookingSearch")
  ?.addEventListener(
    "input",
    renderBookings
  );


document
  .getElementById(
    "bookingStatusFilter"
  )
  ?.addEventListener(
    "change",
    renderBookings
  );


document
  .getElementById("membershipSearch")
  ?.addEventListener(
    "input",
    renderMemberships
  );


/* =========================================================
   REFRESH BUTTONS
========================================================= */

document
  .getElementById("refreshDashboard")
  ?.addEventListener(
    "click",
    loadDashboard
  );


document
  .getElementById("refreshBookings")
  ?.addEventListener(
    "click",
    loadBookings
  );


document
  .getElementById("refreshRooms")
  ?.addEventListener(
    "click",
    loadRooms
  );


document
  .getElementById("refreshMemberships")
  ?.addEventListener(
    "click",
    loadMemberships
  );


/* =========================================================
   HELPERS
========================================================= */

function setText(id, value) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent = value;

  }

}


function formatMoney(value) {

  return (
    "₹" +
    Number(
      value || 0
    ).toLocaleString("en-IN")
  );

}


function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showToast(
  message,
  isError = false
) {

  const toast =
    document.getElementById(
      "adminToast"
    );


  if (!toast) return;


  toast.textContent = message;


  toast.classList.toggle(
    "error",
    isError
  );


  toast.classList.add("show");


  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  }, 3000);

}