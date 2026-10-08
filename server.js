const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();

const PORT =
  process.env.PORT || 3000;


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(__dirname, {
    index: false
  })
);


/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});


/* =========================================================
   ADMIN PAGE
========================================================= */

app.get("/admin.html", (req, res) => {

  res.sendFile(
    path.join(__dirname, "admin.html")
  );

});


/* =========================================================
   API TEST
========================================================= */

app.get("/api", (req, res) => {

  res.json({
    message:
      "SILVORA hotel API is running."
  });

});


/* =========================================================
   ROOMS
========================================================= */

app.get("/api/rooms", (req, res) => {

  try {

    const rooms =
      db
        .prepare(`
          SELECT
            id,
            room_number,
            room_type,
            price,
            status
          FROM rooms
          ORDER BY id
        `)
        .all();


    res.json(rooms);

  } catch (error) {

    console.error(
      "Room list error:",
      error
    );


    res.status(500).json({

      message:
        "Unable to load rooms."

    });

  }

});


/* =========================================================
   ADMIN — UPDATE ROOM PRICE
========================================================= */

app.patch(
  "/api/admin/rooms/:id/price",
  (req, res) => {

    const roomId =
      Number(req.params.id);

    const price =
      Number(req.body.price);


    if (
      !Number.isInteger(roomId) ||
      roomId <= 0
    ) {

      return res.status(400).json({

        message:
          "Invalid room ID."

      });

    }


    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {

      return res.status(400).json({

        message:
          "Room price must be greater than zero."

      });

    }


    try {

      const result =
        db
          .prepare(`
            UPDATE rooms
            SET price = ?
            WHERE id = ?
          `)
          .run(
            price,
            roomId
          );


      if (result.changes === 0) {

        return res.status(404).json({

          message:
            "Room not found."

        });

      }


      const room =
        db
          .prepare(`
            SELECT
              id,
              room_number,
              room_type,
              price,
              status
            FROM rooms
            WHERE id = ?
          `)
          .get(roomId);


      return res.json({

        message:
          "Room price updated successfully.",

        room

      });


    } catch (error) {

      console.error(
        "Room price update error:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to update room price."

      });

    }

  }
);


/* =========================================================
   DATE VALIDATION
========================================================= */

function isValidDate(value) {

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {

    return false;

  }


  const date =
    new Date(
      `${value}T00:00:00Z`
    );


  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) ===
      value
  );

}


/* =========================================================
   MEMBERSHIP LOOKUP
========================================================= */

app.get(
  "/api/membership",
  (req, res) => {

    const name =
      String(
        req.query.name || ""
      ).trim();


    const email =
      String(
        req.query.email || ""
      )
        .trim()
        .toLowerCase();


    if (!name || !email) {

      return res.json({

        member: false,

        points: 0,

        message:
          "Enter your name and email to check your membership points."

      });

    }


    try {

      const membership =
        db
          .prepare(`
            SELECT
              id,
              guest_name,
              email,
              points
            FROM memberships
            WHERE LOWER(TRIM(guest_name)) =
                  LOWER(TRIM(?))
              AND LOWER(TRIM(email)) = ?
            LIMIT 1
          `)
          .get(
            name,
            email
          );


      if (!membership) {

        return res.json({

          member: false,

          points: 0,

          message:
            "No membership points found for this name and email."

        });

      }


      const points =
        Number(
          membership.points
        );


      return res.json({

        member: true,

        name:
          membership.guest_name,

        email:
          membership.email,

        points,

        message:
          `You have ${points} membership points available.`

      });


    } catch (error) {

      console.error(
        "Membership lookup error:",
        error
      );


      return res.status(500).json({

        member: false,

        points: 0,

        message:
          "Unable to check membership points."

      });

    }

  }
);


/* =========================================================
   CATERING PRICES
========================================================= */

const CATERING_PRICES = {

  breakfast: 500,

  lunch: 700,

  dinner: 800,

  full_meal: 1800

};


/* =========================================================
   CALCULATE CATERING
========================================================= */

