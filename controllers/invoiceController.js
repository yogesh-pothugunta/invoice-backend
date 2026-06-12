const Invoice = require('../models/Invoice');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Invoice number generate cheyyatam
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${random}`;
};

// Create Invoice
exports.createInvoice = async (req, res) => {
  try {
    const {
      clientName, clientEmail, clientAddress, clientPhone,
      items, tax, dueDate, notes
    } = req.body;

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * tax) / 100;
    const total = subtotal + taxAmount;

    const invoice = await Invoice.create({
      userId: req.user.id,
      invoiceNumber: generateInvoiceNumber(),
      clientName, clientEmail, clientAddress, clientPhone,
      items, subtotal, tax, taxAmount, total,
      dueDate, notes
    });

    res.status(201).json({ message: 'Invoice created ✅', invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single invoice
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice updated ✅', invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted ✅' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: `Invoice marked as ${status} ✅`, invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id });

    const stats = {
      total: invoices.length,
      draft: invoices.filter(i => i.status === 'draft').length,
      sent: invoices.filter(i => i.status === 'sent').length,
      paid: invoices.filter(i => i.status === 'paid').length,
      overdue: invoices.filter(i => i.status === 'overdue').length,
      totalRevenue: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.total, 0),
      pendingAmount: invoices
        .filter(i => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + i.total, 0),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send invoice via email
exports.sendInvoiceEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const user = await User.findById(req.user.id);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1F4E79; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Invoice from ${user.company || user.name}</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear <strong>${invoice.clientName}</strong>,</p>
          <p>Please find below your invoice details:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #1F4E79; color: white;">
                <th style="padding: 10px; text-align: left;">Invoice No</th>
                <td style="padding: 10px;">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <th style="padding: 10px; text-align: left; background: #f0f0f0;">Due Date</th>
                <td style="padding: 10px;">${new Date(invoice.dueDate).toLocaleDateString()}</td>
              </tr>
              <tr style="background: #f0f0f0;">
                <th style="padding: 10px; text-align: left;">Status</th>
                <td style="padding: 10px; text-transform: capitalize;">${invoice.status}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1F4E79;">Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #1F4E79; color: white;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
              ${invoice.items.map(item => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px;">${item.name}</td>
                  <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                  <td style="padding: 8px; text-align: right;">₹${item.price.toLocaleString()}</td>
                  <td style="padding: 8px; text-align: right;">₹${item.total.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right;"><strong>Subtotal</strong></td>
                <td style="padding: 8px; text-align: right;">₹${invoice.subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 8px; text-align: right;"><strong>Tax (${invoice.tax}%)</strong></td>
                <td style="padding: 8px; text-align: right;">₹${invoice.taxAmount.toLocaleString()}</td>
              </tr>
              <tr style="background: #1F4E79; color: white;">
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total</strong></td>
                <td style="padding: 10px; text-align: right;"><strong>₹${invoice.total.toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>

          ${invoice.notes ? `<p style="margin-top: 20px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          
          <p style="margin-top: 30px;">Thank you for your business!</p>
          <p><strong>${user.company || user.name}</strong><br/>
          ${user.email}<br/>
          ${user.phone || ''}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${user.company || user.name}`,
      html: emailHtml
    });

    await Invoice.findByIdAndUpdate(invoice._id, { status: 'sent' });

    res.json({ message: 'Invoice sent successfully via email ✅' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};