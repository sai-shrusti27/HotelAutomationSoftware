document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     ELEMENTS
  ===================================================== */

  const welcomePopup =
    document.getElementById("welcomePopup");

  const exploreButton =
    document.getElementById("exploreButton");

  const menuToggle =
    document.getElementById("menuToggle");

  const navMenu =
    document.getElementById("navMenu");

  const bookingForm =
    document.getElementById("bookingForm");

  const guestName =
    document.getElementById("guestName");

  const guestEmail =
    document.getElementById("guestEmail");

  const checkIn =
    document.getElementById("checkIn");

  const checkOut =
    document.getElementById("checkOut");

  const roomType =
    document.getElementById("roomType");

  const guests =
    document.getElementById("guests");

  const usePoints =
    document.getElementById("usePoints");

  const membershipInfo =
    document.getElementById("membershipInfo");

  const cateringSummary =
    document.getElementById("cateringSummary");

  const roomTotalDisplay =
    document.getElementById("roomTotalDisplay");

  const cateringTotalDisplay =
    document.getElementById("cateringTotalDisplay");

  const subtotalDisplay =
    document.getElementById("subtotalDisplay");

  const pointsDiscountDisplay =
    document.getElementById("pointsDiscountDisplay");

  const estimatedTotal =
    document.getElementById("estimatedTotal");

  const nightCount =
    document.getElementById("nightCount");

  const pointsSummary =
    document.getElementById("pointsSummary");

  const bookingMessage =
    document.getElementById("bookingMessage");

  const lookupForm =
    document.getElementById("lookupForm");

  const lookupName =
    document.getElementById("lookupName");

  const lookupEmail =
    document.getElementById("lookupEmail");

  const lookupMessage =
    document.getElementById("lookupMessage");

  const reservationsList =
    document.getElementById("myReservationsList");

  const cateringCheckboxes =
    document.querySelectorAll(".catering-checkbox");


  /* =====================================================
     HELPERS
  ===================================================== */

  function money(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }


  function getNights() {

    if (!checkIn?.value || !checkOut?.value) {
      return 0;
    }

    const start =
      new Date(`${checkIn.value}T00:00:00`);

    const end =
      new Date(`${checkOut.value}T00:00:00`);

    const nights =
      Math.round((end - start) / 86400000);

    return nights > 0 ? nights : 0;
  }


  function getRoomPrice() {

    if (!roomType?.value) {
      return 0;
    }

    const option =
      roomType.options[roomType.selectedIndex];

    return Number(option?.dataset.price || 0);
  }


  /* =====================================================
     CATERING
  ===================================================== */

  function getCatering() {

    const result = {
      breakfast: false,
      lunch: false,
      dinner: false,
      full_meal: false
    };

    cateringCheckboxes.forEach((checkbox) => {

      if (!checkbox.checked) {
        return;
      }

      const value =
        String(checkbox.value || "").trim();

      /*
        Accept both possible values:
        full_meal
        fullMeal
      */

      if (
        value === "full_meal" ||
        value === "fullMeal"
      ) {
        result.full_meal = true;
      }

      if (value === "breakfast") {
        result.breakfast = true;
      }

      if (value === "lunch") {
        result.lunch = true;
      }

      if (value === "dinner") {
        result.dinner = true;
      }

    });

    /*
      Full meal replaces individual meals.
    */

    if (result.full_meal) {
      result.breakfast = false;
      result.lunch = false;
      result.dinner = false;
    }

    return result;
  }


  function getCateringItems(catering, guestCount, nights) {

    const items = [];

    if (!catering) {
      return items;
    }

    /*
      FULL MEAL
    */

    if (catering.full_meal) {

      items.push({
        service_name: "Full Meal Package",
        price: 1800,
        guests: guestCount,
        days: nights,
        total_price:
          1800 * guestCount * nights
      });

      return items;
    }


    /*
      BREAKFAST
    */

    if (catering.breakfast) {

      items.push({
        service_name: "Breakfast",
        price: 500,
        guests: guestCount,
        days: nights,
        total_price:
          500 * guestCount * nights
      });

    }


    /*
      LUNCH
    */

    if (catering.lunch) {

      items.push({
        service_name: "Lunch",
        price: 700,
        guests: guestCount,
        days: nights,
        total_price:
          700 * guestCount * nights
      });

    }


    /*
      DINNER
    */

    if (catering.dinner) {

      items.push({
        service_name: "Dinner",
        price: 800,
        guests: guestCount,
        days: nights,
        total_price:
          800 * guestCount * nights
      });

    }

    return items;
  }


  function cateringTextFromBooking(booking) {

    /*
      First use the catering array returned
      by the server.
    */

    if (
      Array.isArray(booking.catering) &&
      booking.catering.length > 0
    ) {

      return booking.catering
        .map((item) => {

          return `
            <span>
              ${item.service_name}
              — ${money(item.total_price)}
            </span>
          `;

        })
        .join("<br>");

    }


    /*
      Fallback:
      Check the individual database flags.

      This is important because it prevents
      "No catering selected" when catering_total
      exists but the array is missing.
    */

    const guestCount =
      Number(booking.guests || 1);

    const nights =
      Number(booking.nights || 0);

    const fallbackItems = [];

    if (
      Number(booking.catering_full_meal) === 1
    ) {

      fallbackItems.push(
        `Full Meal Package — ${money(
          1800 * guestCount * nights
        )}`
      );

    } else {

      if (
        Number(booking.catering_breakfast) === 1
      ) {

        fallbackItems.push(
          `Breakfast — ${money(
            500 * guestCount * nights
          )}`
        );

      }

      if (
        Number(booking.catering_lunch) === 1
      ) {

        fallbackItems.push(
          `Lunch — ${money(
            700 * guestCount * nights
          )}`
        );

      }

      if (
        Number(booking.catering_dinner) === 1
      ) {

        fallbackItems.push(
          `Dinner — ${money(
            800 * guestCount * nights
          )}`
        );

      }

    }

    if (fallbackItems.length > 0) {
      return fallbackItems.join("<br>");
    }

    /*
      Last fallback:
      If catering_total is greater than zero,
      don't incorrectly say "No catering".
    */

    if (
      Number(booking.catering_total || 0) > 0
    ) {

      return `Meal Package — ${money(
        booking.catering_total
      )}`;

    }

    return "No catering selected.";
  }


  /* =====================================================
     WELCOME POPUP
  ===================================================== */

  if (exploreButton) {

    exploreButton.addEventListener("click", () => {

      if (welcomePopup) {
        welcomePopup.classList.add("hidden");
      }

    });

  }


  /* =====================================================
     MOBILE MENU
  ===================================================== */

  if (menuToggle && navMenu) {

    menuToggle.addEventListener("click", () => {

      navMenu.classList.toggle("active");

    });


    navMenu
      .querySelectorAll("a")
      .forEach((link) => {

        link.addEventListener("click", () => {

          navMenu.classList.remove("active");

        });

      });

  }


  /* =====================================================
     DATE MINIMUM
  ===================================================== */

  const today =
    new Date().toISOString().split("T")[0];

  if (checkIn) {
    checkIn.min = today;
  }

  if (checkOut) {
    checkOut.min = today;
  }


  if (checkIn) {

    checkIn.addEventListener("change", () => {

      if (checkOut && checkIn.value) {

        checkOut.min = checkIn.value;

        if (
          checkOut.value &&
          checkOut.value <= checkIn.value
        ) {

          checkOut.value = "";

        }

      }

      updateTotal();

    });

  }


  if (checkOut) {

    checkOut.addEventListener(
      "change",
      updateTotal
    );

  }


  /* =====================================================
     ROOM CARD BUTTONS
  ===================================================== */

  document
    .querySelectorAll(".text-btn[data-room-type]")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const selectedRoom =
          button.dataset.roomType;

        if (roomType) {

          roomType.value =
            selectedRoom;

        }

        const bookingSection =
          document.getElementById("booking");

        if (bookingSection) {

          bookingSection.scrollIntoView({
            behavior: "smooth"
          });

        }

        updateTotal();

      });

    });


  /* =====================================================
     CATERING CHECKBOXES
  ===================================================== */

  cateringCheckboxes.forEach((checkbox) => {

    checkbox.addEventListener("change", () => {

      const value =
        String(checkbox.value || "").trim();


      /*
        FULL MEAL SELECTED
      */

      if (
        value === "full_meal" ||
        value === "fullMeal"
      ) {

        if (checkbox.checked) {

          cateringCheckboxes.forEach((other) => {

            if (other !== checkbox) {
              other.checked = false;
            }

          });

        }

      }


      /*
        INDIVIDUAL MEAL SELECTED
        => remove full meal
      */

      if (
        value === "breakfast" ||
        value === "lunch" ||
        value === "dinner"
      ) {

        if (checkbox.checked) {

          cateringCheckboxes.forEach((other) => {

            const otherValue =
              String(other.value || "").trim();

            if (
              otherValue === "full_meal" ||
              otherValue === "fullMeal"
            ) {

              other.checked = false;

            }

          });

        }

      }

      updateTotal();

    });

  });


  /* =====================================================
     UPDATE TOTAL
  ===================================================== */

  function updateTotal() {

    const nights =
      getNights();

    const roomPrice =
      getRoomPrice();

    const guestCount =
      Number(guests?.value || 1);

    const catering =
      getCatering();


    let dailyCatering = 0;


    if (catering.full_meal) {

      dailyCatering = 1800;

    } else {

      if (catering.breakfast) {
        dailyCatering += 500;
      }

      if (catering.lunch) {
        dailyCatering += 700;
      }

      if (catering.dinner) {
        dailyCatering += 800;
      }

    }


    const roomTotal =
      roomPrice * nights;

    const cateringTotal =
      dailyCatering *
      guestCount *
      nights;

    const subtotal =
      roomTotal +
      cateringTotal;


    let points =
      Number(usePoints?.value || 0);

    if (
      !Number.isInteger(points) ||
      points < 0
    ) {
      points = 0;
    }


    const discount =
      Math.min(points, subtotal);

    const finalTotal =
      Math.max(
        0,
        subtotal - discount
      );


    if (roomTotalDisplay) {

      roomTotalDisplay.textContent =
        money(roomTotal);

    }


    if (cateringTotalDisplay) {

      cateringTotalDisplay.textContent =
        money(cateringTotal);

    }


    if (subtotalDisplay) {

      subtotalDisplay.textContent =
        money(subtotal);

    }


    if (pointsDiscountDisplay) {

      pointsDiscountDisplay.textContent =
        money(discount);

    }


    if (estimatedTotal) {

      estimatedTotal.textContent =
        money(finalTotal);

    }


    if (nightCount) {

      if (nights > 0) {

        nightCount.textContent =
          `${nights} night${
            nights === 1 ? "" : "s"
          }`;

      } else {

        nightCount.textContent =
          "Select your dates and room.";

      }

    }


    /* ===================================================
       CATERING SUMMARY
    =================================================== */

    if (cateringSummary) {

      const selected = [];

      if (catering.breakfast) {
        selected.push("Breakfast");
      }

      if (catering.lunch) {
        selected.push("Lunch");
      }

      if (catering.dinner) {
        selected.push("Dinner");
      }

      if (catering.full_meal) {
        selected.push("Full Meal Package");
      }


      if (selected.length === 0) {

        cateringSummary.textContent =
          "No catering selected.";

      } else {

        cateringSummary.textContent =
          `${selected.join(", ")} — ${money(
            cateringTotal
          )} total`;

      }

    }


    /* ===================================================
       POINT SUMMARY
    =================================================== */

    if (pointsSummary) {

      if (discount > 0) {

        pointsSummary.textContent =
          `${discount} membership points will be used.`;

      } else {

        pointsSummary.textContent =
          "No membership points used.";

      }

    }

  }


  /* =====================================================
     TOTAL EVENT LISTENERS
  ===================================================== */

  if (roomType) {

    roomType.addEventListener(
      "change",
      updateTotal
    );

  }


  if (guests) {

    guests.addEventListener(
      "change",
      updateTotal
    );

  }


  if (usePoints) {

    usePoints.addEventListener(
      "input",
      updateTotal
    );

  }


  /* =====================================================
     MEMBERSHIP LOOKUP
  ===================================================== */

  let membershipPoints = 0;


  async function checkMembership() {

    const name =
      guestName?.value.trim();

    const email =
      guestEmail?.value.trim();


    if (!name || !email) {

      membershipPoints = 0;

      if (membershipInfo) {

        membershipInfo.textContent =
          "Enter your name and email to check your membership points.";

      }

      return;

    }


    try {

      const response =
        await fetch(
          `/api/membership?name=${encodeURIComponent(
            name
          )}&email=${encodeURIComponent(
            email
          )}`
        );


      const data =
        await response.json();


      if (data.member) {

        membershipPoints =
          Number(data.points);


        if (membershipInfo) {

          membershipInfo.textContent =
            `Available membership points: ${membershipPoints}`;

        }


        if (usePoints) {

          usePoints.max =
            membershipPoints;


          if (
            Number(usePoints.value) >
            membershipPoints
          ) {

            usePoints.value =
              membershipPoints;

          }

        }

      } else {

        membershipPoints = 0;


        if (membershipInfo) {

          membershipInfo.textContent =
            data.message;

        }


        if (usePoints) {

          usePoints.max = 0;
          usePoints.value = 0;

        }

      }


      updateTotal();

    } catch (error) {

      console.error(
        "Membership error:",
        error
      );

    }

  }


  let membershipTimer;


  function scheduleMembershipLookup() {

    clearTimeout(membershipTimer);

    membershipTimer =
      setTimeout(
        checkMembership,
        500
      );

  }


  if (guestName) {

    guestName.addEventListener(
      "input",
      scheduleMembershipLookup
    );

  }


  if (guestEmail) {

    guestEmail.addEventListener(
      "input",
      scheduleMembershipLookup
    );

  }


  /* =====================================================
     BOOKING SUBMIT
  ===================================================== */

  if (bookingForm) {

    bookingForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        if (bookingMessage) {

          bookingMessage.textContent =
            "Processing reservation...";

        }


        const roomPrice =
          getRoomPrice();


        const catering =
          getCatering();


        const points =
          Number(usePoints?.value || 0);


        const payload = {

          guest_name:
            guestName.value.trim(),

          email:
            guestEmail.value.trim(),

          room_type:
            roomType.value,

          price:
            roomPrice,

          check_in:
            checkIn.value,

          check_out:
            checkOut.value,

          guests:
            Number(guests.value),

          use_points:
            points,

          catering:
            catering

        };


        console.log(
          "BOOKING PAYLOAD:",
          payload
        );


        try {

          const response =
            await fetch(
              "/api/bookings",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify(payload)
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


          /* =================================================
             CONFIRMATION CATERING
          ================================================= */

          const confirmationCatering =
            Array.isArray(data.catering) &&
            data.catering.length > 0
              ? data.catering
                  .map((item) =>
                    `${item.service_name} — ${money(
                      item.total_price
                    )}`
                  )
                  .join("<br>")
              : (
                  data.catering_full_meal
                    ? `Full Meal Package — ${money(
                        data.catering_total
                      )}`
                    : (
                        data.catering_total > 0
                          ? `Meal Package — ${money(
                              data.catering_total
                            )}`
                          : "No catering selected."
                      )
                );


          /* =================================================
             CONFIRMATION MESSAGE
          ================================================= */

          if (bookingMessage) {

            bookingMessage.innerHTML = `

              <strong>
                Reservation Confirmed!
              </strong>

              <br><br>

              Booking #${data.bookingId}

              <br>

              Room: ${data.room_type}

              <br>

              Room Number: ${data.room_number}

              <br>

              ${data.nights}
              night${
                data.nights === 1
                  ? ""
                  : "s"
              }

              <br>

              ${data.guests}
              guest${
                data.guests === 1
                  ? ""
                  : "s"
              }

              <br><br>

              <strong>
                Catering
              </strong>

              <br>

              ${confirmationCatering}

              <br>

              Catering Total:
              ${money(data.catering_total)}

              <br><br>

              Subtotal:
              ${money(data.subtotal)}

              <br>

              Membership Points Used:
              ${money(data.points_used)}

              <br><br>

              <strong>
                Total:
                ${money(data.total_price)}
              </strong>

            `;

          }


          /*
            Reset form after successful booking.
          */

          bookingForm.reset();


          if (usePoints) {
            usePoints.value = 0;
          }


          if (membershipInfo) {

            membershipInfo.textContent =
              "Enter your name and email to check your membership points.";

          }


          membershipPoints = 0;


          updateTotal();


        } catch (error) {

          console.error(
            "Booking error:",
            error
          );


          if (bookingMessage) {

            bookingMessage.textContent =
              error.message;

          }

        }

      }
    );

  }


  /* =====================================================
     RESERVATION LOOKUP
  ===================================================== */

  if (lookupForm) {

    lookupForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        const name =
          lookupName.value.trim();

        const email =
          lookupEmail.value.trim();


        if (lookupMessage) {

          lookupMessage.textContent =
            "Searching...";

        }


        if (reservationsList) {

          reservationsList.innerHTML =
            "";

        }


        try {

          const response =
            await fetch(
              `/api/bookings?name=${encodeURIComponent(
                name
              )}&email=${encodeURIComponent(
                email
              )}`
            );


          const data =
            await response.json();


          if (!response.ok) {

            throw new Error(
              data.message ||
              "Unable to find reservations."
            );

          }


          if (!data.length) {

            lookupMessage.textContent =
              "No reservations found.";

            return;

          }


          lookupMessage.textContent =
            `${data.length} reservation(s) found.`;


          data.forEach((booking) => {

            const card =
              document.createElement(
                "article"
              );


            card.className =
              "reservation-card";


            /*
              Get catering display text.
            */

            const cateringText =
              cateringTextFromBooking(
                booking
              );


            card.innerHTML = `

              <div>

                <p class="eyebrow">
                  RESERVATION #${booking.id}
                </p>


                <h3>
                  ${booking.room_type}
                </h3>


                <p>
                  Room ${booking.room_number}
                </p>


                <p>
                  ${booking.check_in}
                  →
                  ${booking.check_out}
                </p>


                <p>
                  ${booking.nights}
                  night${
                    booking.nights === 1
                      ? ""
                      : "s"
                  },

                  ${booking.guests}
                  guest${
                    booking.guests === 1
                      ? ""
                      : "s"
                  }
                </p>


                <p>

                  <strong>
                    Catering
                  </strong>

                  <br>

                  ${cateringText}

                </p>


                <p>

                  Catering Total:
                  ${money(
                    booking.catering_total
                  )}

                </p>


                <p>

                  Subtotal:
                  ${money(
                    booking.subtotal
                  )}

                </p>


                <p>

                  Membership discount:
                  ${money(
                    booking.points_used
                  )}

                </p>


                <p>

                  <strong>

                    Total:
                    ${money(
                      booking.total_price
                    )}

                  </strong>

                </p>


                <p>

                  Status:
                  ${booking.booking_status}

                </p>


                <div
                  class="reservation-actions"
                >

                  <button
                    type="button"
                    class="btn delete-reservation"
                    data-id="${booking.id}"
                  >
                    Delete Reservation
                  </button>

                </div>

              </div>

            `;


            if (reservationsList) {

              reservationsList.appendChild(
                card
              );

            }

          });


          /* =================================================
             DELETE BUTTONS
          ================================================= */

          if (reservationsList) {

            reservationsList
              .querySelectorAll(
                ".delete-reservation"
              )
              .forEach((button) => {

                button.addEventListener(
                  "click",
                  async () => {

                    const bookingId =
                      button.dataset.id;


                    const confirmed =
                      window.confirm(
                        `Delete reservation #${bookingId}?`
                      );


                    if (!confirmed) {
                      return;
                    }


                    try {

                      const response =
                        await fetch(
                          `/api/bookings/${bookingId}`,
                          {
                            method: "DELETE",

                            headers: {
                              "Content-Type":
                                "application/json"
                            },

                            body:
                              JSON.stringify({
                                name,
                                email
                              })
                          }
                        );


                      const result =
                        await response.json();


                      if (!response.ok) {

                        throw new Error(
                          result.message
                        );

                      }


                      lookupMessage.textContent =
                        result.message;


                      lookupForm.dispatchEvent(
                        new Event(
                          "submit",
                          {
                            bubbles: true,
                            cancelable: true
                          }
                        )
                      );


                    } catch (error) {

                      lookupMessage.textContent =
                        error.message;

                    }

                  }
                );

              });

          }


        } catch (error) {

          console.error(
            "Lookup error:",
            error
          );


          if (lookupMessage) {

            lookupMessage.textContent =
              error.message;

          }

        }

      }
    );

  }


  /* =====================================================
     INITIAL TOTAL
  ===================================================== */

  updateTotal();

});