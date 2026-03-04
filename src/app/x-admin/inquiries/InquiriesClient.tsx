"use client";

import { useState } from "react";
import {
  MessageSquare,
  Mail,
  MailOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Package,
  RefreshCw,
} from "lucide-react";

interface CartItem {
  name: string;
  quantity: number;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  product: string | null;
  quantity: string | null;
  description: string | null;
  cart_items: CartItem[] | null;
  is_read: boolean;
  created_at: string;
}

type FilterTab = "all" | "unread" | "read";

export default function InquiriesClient({
  initialInquiries,
}: {
  initialInquiries: Inquiry[];
}) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refetch(tab: FilterTab = filter) {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (tab !== "all") params.set("status", tab);
      const res = await fetch(`/api/admin/inquiries?${params}`);
      const json = await res.json();
      setInquiries(json.data ?? []);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function toggleRead(inquiry: Inquiry) {
    const updated = !inquiry.is_read;
    await fetch(`/api/admin/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: updated }),
    });
    setInquiries((prev) =>
      prev.map((inq) =>
        inq.id === inquiry.id ? { ...inq, is_read: updated } : inq
      )
    );
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      setDeleteConfirm(null);
      if (expandedId === id) setExpandedId(null);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleFilterChange(tab: FilterTab) {
    setFilter(tab);
    refetch(tab);
  }

  const unreadCount = inquiries.filter((i) => !i.is_read).length;

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "read", label: "Read" },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Inquiries
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {unreadCount > 0 && (
              <span className="text-emerald-400 font-medium">
                {unreadCount} unread ·{" "}
              </span>
            )}
            {inquiries.length} total shown
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleFilterChange(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inquiries list */}
      {inquiries.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
          <MessageSquare className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500">No inquiries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inquiries.map((inq) => {
            const isExpanded = expandedId === inq.id;

            return (
              <div
                key={inq.id}
                className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-colors ${
                  inq.is_read
                    ? "border-zinc-800"
                    : "border-emerald-500/30 bg-emerald-500/3"
                }`}
              >
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Unread indicator */}
                  <div className="flex-shrink-0">
                    {!inq.is_read ? (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-300 text-sm font-semibold">
                      {inq.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${inq.is_read ? "text-zinc-300" : "text-white"}`}
                      >
                        {inq.name}
                      </span>
                      <span className="text-zinc-600 text-xs">·</span>
                      <span className="text-zinc-500 text-xs">{inq.email}</span>
                    </div>
                    <p className="text-zinc-500 text-xs truncate">
                      {inq.product
                        ? `Product: ${inq.product}`
                        : "General inquiry"}
                      {inq.quantity && ` · Qty: ${inq.quantity}`}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="text-zinc-600 text-xs flex-shrink-0 hidden sm:block">
                    {new Date(inq.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleRead(inq)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                      title={inq.is_read ? "Mark unread" : "Mark read"}
                    >
                      {inq.is_read ? (
                        <Mail className="w-3.5 h-3.5" />
                      ) : (
                        <MailOpen className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(inq.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setExpandedId(isExpanded ? null : inq.id);
                        if (!inq.is_read && !isExpanded) toggleRead(inq);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-3">
                    {inq.description && (
                      <div>
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">
                          Message
                        </p>
                        <p className="text-zinc-300 text-sm whitespace-pre-wrap">
                          {inq.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {inq.product && (
                        <div className="bg-zinc-800 rounded-xl p-3">
                          <p className="text-zinc-500 text-xs mb-1">Product</p>
                          <p className="text-zinc-200 text-sm font-medium">
                            {inq.product}
                          </p>
                        </div>
                      )}
                      {inq.quantity && (
                        <div className="bg-zinc-800 rounded-xl p-3">
                          <p className="text-zinc-500 text-xs mb-1">Quantity</p>
                          <p className="text-zinc-200 text-sm font-medium">
                            {inq.quantity}
                          </p>
                        </div>
                      )}
                      <div className="bg-zinc-800 rounded-xl p-3">
                        <p className="text-zinc-500 text-xs mb-1">Email</p>
                        <a
                          href={`mailto:${inq.email}`}
                          className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors"
                        >
                          {inq.email}
                        </a>
                      </div>
                    </div>

                    {inq.cart_items && inq.cart_items.length > 0 && (
                      <div>
                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          Quote Cart ({inq.cart_items.length} items)
                        </p>
                        <div className="bg-zinc-800 rounded-xl divide-y divide-zinc-700/50 overflow-hidden">
                          {inq.cart_items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between px-3 py-2"
                            >
                              <span className="text-zinc-300 text-sm">
                                {item.name}
                              </span>
                              <span className="text-zinc-500 text-xs">
                                qty {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-zinc-600 text-xs">
                      Received:{" "}
                      {new Date(inq.created_at).toLocaleString("en-IN", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Delete Inquiry</p>
                <p className="text-zinc-400 text-sm">
                  This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