function calculateCatering(
  catering,
  guests,
  nights
) {

  let breakfast =
    Boolean(
      catering?.breakfast
    );


  let lunch =
    Boolean(
      catering?.lunch
    );


  let dinner =
    Boolean(
      catering?.dinner
    );


  const fullMeal =
    Boolean(
      catering?.full_meal
    );


  if (fullMeal) {

    breakfast = false;

    lunch = false;

    dinner = false;

  }


  let dailyPrice = 0;


  if (fullMeal) {

    dailyPrice =
      CATERING_PRICES.full_meal;

  } else {

    if (breakfast) {

      dailyPrice +=
        CATERING_PRICES.breakfast;

    }


    if (lunch) {

      dailyPrice +=
        CATERING_PRICES.lunch;

    }


    if (dinner) {

      dailyPrice +=
        CATERING_PRICES.dinner;

    }

  }


  const cateringTotal =
    dailyPrice *
    guests *
    nights;


  return {

    breakfast,

    lunch,

    dinner,

    full_meal:
      fullMeal,

    daily_price:
      dailyPrice,

    total:
      cateringTotal

  };

}


/* =========================================================
   CREATE BOOKING
========================================================= */

const createBooking =
  db.transaction(
    details => {

      const room =
        db
          .prepare(`
            SELECT
              r.id,
              r.room_number,
              r.room_type,
              r.price
            FROM rooms AS r
            WHERE r.room_type = ?
              AND r.status = 'Available'
              AND NOT EXISTS (
                SELECT 1
                FROM bookings AS b
                WHERE b.room_id = r.id
                  AND b.booking_status = 'Confirmed'
                  AND b.check_in < ?
                  AND b.check_out > ?
              )
            ORDER BY r.id
            LIMIT 1
          `)
          .get(
            details.room_type,
            details.check_out,
            details.check_in
          );


      if (!room) {

        return null;

      }


      const start =
        new Date(
          `${details.check_in}T00:00:00Z`
        );


      const end =
        new Date(
          `${details.check_out}T00:00:00Z`
        );


      const nights =
        Math.round(
          (end - start) /
          86400000
        );


      if (nights <= 0) {

        throw new Error(
          "Invalid booking dates."
        );

      }


      /*
        IMPORTANT:
        Price comes directly from
        the database.

        This means if the admin changes
        the room price, new bookings
        automatically use the new price.
      */

      const roomPrice =
        Number(room.price);


      const roomTotal =
        nights *
        roomPrice;


      const catering =
        calculateCatering(
          details.catering,
          details.guests,
          nights
        );


      /* =====================================================
         MEMBERSHIP
      ===================================================== */

      let pointsUsed = 0;

      let pointsBefore = 0;

      let pointsAfter = 0;


      const membership =
        db
          .prepare(`
            SELECT
              id,
              guest_name,
              email,
              points
            FROM memberships
            WHERE LOWER(TRIM(guest_name)) =
                  LOWER(TRIM(?))
              AND LOWER(TRIM(email)) = ?
            LIMIT 1
          `)
          .get(
            details.guest_name,
            details.email
          );


      if (membership) {

        pointsBefore =
          Number(
            membership.points
          );

        pointsAfter =
          pointsBefore;

      }


      /* =====================================================
         USE MEMBERSHIP POINTS
      ===================================================== */

      if (
        details.use_points > 0
      ) {

        if (!membership) {

          throw new Error(
            "No membership account found for this name and email."
          );

        }


        if (
          details.use_points >
          pointsBefore
        ) {

          throw new Error(
            `You only have ${pointsBefore} membership points available.`
          );

        }


        const bookingBeforePoints =
          roomTotal +
          catering.total;


        pointsUsed =
          Math.min(
            details.use_points,
            bookingBeforePoints
          );


        pointsAfter =
          pointsBefore -
          pointsUsed;


        db
          .prepare(`
            UPDATE memberships
            SET points = ?
            WHERE id = ?
          `)
          .run(
            pointsAfter,
            membership.id
          );

      }


      /* =====================================================
         TOTAL
      ===================================================== */

      const subtotal =
        roomTotal +
        catering.total;


      const finalTotal =
        Math.max(
          0,
          subtotal -
          pointsUsed
        );


      /* =====================================================
         INSERT BOOKING
      ===================================================== */

      const result =
        db
          .prepare(`
            INSERT INTO bookings (
              guest_name,
              email,
              room_id,
              check_in,
              check_out,
              guests,
              total_price,
              booking_status,
              catering_breakfast,
              catering_lunch,
              catering_dinner,
              catering_full_meal,
              catering_total
            )
            VALUES (
              ?, ?, ?, ?, ?, ?, ?, 'Confirmed',
              ?, ?, ?, ?, ?
            )
          `)
          .run(

            details.guest_name,

            details.email,

            room.id,

            details.check_in,

            details.check_out,

            details.guests,

            finalTotal,

            catering.breakfast
              ? 1
              : 0,

            catering.lunch
              ? 1
              : 0,

            catering.dinner
              ? 1
              : 0,

            catering.full_meal
              ? 1
              : 0,

            catering.total

          );


      return {

        bookingId:
          Number(
            result.lastInsertRowid
          ),

        room_number:
          room.room_number,

        room_type:
          room.room_type,

        room_price:
          roomPrice,

        nights,

        guests:
          details.guests,

        room_total:
          roomTotal,

        catering_breakfast:
          catering.breakfast,

        catering_lunch:
          catering.lunch,

        catering_dinner:
          catering.dinner,

        catering_full_meal:
          catering.full_meal,

        catering_daily_price:
          catering.daily_price,

        catering_total:
          catering.total,

        subtotal,

        points_before:
          pointsBefore,

        points_used:
          pointsUsed,

        points_remaining:
          pointsAfter,

        total_price:
          finalTotal,

        booking_status:
          "Confirmed"

      };

    }
  );


