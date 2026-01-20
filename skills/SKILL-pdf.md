---
name: pdf
description: PDF processing toolkit for text/table extraction, document creation, merging, splitting, and form handling. Use when working with PDF files.
---

# PDF Processing Guide

## Overview
This toolkit enables PDF manipulation including text/table extraction, document creation, merging, splitting, and form handling.

## Key Libraries

### pypdf (Basic Operations)
```python
from pypdf import PdfReader, PdfWriter

# Merge PDFs
writer = PdfWriter()
for pdf_path in pdf_files:
    reader = PdfReader(pdf_path)
    for page in reader.pages:
        writer.add_page(page)
with open("merged.pdf", "wb") as f:
    writer.write(f)

# Split PDF into individual pages
reader = PdfReader("document.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as f:
        writer.write(f)

# Extract metadata
reader = PdfReader("document.pdf")
metadata = reader.metadata
print(f"Title: {metadata.title}")
print(f"Author: {metadata.author}")

# Rotate pages
reader = PdfReader("document.pdf")
writer = PdfWriter()
for page in reader.pages:
    page.rotate(90)  # Rotate 90 degrees clockwise
    writer.add_page(page)
```

### pdfplumber (Content Extraction)
```python
import pdfplumber
import pandas as pd

# Extract text preserving layout
with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)

# Extract tables from PDF
with pdfplumber.open("document.pdf") as pdf:
    all_tables = []
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            df = pd.DataFrame(table[1:], columns=table[0])
            all_tables.append(df)

    # Export to Excel
    with pd.ExcelWriter("tables.xlsx") as writer:
        for i, df in enumerate(all_tables):
            df.to_excel(writer, sheet_name=f"Table_{i+1}", index=False)
```

### reportlab (Create PDFs)
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# Simple PDF with Canvas
c = canvas.Canvas("output.pdf", pagesize=letter)
c.drawString(100, 750, "Hello, World!")
c.line(100, 740, 500, 740)
c.save()

# Complex document with Platypus
doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = []

story.append(Paragraph("Report Title", styles['Heading1']))
story.append(Spacer(1, 12))
story.append(Paragraph("This is the content of the report.", styles['Normal']))

doc.build(story)
```

## Command-Line Tools

### pdftotext (Extract text)
```bash
# Basic extraction
pdftotext document.pdf output.txt

# Preserve layout
pdftotext -layout document.pdf output.txt

# Extract specific pages
pdftotext -f 1 -l 5 document.pdf output.txt
```

### qpdf (Manipulation)
```bash
# Merge PDFs
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

# Split PDF
qpdf --split-pages document.pdf output_%d.pdf

# Decrypt PDF
qpdf --decrypt encrypted.pdf decrypted.pdf

# Rotate pages
qpdf --rotate=90:1-5 input.pdf output.pdf
```

### pdftk (Alternative)
```bash
# Merge
pdftk file1.pdf file2.pdf cat output merged.pdf

# Split
pdftk document.pdf burst output page_%02d.pdf

# Rotate
pdftk input.pdf cat 1-endeast output rotated.pdf
```

## Advanced Operations

### OCR for Scanned Documents
```python
import pytesseract
from pdf2image import convert_from_path

# Convert PDF pages to images
images = convert_from_path("scanned.pdf", dpi=300)

# OCR each page
text = ""
for image in images:
    text += pytesseract.image_to_string(image)
```

### Add Watermark
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
watermark_reader = PdfReader("watermark.pdf")
watermark_page = watermark_reader.pages[0]

writer = PdfWriter()
for page in reader.pages:
    page.merge_page(watermark_page)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as f:
    writer.write(f)
```

### Extract Images
```bash
# Using pdfimages
pdfimages -j document.pdf images/
```

### Password Protection
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

writer.encrypt("user_password", "owner_password")

with open("protected.pdf", "wb") as f:
    writer.write(f)
```

## Tax Deed Flow Integration

For parsing property list PDFs:
```python
import pdfplumber
import re

def parse_property_list(pdf_path):
    """Extract properties from tax sale PDF."""
    properties = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()

            # PA parcel pattern
            parcel_pattern = r'\d{2}\.\d{2}-\d{2}\.\.-\d{3}\.\d{2}-\d{3}'
            parcels = re.findall(parcel_pattern, text)

            for parcel in parcels:
                properties.append({
                    'parcel_id': parcel,
                    'raw_text': text
                })

    return properties
```

## Dependencies

```bash
pip install pypdf pdfplumber reportlab pytesseract pdf2image pandas
```

For command-line tools:
- **pdftotext**: Part of poppler-utils (`apt install poppler-utils`)
- **qpdf**: `apt install qpdf`
- **pdftk**: `apt install pdftk`
