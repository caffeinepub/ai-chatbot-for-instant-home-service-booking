import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TimeWindow {
    end: Time;
    start: Time;
}
export interface Booking {
    id: bigint;
    status: BookingStatus;
    serviceCategory: string;
    contactInfo: string;
    createdAt: Time;
    user: Principal;
    updatedAt: Time;
    address: string;
    notes: string;
    timeWindow: TimeWindow;
}
export type Time = bigint;
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
}
export enum BookingStatus {
    cancelled = "cancelled",
    pending = "pending"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cancelBooking(bookingId: bigint): Promise<void>;
    createBooking(serviceCategory: string, address: string, timeWindow: TimeWindow, contactInfo: string, notes: string): Promise<bigint>;
    getBookingDetails(bookingId: bigint): Promise<Booking>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMyBookings(): Promise<Array<Booking>>;
    getServiceCategories(): Promise<Array<string>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    rescheduleBooking(bookingId: bigint, newTimeWindow: TimeWindow): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
