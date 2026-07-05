'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  FiBook,
  FiEdit,
  FiImage,
  FiPlus,
  FiShoppingBag,
  FiTrash2,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface ProductItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  comparePrice?: number;
  thumbnail?: string;
  productType: 'book' | 'merchandise' | 'other';
  stock: number | null;
  status: 'draft' | 'published';
}

export default function ProductsPageClient({
  initialProducts,
}: {
  initialProducts: ProductItem[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);

  const handleDelete = async (product: ProductItem) => {
    const result = await Swal.fire({
      title: 'Delete Product?',
      text: `Are you sure you want to permanently delete "${product.title}"? This will remove it from the shop.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      confirmButtonColor: '#E61C24',
      background: '#ffffff',
      color: '#1a1a1a',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Product removed from the shop.',
          timer: 1200,
          showConfirmButton: false,
          background: '#ffffff',
          color: '#1a1a1a',
        });
      } else {
        throw new Error(data.error || 'Failed to delete product.');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to delete product.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  };

  const toggleStatus = async (product: ProductItem) => {
    const nextStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, status: nextStatus } : p,
          ),
        );
      }
    } catch (err) {
      console.error('Failed to toggle product status', err);
    }
  };

  return (
    <div className='px-6 py-8 space-y-6 container mx-auto'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6'>
        <div>
          <h1 className='text-3xl font-bold font-display text-slate-800'>
            Shop Products
          </h1>
          <p className='text-base font-semibold text-slate-500 mt-1'>
            Manage books and other items sold on the public shop page.
          </p>
        </div>

        <button
          type='button'
          onClick={() => router.push('/admin/products/new')}
          className='inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 hover:scale-[1.01] transition-all cursor-pointer shrink-0'
        >
          <FiPlus className='h-5 w-5' />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products List Table */}
      <div className='bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm'>
        {products.length === 0 ? (
          <div className='p-16 text-center space-y-4'>
            <FiShoppingBag className='h-12 w-12 text-slate-300 mx-auto' />
            <h3 className='text-lg font-bold text-slate-600'>
              No products yet
            </h3>
            <p className='text-base font-semibold text-slate-400 max-w-sm mx-auto'>
              Add your first book or item to start selling on the shop page.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-base'>
              <thead>
                <tr className='bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-sm uppercase tracking-wider select-none'>
                  <th className='px-6 py-4'>Product</th>
                  <th className='px-6 py-4'>Type</th>
                  <th className='px-6 py-4'>Price</th>
                  <th className='px-6 py-4'>Stock</th>
                  <th className='px-6 py-4'>Status</th>
                  <th className='px-6 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    {/* Product name + thumbnail */}
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-3'>
                        <div className='h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0'>
                          {product.thumbnail ? (
                            <Image
                              src={product.thumbnail}
                              alt={product.title}
                              className='w-full h-full object-cover'
                              width={100}
                              height={100}
                            />
                          ) : (
                            <FiImage className='h-5 w-5 text-slate-350' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <p className='font-bold text-slate-800 truncate'>
                            {product.title}
                          </p>
                          <p className='text-sm font-semibold text-slate-400 truncate'>
                            /{product.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className='px-6 py-4'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold uppercase tracking-wide bg-[#E61C24]/10 border border-[#E61C24]/20 text-[#E61C24]'>
                        <FiBook className='h-3.5 w-3.5' />
                        {product.productType}
                      </span>
                    </td>

                    {/* Price */}
                    <td className='px-6 py-4'>
                      <span className='font-bold text-slate-800'>
                        ৳{product.price.toLocaleString('en-BD')}
                      </span>
                      {product.comparePrice ? (
                        <span className='ml-2 text-sm font-semibold text-slate-400 line-through'>
                          ৳{product.comparePrice.toLocaleString('en-BD')}
                        </span>
                      ) : null}
                    </td>

                    {/* Stock */}
                    <td className='px-6 py-4'>
                      <span className='font-semibold text-slate-600'>
                        {product.stock === null || product.stock === undefined
                          ? 'Unlimited'
                          : product.stock}
                      </span>
                    </td>

                    {/* Status toggle */}
                    <td className='px-6 py-4'>
                      <button
                        onClick={() => toggleStatus(product)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer select-none uppercase tracking-wide ${
                          product.status === 'published'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${product.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
                        />
                        <span>
                          {product.status === 'published'
                            ? 'Published'
                            : 'Draft'}
                        </span>
                      </button>
                    </td>

                    {/* Edit/Delete Actions */}
                    <td className='px-6 py-4 text-right'>
                      <div className='flex items-center justify-end gap-2.5'>
                        <button
                          onClick={() =>
                            router.push(`/admin/products/${product.id}/edit`)
                          }
                          className='p-2 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24] border border-[#E61C24]/20 text-[#E61C24] hover:text-white transition-all cursor-pointer hover:shadow-lg hover:shadow-[#E61C24]/10'
                          title='Edit Product'
                        >
                          <FiEdit className='h-4 w-4' />
                        </button>

                        <button
                          onClick={() => handleDelete(product)}
                          className='p-2 rounded-lg bg-rose-50 hover:bg-rose-500 border border-rose-200 text-rose-500 hover:text-white transition-all cursor-pointer hover:shadow-lg hover:shadow-rose-500/10'
                          title='Delete Product'
                        >
                          <FiTrash2 className='h-4 w-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
