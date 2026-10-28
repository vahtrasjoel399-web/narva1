import { Suspense } from "react";
import { BookingsManager } from "@/components/admin/BookingsManager";

export const metadata = { title: "Bookings" };

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsManager />
    </Suspense>
  );
}
