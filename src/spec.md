# Specification

## Summary
**Goal:** Add an optional customer name to the chat-based booking flow and persist/display it with bookings.

**Planned changes:**
- Update the chat-based “new booking” flow to prompt for an optional customer name and allow skipping.
- Include the provided name (or null/empty when skipped) in the in-progress booking draft and in the booking confirmation/summary step.
- Extend the backend Booking data model to store an optional customer name and update the createBooking API to accept and persist it.
- Update read APIs to return the optional customer name and ensure existing bookings continue to load with name defaulting to null/empty.
- Update frontend API bindings/mutations to send the optional customer name when creating a booking.
- Display the stored customer name in the Booking Details screen and Admin Dashboard booking details panel with graceful fallback when missing.

**User-visible outcome:** Users can optionally provide their name during a new booking chat; if provided it is saved with the booking and shown in booking details (including admin views), and if skipped the booking still completes normally.
