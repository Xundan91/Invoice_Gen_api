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
            <!-- Your existing HTML template -->
        </html>
    `;

    try {
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            headless: 'new' 
        });

        const page = await browser.newPage();
        await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' });

        const pngBuffer = await page.screenshot({ fullPage: true });

    
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

    
        res.json({
            png: pngBuffer.toString('base64'),
            pdf: pdfBuffer.toString('base64')
        });
    } catch (error) {
        console.error('Error generating files:', error);
        res.status(500).send('Error generating files');
    }
});


app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log(`Invoice API running on port ${port}`);
});