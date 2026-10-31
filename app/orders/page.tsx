import { listOrders } from '@/server/services/order-service';
import { OrdersClient } from '@/components/orders/OrdersClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const initialData = await listOrders({ page: 1, pageSize: 25 });

  return (
    <OrdersClient
      initialOrders={initialData.orders as any}
      initialPagination={initialData.pagination}
    />
  );
}
