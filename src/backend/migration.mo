import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  type TimeWindow = {
    start : Time.Time;
    end : Time.Time;
  };

  type OldBooking = {
    id : Nat;
    user : Principal.Principal;
    serviceCategory : Text;
    address : Text;
    timeWindow : TimeWindow;
    contactInfo : Text;
    notes : Text;
    status : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type BookingStatus = {
    #pending;
    #cancelled;
  };

  type NewBooking = {
    id : Nat;
    user : Principal.Principal;
    serviceCategory : Text;
    address : Text;
    timeWindow : TimeWindow;
    contactInfo : Text;
    notes : Text;
    status : BookingStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type OldActor = {
    bookings : Map.Map<Nat, OldBooking>;
  };

  type NewActor = {
    bookings : Map.Map<Nat, NewBooking>;
  };

  public func run(old : OldActor) : NewActor {
    let newBookings = old.bookings.map<Nat, OldBooking, NewBooking>(
      func(_id, oldBooking) {
        { oldBooking with status = convertStatus(oldBooking.status) };
      }
    );
    { bookings = newBookings };
  };

  func convertStatus(status : Text) : BookingStatus {
    switch (status) {
      case ("pending") { #pending };
      case _ { #cancelled };
    };
  };
};
