const express = require('express');
const router = express.Router();
const Invoice = require('../models/invoiceModel'); // استدعاء الموديل الجديد
const { v4: uuidv4 } = require('uuid'); // لإنشاء ID فريد

// إنشاء فاتورة جديدة
router.post('/', async (req, res) => {
  try {
    const { items, total, date, customer } = req.body;

    // تحقق من الحقول الأساسية
    if (!items || !total || !date || !customer) {
      return res.status(400).json({ error: 'الحقول المطلوبة ناقصة' });
    }

    const invoice = new Invoice({
      id: uuidv4(),
      items,
      total,
      date,
      customer
    });

    await invoice.save();
    res.json({ message: 'تم حفظ الفاتورة بنجاح', invoice });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ الفاتورة' });
  }
});

module.exports = router;