/* =========================================================
   BOOKING API
========================================================= */

app.post(
  "/api/bookings",
  (req, res) => {

    const guest_name =
      String(
        req.body.guest_name || ""
      ).trim();


    const email =
      String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();


    const room_type =
      String(
        req.body.room_type || ""
      ).trim();


    /*
      Price is still accepted from the
      frontend for compatibility, but
      the server no longer trusts it.
    */

    const price =
      Number(req.body.price);


    const check_in =
      String(
        req.body.check_in || ""
      );


    const check_out =
      String(
        req.body.check_out || ""
      );


    const guests =
      Number(req.body.guests);


    const use_points =
      Number(
        req.body.use_points || 0
      );


    const catering =
      req.body.catering || {};


    /* =====================================================
       REQUIRED
    ===================================================== */

    if (
      !guest_name ||
      !email ||
      !room_type ||
      !check_in ||
      !check_out
    ) {

      return res.status(400).json({

        message:
          "Please complete all booking fields."

      });

    }


    /* =====================================================
       EMAIL
    ===================================================== */

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {

      return res.status(400).json({

        message:
          "Please enter a valid email address."

      });

    }


    /* =====================================================
       ROOM
    ===================================================== */

    const selectedRoom =
      db
        .prepare(`
          SELECT
            id,
            room_type,
            price,
            status
          FROM rooms
          WHERE room_type = ?
            AND status = 'Available'
          ORDER BY id
          LIMIT 1
        `)
        .get(room_type);


    if (!selectedRoom) {

      return res.status(400).json({

        message:
          "Please select a valid available room."

      });

    }


    /*
      IMPORTANT:
      Do NOT compare the frontend price
      against a hard-coded list anymore.

      The actual price is taken from
      the rooms table inside createBooking().
    */


    /* =====================================================
       GUESTS
    ===================================================== */

    if (
      !Number.isInteger(guests) ||
      guests < 1 ||
      guests > 4
    ) {

      return res.status(400).json({

        message:
          "Please select between 1 and 4 guests."

      });

    }


    /* =====================================================
       POINTS
    ===================================================== */

    if (
      !Number.isInteger(use_points) ||
      use_points < 0
    ) {

      return res.status(400).json({

        message:
          "Membership points must be a valid positive number."

      });

    }


    /* =====================================================
       DATES
    ===================================================== */

    if (
      !isValidDate(check_in) ||
      !isValidDate(check_out) ||
      check_out <= check_in
    ) {

      return res.status(400).json({

        message:
          "Please select valid dates. Check-out must be after check-in."

      });

    }


    const today =
      new Date()
        .toISOString()
        .slice(0, 10);


    if (check_in < today) {

      return res.status(400).json({

        message:
          "Check-in cannot be in the past."

      });

    }


    /* =====================================================
       CATERING
    ===================================================== */

    const fullMeal =
      catering.full_meal === true;


    const cleanCatering = {

      breakfast:
        fullMeal
          ? false
          : catering.breakfast === true,

      lunch:
        fullMeal
          ? false
          : catering.lunch === true,

      dinner:
        fullMeal
          ? false
          : catering.dinner === true,

      full_meal:
        fullMeal

    };


    /* =====================================================
       CREATE
    ===================================================== */

    try {

      const booking =
        createBooking({

          guest_name,

          email,

          room_type,

          /*
            This value is not used
            to calculate the final price.
            Database price is used.
          */
          price,

          check_in,

          check_out,

          guests,

          use_points,

          catering:
            cleanCatering

        });


      if (!booking) {

        return res.status(409).json({

          message:
            "No room of this type is available for those dates. Please choose different dates or a different room."

        });

      }


      return res.status(201).json({

        message:
          "Your reservation is confirmed.",

        ...booking

      });


    } catch (error) {

      console.error(
        "Booking creation error:",
        error
      );


      return res.status(400).json({

        message:
          error.message ||
          "Unable to complete the reservation."

      });

    }

  }
);


