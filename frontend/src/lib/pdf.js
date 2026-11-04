import { Capacitor } from '@capacitor/core';

/** Capture an element and save it as a landscape A4 PDF (shares the file on Android/iOS). */
export async function exportPdf(el, filename = 'asakai.pdf') {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: el.scrollWidth });
  const img = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const w = pw - margin * 2;
  const h = (canvas.height * w) / canvas.width;
  let y = 0;
  // Slice tall captures across pages.
  while (y < h) {
    if (y > 0) pdf.addPage();
    pdf.addImage(img, 'JPEG', margin, margin - y, w, h);
    y += ph - margin * 2;
  }

  if (!Capacitor.isNativePlatform()) {
    pdf.save(filename);
    return;
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const data = pdf.output('datauristring').split(',')[1];
  const file = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  await Share.share({ title: filename, url: file.uri, dialogTitle: 'Share Asakai PDF' });
}
