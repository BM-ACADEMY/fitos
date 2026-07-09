const PDFDocument = require('pdfkit');
const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Gym = require('../models/Gym');

/**
 * Generate an invoice PDF for a payment. Returns a Buffer.
 */
async function generateInvoice(paymentId) {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) throw new Error('Payment not found');
  
  const [member, gym] = await Promise.all([
    Member.findById(payment.member_id, 'name phone').lean(),
    Gym.findById(payment.gym_id, 'name address city gstin phone').lean(),
  ]);

  const p = { ...payment, member_name: member?.name, member_phone: member?.phone, gym_name: gym?.name, address: gym?.address, city: gym?.city, gstin: gym?.gstin, gym_phone: gym?.phone };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const GREEN = '#00C896';
    const NAVY = '#0D1B2A';
    const GRAY = '#718096';

    // Header
    doc.rect(0, 0, doc.page.width, 90).fill(NAVY);
    doc.fill(GREEN).fontSize(24).font('Helvetica-Bold').text(p.gym_name, 50, 28);
    doc.fill('#A0AEC0').fontSize(9).font('Helvetica')
       .text(`${p.address || ''} ${p.city || ''}  ·  ${p.gym_phone || ''}${p.gstin ? '  ·  GSTIN: ' + p.gstin : ''}`, 50, 58);
    doc.fill('white').fontSize(16).font('Helvetica-Bold')
       .text('INVOICE', doc.page.width - 150, 35, { width: 100, align: 'right' });

    // Invoice meta
    let y = 120;
    doc.fill(NAVY).fontSize(10).font('Helvetica-Bold').text('Billed to:', 50, y);
    doc.font('Helvetica').text(p.member_name, 50, y + 15);
    doc.fill(GRAY).text(p.member_phone, 50, y + 30);

    doc.fill(NAVY).font('Helvetica-Bold').text('Invoice no:', 350, y);
    doc.font('Helvetica').text(p.invoice_number || p.id.slice(0, 8).toUpperCase(), 430, y);
    doc.font('Helvetica-Bold').text('Date:', 350, y + 15);
    doc.font('Helvetica').text(new Date(p.paid_at || p.created_at).toLocaleDateString('en-IN'), 430, y + 15);
    doc.font('Helvetica-Bold').text('Method:', 350, y + 30);
    doc.font('Helvetica').text((p.method || 'cash').toUpperCase(), 430, y + 30);

    // Table
    y = 200;
    doc.rect(50, y, doc.page.width - 100, 24).fill(NAVY);
    doc.fill('white').fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 60, y + 7);
    doc.text('Months', 320, y + 7);
    doc.text('Amount', 430, y + 7, { width: 100, align: 'right' });

    y += 34;
    doc.fill(NAVY).font('Helvetica').fontSize(10);
    doc.text(`Gym membership — ${p.plan_months} month(s)`, 60, y);
    doc.text(String(p.plan_months), 320, y);
    doc.text(`₹${Number(p.amount).toFixed(2)}`, 430, y, { width: 100, align: 'right' });

    // Totals
    y += 40;
    doc.moveTo(300, y).lineTo(doc.page.width - 50, y).strokeColor('#E2E8F0').stroke();
    y += 10;
    doc.fill(GRAY).text('Subtotal', 350, y);
    doc.fill(NAVY).text(`₹${Number(p.amount).toFixed(2)}`, 430, y, { width: 100, align: 'right' });
    y += 18;
    doc.fill(GRAY).text('GST (18%)', 350, y);
    doc.fill(NAVY).text(`₹${Number(p.gst_amount).toFixed(2)}`, 430, y, { width: 100, align: 'right' });
    y += 22;
    doc.rect(340, y - 4, doc.page.width - 390, 26).fill('#E6FFF7');
    doc.fill(NAVY).font('Helvetica-Bold').fontSize(12);
    doc.text('TOTAL', 350, y + 2);
    doc.fill('#065F46').text(`₹${Number(p.total_amount).toFixed(2)}`, 420, y + 2, { width: 110, align: 'right' });

    // Footer
    doc.fill(GRAY).font('Helvetica').fontSize(8)
       .text('Powered by FitOS — fitos.in · BM TechX · ABM Groups', 50, doc.page.height - 60, {
         width: doc.page.width - 100, align: 'center',
       });

    doc.end();
  });
}

module.exports = { generateInvoice };