/* =========================================================
   MY RESERVATIONS
========================================================= */

app.get(
  "/api/bookings",
  (req, res) => {

    const name =
      String(
        req.query.name || ""
      ).trim();


    const email =
      String(
        req.query.email || ""
      )
        .trim()
        .toLowerCase();


    if (!name || !email) {

      return res.status(400).json({

        message:
          "Enter the name and email used for the booking."

      });

    }


    try {

      const rows =
        db
          .prepare(`
            SELECT
              b.id,
              b.guest_name,
              b.email,
              b.check_in,
              b.check_out,
              b.guests,
              b.total_price,
              b.booking_status,
              b.catering_breakfast,
              b.catering_lunch,
              b.catering_dinner,
              b.catering_full_meal,
              b.catering_total,
              r.room_number,
              r.room_type,
              r.price AS room_price
            FROM bookings AS b
            JOIN rooms AS r
              ON r.id = b.room_id
            WHERE LOWER(TRIM(b.guest_name)) =
                  LOWER(TRIM(?))
              AND LOWER(TRIM(b.email)) = ?
            ORDER BY b.id DESC
          `)
          .all(
            name,
            email
          );


      const bookings =
        rows.map(
          booking => {

            const start =
              new Date(
                `${booking.check_in}T00:00:00Z`
              );


            const end =
              new Date(
                `${booking.check_out}T00:00:00Z`
              );


            const nights =
              Math.max(
                0,
                Math.round(
                  (end - start) /
                  86400000
                )
              );


            const guestCount =
              Number(
                booking.guests || 1
              );


            const roomTotal =
              Number(
                booking.room_price || 0
              ) *
              nights;


            const catering = [];


            if (
              Number(
                booking.catering_full_meal
              ) === 1
            ) {

              catering.push({

                service_id: 4,

                service_name:
                  "Full Meal Package",

                price:
                  CATERING_PRICES.full_meal,

                guests:
                  guestCount,

                days:
                  nights,

                total_price:
                  CATERING_PRICES.full_meal *
                  guestCount *
                  nights

              });

            } else {

              if (
                Number(
                  booking.catering_breakfast
                ) === 1
              ) {

                catering.push({

                  service_id: 1,

                  service_name:
                    "Breakfast",

                  price:
                    CATERING_PRICES.breakfast,

                  guests:
                    guestCount,

                  days:
                    nights,

                  total_price:
                    CATERING_PRICES.breakfast *
                    guestCount *
                    nights

                });

              }


              if (
                Number(
                  booking.catering_lunch
                ) === 1
              ) {

                catering.push({

                  service_id: 2,

                  service_name:
                    "Lunch",

                  price:
                    CATERING_PRICES.lunch,

                  guests:
                    guestCount,

                  days:
                    nights,

                  total_price:
                    CATERING_PRICES.lunch *
                    guestCount *
                    nights

                });

              }


              if (
                Number(
                  booking.catering_dinner
                ) === 1
              ) {

                catering.push({

                  service_id: 3,

                  service_name:
                    "Dinner",

                  price:
                    CATERING_PRICES.dinner,

                  guests:
                    guestCount,

                  days:
                    nights,

                  total_price:
                    CATERING_PRICES.dinner *
                    guestCount *
                    nights

                });

              }

            }


            const cateringTotal =
              Number(
                booking.catering_total || 0
              );


            const subtotal =
              roomTotal +
              cateringTotal;


            const finalTotal =
              Number(
                booking.total_price || 0
              );


            const pointsUsed =
              Math.max(
                0,
                subtotal -
                finalTotal
              );


            return {

              id:
                booking.id,

              guest_name:
                booking.guest_name,

              email:
                booking.email,

              room_number:
                booking.room_number,

              room_type:
                booking.room_type,

              room_price:
                Number(
                  booking.room_price || 0
                ),

              check_in:
                booking.check_in,

              check_out:
                booking.check_out,

              guests:
                guestCount,

              nights,

              catering,

              catering_total:
                cateringTotal,

              subtotal,

              points_used:
                pointsUsed,

              total_price:
                finalTotal,

              booking_status:
                booking.booking_status

            };

          }
        );


      return res.json(
        bookings
      );


    } catch (error) {

      console.error(
        "Reservation lookup error:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to search reservations."

      });

    }

  }
);


