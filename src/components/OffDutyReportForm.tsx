import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import SignaturePad from 'signature_pad';

const OffDutyReportForm = () => {
  const [formData, setFormData] = useState({
    badge: '',
    date: '',
    beginTime: '',
    endTime: '',
    date2: '',
    name: '',
    businessName: '',
    businessLocation: '',
    billTo: '',
    unit: '',
    totalHours: '',
    hourlyRate: '',
    rate: '',
    shift: '', // 'Day' or 'Night'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [signaturePad, setSignaturePad] = useState<SignaturePad | null>(null);

  useEffect(() => {
    if (signatureCanvasRef.current) {
      const pad = new SignaturePad(signatureCanvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)', // Set background color
        penColor: 'rgb(0, 0, 0)' // Set pen color
      });
      setSignaturePad(pad);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearSignature = () => {
    signaturePad?.clear();
    setSignatureDataUrl(null);
  };

  const saveSignature = () => {
    if (signaturePad) {
      const data = signaturePad.toDataURL();
      setSignatureDataUrl(data);
    }
  };

  const uploadReport = async (pdfBytes: Uint8Array) => {
    setIsUploading(true);
    try {
      const fileName = `filled-vehicle-report-${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-templates')
        .upload(fileName, new Blob([pdfBytes], { type: 'application/pdf' }), {
          contentType: 'application/pdf',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pdf-templates')
        .getPublicUrl(uploadData.path);

      const { error: dbError } = await supabase
        .from('pdf_templates')
        .insert([
          {
            name: fileName,
            file_url: publicUrl,
          },
        ]);

      if (dbError) throw dbError;

      toast.success('Report generated and uploaded successfully!');
    } catch (error: any) {
      toast.error(`Error uploading report: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const generateFilledPdf = async () => {
    setIsUploading(true);
    try {
      const response = await fetch('/Fillable - Off Duty Vehicle Usage Report.pdf');
      const existingPdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const form = pdfDoc.getForm();

      form.getTextField('Badge').setText(formData.badge);
      form.getTextField('Date').setText(formData.date);
      form.getTextField('Begin Time').setText(formData.beginTime);
      form.getTextField('End Time').setText(formData.endTime);
      form.getTextField('Date_2').setText(formData.date2);
      form.getTextField('Name').setText(formData.name);
      form.getTextField('Business Name').setText(formData.businessName);
      form.getTextField('Business Location').setText(formData.businessLocation);
      form.getTextField('Bill To Name & Address').setText(formData.billTo);
      form.getTextField('Unit').setText(formData.unit);
      form.getTextField('Total Number of Hours').setText(formData.totalHours);
      form.getTextField('Officers Hourly Rate').setText(formData.hourlyRate);
      form.getTextField('Rate').setText(formData.rate);

      if (formData.shift === '1-4 Hours') {
        form.getCheckBox('Check Box7').check();
      } else if (formData.shift === 'More than 4 hours') {
        form.getCheckBox('Check Box8').check();
      }

      // Embed signature image
      let signatureImage;
      if (signatureDataUrl) {
        signatureImage = await pdfDoc.embedPng(signatureDataUrl);
      }

// Draw signature on the same page as form fields (page 0)
const [firstPage] = pdfDoc.getPages();

      /*
if (signatureImage) {
  firstPage.drawImage(signatureImage, {
    x: 400,  // Adjust based on actual signature box position
    y: 80,   // Adjust to match vertical position of the box
    width: 150,
    height: 50,
  });
}
*/
if (signatureImage) {
  firstPage.drawImage(signatureImage, {
        x: 370,   // shift left/right
        y: 60,    // shift up/down
        width: 160,
        height: 50,
      });
}

      const pdfBytes = await pdfDoc.save();
      await uploadReport(pdfBytes);
    } catch (error: any) {
      toast.error(`Error generating PDF: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold">Off Duty Vehicle Usage Report</h2>

      {[
        { label: 'Badge', name: 'badge' },
        { label: 'Date (worked)', name: 'date' },
        { label: 'Begin Time', name: 'beginTime' },
        { label: 'End Time', name: 'endTime' },
        { label: 'Date (signed)', name: 'date2' },
        { label: 'Name', name: 'name' },
        { label: 'Business Name', name: 'businessName' },
        { label: 'Business Location', name: 'businessLocation' },
        { label: 'Bill To Name & Address', name: 'billTo' },
        { label: 'Unit', name: 'unit' },
        { label: 'Total Hours', name: 'totalHours' },
        { label: 'Hourly Rate', name: 'hourlyRate' },
        { label: 'Rate (if more than 4)', name: 'rate' },
      ].map(({ label, name }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <input
            type="text"
            name={name}
            value={formData[name as keyof typeof formData]}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700">Shift</label>
        <select
          name="shift"
          value={formData.shift}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Shift</option>
          <option value="1-4 Hours">1-4 Hours</option>
          <option value="More than 4 hours">More than 4 hours</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Signature</label>
        <canvas
          ref={signatureCanvasRef}
          width={400}
          height={200}
          className="border border-gray-300 rounded-md"
        ></canvas>
        <div className="flex justify-between mt-2">
          <button
            type="button"
            onClick={clearSignature}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={saveSignature}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Signature
          </button>
        </div>
        {signatureDataUrl && (
          <img src={signatureDataUrl} alt="Signature" className="mt-2 max-h-20" />
        )}
      </div>

      <button
        onClick={generateFilledPdf}
        disabled={isUploading}
        className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Generating and Uploading...' : 'Download Filled Report'}
      </button>
    </div>
  );
};

export default OffDutyReportForm;
