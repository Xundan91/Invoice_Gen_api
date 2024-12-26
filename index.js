const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const downloadDir = path.join(__dirname, 'download');
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

app.post('/generate-invoice', async (req, res) => {
    const { from, to, logo, number, date, due_date, items, notes, terms } = req.body;

    const invoiceHtml = `
        <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    table, th, td { border: 1px solid #ddd; }
                    th, td { padding: 10px; text-align: left; }
                    img { max-width: 150px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>Invoice #${number}</h1>
                <p>Date: ${date}</p>
                <p>Due Date: ${due_date}</p>
                <p><strong>From:</strong> ${from}</p>
                <p><strong>To:</strong> ${to}</p>
                <img src="${logo}" alt="Logo" />
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Unit Cost</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${item.unit_cost}</td>
                                <td>${item.quantity * item.unit_cost}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p>${notes}</p>
                <p>${terms}</p>
            </body>
        </html>
    `;

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });

        const pngPath = path.join(downloadDir, `invoice-${number}.png`);
        await page.screenshot({ path: pngPath, fullPage: true });

        await browser.close();

        const pngBytes = fs.readFileSync(pngPath);
        const pdfDoc = await PDFDocument.create();
        const pngImage = await pdfDoc.embedPng(pngBytes);

        const pdfPage = pdfDoc.addPage([pngImage.width, pngImage.height]);
        pdfPage.drawImage(pngImage, { x: 0, y: 0, width: pngImage.width, height: pngImage.height });

        const pdfBytes = await pdfDoc.save();
        const pdfPath = path.join(downloadDir, `invoice-${number}.pdf`);
        fs.writeFileSync(pdfPath, pdfBytes);

        res.json({
            pngUrl: `/download/invoice-${number}.png`,
            pdfUrl: `/download/invoice-${number}.pdf`
        });
    } catch (error) {
        console.error('Error generating files:', error);
        res.status(500).send('Error generating files');
    }
});

app.use('/download', express.static(downloadDir));

app.listen(port, () => {
    console.log(`Invoice API running on http://localhost:${port}`);
});
