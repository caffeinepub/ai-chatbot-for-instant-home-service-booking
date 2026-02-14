import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAdminBookings } from '../hooks/useAdminBookings';
import { useCompleteBooking } from '../hooks/useCompleteBooking';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, AlertCircle, Shield, MapPin, Calendar, Phone, FileText, User, Star, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { BookingWithCustomer } from '../hooks/useAdminBookings';
import { BookingStatus } from '../backend';

export default function AdminDashboardScreen() {
  const { identity } = useInternetIdentity();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: bookingsWithCustomers, isLoading: bookingsLoading, error, refetch } = useAdminBookings();
  const { mutate: completeBooking, isPending: isCompleting } = useCompleteBooking();
  const navigate = useNavigate();
  
  const [selectedBooking, setSelectedBooking] = useState<BookingWithCustomer | null>(null);
  const [completingId, setCompletingId] = useState<bigint | null>(null);

  // Check authentication
  if (!identity) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please log in to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: '/' })} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check admin loading
  if (isAdminLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check admin access
  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access the admin dashboard. Only administrators can view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: '/' })} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message || 'Failed to load bookings'}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const bookings = bookingsWithCustomers || [];
  const pendingBookings = bookings.filter(b => b.booking.status === BookingStatus.pending);
  const cancelledBookings = bookings.filter(b => b.booking.status === BookingStatus.cancelled);
  // Note: completedBookings will be empty until backend adds 'completed' status
  const completedBookings: BookingWithCustomer[] = [];

  const handleComplete = (bookingId: bigint) => {
    setCompletingId(bookingId);
    completeBooking(bookingId, {
      onSettled: () => setCompletingId(null),
    });
  };

  const getCustomerDisplay = (bookingWithCustomer: BookingWithCustomer) => {
    // Priority: booking.name -> customerProfile.name -> principal short form
    if (bookingWithCustomer.booking.name) {
      return bookingWithCustomer.booking.name;
    }
    if (bookingWithCustomer.customerProfile) {
      return bookingWithCustomer.customerProfile.name;
    }
    return bookingWithCustomer.booking.user.toString().slice(0, 8) + '...';
  };

  const getStatusBadge = (status: BookingStatus) => {
    if (status === BookingStatus.cancelled) {
      return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Pending</Badge>;
  };

  const renderBookingRow = (bookingWithCustomer: BookingWithCustomer, showCompleteAction: boolean = false) => {
    const { booking, customerProfile } = bookingWithCustomer;
    
    return (
      <TableRow 
        key={booking.id.toString()} 
        className="cursor-pointer hover:bg-accent/50"
        onClick={() => setSelectedBooking(bookingWithCustomer)}
      >
        <TableCell className="font-medium">BK-{booking.id.toString()}</TableCell>
        <TableCell>{booking.serviceCategory}</TableCell>
        <TableCell className="max-w-[200px] truncate">{booking.address}</TableCell>
        <TableCell>
          {format(Number(booking.timeWindow.start) / 1_000_000, 'MMM d, yyyy')}
          <br />
          <span className="text-xs text-muted-foreground">
            {format(Number(booking.timeWindow.start) / 1_000_000, 'h:mm a')}
          </span>
        </TableCell>
        <TableCell>{getCustomerDisplay(bookingWithCustomer)}</TableCell>
        <TableCell>
          {showCompleteAction ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleComplete(booking.id);
              }}
              disabled={isCompleting && completingId === booking.id}
            >
              {isCompleting && completingId === booking.id ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-3 w-3" />
                  Mark Complete
                </>
              )}
            </Button>
          ) : (
            getStatusBadge(booking.status)
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Track all customer bookings, progress, and reviews
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="pending">
              Pending ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Bookings</CardTitle>
                <CardDescription>
                  Bookings awaiting service completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : pendingBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending bookings
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingBookings.map(b => renderBookingRow(b, true))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Completed Bookings</CardTitle>
                <CardDescription>
                  Services that have been completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    Completed bookings will appear here once the backend adds 'completed' status support.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Currently, bookings can only be marked as pending or cancelled.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cancelled Bookings</CardTitle>
                <CardDescription>
                  Bookings that were cancelled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : cancelledBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No cancelled bookings
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancelledBookings.map(b => renderBookingRow(b, false))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Details Sheet */}
      <Sheet open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedBooking && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>Booking Details</span>
                  {getStatusBadge(selectedBooking.booking.status)}
                </SheetTitle>
                <SheetDescription>
                  ID: BK-{selectedBooking.booking.id.toString()}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Customer
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getCustomerDisplay(selectedBooking)}
                  </p>
                  {selectedBooking.customerProfile && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email: {selectedBooking.customerProfile.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Phone: {selectedBooking.customerProfile.phone}
                      </p>
                    </>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Service</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking.booking.serviceCategory}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Location
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking.booking.address}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Scheduled Time
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(Number(selectedBooking.booking.timeWindow.start) / 1_000_000, 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(Number(selectedBooking.booking.timeWindow.start) / 1_000_000, 'h:mm a')} - {format(Number(selectedBooking.booking.timeWindow.end) / 1_000_000, 'h:mm a')}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Contact
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBooking.booking.contactInfo}
                  </p>
                </div>

                {selectedBooking.booking.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Notes
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedBooking.booking.notes}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Created: {format(Number(selectedBooking.booking.createdAt) / 1_000_000, 'MMM d, yyyy h:mm a')}</p>
                  <p>Updated: {format(Number(selectedBooking.booking.updatedAt) / 1_000_000, 'MMM d, yyyy h:mm a')}</p>
                </div>

                {selectedBooking.booking.status === BookingStatus.pending && (
                  <>
                    <Separator />
                    <Button
                      className="w-full"
                      onClick={() => {
                        handleComplete(selectedBooking.booking.id);
                        setSelectedBooking(null);
                      }}
                      disabled={isCompleting}
                    >
                      {isCompleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Complete
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
