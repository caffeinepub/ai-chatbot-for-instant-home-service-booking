# Specification

## Summary
**Goal:** Add a simple admin dashboard and supporting APIs so an authenticated admin can track all customers’ bookings (with status, customer info, and address) and reviews, and can mark bookings as completed.

**Planned changes:**
- Add admin-only backend APIs to list all bookings (not just the caller’s), with filtering/splitting by status and including booking details, owner principal/profile (if available), and address.
- Add admin-only backend API to mark a pending booking as completed (reject completing cancelled bookings).
- Add backend support for reviews tied to a booking: booking owner can create a rating (1–5) + comment only after completion; admin can fetch reviews across bookings (and/or by bookingId).
- Add a new Admin Dashboard route (e.g., `/admin`) that shows separate Pending and Completed booking lists (optionally Cancelled), with customer identifier and address, and a simple booking details view including review data when present.
- Add admin UI actions to mark a pending booking as completed, including loading/error states and automatic list refresh.
- Add a minimal customer review submission UI for booking owners on completed bookings, with loading/error handling and read-only display after submission.

**User-visible outcome:** Admin users can open an easy-to-access dashboard to view all bookings by status, see customer identifiers and addresses, review status/details per booking, and mark pending bookings as completed; customers can submit a simple rating and comment for their completed bookings.
