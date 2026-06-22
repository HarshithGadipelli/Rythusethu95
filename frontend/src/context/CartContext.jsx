import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const stored = localStorage.getItem("rythusethu_cart");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("rythusethu_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (crop, quantity, isPrebooked = false) => {
    setCart(prev => {
      const existing = prev.find(item => item.crop._id === crop._id && item.isPrebooked === isPrebooked);
      if (existing) {
        return prev.map(item => 
          item.crop._id === crop._id && item.isPrebooked === isPrebooked
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { crop, quantity, isPrebooked }];
    });
  };

  const removeFromCart = (cropId, isPrebooked = false) => {
    setCart(prev => prev.filter(item => !(item.crop._id === cropId && item.isPrebooked === isPrebooked)));
  };

  const updateQuantity = (cropId, isPrebooked, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cropId, isPrebooked);
      return;
    }
    setCart(prev => prev.map(item => 
      item.crop._id === cropId && item.isPrebooked === isPrebooked
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const clearCart = () => setCart([]);

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.crop.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};
