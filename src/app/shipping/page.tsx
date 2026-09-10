import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: "DANDY shipping policy — free shipping across India, dispatch and delivery timelines, tracking and delivery support.",
  alternates: { canonical: "/shipping" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Shipping &amp; Delivery Policy</h1>
      <p className="mt-2 text-xs text-ink-soft">Last updated: September 2026</p>

      <div className="mt-10 space-y-10 leading-relaxed text-sm sm:text-base">
        <section>
          <h2 className="font-serif text-xl sm:text-2xl">1. Delivery Coverage</h2>
          <p className="mt-3">
            DANDY currently delivers across India. We use India Post and/or national courier partners to
            ship orders. Serviceability is generally based on courier coverage for the delivery
            pincode.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">2. Free Shipping</h2>
          <p className="mt-3">
            Shipping is free for all orders within India. No shipping charges are applied at checkout.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">3. Order Processing</h2>
          <p className="mt-3">
            Orders are typically processed within 2–3 business days after payment confirmation.
            Business days are Monday to Saturday, excluding public holidays in Tamil Nadu.
          </p>
          <p className="mt-3">
            Orders placed on Sundays or public holidays will be processed on the next business day.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">4. Dispatch and Delivery Timelines</h2>
          <p className="mt-3">
            After processing, we aim to dispatch orders within 2–3 business days.
          </p>
          <p className="mt-3">
            Estimated delivery time after dispatch is 3–7 business days for most locations within
            India. Remote or hard-to-reach areas may take longer.
          </p>
          <p className="mt-3">
            These timelines are estimates only and are not guaranteed delivery dates. Actual delivery
            depends on courier operations, weather, public holidays, local restrictions and other
            factors outside our reasonable control.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">5. Tracking</h2>
          <p className="mt-3">
            Tracking details are provided once the order is dispatched and the courier tracking number
            is available. Tracking is currently entered manually by the DANDY team. You can view
            tracking information on the order detail page in your account or in the order confirmation
            communication.
          </p>
          <p className="mt-3">
            Tracking updates may not be real-time. We are not responsible for delays or gaps in
            courier tracking information.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">6. Address Accuracy</h2>
          <p className="mt-3">
            You are responsible for providing a complete, accurate and current delivery address and
            contact number at checkout. DANDY is not liable for non-delivery, misdelivery or delays
            caused by incorrect or incomplete address details.
          </p>
          <p className="mt-3">
            Address changes are possible only before dispatch. Once an order has been shipped, address
            redirection requests may not always be feasible and may attract additional charges from the
            courier.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">7. Failed Delivery</h2>
          <p className="mt-3">
            If a courier attempts delivery and the customer is unavailable, the courier may hold the
            package at the nearest hub or attempt re-delivery. The customer should monitor any tracking
            updates or contact the courier directly if informed.
          </p>
          <p className="mt-3">
            If a package is returned to sender due to failed delivery, address refusal or
            non-availability, DANDY may contact you to arrange re-shipment. Re-shipment charges, if
            any, will be communicated before processing.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">8. Delivery Delays</h2>
          <p className="mt-3">
            Delivery delays may occur due to courier disruptions, weather conditions, public holidays,
            regional restrictions, strikes, natural events or other circumstances beyond our control.
            We are not liable for such delays.
          </p>
          <p className="mt-3">
            If your order is significantly delayed, please contact us so we can investigate with the
            courier partner.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">9. Damaged or Tampered Packages</h2>
          <p className="mt-3">
            If you receive a package that appears damaged or tampered with, please document the
            condition with photos before opening if possible. Raise the issue with us within 48 hours
            of delivery so we can investigate and assist with a replacement or refund where applicable.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">10. Circumstances Beyond DANDY&apos;s Control</h2>
          <p className="mt-3">
            DANDY is not responsible for any loss, delay or non-delivery caused by force majeure
            events, including but not limited to natural disasters, epidemics, government orders,
            courier failures, civil unrest or infrastructure failures.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">11. Contact</h2>
          <p className="mt-3">
            For shipping or delivery queries, contact:
          </p>
          <p className="mt-2">
            <strong>Email:</strong>{" "}
            <a href="mailto:dandybagsofficial@gmail.com" className="text-ink underline underline-offset-4">dandybagsofficial@gmail.com</a><br />
            <strong>Phone / WhatsApp:</strong>{" "}
            <a href="tel:+919047633332" className="text-ink underline underline-offset-4">+91 90476 33332</a>
          </p>
        </section>
      </div>
    </div>
  );
}
