/**
 * Default Bill Settings
 */
export const DEFAULT_BILL_SETTINGS = {
    packaging_fee_percent: 5.0,
    platform_fee: 5.0,
    cgst_percent: 2.5,
    sgst_percent: 2.5,
    platform_fee_gst_percent: 18.0,
};

/**
 * Calculates complete bill breakdown matching business rules:
 * - Subtotal: sum of base item prices
 * - Packaging Fee: packaging_fee_percent% of subtotal
 * - Platform Fee: flat app usage fee
 * - CGST: cgst_percent% of (Subtotal + Packaging Fee)
 * - SGST: sgst_percent% of (Subtotal + Packaging Fee)
 * - GST on Platform Fee: platform_fee_gst_percent% of Platform Fee
 * - Calculated Total: sum of all line items
 * - Rounding Off: ceil function rounding up to next integer rupee
 * - Grand Total: final payable amount
 */
export function calculateBillBreakdown(subtotal, settings = DEFAULT_BILL_SETTINGS) {
    const packagingPercent = Number(settings?.packaging_fee_percent ?? DEFAULT_BILL_SETTINGS.packaging_fee_percent);
    const platformFeeVal = Number(settings?.platform_fee ?? DEFAULT_BILL_SETTINGS.platform_fee);
    const cgstPercent = Number(settings?.cgst_percent ?? DEFAULT_BILL_SETTINGS.cgst_percent);
    const sgstPercent = Number(settings?.sgst_percent ?? DEFAULT_BILL_SETTINGS.sgst_percent);
    const platformGstPercent = Number(settings?.platform_fee_gst_percent ?? DEFAULT_BILL_SETTINGS.platform_fee_gst_percent);

    const subtotalNum = Math.max(0, Number(subtotal) || 0);

    // 1. Packaging Fee (e.g. 5% of subtotal, rounded to 2 decimals)
    const rawPackagingFee = subtotalNum > 0 ? subtotalNum * (packagingPercent / 100) : 0;
    const packagingFee = Number(rawPackagingFee.toFixed(2));

    // 2. Platform Fee (e.g. fixed ₹5)
    const platformFee = subtotalNum > 0 ? Number(platformFeeVal.toFixed(2)) : 0;

    // 3. Food & Packaging Base for GST
    const foodAndPackagingBase = Number((subtotalNum + packagingFee).toFixed(2));

    // 4. CGST & SGST on Food & Packaging (e.g. 2.5% each, rounded to 2 decimals)
    const rawCgst = foodAndPackagingBase * (cgstPercent / 100);
    const rawSgst = foodAndPackagingBase * (sgstPercent / 100);
    const cgst = Number(rawCgst.toFixed(2));
    const sgst = Number(rawSgst.toFixed(2));

    // 5. GST on Platform Fee (e.g. 18%, rounded to 2 decimals)
    const rawPlatformFeeGst = platformFee * (platformGstPercent / 100);
    const platformFeeGst = Number(rawPlatformFeeGst.toFixed(2));

    // 6. Calculated Total (exact sum of all rounded line item charges)
    const calculatedTotal = Number((subtotalNum + packagingFee + platformFee + cgst + sgst + platformFeeGst).toFixed(2));

    // 7. Rounding Off (Ceil function: rounds up to next rupee)
    const grandTotal = Math.ceil(calculatedTotal);
    const roundingOff = Number((grandTotal - calculatedTotal).toFixed(2));

    return {
        subtotal: Number(subtotalNum.toFixed(2)),
        packaging_fee_percent: packagingPercent,
        packaging_fee: packagingFee,
        platform_fee: platformFee,
        food_and_packaging_base: foodAndPackagingBase,
        cgst_percent: cgstPercent,
        cgst: cgst,
        sgst_percent: sgstPercent,
        sgst: sgst,
        platform_fee_gst_percent: platformGstPercent,
        platform_fee_gst: platformFeeGst,
        calculated_total: calculatedTotal,
        rounding_off: roundingOff,
        grand_total: grandTotal,
    };
}
