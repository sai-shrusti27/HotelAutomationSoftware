const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
  path.join(__dirname, "silvora.db")
);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

/* =========================
   DATABASE TABLES
========================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY,
    room_number TEXT NOT NULL UNIQUE,
    room_type TEXT NOT NULL,
    price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available'
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    email TEXT NOT NULL,
    room_id INTEGER NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    total_price INTEGER NOT NULL,
    booking_status TEXT NOT NULL DEFAULT 'Confirmed',

    catering_breakfast INTEGER NOT NULL DEFAULT 0,
    catering_lunch INTEGER NOT NULL DEFAULT 0,
    catering_dinner INTEGER NOT NULL DEFAULT 0,
    catering_full_meal INTEGER NOT NULL DEFAULT 0,
    catering_total INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    email TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    UNIQUE(guest_name, email)
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_room_dates
  ON bookings(
    room_id,
    check_in,
    check_out,
    booking_status
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_guest
  ON bookings(
    email,
    guest_name
  );

  CREATE INDEX IF NOT EXISTS idx_memberships_guest
  ON memberships(
    email,
    guest_name
  );
`);


/* =========================
   DATABASE MIGRATION
========================= */

function getBookingColumns() {
  return db
    .prepare(`PRAGMA table_info(bookings)`)
    .all()
    .map(column => column.name);
}


/* =========================
   GUESTS COLUMN
========================= */

let existingColumns = getBookingColumns();

if (!existingColumns.includes("guests")) {

  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN guests INTEGER NOT NULL DEFAULT 1
  `);

}


/* =========================
   BREAKFAST COLUMN
========================= */

existingColumns = getBookingColumns();

if (!existingColumns.includes("catering_breakfast")) {

  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN catering_breakfast
    INTEGER NOT NULL DEFAULT 0
  `);

}


/* =========================
   LUNCH COLUMN
========================= */

existingColumns = getBookingColumns();

if (!existingColumns.includes("catering_lunch")) {

  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN catering_lunch
    INTEGER NOT NULL DEFAULT 0
  `);

}


/* =========================
   DINNER COLUMN
========================= */

existingColumns = getBookingColumns();

if (!existingColumns.includes("catering_dinner")) {

  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN catering_dinner
    INTEGER NOT NULL DEFAULT 0
  `);

}


/* =========================
   FULL MEAL COLUMN
========================= */

existingColumns = getBookingColumns();

if (!existingColumns.includes("catering_full_meal")) {

  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN catering_full_meal
    INTEGER NOT NULL DEFAULT 0
  `);

  console.log(
    "Added catering_full_meal column to bookings table."
  );

}


/* =========================
   CATERING TOTAL COLUMN
========================= */

existingColumns = getBookingColumns();

if (!existingColumns.includes("catering_total")) {

  db.exec(`
    ALTER TABLE bookings
    ADD COLUMN catering_total
    INTEGER NOT NULL DEFAULT 0
  `);

}


/* =========================
   ROOMS
========================= */

const roomTypes = [

  {
    type: "Deluxe Room",
    price: 4999
  },

  {
    type: "Executive Room",
    price: 6499
  },

  {
    type: "Junior Suite",
    price: 7499
  },

  {
    type: "Executive Suite",
    price: 8499
  },

  {
    type: "Family Room",
    price: 9499
  },

  {
    type: "Presidential Suite",
    price: 14999
  }

];


const insertRoom = db.prepare(`
  INSERT OR IGNORE INTO rooms
  (
    room_number,
    room_type,
    price,
    status
  )
  VALUES
  (
    ?,
    ?,
    ?,
    'Available'
  )
`);


const seedRooms = db.transaction(() => {

  roomTypes.forEach((room, index) => {

    for (
      let number = 1;
      number <= 5;
      number++
    ) {

      const roomNumber =
        `${index + 1}0${number}`;

      insertRoom.run(
        roomNumber,
        room.type,
        room.price
      );

    }

  });

});


seedRooms();


/* =========================
   MEMBERSHIP CUSTOMERS
========================= */

const membershipCustomers = [

  {
    name: "Priya Singh",
    email: "priya@gmail.com",
    points: 250
  },

  {
    name: "Rahul",
    email: "rahul@gmail.com",
    points: 150
  },

  {
    name: "Amit Sharma",
    email: "amit@gmail.com",
    points: 800
  },

  {
    name: "Neha Sharma",
    email: "neha@gmail.com",
    points: 300
  }

];


const insertMembership = db.prepare(`
  INSERT OR IGNORE INTO memberships
  (
    guest_name,
    email,
    points
  )
  VALUES
  (
    ?,
    ?,
    ?
  )
`);


const seedMemberships = db.transaction(() => {

  membershipCustomers.forEach((customer) => {

    insertMembership.run(
      customer.name,
      customer.email,
      customer.points
    );

  });

});


seedMemberships();


/* =========================
   PRIYA CORRECTION
========================= */

const priya = db.prepare(`
  SELECT
    id,
    points
  FROM memberships
  WHERE LOWER(TRIM(guest_name)) =
        'priya singh'
    AND LOWER(TRIM(email)) =
        'priya@gmail.com'
  LIMIT 1
`).get();


if (
  priya &&
  Number(priya.points) === 500
) {

  db.prepare(`
    UPDATE memberships
    SET points = 250
    WHERE id = ?
  `).run(priya.id);

  console.log(
    "Updated Priya Singh membership points: 500 -> 250"
  );

}


/* =========================
   SHOW MEMBERSHIP DATA
========================= */

const memberships = db.prepare(`
  SELECT
    guest_name,
    email,
    points
  FROM memberships
  ORDER BY id
`).all();


console.log("\nCurrent membership points:");


memberships.forEach((member) => {

  console.log(
    `${member.guest_name} | ${member.email} | ${member.points} points`
  );

});


console.log("");


/* =========================
   SHOW CATERING COLUMNS
========================= */

const finalBookingColumns = db
  .prepare(`PRAGMA table_info(bookings)`)
  .all();

console.log(
  "\nCatering columns available:"
);

[
  "catering_breakfast",
  "catering_lunch",
  "catering_dinner",
  "catering_full_meal",
  "catering_total"
].forEach((columnName) => {

  const exists =
    finalBookingColumns.some(
      column =>
        column.name === columnName
    );

  console.log(
    `${columnName}: ${exists ? "YES" : "NO"}`
  );

});

console.log("");


/* =========================
   EXPORT DATABASE
========================= */

module.exports = db;