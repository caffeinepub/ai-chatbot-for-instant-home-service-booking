import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  type OldBooking = {
    id : Nat;
    user : Principal;
    serviceCategory : Text;
    address : Text;
    timeWindow : {
      start : Time.Time;
      end : Time.Time;
    };
    contactInfo : Text;
    notes : Text;
    status : {
      #pending;
      #cancelled;
    };
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type OldActor = {
    bookings : Map.Map<Nat, OldBooking>;
  };

  type NewBooking = {
    id : Nat;
    user : Principal;
    name : ?Text; // New optional name field
    serviceCategory : Text;
    address : Text;
    timeWindow : {
      start : Time.Time;
      end : Time.Time;
    };
    contactInfo : Text;
    notes : Text;
    status : {
      #pending;
      #cancelled;
    };
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type NewActor = {
    bookings : Map.Map<Nat, NewBooking>;
  };

  public func run(old : OldActor) : NewActor {
    let newBookings = old.bookings.map<Nat, OldBooking, NewBooking>(
      func(_id, oldBooking) {
        { oldBooking with name = null };
      }
    );
    { bookings = newBookings };
  };
};
