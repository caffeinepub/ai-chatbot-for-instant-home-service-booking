import Map "mo:core/Map";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Set "mo:core/Set";
import Runtime "mo:core/Runtime";
import Migration "migration";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  // Access Control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Service Categories Catalog
  let serviceCategories = List.fromArray([
    "Cleaning",
    "Plumbing",
    "Electrical",
    "HVAC",
    "Handyman",
  ]);

  public query ({ caller }) func getServiceCategories() : async [Text] {
    serviceCategories.toArray();
  };

  // Booking Types and Storage
  type TimeWindow = {
    start : Time.Time;
    end : Time.Time;
  };

  type BookingStatus = {
    #pending;
    #cancelled;
  };

  type Booking = {
    id : Nat;
    user : Principal;
    serviceCategory : Text;
    address : Text;
    timeWindow : TimeWindow;
    contactInfo : Text;
    notes : Text;
    status : BookingStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  let bookings = Map.empty<Nat, Booking>();

  // Track completed booking count per user
  let userBookingCounts = Map.empty<Principal, Nat>();

  var nextBookingId = 1;

  // Review Types and Storage
  public type Review = {
    bookingId : Nat;
    user : Principal;
    rating : Nat; // 1-5
    comments : Text;
    createdAt : Time.Time;
  };

  let reviews = Map.empty<Nat, Review>(); // Keyed by bookingId

  // Customer Loyalty Tiers
  public type LoyaltyTier = {
    #bronze;
    #silver;
    #gold;
  };

  type CustomerLoyalty = {
    tier : LoyaltyTier;
    totalBookings : Nat;
    totalReviews : Nat;
  };

  // Customer info for admin tracking
  public type CustomerInfo = {
    principal : Principal;
    profile : ?UserProfile;
    loyalty : CustomerLoyalty;
  };

  // Booking info with customer details for admin tracking
  public type BookingWithCustomer = {
    booking : Booking;
    customerProfile : ?UserProfile;
  };

  // Create Booking
  public shared ({ caller }) func createBooking(
    serviceCategory : Text,
    address : Text,
    timeWindow : TimeWindow,
    contactInfo : Text,
    notes : Text,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be a user to create a booking");
    };

    let bookingId = nextBookingId;
    nextBookingId += 1;

    let newBooking : Booking = {
      id = bookingId;
      user = caller;
      serviceCategory;
      address;
      timeWindow;
      contactInfo;
      notes;
      status = #pending;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    bookings.add(bookingId, newBooking);
    bookingId;
  };

  // Get a user's bookings
  public query ({ caller }) func getMyBookings() : async [Booking] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be a user to view bookings");
    };
    bookings.values().toArray().filter(
      func(b) { b.user == caller }
    );
  };

  // Get booking details (with access control)
  public query ({ caller }) func getBookingDetails(bookingId : Nat) : async Booking {
    switch (bookings.get(bookingId)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?booking) {
        if (booking.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Cannot view booking");
        };
        booking;
      };
    };
  };

  // Cancel a booking
  public shared ({ caller }) func cancelBooking(bookingId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be a user to cancel bookings");
    };

    switch (bookings.get(bookingId)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?booking) {
        if (booking.user != caller) {
          Runtime.trap("Unauthorized: Can only cancel your own bookings");
        };
        if (booking.status == #cancelled) {
          Runtime.trap("Booking is already cancelled");
        };

        let updatedBooking : Booking = {
          id = booking.id;
          user = booking.user;
          serviceCategory = booking.serviceCategory;
          address = booking.address;
          timeWindow = booking.timeWindow;
          contactInfo = booking.contactInfo;
          notes = booking.notes;
          status = #cancelled;
          createdAt = booking.createdAt;
          updatedAt = Time.now();
        };

        bookings.add(bookingId, updatedBooking);
      };
    };
  };

  // Reschedule a booking
  public shared ({ caller }) func rescheduleBooking(bookingId : Nat, newTimeWindow : TimeWindow) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be a user to reschedule bookings");
    };

    switch (bookings.get(bookingId)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?booking) {
        if (booking.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only reschedule your own bookings");
        };
        if (booking.status == #cancelled) {
          Runtime.trap("Cannot reschedule a cancelled booking");
        };

        let updatedBooking : Booking = {
          id = booking.id;
          user = booking.user;
          serviceCategory = booking.serviceCategory;
          address = booking.address;
          timeWindow = newTimeWindow;
          contactInfo = booking.contactInfo;
          notes = booking.notes;
          status = booking.status;
          createdAt = booking.createdAt;
          updatedAt = Time.now();
        };

        bookings.add(bookingId, updatedBooking);
      };
    };
  };
};
