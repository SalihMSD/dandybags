import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation, Return & Refund Policy",
  description: "DANDY cancellation, return and refund policy — how to cancel an order, report issues and request refunds.",
  alternates: { canonical: "/returns" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Cancellation, Return &amp; Refund Policy</h1>
      <p className="mt-2 text-xs text-ink-soft">Last updated: September 2026</p>

      <div className="mt-10 space-y-10 leading-relaxed text-sm sm:text-base">
        <section>
          <h2 className="font-serif text-xl sm:text-2xl">1. Order Cancellation</h2>
          <p className="mt-3">
            You may cancel an order yourself from the order detail page while its status is{" "}
            <strong>PLACED</strong>. Once the order moves to CONFIRMED, SHIPPED, DELIVERED or
            CANCELLED, self-service cancellation is no longer available on the website.
          </p>
          <p className="mt-3">
            To cancel, open the order in your account and use the <strong>Cancel Order</strong> option.
            You will receive a confirmation once cancellation is complete.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">2. Paid Order Cancellation</h2>
          <p className="mt-3">
            If you cancel a paid order, the order status will be updated to <strong>CANCELLED</strong>.
            Any applicable refund is processed manually. We do not currently offer automatic refunds
            through the payment gateway.
          </p>
          <p className="mt-3">
            Refunds, when approved, are normally processed within <strong>5–7 business days</strong>.
            The time taken for the refund to appear in your bank account or payment instrument may
            vary depending on your bank or payment provider.
          </p>
          <p className="mt-3">
            The refund amount will be based on the amount actually paid by you, after applying any
            applicable coupons or discounts. Delivery charges, if any, may be deducted unless the
            cancellation is due to circumstances on our side.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">3. Pending or Failed Payment Orders</h2>
          <p className="mt-3">
            If your order is still in <strong>PENDING</strong> or <strong>FAILED</strong> payment
            status, you may cancel it while the order status is PLACED. No refund is required unless a
            payment was actually captured from your account.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">4. When Cancellation Is Unavailable</h2>
          <p className="mt-3">
            Self-service cancellation is not available once an order has been:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Confirmed for processing</li>
            <li>Shipped or in transit</li>
            <li>Delivered</li>
            <li>Already cancelled</li>
          </ul>
          <p className="mt-3">
            For exceptional situations, please contact us. We will review requests on a case-by-case
            basis but cannot guarantee cancellation after dispatch.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">5. Eligible Product Issues</h2>
          <p className="mt-3">
            We do not offer general change-of-mind returns. However, if you receive a product that is:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Damaged or defective</li>
            <li>Wrong item or wrong variant</li>
            <li>Materially different from what was ordered</li>
            <li>Incorrect quantity</li>
          </ul>
          <p className="mt-3">
            Please contact us promptly so we can resolve the issue fairly.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">6. Damaged, Wrong or Defective Product</h2>
          <p className="mt-3">
            If you receive a damaged, wrong or defective product, please report it within{" "}
            <strong>48 hours</strong> of delivery. You may raise the issue through your order page or
            by contacting us directly.
          </p>
          <p className="mt-3">
            We may ask for photos or videos to help verify the issue. An unboxing video is helpful but
            is not an absolute mandatory requirement for every valid claim. We will assess each case
            on its merits.
          </p>
          <p className="mt-3">
            Where the claim is verified and a replacement or refund is reasonably possible, we will
            proceed accordingly.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">7. How to Report an Issue</h2>
          <p className="mt-3">
            To report a delivery issue, damaged product or wrong item:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Open your order in your DANDY account and use the available support option, or</li>
            <li>Email us at{" "}
              <a href="mailto:dandybagsofficial@gmail.com" className="text-ink underline underline-offset-4">dandybagsofficial@gmail.com</a> with your order ID, photos and details</li>
            <li>Message us on WhatsApp at <a href="tel:+919047633332" className="text-ink underline underline-offset-4">+91 90476 33332</a></li>
          </ul>
          <p className="mt-3">
            Please include your order ID, the product SKU or name, and a brief description of the
            issue.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">8. Evidence and Supporting Information</h2>
          <p className="mt-3">
            Clear photos or videos of the product, packaging and any damage help us resolve claims
            faster. While an unboxing video is not mandatory for every claim, providing supporting
            evidence reduces the time needed for verification.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">9. Replacement or Refund Options</h2>
          <p className="mt-3">
            For verified defective, damaged or wrong-product cases, we may offer:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Replacement of the affected item, where stock is available</li>
            <li>Refund of the affected item or order, where replacement is not feasible</li>
            <li>Partial refund where only part of the order is affected</li>
          </ul>
          <p className="mt-3">
            The option offered will depend on product availability, verification outcome and the
            specific circumstances of the case.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">10. Return Shipping</h2>
          <p className="mt-3">
            If you need to return a product for a verified defective, damaged or wrong-product claim,
            DANDY will bear the return shipping cost where the claim is approved. We will arrange or
            reimburse return shipping after verifying the issue.
          </p>
          <p className="mt-3">
            For change-of-mind returns or non-eligible cases, return shipping, if accepted, may be the
            customer&apos;s responsibility and will be communicated in advance.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">11. Refund Processing</h2>
          <p className="mt-3">
            Approved refunds are processed manually. We aim to complete processing within{" "}
            <strong>5–7 business days</strong> of approval. Once processed, the refund will be issued
            to the original payment method used for the order.
          </p>
          <p className="mt-3">
            Please allow additional time for your bank or payment provider to reflect the refund in
            your account. We are not responsible for delays caused by financial institutions.
          </p>
          <p className="mt-3">
            Refunds are based on the actual amount paid, after applying coupons, discounts and any
            applicable deductions.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">12. Coupon and Discount Orders</h2>
          <p className="mt-3">
            If an order was placed using a coupon or discount, the refund amount will be calculated on
            the net amount actually paid. In cases where the full order is returned or cancelled after
            coupon use, the coupon may not be reinstated unless specifically agreed.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">13. Situations That May Not Qualify</h2>
          <p className="mt-3">
            The following situations generally do not qualify for return or refund unless otherwise
            agreed:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Change of mind after delivery</li>
            <li>Minor colour or finish variations due to screen settings or lighting</li>
            <li>Damage caused by misuse, accident or normal wear after delivery</li>
            <li>Products purchased on final sale or clearance, if clearly marked</li>
            <li>Orders returned without prior communication or approval</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">14. Consumer Rights</h2>
          <p className="mt-3">
            This policy is to be read alongside applicable Indian consumer protection laws, including
            the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.
            Nothing in this policy restricts your statutory consumer rights.
          </p>
          <p className="mt-3">
            Where a product is found to be defective, not as described or unfit for purpose, you may
            have additional rights under applicable law. We will cooperate in good faith to resolve
            such matters.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">15. Contact and Grievance</h2>
          <p className="mt-3">
            For cancellation, return, refund or grievance matters, contact:
          </p>
          <p className="mt-2">
            <strong>Grievance Officer:</strong> Muhammad Salih A M<br />
            <strong>Designation:</strong> Grievance Officer, Dandy Bags<br />
            <strong>Email:</strong>{" "}
            <a href="mailto:dandybagsofficial@gmail.com" className="text-ink underline underline-offset-4">dandybagsofficial@gmail.com</a><br />
            <strong>Phone / WhatsApp:</strong>{" "}
            <a href="tel:+919047633332" className="text-ink underline underline-offset-4">+91 90476 33332</a>
          </p>
          <p className="mt-3">
            We will endeavour to resolve complaints fairly and promptly. If you remain unsatisfied,
            you may approach the appropriate consumer dispute redressal commission or forum.
          </p>
        </section>
      </div>
    </div>
  );
}
