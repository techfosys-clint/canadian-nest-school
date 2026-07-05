import React from 'react';
import ShopCheckoutFormClient from './ShopCheckoutFormClient';

export const metadata = {
  title: 'Checkout - Canadian Nest Shop',
  description: 'Complete your shop order checkout.',
};

export default function ShopCheckoutPage() {
  return (
    <div className='min-h-screen bg-zinc-50/50'>
      <ShopCheckoutFormClient />
    </div>
  );
}
