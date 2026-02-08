"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Send, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { useCartStore } from "@/stores/useCartStore";
import { COMPANY } from "@/lib/constants";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const { items, removeItem, clear } = useCartStore();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    product: "",
    quantity: "",
    description: "",
  });
  const [productOptions, setProductOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    let isActive = true;

    const loadProducts = async () => {
      try {
        const response = await fetch("/api/catalog/products");
        if (!response.ok) {
          throw new Error("Failed to load products");
        }
        const data = (await response.json()) as Array<{ id: string; name: string }>;
        if (isActive) {
          setProductOptions(data);
        }
      } catch {
        if (isActive) {
          setProductOptions([]);
        }
      }
    };

    loadProducts();
    return () => {
      isActive = false;
    };
  }, []);

  // Pre-fill product field from quote cart
  const cartProductNames = items.map((i) => `${i.product.name} (x${i.quantity})`).join(", ");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const body = {
        ...formData,
        product: formData.product || cartProductNames,
        cartItems: items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
        })),
      };

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", product: "", quantity: "", description: "" });
        clear();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (status === "success") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-8 w-8 text-emerald" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Inquiry Sent Successfully!
          </h2>
          <p className="mb-6 text-gray-600">
            We&apos;ll get back to you within 24 hours with pricing and
            availability details.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
            <Button variant="outline" onClick={() => setStatus("idle")}>
              Send Another Inquiry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-emerald">
            Home
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Contact / Get Quote</span>
        </nav>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <div>
            <SectionHeading
              title="Request a Quote"
              subtitle="Get in Touch"
              description="Fill in the form below and our team will respond with pricing, MOQ details, and technical specifications."
              align="left"
            />

            <form onSubmit={handleSubmit} className="mt-10 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Product
                  </label>
                  <Input
                    name="product"
                    value={formData.product || cartProductNames}
                    onChange={handleChange}
                    placeholder="e.g., Ashwagandha Extract"
                    list="product-list"
                  />
                  <datalist id="product-list">
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <Input
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="e.g., 500 kg"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Additional Details
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us about your requirements, specifications, or any questions..."
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-1"
                />
              </div>

              {status === "error" && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Something went wrong. Please try again or email us directly.
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={status === "submitting"}
                className="w-full sm:w-auto"
              >
                {status === "submitting" ? (
                  "Sending..."
                ) : (
                  <>
                    Send Inquiry
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Sidebar: Quote Cart + Info */}
          <div className="space-y-6">
            {/* Quote Cart */}
            {items.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Your Quote Cart ({items.length})
                  </h3>
                  <button
                    onClick={clear}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info Card */}
            <div className="rounded-2xl bg-emerald p-6 text-white">
              <h3 className="mb-4 text-lg font-bold">Direct Contact</h3>
              <div className="space-y-3 text-sm">
                <p className="text-emerald-200">Email</p>
                <a
                  href={`mailto:${COMPANY.salesEmail}`}
                  className="block font-medium hover:text-emerald-200"
                >
                  {COMPANY.salesEmail}
                </a>
                <p className="mt-3 text-emerald-200">Phone</p>
                <a
                  href={`tel:${COMPANY.phone}`}
                  className="block font-medium hover:text-emerald-200"
                >
                  {COMPANY.phone}
                </a>
                <p className="mt-3 text-emerald-200">Business Hours</p>
                <p className="font-medium">{COMPANY.hours}</p>
              </div>
            </div>

            {/* Trust badges */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                Why Request a Quote?
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" />
                  Competitive bulk pricing
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" />
                  Custom formulation support
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" />
                  Technical documentation included
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald" />
                  Sample availability for testing
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
