"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosePaymentFailure = diagnosePaymentFailure;
const aiEngine_service_1 = require("../services/aiEngine.service");
const zod_1 = require("zod");
const diagnoseSchema = zod_1.z.object({
    paymentId: zod_1.z.string().default(() => `pay_diag_${Date.now()}`),
    amount: zod_1.z.number().positive('Amount must be greater than 0'),
    currency: zod_1.z.string().default('INR'),
    paymentMethod: zod_1.z.string().default('CARD'),
    failureCode: zod_1.z.string().optional(),
    failureReason: zod_1.z.string().optional(),
    rawErrorCode: zod_1.z.string().optional(),
    rawErrorMessage: zod_1.z.string().optional(),
});
async function diagnosePaymentFailure(req, res, next) {
    try {
        const input = diagnoseSchema.parse(req.body);
        const diagnosis = aiEngine_service_1.aiDecisionEngine.diagnose(input);
        return res.status(200).json({
            success: true,
            data: {
                input,
                diagnosis,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
