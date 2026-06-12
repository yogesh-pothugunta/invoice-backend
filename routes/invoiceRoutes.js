const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createInvoice, getAllInvoices, getInvoiceById,
  updateInvoice, deleteInvoice, updateStatus,
  getDashboardStats, sendInvoiceEmail
} = require('../controllers/invoiceController');

router.get('/stats', authMiddleware, getDashboardStats);
router.get('/', authMiddleware, getAllInvoices);
router.get('/:id', authMiddleware, getInvoiceById);
router.post('/', authMiddleware, createInvoice);
router.put('/:id', authMiddleware, updateInvoice);
router.delete('/:id', authMiddleware, deleteInvoice);
router.patch('/:id/status', authMiddleware, updateStatus);
router.post('/:id/send', authMiddleware, sendInvoiceEmail);

module.exports = router;