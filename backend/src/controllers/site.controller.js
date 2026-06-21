import {
  createSupportTicketFor,
  getPublicSiteSettings,
  updateSupportTicketDeliveryFor,
} from "../lib/localStore.js";
import {
  sendSupportReceiptEmail,
  sendSupportTicketEmail,
} from "../lib/smtpMailer.js";

export async function getSiteSettings(req, res) {
  try {
    const settings = await getPublicSiteSettings();
    res.status(200).json(settings);
  } catch (error) {
    console.error("[LOCAL SITE] Error loading site settings:", error.message);
    res.status(500).json({ message: "Could not load site settings" });
  }
}

export async function createSupportTicket(req, res) {
  try {
    const ticket = await createSupportTicketFor(req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    let supportMail = { sent: false, reason: "" };
    let receiptMail = { sent: false, reason: "" };

    try {
      supportMail = await sendSupportTicketEmail({
        to: ticket.supportEmail,
        ticket,
      });
    } catch (error) {
      supportMail = {
        sent: false,
        reason: error.message || "Support email failed",
      };
    }

    try {
      receiptMail = await sendSupportReceiptEmail({
        to: ticket.email,
        name: ticket.name,
        ticket,
      });
    } catch (error) {
      receiptMail = {
        sent: false,
        reason: error.message || "Receipt email failed",
      };
    }

    const updatedTicket = await updateSupportTicketDeliveryFor(ticket._id, {
      supportSent: supportMail.sent,
      receiptSent: receiptMail.sent,
      supportReason: supportMail.sent ? "" : supportMail.reason,
      receiptReason: receiptMail.sent ? "" : receiptMail.reason,
    });

    res.status(201).json({
      ticket: updatedTicket,
      mail: {
        support: supportMail,
        receipt: receiptMail,
      },
      message: receiptMail.sent
        ? "Support ticket opened and receipt emailed."
        : "Support ticket opened. Email receipt is not configured yet.",
    });
  } catch (error) {
    console.error("[LOCAL SITE] Error creating support ticket:", error.message);
    res.status(error.status || 500).json({
      message: error.message || "Could not open support ticket",
    });
  }
}