/* =========================================================
   UPDATE CATERING
========================================================= */

app.patch(
  "/api/bookings/:id/catering",
  (req, res) => {

    const bookingId =
      Number(req.params.id);


    const name =
      String(
        req.body.name || ""
      ).trim();


    const email =
      String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();


    const breakfast =
      req.body.breakfast === true;


    const lunch =
      req.body.lunch === true;


    const dinner =
      req.body.dinner === true;


    const fullMeal =
      req.body.full_meal === true;


    if (
      !Number.isInteger(bookingId) ||
      bookingId <= 0 ||
      !name ||
      !email
    ) {

      return res.status(400).json({

        message:
          "Reservation ID, name and email are required."

      });

    }


    try {

      const booking =
        db
          .prepare(`
            SELECT
              b.id,
              b.guest_name,
              b.email,
              b.check_in,
              b.check_out,
              b.guests,
              b.total_price,
              b.catering_total,
              b.booking_status,
              r.price AS room_price
            FROM bookings AS b
            JOIN rooms AS r
              ON r.id = b.room_id
            WHERE b.id = ?
              AND LOWER(TRIM(b.guest_name)) =
                  LOWER(TRIM(?))
              AND LOWER(TRIM(b.email)) = ?
              AND b.booking_status = 'Confirmed'
            LIMIT 1
          `)
          .get(
            bookingId,
            name,
            email
          );


      if (!booking) {

        return res.status(404).json({

          message:
            "Reservation not found."

        });

      }


      const start =
        new Date(
          `${booking.check_in}T00:00:00Z`
        );


      const end =
        new Date(
          `${booking.check_out}T00:00:00Z`
        );


      const nights =
        Math.max(
          0,
          Math.round(
            (end - start) /
            86400000
          )
        );


      const guests =
        Number(
          booking.guests || 1
        );


      const newCatering =
        calculateCatering(
          {

            breakfast:
              fullMeal
                ? false
                : breakfast,

            lunch:
              fullMeal
                ? false
                : lunch,

            dinner:
              fullMeal
                ? false
                : dinner,

            full_meal:
              fullMeal

          },

          guests,

          nights
        );


      const oldCatering =
        Number(
          booking.catering_total || 0
        );


      const roomTotal =
        Number(
          booking.room_price || 0
        ) *
        nights;


      const currentSubtotal =
        roomTotal +
        oldCatering;


      const currentFinalTotal =
        Number(
          booking.total_price || 0
        );


      const currentPointsUsed =
        Math.max(
          0,
          currentSubtotal -
          currentFinalTotal
        );


      const newSubtotal =
        roomTotal +
        newCatering.total;


      const newFinalTotal =
        Math.max(
          0,
          newSubtotal -
          currentPointsUsed
        );


      db
        .prepare(`
          UPDATE bookings
          SET
            catering_breakfast = ?,
            catering_lunch = ?,
            catering_dinner = ?,
            catering_full_meal = ?,
            catering_total = ?,
            total_price = ?
          WHERE id = ?
        `)
        .run(

          newCatering.breakfast
            ? 1
            : 0,

          newCatering.lunch
            ? 1
            : 0,

          newCatering.dinner
            ? 1
            : 0,

          newCatering.full_meal
            ? 1
            : 0,

          newCatering.total,

          newFinalTotal,

          bookingId

        );


      return res.json({

        message:
          "Catering updated successfully.",

        booking_id:
          bookingId,

        guests,

        nights,

        room_total:
          roomTotal,

        catering_total:
          newCatering.total,

        subtotal:
          newSubtotal,

        points_used:
          currentPointsUsed,

        total_price:
          newFinalTotal

      });


    } catch (error) {

      console.error(
        "Existing booking catering error:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to update catering."

      });

    }

  }
);


