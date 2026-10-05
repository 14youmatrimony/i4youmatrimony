import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  FileText
} from 'lucide-react';

export default function PaymentInvoiceModal({
  invoice,
  currentUser,
  onClose,
  isWebsiteModal = false
}) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className={isWebsiteModal 
        ? "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
        : "absolute inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-3 animate-in fade-in"
      }
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md max-h-[90%] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Controls */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#DFB76C]/20 text-[#8C6D1F] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-[#0B192C]">Tax Invoice & Receipt</h3>
              <p className="text-[10px] text-slate-500 font-mono">{invoice.invoiceNumber || 'INV-2026-8812'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Printable Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          
          {/* Company & Status Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="font-serif font-extrabold text-base text-[#0B192C] tracking-wide flex items-center gap-1">
                I 4 You <span className="text-[#DFB76C] text-xs font-sans font-bold">Matrimony</span>
              </span>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                I 4 You Technologies Pvt. Ltd.<br />
                Aadhaar Matrimonial Verification Hub<br />
                GSTIN: <span className="font-mono font-semibold">27AAACI4YOU1Z8</span><br />
                SAC Code: <span className="font-mono">998439</span> (Matrimonial Services)
              </p>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>PAID</span>
              </span>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                {invoice.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Billed To / Customer Details */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billed To</span>
              <p className="font-bold text-slate-800">{(currentUser?.name && currentUser.name !== 'Verified Member') ? currentUser.name : 'Priya Sharma'}</p>
              <p className="text-slate-600 text-[10px]">+91 {currentUser?.mobile || '9876543210'}</p>
              <p className="text-slate-600 text-[10px]">{currentUser?.district || 'Pune'}, {currentUser?.state || 'Maharashtra'}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payment Mode</span>
              <p className="font-bold text-slate-800">{invoice.paymentMethod || 'UPI Payment'}</p>
              <p className="text-[10px] font-mono text-slate-500 truncate" title={invoice.transactionId}>
                Txn: {invoice.transactionId || 'TXN_UPI_889412'}
              </p>
              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-[#8C6D1F] border border-amber-200 mt-0.5">
                UIDAI 100% Verified
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-2 text-center">Duration</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800 block">{invoice.planName || 'Diamond VIP Membership'}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {invoice.contactCredits ? `${invoice.contactCredits} Contact Unlocks` : 'Full Contact & Chat Access'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600">
                    {invoice.durationMonths || 6} Months
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                    ₹ {invoice.baseOfferPrice?.toLocaleString('en-IN') || '2,499'}
                  </td>
                </tr>

                {invoice.couponDiscount > 0 && (
                  <tr className="bg-emerald-50/50 text-emerald-800">
                    <td className="py-1.5 px-3" colSpan="2">
                      <span className="font-bold">Festive Coupon Savings ({invoice.couponCode || 'VIVAH50'})</span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                      - ₹ {invoice.couponDiscount?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tax Summary Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Amount (Excl. Tax):</span>
              <span className="font-semibold text-slate-800">₹ {(invoice.discountedBase || 2499).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>CGST (9%):</span>
              <span className="font-semibold text-slate-700">₹ {(invoice.cgst || Math.round(invoice.gst / 2) || 225).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>SGST (9%):</span>
              <span className="font-semibold text-slate-700">₹ {(invoice.sgst || Math.round(invoice.gst / 2) || 225).toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-[#0B192C]">
              <span>Total Paid (Incl. GST):</span>
              <span className="text-[#0B192C] text-base font-serif">
                ₹ {(invoice.totalAmount || 2949).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-center space-y-0.5">
            <span className="text-[10px] font-bold text-[#8C6D1F] flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Aadhaar Security & 7-Day Money-Back Guarantee
            </span>
            <p className="text-[9px] text-slate-500">
              Computer-generated official tax invoice under Section 31 of CGST Act. No signature required.
            </p>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0B192C] text-[#DFB76C] font-bold text-xs hover:bg-[#152E52] transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
