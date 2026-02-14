import { useParams, useNavigate } from '@tanstack/react-router';
import { useBookingDetails } from '../hooks/useBookingDetails';
import { useCancelBooking } from '../hooks/useCancelBooking';
import { useBookingReview, useSubmitReview } from '../hooks/useBookingReview';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, MapPin, Calendar, Phone, FileText, AlertCircle, X, Star, User } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { BookingStatus } from '../backend';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function BookingDetailsScreen() {
  const { bookingId } = useParams({ from: '/bookings/$bookingId' });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: booking, isLoading, error, refetch } = useBookingDetails(bookingId ? BigInt(bookingId) : null);
  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();
  const { data: review, isLoading: reviewLoading } = useBookingReview(bookingId ? BigInt(bookingId) : null);
  const { mutate: submitReview, isPending: isSubmitting } = useSubmitReview();

  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');

  const handleCancel = () => {
    if (!booking) return;
    cancelBooking(booking.id);
  };

  const handleSubmitReview = () => {
    if (!booking) return;
    submitReview({ bookingId: booking.id, rating, comments }, {
      onSuccess: () => {
        setComments('');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load booking details</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusVariant = (status: BookingStatus): 'default' | 'secondary' | 'destructive' => {
    if (status === BookingStatus.cancelled) return 'destructive';
    return 'default';
  };

  const getStatusLabel = (status: BookingStatus): string => {
    if (status === BookingStatus.cancelled) return 'cancelled';
    if (status === BookingStatus.pending) return 'pending';
    return 'unknown';
  };

  const canCancel = booking.status === BookingStatus.pending;
  const isOwner = identity && booking.user.toString() === identity.getPrincipal().toString();
  // Note: Review functionality will be enabled once backend adds 'completed' status
  const canReview = false; // Will be: isOwner && booking.status === 'completed' && !review
  const hasReview = !!review;

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/bookings' })}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Button>

        <Card className="shadow-warm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{booking.serviceCategory}</CardTitle>
                <CardDescription>
                  Booking ID: {booking.id.toString()}
                </CardDescription>
              </div>
              <Badge variant={getStatusVariant(booking.status)} className="text-sm">
                {getStatusLabel(booking.status)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {booking.name && (
              <>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Customer Name
                  </h3>
                  <p className="text-muted-foreground">{booking.name}</p>
                </div>
                <Separator />
              </>
            )}

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Service Address
              </h3>
              <p className="text-muted-foreground">{booking.address}</p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Scheduled Time
              </h3>
              <p className="text-muted-foreground">
                {format(Number(booking.timeWindow.start) / 1_000_000, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {format(Number(booking.timeWindow.start) / 1_000_000, 'h:mm a')} - {format(Number(booking.timeWindow.end) / 1_000_000, 'h:mm a')}
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Contact Information
              </h3>
              <p className="text-muted-foreground">{booking.contactInfo}</p>
            </div>

            {booking.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Special Instructions
                  </h3>
                  <p className="text-muted-foreground">{booking.notes}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Created</p>
                <p className="font-medium">
                  {format(Number(booking.createdAt) / 1_000_000, 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Last Updated</p>
                <p className="font-medium">
                  {format(Number(booking.updatedAt) / 1_000_000, 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>

            {/* Review Section - Will be enabled once backend adds 'completed' status */}
            {isOwner && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    Service Review
                  </h3>
                  
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      Review functionality will be available once the booking is marked as completed by an administrator.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Note: Backend support for 'completed' status is currently being added.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>

          {canCancel && (
            <CardFooter className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isCancelling}>
                    {isCancelling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Cancel Booking
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The booking will be marked as cancelled.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Cancel Booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