/* =========================================================
   DELETE RESERVATION
========================================================= */

app.delete(
  "/api/bookings/:id",
  (req, res) => {

    const bookingId =
      Number(req.params.id);


    const name =
      String(
        req.body.name || ""
      ).trim();


    const email =
      String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();


    if (
      !Number.isInteger(bookingId) ||
      bookingId <= 0 ||
      !name ||
      !email
    ) {

      return res.status(400).json({

        message:
          "Reservation ID, name and email are required."

      });

    }


    try {

      const result =
        db
          .prepare(`
            DELETE FROM bookings
            WHERE id = ?
              AND LOWER(TRIM(guest_name)) =
                  LOWER(TRIM(?))
              AND LOWER(TRIM(email)) = ?
          `)
          .run(
            bookingId,
            name,
            email
          );


      if (result.changes === 0) {

        return res.status(404).json({

          message:
            "Reservation not found or guest details do not match."

        });

      }


      return res.json({

        message:
          `Reservation #${bookingId} deleted successfully.`

      });


    } catch (error) {

      console.error(
        "Reservation deletion error:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to delete the reservation."

      });

    }

  }
);


/* =========================================================
   ADMIN — ALL BOOKINGS
========================================================= */

app.get(
  "/api/admin/bookings",
  (req, res) => {

    try {

      const bookings =
        db
          .prepare(`
            SELECT
              b.id,
              b.guest_name,
              b.email,
              b.check_in,
              b.check_out,
              b.guests,
              b.total_price,
              b.booking_status,
              b.catering_breakfast,
              b.catering_lunch,
              b.catering_dinner,
              b.catering_full_meal,
              b.catering_total,
              b.created_at,
              r.room_number,
              r.room_type,
              r.price AS room_price
            FROM bookings AS b
            JOIN rooms AS r
              ON r.id = b.room_id
            ORDER BY b.id DESC
          `)
          .all();


      return res.json(
        bookings
      );


    } catch (error) {

      console.error(
        "Admin bookings error:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to load admin bookings."

      });

    }

  }
);


/* =========================================================
   ADMIN — ALL MEMBERSHIPS
========================================================= */

app.get(
  "/api/admin/memberships",
  (req, res) => {

    try {

      const memberships =
        db
          .prepare(`
            SELECT
              id,
              guest_name,
              email,
              points
            FROM memberships
            ORDER BY id DESC
          `)
          .all();


      return res.json(
        memberships
      );


    } catch (error) {

      console.error(
        "Admin memberships error:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to load memberships."

      });

    }

  }
);


/* =========================================================
   ADMIN — UPDATE BOOKING STATUS
========================================================= */

app.patch(
  "/api/admin/bookings/:id/status",
  (req, res) => {

    const bookingId =
      Number(req.params.id);


    const status =
      String(
        req.body.status || ""
      ).trim();


    const allowedStatuses = [

      "Confirmed",

      "Completed",

      "Cancelled"

    ];


    if (
      !Number.isInteger(bookingId) ||
      bookingId <= 0
    ) {

      return res.status(400).json({

        message:
          "Invalid booking ID."

      });

    }


    if (
      !allowedStatuses.includes(
        status
      )
    ) {

      return res.status(400).json({

        message:
          "Invalid booking status."

      });

    }


    try {

      const result =
        db
          .prepare(`
            UPDATE bookings
            SET booking_status = ?
            WHERE id = ?
          `)
          .run(
            status,
            bookingId
          );


      if (result.changes === 0) {

        return res.status(404).json({

          message:
            "Booking not found."

        });

      }


      return res.json({

        message:
          "Booking status updated.",

        booking_id:
          bookingId,

        booking_status:
          status

      });


    } catch (error) {

      console.error(
        "Admin booking status error:",
        error
      );


      return res.status(500).json({

        message:
          "Unable to update booking status."

      });

    }

  }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {

    console.log(
      `SILVORA is running at http://localhost:${PORT}`
    );

    console.log(
      `Admin dashboard: http://localhost:${PORT}/admin.html`
    );

  }
);