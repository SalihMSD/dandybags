import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "DANDY terms of sale, account use, cancellation, delivery, returns and consumer terms for Karur, Tamil Nadu.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 md:px-8">
      <h1 className="font-serif text-4xl sm:text-5xl">Terms & Conditions</h1>
      <p className="mt-2 text-xs text-ink-soft">Last updated: September 2026</p>

      <div className="mt-10 space-y-10 leading-relaxed text-sm sm:text-base">
        <section>
          <h2 className="font-serif text-xl sm:text-2xl">1. About DANDY</h2>
          <p className="mt-3">
            DANDY is a bag brand operated as a sole proprietorship from Karur, Tamil Nadu – 639002, India.
            We design, manufacture and sell bags for school, college, travel and everyday use through our
            website and selected retail channels.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">2. Website and Account Use</h2>
          <p className="mt-3">
            You may browse our website without creating an account. Certain features, such as checkout,
            order tracking and reviews, require a registered account. You are responsible for keeping
            your account credentials secure and for all activity under your account.
          </p>
          <p className="mt-3">
            We may suspend or terminate accounts that are used for fraudulent, abusive or unlawful
            activity.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">3. Customer Information Accuracy</h2>
          <p className="mt-3">
            You agree to provide accurate, current and complete information during checkout and account
            registration. DANDY is not responsible for delays, non-delivery or incorrect orders caused by
            inaccurate address, contact or payment details supplied by you.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">4. Products, Images and Descriptions</h2>
          <p className="mt-3">
            We make every effort to display product images and descriptions accurately. Colours and
            appearances may vary slightly from what is shown on screen due to lighting, screen settings
            and manufacturing finishes. Product specifications, dimensions and weights are indicative.
          </p>
          <p className="mt-3">
            Prices marked “to be updated” are indicative and do not constitute an offer to sell at that
            price.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">5. Product Availability</h2>
          <p className="mt-3">
            All products are subject to availability. We endeavour to keep stock information current, but
            stock levels may change between the time of ordering and payment confirmation. If an item is
            unavailable after payment, we will contact you with options such as replacement, partial
            refund or full refund.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">6. Pricing, MRP, Discounts and Coupons</h2>
          <p className="mt-3">
            Prices are displayed in Indian Rupees (INR). Where an MRP is shown, the selling price may be
            lower. Discount percentages are calculated against the MRP.
          </p>
          <p className="mt-3">
            Coupons and promotions are subject to their own terms, including minimum order values,
            expiry dates and usage limits. Only one coupon may typically be applied per order unless
            stated otherwise. Coupons are void where prohibited.
          </p>
          <p className="mt-3">
            DANDY reserves the right to correct pricing errors. If an item is priced incorrectly, we may
            cancel the order or contact you for further instructions before processing.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">7. Orders and Order Acceptance</h2>
          <p className="mt-3">
            Placing an order does not guarantee acceptance. DANDY reserves the right to refuse or cancel
            any order for reasons including, but not limited to, stock unavailability, pricing errors,
            suspected fraud or inability to process payment.
          </p>
          <p className="mt-3">
            Orders are confirmed only after successful payment verification. An order confirmation
            message or email does not constitute acceptance if payment has not cleared.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">8. Payment and Payment Failures</h2>
          <p className="mt-3">
            Payments are processed through Razorpay. You may be redirected to Razorpay&apos;s secure
            checkout to complete payment. DANDY does not store your full card or UPI credentials.
          </p>
          <p className="mt-3">
            If a payment fails or is declined, the order may remain in a pending state. You may retry
            payment or contact us for assistance. Duplicate or erroneous payments will be refunded
            following manual verification.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">9. Customer Cancellation</h2>
          <p className="mt-3">
            You may cancel an order yourself only while its status is <strong>PLACED</strong>.
            Once an order moves to CONFIRMED, SHIPPED, DELIVERED or CANCELLED, self-service
            cancellation is no longer available.
          </p>
          <p className="mt-3">
            For paid orders that are cancelled, the order status will be updated to CANCELLED.
            Any refund, if applicable, will be processed manually in accordance with our
            Cancellation, Return &amp; Refund Policy.
          </p>
          <p className="mt-3">
            Cancellation is not available through this website once the order has progressed beyond the
            PLACED stage. For exceptional cases, please contact us.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">10. Shipping and Delivery</h2>
          <p className="mt-3">
            Shipping details, timelines, charges and coverage are set out in our{" "}
            <Link href="/shipping" className="text-ink underline underline-offset-4">Shipping &amp; Delivery Policy</Link>.
          </p>
          <p className="mt-3">
            Delivery estimates are indicative and not guaranteed. Delays caused by courier partners,
            weather, public holidays or other circumstances outside our reasonable control do not
            constitute a breach of contract.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">11. Returns, Defective/Wrong Products and Refunds</h2>
          <p className="mt-3">
            Our returns, exchanges and refund terms are described in our{" "}
            <Link href="/returns" className="text-ink underline underline-offset-4">Cancellation, Return &amp; Refund Policy</Link>.
            No general change-of-mind returns are offered unless specifically agreed in writing.
          </p>
          <p className="mt-3">
            Refunds, where approved, are normally processed within 5–7 business days. The time taken
            for the refund to appear in your account may vary depending on your bank or payment
            provider.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">12. Reviews and User Content</h2>
          <p className="mt-3">
            You may write reviews for products you have purchased. Reviews must be honest, relevant and
            respectful. DANDY may moderate, hide or remove reviews that are offensive, fraudulent or
            irrelevant. By submitting a review, you grant DANDY a non-exclusive licence to display it
            on our website and marketing materials.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">13. Intellectual Property</h2>
          <p className="mt-3">
            All content on this website, including text, images, logos, designs and trademarks, is the
            property of DANDY or its licensors and is protected by applicable intellectual property laws.
            You may not copy, reproduce, distribute or create derivative works without our prior written
            consent.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">14. Prohibited or Fraudulent Use</h2>
          <p className="mt-3">
            You may not use this website for any unlawful, fraudulent or unauthorised purpose. This
            includes misusing coupons, creating fake accounts, placing orders without intent to pay, or
            providing false information. We reserve the right to cooperate with law enforcement and
            take legal action where necessary.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">15. Website Availability</h2>
          <p className="mt-3">
            We strive to keep the website available, but do not guarantee uninterrupted access. Features,
            prices and availability may change without notice. We may suspend or withdraw parts of the
            site for maintenance, updates or operational reasons.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">16. Force Majeure</h2>
          <p className="mt-3">
            We are not liable for delays or failures in performance caused by circumstances beyond our
            reasonable control, including natural disasters, courier disruptions, government orders,
            internet outages, strikes or public emergencies.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">17. Limitation of Liability</h2>
          <p className="mt-3">
            To the maximum extent permitted by law, DANDY shall not be liable for any indirect,
            incidental, special or consequential losses arising from your use of this website or our
            products. Our total liability to you in respect of any single order shall not exceed the
            amount actually paid by you for that order.
          </p>
          <p className="mt-3">
            Nothing in these terms excludes liability for death or personal injury caused by negligence,
            or for fraud or fraudulent misrepresentation, or for any matter that cannot legally be
            excluded.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">18. Changes to These Terms</h2>
          <p className="mt-3">
            We may update these terms from time to time to reflect changes in our services, technology
            or legal requirements. The updated terms will be posted on this page with a revised date.
            Continued use of the website after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">19. Governing Law</h2>
          <p className="mt-3">
            These terms are governed by the laws of India. Courts in Karur, Tamil Nadu shall have
            exclusive jurisdiction over any dispute arising from these terms or your use of the website,
            subject to any statutory rights you may have to initiate proceedings elsewhere.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">20. Consumer Rights and Grievance Redressal</h2>
          <p className="mt-3">
            These terms are to be read alongside applicable consumer protection laws, including the
            Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.
            Nothing in these terms restricts your statutory rights as a consumer.
          </p>
          <p className="mt-3">
            For any complaint or grievance, you may contact:
          </p>
          <p className="mt-2">
            <strong>Grievance Officer:</strong> Muhammad Salih A M<br />
            <strong>Designation:</strong> Grievance Officer, Dandy Bags<br />
            <strong>Email:</strong>{" "}
            <a href="mailto:dandybagsofficial@gmail.com" className="text-ink underline underline-offset-4">dandybagsofficial@gmail.com</a><br />
            <strong>Phone:</strong>{" "}
            <a href="tel:+919047633332" className="text-ink underline underline-offset-4">+91 90476 33332</a>
          </p>
          <p className="mt-3">
            We will endeavour to resolve grievances promptly and fairly. You may also approach the
            appropriate consumer dispute redressal forum if unsatisfied.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl sm:text-2xl">21. Contact</h2>
          <p className="mt-3">
            Dandy Bags<br />
            Karur, Tamil Nadu – 639002, India<br />
            GSTIN: 33AHUPU9367K1Z7
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
