"use client";

import { useState, useEffect } from "react";

/**
 * Hook to debounce a value
 * Useful for search inputs to avoid making API calls on every keystroke
 * 
 * Example:
 * const debouncedSearch = useDebounce(search, 500);
 * useEffect(() => {
 *   // Only runs after 500ms of no typing
 *   fetchCustomers(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay expires
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to throttle a value
 * Similar to debounce but fires on a regular interval
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);

  useEffect(() => {
    const handler = setInterval(() => {
      setThrottledValue(value);
    }, delay);

    return () => clearInterval(handler);
  }, [value, delay]);

  return throttledValue;
}
