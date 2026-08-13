import { site } from "./site";

export function whatsappUrl(text: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function productEnquiryMessage(name: string, sku: string) {
  return `Hello DANDY, I am interested in ${name} / ${sku}.`;
}

export function productEnquiryUrl(name: string, sku: string) {
  return whatsappUrl(productEnquiryMessage(name, sku));
}

export function generalWhatsappUrl() {
  return whatsappUrl("Hello DANDY, I would like to know more about your bags.");
}

export function wholesaleWhatsappUrl() {
  return whatsappUrl(
    "Hello DANDY, I would like to discuss a wholesale / dealer partnership.",
  );
}
