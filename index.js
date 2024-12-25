const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/generate-invoice', async (req, res) => {
    const { from, to, logo, number, date, due_date, items, notes, terms } = req.body;
    
    const invoiceHtml = `
    <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                }
                h1 {
                    color: #333;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                table, th, td {
                    border: 1px solid #ddd;
                }
                th, td {
                    padding: 10px;
                    text-align: left;
                }
                img {
                    max-width: 150px;
                    margin-bottom: 20px;
                }
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
        // Updated Puppeteer launch configuration for Render
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
            headless: 'new'
        });

        const page = await browser.newPage();
        await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });

        // Generate PNG
        const pngBuffer = await page.screenshot({ fullPage: true });

        // Generate PDF
        const pdfDoc = await PDFDocument.create();
        const pngImage = await pdfDoc.embedPng(pngBuffer);
        
        const pagePdf = pdfDoc.addPage([pngImage.width, pngImage.height]);
        pagePdf.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pngImage.width,
            height: pngImage.height
        });

        const pdfBuffer = await pdfDoc.save();

        await browser.close();

        // Send buffers directly in response
        res.json({
            png: pngBuffer.toString('base64'),
            pdf: pdfBuffer.toString('base64')
        });
    } catch (error) {
        console.error('Error generating files:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Invoice API running on port ${port}`);
});