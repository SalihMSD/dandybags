export function generateStaticParams() {
  return [{ orderId: "_" }];
}

export default function AdminOrderDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
