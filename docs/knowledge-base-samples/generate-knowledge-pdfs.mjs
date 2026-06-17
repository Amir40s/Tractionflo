import fs from "node:fs";
import path from "node:path";

const outputDir = path.dirname(new URL(import.meta.url).pathname);

const docs = [
  {
    slug: "kids-clothing-store-knowledge-base",
    title: "TinyTrend Kids Clothing Store Knowledge Base",
    subtitle: "Detailed AI training source for a children's clothes selling business",
    sections: [
      {
        heading: "Business Overview",
        paragraphs: [
          "TinyTrend Kids Clothing Store sells comfortable, durable, and stylish clothes for babies, toddlers, and children from newborn to 12 years. The store focuses on soft fabrics, easy sizing, parent-friendly bundles, and outfits that work for school, play, birthdays, holidays, and family events.",
          "The brand voice should be warm, helpful, parent-friendly, and practical. Replies should make parents feel confident about size, fabric, care, exchange options, and delivery timing. Avoid overpromising stock or delivery dates unless the exact detail is known.",
        ],
      },
      {
        heading: "Product Categories",
        bullets: [
          "Baby basics: bodysuits, rompers, sleepsuits, bib sets, swaddles, mittens, caps, and soft cotton sets for newborn to 24 months.",
          "Toddler everyday wear: T-shirts, leggings, joggers, shorts, hoodies, frocks, dungarees, co-ord sets, and soft denim alternatives for ages 2 to 5.",
          "Kids casual wear: school-friendly tees, modest tops, jeans, trousers, activewear, sweatshirts, skirts, and easy mix-and-match outfits for ages 6 to 12.",
          "Occasion wear: birthday dresses, formal shirts, waistcoat sets, embroidered outfits, festive dresses, holiday outfits, and sibling matching sets.",
          "Seasonal collections: summer lawn and cotton outfits, winter fleece sets, jackets, cardigans, thermal layers, rain jackets, and sleepwear.",
        ],
      },
      {
        heading: "Sizing Guidance",
        paragraphs: [
          "Always ask for the child's age, height, weight, and usual size when a parent is unsure. If the child is between sizes, recommend sizing up for comfort and longer wear. For babies, size up if the baby is tall, chubby, or wearing diapers that add bulk.",
          "Common size guide: newborn for 0 to 1 month, 0-3 months, 3-6 months, 6-9 months, 9-12 months, 12-18 months, 18-24 months, 2-3 years, 3-4 years, 4-5 years, 5-6 years, 7-8 years, 9-10 years, and 11-12 years. Fit may vary by item, so final selection should follow the product's listed measurements.",
        ],
      },
      {
        heading: "Fabric and Care",
        bullets: [
          "Preferred fabrics include soft cotton, organic cotton blends, breathable lawn, jersey knit, muslin, fleece, and soft denim blends.",
          "Recommend machine wash on gentle cycle or hand wash for delicate outfits. Use mild detergent and avoid bleach.",
          "For printed items, wash inside out and dry in shade to protect color and print life.",
          "For festive or embroidered outfits, recommend hand wash or dry clean depending on embellishment.",
          "Parents asking about sensitive skin should be guided toward cotton, muslin, tagless styles, and breathable fits.",
        ],
      },
      {
        heading: "Pricing and Bundles",
        paragraphs: [
          "Basic baby items usually start at an affordable entry price. Premium occasion wear, winter jackets, and embellished outfits cost more because of fabric, detailing, and construction. Offer exact pricing only when the product is identified.",
          "Bundle options can include newborn starter sets, school basics packs, sibling matching outfits, birthday outfit bundles, and seasonal essentials. Encourage customers to share age and occasion so the team can suggest the best bundle.",
        ],
      },
      {
        heading: "Ordering, Delivery, and Exchanges",
        bullets: [
          "To order, the customer should share the product name or screenshot, size, color, delivery city, and phone number.",
          "If an item is out of stock, offer closest alternatives by size, color, or style.",
          "Exchanges are usually possible for unused, unwashed items with original tags and packaging, subject to size and stock availability.",
          "Customized, worn, washed, or sale items may not be eligible for exchange unless there is a verified defect.",
          "For urgent birthdays or events, ask for event date and city before promising delivery.",
        ],
      },
      {
        heading: "Lead Qualification Rules",
        bullets: [
          "Ask age and size first when the customer is browsing for a child.",
          "Ask occasion: daily wear, school, birthday, wedding, Eid, winter, summer, or gift.",
          "Ask budget range if the customer requests recommendations.",
          "Ask city and required delivery date before confirming urgent availability.",
          "Escalate to human if the customer asks for bulk school uniforms, custom stitching, complaint handling, or a refund decision.",
        ],
      },
      {
        heading: "Direct FAQ Answers",
        qa: [
          ["What size should I order if my child is between sizes?", "If your child is between sizes, choose the larger size for comfort and longer wear. Please share the child's age, height, weight, and usual size so we can suggest the best fit."],
          ["Do you have clothes for newborn babies?", "Yes, we carry newborn and baby essentials including bodysuits, rompers, sleepsuits, swaddles, bib sets, caps, mittens, and soft cotton sets."],
          ["Can I exchange the size if it does not fit?", "Size exchange is usually possible for unused and unwashed items with tags and original packaging, subject to stock availability. Customized, worn, washed, or sale items may not be exchangeable."],
          ["Which fabric is best for sensitive skin?", "Soft cotton, organic cotton blends, muslin, and tagless breathable outfits are best for sensitive skin. Avoid heavy embellishments or rough seams for babies and toddlers."],
          ["Can you suggest a birthday outfit?", "Yes. Please share the child's age, size, gender or style preference, budget, delivery city, and event date. We can suggest birthday dresses, formal sets, sibling matching outfits, or themed looks."],
        ],
      },
    ],
    faqText: [
      ["What size should I order if my child is between sizes?", "If your child is between sizes, choose the larger size for comfort and longer wear. Please share the child's age, height, weight, and usual size so we can suggest the best fit."],
      ["Do you have clothes for newborn babies?", "Yes, we carry newborn and baby essentials including bodysuits, rompers, sleepsuits, swaddles, bib sets, caps, mittens, and soft cotton sets."],
      ["Can I exchange the size if it does not fit?", "Size exchange is usually possible for unused and unwashed items with tags and original packaging, subject to stock availability. Customized, worn, washed, or sale items may not be exchangeable."],
      ["Which fabric is best for sensitive skin?", "Soft cotton, organic cotton blends, muslin, and tagless breathable outfits are best for sensitive skin. Avoid heavy embellishments or rough seams for babies and toddlers."],
      ["Can you suggest a birthday outfit?", "Yes. Please share the child's age, size, gender or style preference, budget, delivery city, and event date. We can suggest birthday dresses, formal sets, sibling matching outfits, or themed looks."],
    ],
  },
  {
    slug: "womens-jewellery-store-knowledge-base",
    title: "Luna & Lattice Women's Jewellery Knowledge Base",
    subtitle: "Detailed AI training source for a women's jewellery selling business",
    sections: [
      {
        heading: "Business Overview",
        paragraphs: [
          "Luna & Lattice sells women's jewellery for daily wear, events, gifting, bridal looks, office styling, and festive occasions. The store carries earrings, rings, necklaces, pendants, bracelets, bangles, anklets, hair accessories, jewellery sets, and customized pieces.",
          "The brand voice should be elegant, confident, helpful, and detail-oriented. Replies should help customers choose by occasion, skin sensitivity, outfit color, budget, metal preference, and delivery date. Do not claim real gold, silver, stones, or hypoallergenic quality unless the specific product confirms it.",
        ],
      },
      {
        heading: "Product Categories",
        bullets: [
          "Everyday jewellery: studs, hoops, small pendants, adjustable rings, minimal bracelets, and lightweight chains.",
          "Statement jewellery: chandelier earrings, cocktail rings, layered necklaces, cuffs, bold bangles, and party sets.",
          "Traditional and festive jewellery: kundan-inspired sets, pearl sets, jhumkas, tikka sets, bangles, and bridal-inspired pieces.",
          "Office and modest styling: small hoops, pearl studs, delicate chains, slim bracelets, and neutral-tone pieces.",
          "Gifting: birthstone-inspired pieces, initial pendants, gift boxes, matching sets, and ready-to-gift packaging.",
        ],
      },
      {
        heading: "Materials and Finish Guidance",
        paragraphs: [
          "Common finishes can include gold plated, silver tone, rose gold tone, stainless steel, alloy, pearl, crystal, zircon, enamel, beads, and kundan-inspired stones. Confirm exact material from product details before answering a material-specific question.",
          "For customers with sensitive skin, recommend stainless steel, sterling silver, nickel-safe, or hypoallergenic-labelled items only when available. If the material is not confirmed, say the team can verify before purchase.",
        ],
      },
      {
        heading: "Care Instructions",
        bullets: [
          "Keep jewellery away from water, perfume, lotion, sweat, and harsh chemicals.",
          "Wear jewellery after applying makeup, perfume, and hair products.",
          "Wipe gently with a soft dry cloth after use.",
          "Store each piece separately in a pouch or box to prevent scratches and tangling.",
          "For plated jewellery, avoid sleeping, showering, or exercising while wearing it to preserve shine.",
        ],
      },
      {
        heading: "Sizing and Fit",
        paragraphs: [
          "For rings, ask for ring size, inner diameter, or a photo of a ring size chart measurement. If the customer is unsure, recommend adjustable rings or ask them to measure an existing ring that fits.",
          "For necklaces, short chains sit close to the collarbone, medium chains suit daily wear, and long chains work well with plain tops, dresses, and layered looks. For bangles and bracelets, ask wrist size and preferred fit: snug, regular, or loose.",
        ],
      },
      {
        heading: "Pricing, Packaging, and Delivery",
        bullets: [
          "Minimal daily wear pieces are usually entry-level priced, while bridal-inspired sets, premium finishes, and custom pieces cost more.",
          "Exact price depends on product code, material, finish, stones, size, and packaging option.",
          "Gift packaging can be offered when available and may cost extra depending on box style.",
          "For urgent orders, ask city, required date, and product code before confirming dispatch.",
          "Customized or personalized items may need advance payment and extra production time.",
        ],
      },
      {
        heading: "Returns and Exchanges",
        paragraphs: [
          "For hygiene reasons, earrings and pierced jewellery may not be returnable unless defective. Unused items with original packaging may be eligible for exchange depending on store policy and availability.",
          "If a customer reports damage, ask for order number, unboxing video or clear photos, product code, and delivery date. Escalate defect, refund, repair, or replacement decisions to a human team member.",
        ],
      },
      {
        heading: "Lead Qualification Rules",
        bullets: [
          "Ask occasion first: daily wear, office, wedding, party, Eid, bridal, gift, or custom order.",
          "Ask outfit color and preferred finish: gold, silver, rose gold, pearls, stones, or minimal style.",
          "Ask budget range before recommending premium sets.",
          "Ask sensitivity or allergy concerns before suggesting earrings or plated pieces.",
          "Escalate bridal bulk orders, custom name pieces, damaged item claims, and refund requests to a human.",
        ],
      },
      {
        heading: "Direct FAQ Answers",
        qa: [
          ["Will the jewellery color fade?", "Plated and fashion jewellery can fade over time if exposed to water, perfume, sweat, or chemicals. To preserve shine, keep it dry, wipe after use, and store it separately in a pouch or box."],
          ["Do you have jewellery for sensitive skin?", "Some items may be better for sensitive skin, such as stainless steel, sterling silver, or hypoallergenic-labelled pieces. Please share the product you like so we can confirm the material before you order."],
          ["Can I get gift packaging?", "Yes, gift packaging is available for selected pieces. Share the product code and occasion, and we can confirm box options, pricing, and availability."],
          ["How do I choose jewellery for a wedding outfit?", "Share your outfit color, neckline, hairstyle, event type, and budget. We can suggest matching earrings, necklace sets, bangles, tikka sets, or statement pieces based on your look."],
          ["Can I return earrings?", "For hygiene reasons, earrings and pierced jewellery may not be returnable unless defective. If there is a defect, please share your order number, clear photos or unboxing video, and delivery date for review."],
        ],
      },
    ],
    faqText: [
      ["Will the jewellery color fade?", "Plated and fashion jewellery can fade over time if exposed to water, perfume, sweat, or chemicals. To preserve shine, keep it dry, wipe after use, and store it separately in a pouch or box."],
      ["Do you have jewellery for sensitive skin?", "Some items may be better for sensitive skin, such as stainless steel, sterling silver, or hypoallergenic-labelled pieces. Please share the product you like so we can confirm the material before you order."],
      ["Can I get gift packaging?", "Yes, gift packaging is available for selected pieces. Share the product code and occasion, and we can confirm box options, pricing, and availability."],
      ["How do I choose jewellery for a wedding outfit?", "Share your outfit color, neckline, hairstyle, event type, and budget. We can suggest matching earrings, necklace sets, bangles, tikka sets, or statement pieces based on your look."],
      ["Can I return earrings?", "For hygiene reasons, earrings and pierced jewellery may not be returnable unless defective. If there is a defect, please share your order number, clear photos or unboxing video, and delivery date for review."],
    ],
  },
];

