const pool = require("../config/db");

// Default system bill configuration
const DEFAULT_SETTINGS = {
    packaging_fee_percent: 5.0,
    platform_fee: 5.0,
    cgst_percent: 2.5,
    sgst_percent: 2.5,
    platform_fee_gst_percent: 18.0,
};

// Ensure bill_settings table exists and has a default record
let isTableInitialized = false;

const initBillSettingsTable = async () => {
    if (isTableInitialized) return;

    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS bill_settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                packaging_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
                platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
                cgst_percent DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
                sgst_percent DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
                platform_fee_gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Check if row exists
        const [rows] = await pool.execute(`SELECT id FROM bill_settings WHERE id = 1`);
        if (rows.length === 0) {
            await pool.execute(`
                INSERT INTO bill_settings 
                (id, packaging_fee_percent, platform_fee, cgst_percent, sgst_percent, platform_fee_gst_percent)
                VALUES (1, 5.00, 5.00, 2.50, 2.50, 18.00)
            `);
        }

        isTableInitialized = true;
    } catch (error) {
        console.error("Init bill_settings table error:", error);
    }
};

// Calculate complete bill breakdown
function calculateBillBreakdown(subtotal, settings = {}) {
    const packagingPercent = Number(settings.packaging_fee_percent ?? DEFAULT_SETTINGS.packaging_fee_percent);
    const platformFeeVal = Number(settings.platform_fee ?? DEFAULT_SETTINGS.platform_fee);
    const cgstPercent = Number(settings.cgst_percent ?? DEFAULT_SETTINGS.cgst_percent);
    const sgstPercent = Number(settings.sgst_percent ?? DEFAULT_SETTINGS.sgst_percent);
    const platformGstPercent = Number(settings.platform_fee_gst_percent ?? DEFAULT_SETTINGS.platform_fee_gst_percent);

    const subtotalNum = Math.max(0, Number(subtotal) || 0);

    // Packaging Fee: 5% of subtotal (0 if no items, rounded to 2 decimals)
    const rawPackagingFee = subtotalNum > 0 ? subtotalNum * (packagingPercent / 100) : 0;
    const packagingFee = Number(rawPackagingFee.toFixed(2));

    // Platform Fee: Fixed (0 if no items)
    const platformFee = subtotalNum > 0 ? Number(platformFeeVal.toFixed(2)) : 0;

    // Taxes on Food & Packaging: (Subtotal + Packaging Fee) * tax%
    const foodAndPackagingBase = Number((subtotalNum + packagingFee).toFixed(2));
    const rawCgst = foodAndPackagingBase * (cgstPercent / 100);
    const rawSgst = foodAndPackagingBase * (sgstPercent / 100);
    const cgst = Number(rawCgst.toFixed(2));
    const sgst = Number(rawSgst.toFixed(2));

    // GST on Platform Fee: Platform Fee * 18%
    const rawPlatformFeeGst = platformFee * (platformGstPercent / 100);
    const platformFeeGst = Number(rawPlatformFeeGst.toFixed(2));

    // Calculated Total (exact sum of all rounded line item charges)
    const calculatedTotal = Number((subtotalNum + packagingFee + platformFee + cgst + sgst + platformFeeGst).toFixed(2));

    // Rounding Off Adjustment (Ceil to next integer rupee)
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

// GET /api/bill/settings (Public or authenticated)
const getBillSettings = async (req, res) => {
    try {
        await initBillSettingsTable();

        const [rows] = await pool.execute(
            `SELECT 
                packaging_fee_percent,
                platform_fee,
                cgst_percent,
                sgst_percent,
                platform_fee_gst_percent,
                updated_at
             FROM bill_settings 
             WHERE id = 1`
        );

        if (rows.length === 0) {
            return res.status(200).json({
                settings: DEFAULT_SETTINGS,
            });
        }

        const raw = rows[0];
        const settings = {
            packaging_fee_percent: Number(raw.packaging_fee_percent),
            platform_fee: Number(raw.platform_fee),
            cgst_percent: Number(raw.cgst_percent),
            sgst_percent: Number(raw.sgst_percent),
            platform_fee_gst_percent: Number(raw.platform_fee_gst_percent),
            updated_at: raw.updated_at,
        };

        return res.status(200).json({
            message: "Bill settings retrieved successfully",
            settings,
        });
    } catch (error) {
        console.error("Get bill settings error:", error);
        return res.status(200).json({
            settings: DEFAULT_SETTINGS,
        });
    }
};

// PUT /api/bill/settings (Admin only)
const updateBillSettings = async (req, res) => {
    try {
        await initBillSettingsTable();

        const {
            packaging_fee_percent,
            platform_fee,
            cgst_percent,
            sgst_percent,
            platform_fee_gst_percent,
        } = req.body;

        // Validation: must be non-negative numbers
        if (
            packaging_fee_percent === undefined ||
            platform_fee === undefined ||
            cgst_percent === undefined ||
            sgst_percent === undefined ||
            platform_fee_gst_percent === undefined
        ) {
            return res.status(400).json({
                message: "All fields are required: packaging_fee_percent, platform_fee, cgst_percent, sgst_percent, platform_fee_gst_percent",
            });
        }

        const packPercent = Number(packaging_fee_percent);
        const platFee = Number(platform_fee);
        const cgst = Number(cgst_percent);
        const sgst = Number(sgst_percent);
        const platGst = Number(platform_fee_gst_percent);

        if (
            isNaN(packPercent) || packPercent < 0 ||
            isNaN(platFee) || platFee < 0 ||
            isNaN(cgst) || cgst < 0 ||
            isNaN(sgst) || sgst < 0 ||
            isNaN(platGst) || platGst < 0
        ) {
            return res.status(400).json({
                message: "All values must be valid non-negative numbers",
            });
        }

        await pool.execute(
            `UPDATE bill_settings
             SET packaging_fee_percent = ?,
                 platform_fee = ?,
                 cgst_percent = ?,
                 sgst_percent = ?,
                 platform_fee_gst_percent = ?
             WHERE id = 1`,
            [packPercent, platFee, cgst, sgst, platGst]
        );

        const updatedSettings = {
            packaging_fee_percent: packPercent,
            platform_fee: platFee,
            cgst_percent: cgst,
            sgst_percent: sgst,
            platform_fee_gst_percent: platGst,
        };

        return res.status(200).json({
            message: "Bill settings updated successfully",
            settings: updatedSettings,
        });
    } catch (error) {
        console.error("Update bill settings error:", error);
        return res.status(500).json({
            message: "Failed to update bill settings",
        });
    }
};

// Helper to fetch current settings directly for internal server use
const getActiveBillSettings = async () => {
    try {
        await initBillSettingsTable();
        const [rows] = await pool.execute(
            `SELECT 
                packaging_fee_percent,
                platform_fee,
                cgst_percent,
                sgst_percent,
                platform_fee_gst_percent
             FROM bill_settings 
             WHERE id = 1`
        );

        if (rows.length > 0) {
            const raw = rows[0];
            return {
                packaging_fee_percent: Number(raw.packaging_fee_percent),
                platform_fee: Number(raw.platform_fee),
                cgst_percent: Number(raw.cgst_percent),
                sgst_percent: Number(raw.sgst_percent),
                platform_fee_gst_percent: Number(raw.platform_fee_gst_percent),
            };
        }
    } catch (err) {
        console.error("getActiveBillSettings error:", err);
    }
    return DEFAULT_SETTINGS;
};

module.exports = {
    getBillSettings,
    updateBillSettings,
    calculateBillBreakdown,
    getActiveBillSettings,
    DEFAULT_SETTINGS,
};
