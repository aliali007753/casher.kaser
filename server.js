require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // للسماح لـ frontend بالاتصال

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // السماح لجميع النطاقات بالوصول، في بيئة الإنتاج يجب تحديد نطاق تطبيقك
app.use(express.json()); // لتمكين قراءة JSON في طلبات الجسم

// الاتصال بقاعدة بيانات MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// تعريف مخطط (Schema) وموديل (Model) للمنتجات
const productSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  details: String,
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

// تعريف مخطط (Schema) وموديل (Model) للفواتير
const invoiceSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // رقم الفاتورة
  date: { type: Date, default: Date.now },
  customerName: String,
  customerPhone: String,
  items: [{
    barcode: String,
    name: String,
    price: Number,
    quantity: Number,
    details: String
  }],
  subtotal: Number,
  discount: Number,
  taxRate: Number,
  taxAmount: Number,
  total: Number,
  savedAt: { type: Date, default: Date.now }
});
const Invoice = mongoose.model('Invoice', invoiceSchema);

// Routes للمنتجات
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    if (err.code === 11000) { // Duplicate key error (barcode)
      return res.status(409).send('Product with this barcode already exists.');
    }
    res.status(500).send(err.message);
  }
});

app.put('/api/products/:barcode', async (req, res) => {
  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { barcode: req.params.barcode },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedProduct) return res.status(404).send('Product not found.');
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/api/products/:barcode', async (req, res) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({ barcode: req.params.barcode });
    if (!deletedProduct) return res.status(404).send('Product not found.');
    res.status(204).send(); // No Content
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Routes للفواتير
app.post('/api/invoices', async (req, res) => {
  try {
    const newInvoice = new Invoice(req.body);
    await newInvoice.save();
    res.status(201).json(newInvoice);
  } catch (err) {
    if (err.code === 11000) { // Duplicate key error (invoice ID)
      return res.status(409).send('Invoice with this ID already exists.');
    }
    // هذا الجزء مهم لمعرفة سبب الفشل في التحقق من صحة النموذج (validation)
    if (err.name === 'ValidationError') {
        return res.status(400).send(err.message); // Bad Request for validation errors
    }
    res.status(500).send(err.message);
  }
});

app.get('/api/invoices', async (req, res) => {
  const { search } = req.query;
  let query = {};
  if (search) {
    query = {
      $or: [
        { id: parseInt(search) || 0 }, // Try to parse as number for invoice ID
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ]
    };
  }
  try {
    const invoices = await Invoice.find(query).sort({ date: -1 }); // Sort by newest first
    res.json(invoices);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    // استخدم parseFloat هنا للتأكد من أن ID هو رقم قبل استعلام قاعدة البيانات
    const invoiceId = parseFloat(req.params.id); 
    const deletedInvoice = await Invoice.findOneAndDelete({ id: invoiceId });
    if (!deletedInvoice) return res.status(404).send('Invoice not found.');
    res.status(204).send();
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✅ Route لإرجاع آخر رقم فاتورة (تم التعديل)
app.get('/api/invoices/last-id', async (req, res) => {
  try {
    const lastInvoice = await Invoice.findOne().sort({ id: -1 });
    const lastId = lastInvoice ? lastInvoice.id : 0;
    const nextInvoiceId = lastId + 1; // ✅ تم حساب رقم الفاتورة التالي
    res.json({ nextInvoiceId }); // ✅ تم إرسال nextInvoiceId
  } catch (err) {
    res.status(500).send('Error fetching last invoice ID');
  }
});

// Serve static files (your frontend)
// تأكد أن مسار ملفات الفرونت إند هو 'public' أو قم بتغييره ليناسب مجلدك
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});