function escapePdfText(value) {
  return value
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text, fontSize, maxWidth) {
  const maxChars = Math.max(18, Math.floor(maxWidth / (fontSize * 0.5)));
  const lines = [];

  for (const rawLine of text.split("\n")) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    let line = "";

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      lines.push(line);
    }
  }

  return lines;
}

function buildPages(doc) {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 54;
  const bottomMargin = 54;
  const maxWidth = pageWidth - marginX * 2;
  const pages = [[]];
  let y = 732;

  function currentPage() {
    return pages[pages.length - 1];
  }

  function newPage() {
    pages.push([]);
    y = 738;
  }

  function ensureSpace(height) {
    if (y - height < bottomMargin) {
      newPage();
    }
  }

  function addLine(text, { size = 11, font = "F1", gap = 14, indent = 0 } = {}) {
    ensureSpace(gap);
    currentPage().push({ text, size, font, x: marginX + indent, y });
    y -= gap;
  }

  function addParagraph(text, options = {}) {
    const size = options.size || 11;
    const indent = options.indent || 0;
    const lines = wrapText(text, size, maxWidth - indent);

    for (const line of lines) {
      addLine(line, { ...options, size, indent, gap: options.gap || size + 4 });
    }
    y -= options.after ?? 6;
  }

  addLine(doc.title, { size: 20, font: "F2", gap: 24 });
  addParagraph(doc.subtitle, { size: 12, font: "F1", gap: 16, after: 12 });

  for (const section of doc.sections) {
    ensureSpace(55);
    addLine(section.heading, { size: 15, font: "F2", gap: 20 });

    for (const paragraph of section.paragraphs || []) {
      addParagraph(paragraph, { size: 11, gap: 15, after: 5 });
    }

    for (const bullet of section.bullets || []) {
      addParagraph(`- ${bullet}`, { size: 11, indent: 14, gap: 15, after: 2 });
    }

    for (const [question, answer] of section.qa || []) {
      addParagraph(`Question: ${question}`, { size: 11, font: "F2", gap: 15, after: 1 });
      addParagraph(`Answer: ${answer}`, { size: 11, gap: 15, after: 5 });
    }

    y -= 6;
  }

  return { pageWidth, pageHeight, pages };
}

function makePdf(doc) {
  const { pageWidth, pageHeight, pages } = buildPages(doc);
  const objects = [];

  function addObject(content) {
    objects.push(content);
    return objects.length;
  }

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesPlaceholderId = addObject("");
  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  for (const pageLines of pages) {
    const stream = pageLines
      .map((line) => `BT /${line.font} ${line.size} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj ET`)
      .join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesPlaceholderId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[pagesPlaceholderId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((content, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${content}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}

for (const doc of docs) {
  const pdfPath = path.join(outputDir, `${doc.slug}.pdf`);
  const faqPath = path.join(outputDir, `${doc.slug}-faqs.txt`);
  const faqText = doc.faqText
    .map(([question, answer], index) => `FAQ ${index + 1}\nQuestion: ${question}\nAnswer: ${answer}`)
    .join("\n\n");

  fs.writeFileSync(pdfPath, makePdf(doc));
  fs.writeFileSync(faqPath, `${doc.title} - Manual FAQ Paste Text\n\n${faqText}\n`, "utf8");
}

console.log(`Generated ${docs.length} PDFs and FAQ text files in ${outputDir}`);
