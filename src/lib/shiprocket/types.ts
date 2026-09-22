export interface ShiprocketAuthToken {
  token: string;
  expiresAt: number;
}

export interface ShiprocketAuthResponse {
  token: string;
}

export interface ShiprocketShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  landmark?: string;
  email?: string;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  qty: number;
  units: number;
  selling_price: number;
  tax_rate: number;
  tax_value: number;
  discount: number;
}

export interface ShiprocketPackage {
  weight: number;
  length: number;
  breadth: number;
  height: number;
}

export interface ShiprocketCreateOrderPayload {
  order_id: string;
  order_date: string;
  shipping_customer_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_pincode: string;
  shipping_phone: string;
  shipping_email?: string;
  shipping_landmark?: string;
  billing_customer_name: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_pincode: string;
  billing_phone: string;
  billing_email?: string;
  billing_landmark?: string;
  order_items: ShiprocketOrderItem[];
  payment_type: string;
  order_amount: number;
  order_currency: string;
  weight: ShiprocketPackage;
  pickup_location: string;
  fuel_price: string;
  extra_params?: string;
  channel_id?: string;
}

export interface ShiprocketCreateOrderResponse {
  order_id: string;
  order_date: string;
  order_status: string;
  message: string;
  shipment_id: string;
  awb_code: string | null;
}

export interface ShiprocketAssignAwbResponse {
  status_code: number;
  status: boolean;
  message: string;
  data?: {
    shipment_id: string;
    awb_code: string;
    courier_company: string;
  };
}

export interface ShiprocketPickupResponse {
  status_code: number;
  status: boolean;
  message: string;
}

export interface ShiprocketLabelResponse {
  status_code: number;
  status: boolean;
  message: string;
  data?: {
    url: string;
  };
}

export interface ShiprocketTrackingEvent {
  date: string;
  activity: string;
  location: string;
  status: string;
  code: string;
  charge: string;
}

export interface ShiprocketTrackResponse {
  status_code: number;
  status: boolean;
  message: string;
  data?: {
    track_status: string;
    track_url: string;
    shipment_track: {
      awb_status: string;
      status: string;
      courier_name: string;
      activity: ShiprocketTrackingEvent[];
    };
  };
}

export interface ShiprocketServiceabilityResponse {
  status_code: number;
  message: string;
  data?: {
    is_serviceable: number;
    cod: number;
    prepaid: number;
    rate: {
      total_charge: number;
    };
  };
}

export interface ShiprocketOrderLookupResult {
  providerOrderId: string;
  awb: string | null;
  courierName: string | null;
  status: string | null;
}

export interface ShiprocketOrderListResponse {
  data: Array<{
    shipment_id?: string | number;
    shipment?: {
      id?: string | number;
      awb?: string | null;
      courier?: string | null;
    };
    awb_code?: string | null;
    courier_name?: string | null;
    status?: string;
    order_id?: number;
  }>;
}
