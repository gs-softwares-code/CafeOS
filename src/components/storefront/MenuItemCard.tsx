'use client';

import React from 'react';
import { Plus, Minus, Clock, Star } from 'lucide-react';
import { MenuItem } from '@/lib/types';

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: number;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
}

export function MenuItemCard({
  item,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
}: MenuItemCardProps) {
  const isAvailable = item.is_available;

  return (
    <article
      className={`group flex flex-col rounded-2xl overflow-hidden border bg-white transition-all duration-300 ${
        isAvailable
          ? 'border-[#E8DED1] hover:border-amber-400 hover:shadow-xl hover:-translate-y-1'
          : 'border-stone-200 opacity-60 bg-stone-50'
      }`}
    >
      {/* 16:9 Image Container with Hero Overlay */}
      <div className="relative w-full aspect-video bg-stone-100 overflow-hidden">
        <img
          src={item.image_url}
          alt={item.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            !isAvailable ? 'grayscale' : ''
          }`}
          loading="lazy"
        />

        {/* Gradient Scrim for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {/* Veg / Non-Veg Indicator */}
          <span
            className={`flex h-5 w-5 items-center justify-center border-2 rounded-md bg-white/95 shadow-sm backdrop-blur-xs ${
              item.is_veg ? 'border-emerald-600' : 'border-rose-600'
            }`}
            title={item.is_veg ? 'Pure Vegetarian' : 'Non-Vegetarian'}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            />
          </span>

          {/* Rating or Prep Time Pill */}
          <div className="flex items-center gap-1.5">
            {item.preparation_time_minutes && (
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                <Clock className="h-3 w-3 text-amber-400" />
                <span>{item.preparation_time_minutes}m</span>
              </span>
            )}
            <span className="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              <Star className="h-3 w-3 fill-white" />
              <span>4.6</span>
            </span>
          </div>
        </div>

        {/* Bottom Title on Image (Zomato / Swiggy Card Style) */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white pointer-events-none">
          <div className="pr-2">
            <h3 className="text-base sm:text-lg font-bold leading-tight drop-shadow-md line-clamp-1">
              {item.name}
            </h3>
            <div className="text-xs text-white/90 font-medium drop-shadow-sm mt-0.5">
              {item.is_veg ? 'Fresh Pure Veg Specialty' : 'Signature Handcrafted Bake'}
            </div>
          </div>
        </div>

        {/* Sold Out Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 text-center">
            <span className="bg-white/95 text-stone-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md tracking-wide uppercase">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Card Content & Actions */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        {/* Description */}
        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {/* Price & Action Button Footer */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-600 font-semibold">
              Price
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#1C130E]">
                ₹{item.price}
              </span>
              <span className="text-xs text-stone-600 font-medium">INR</span>
            </div>
          </div>

          {/* Add to Cart Button */}
          {isAvailable && (
            <div>
              {quantityInCart === 0 ? (
                <button
                  onClick={() => onAddToCart(item)}
                  className="flex items-center gap-1.5 bg-[#1C130E] hover:bg-[#D9531E] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer active:scale-95 border border-amber-600/30"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-400" />
                  <span>ADD</span>
                </button>
              ) : (
                <div className="flex items-center bg-[#1C130E] text-white rounded-xl px-2.5 py-1 shadow-md border border-amber-500">
                  <button
                    onClick={() => onUpdateQuantity(item.id, quantityInCart - 1)}
                    className="h-6 w-6 rounded-lg flex items-center justify-center text-white hover:bg-stone-800 transition cursor-pointer"
                    title="Decrease"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-xs font-extrabold text-amber-400">
                    {quantityInCart}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, quantityInCart + 1)}
                    className="h-6 w-6 rounded-lg flex items-center justify-center text-white hover:bg-stone-800 transition cursor-pointer"
                    title="Increase"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
