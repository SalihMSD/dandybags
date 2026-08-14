export function generateStaticParams() {
  return [{ orderId: "_" }];
}

export default function OrderDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
