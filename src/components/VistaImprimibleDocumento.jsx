
import React from 'react';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';

const VistaImprimibleDocumento = ({ aviso, documento, partida, emisorInfo, receptorInfo }) => {
    
    const renderField = (label, value) => (
        <div className="mb-2">
            <span className="font-bold uppercase text-xs text-black mr-2">{label}:</span>
            <span className="text-black border-b border-black inline-block min-w-[200px]">{value || '---'}</span>
        </div>
    );

    return (
        <div className="print-document p-[0.5in] bg-white text-black max-w-[8.5in] mx-auto" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: 1.4 }}>
            {/* ENCABEZADO */}
            <div className="print-header text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-[14pt] font-bold uppercase tracking-widest mb-1">Aviso de Notificación Matrimonial</h1>
                <p className="text-[10pt] uppercase mb-2">{emisorInfo?.name || 'Parroquia Emisora'}</p>
                <div className="flex justify-between items-center mt-4 text-[10pt]">
                    <span className="font-bold">Consecutivo: {aviso?.consecutivo || documento?.consecutivo}</span>
                    <span>Fecha: {new Date(aviso?.createdAt || documento?.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
            </div>

            {/* SECCIÓN 1: DIRIGIDO A */}
            <div className="print-section mb-8">
                <p className="mb-2">Señor Cura Párroco de:</p>
                <h2 className="text-[12pt] font-bold uppercase border-b border-black pb-1 mb-2">{receptorInfo?.name || 'Parroquia Receptora'}</h2>
                <p className="mt-2 text-justify">
                    Atentamente me dirijo a usted para notificarle, con el fin de que se sirva asentar la respectiva Nota Marginal, la celebración del siguiente matrimonio canónico de una persona bautizada en su jurisdicción.
                </p>
            </div>

            {/* SECCIÓN 2: DATOS DEL BAUTISMO */}
            <div className="print-section mb-8 border border-black p-4">
                <h2 className="text-[12pt] font-bold border-b border-black mb-4 pb-1">I. Datos de la Partida de Bautismo</h2>
                <div className="grid grid-cols-2 gap-4">
                    {renderField("Nombre del Bautizado/a", documento?.personName)}
                    {renderField("Libro", documento?.baptismBook)}
                    {renderField("Folio", documento?.baptismFolio)}
                    {renderField("Número", documento?.baptismNumber)}
                </div>
            </div>

            {/* SECCIÓN 3: DATOS DEL MATRIMONIO */}
            <div className="print-section mb-8 border border-black p-4">
                <h2 className="text-[12pt] font-bold border-b border-black mb-4 pb-1">II. Datos de la Celebración del Matrimonio</h2>
                <div className="grid grid-cols-2 gap-4">
                    {renderField("Contrajo Matrimonio con", documento?.spouseName)}
                    {renderField("Fecha de Matrimonio", documento?.marriageDate)}
                    {renderField("Parroquia donde se celebró", documento?.marriageParish)}
                    {renderField("Diócesis", documento?.marriageDiocese)}
                    {renderField("Libro de Matrimonios", documento?.marriageBook)}
                    {renderField("Folio", documento?.marriageFolio)}
                    {renderField("Número", documento?.marriageNumber)}
                </div>
            </div>

            <div className="print-section mb-12">
                <p>Expedido en {emisorInfo?.city || '________________'} a los {convertDateToSpanishText(new Date().toISOString().split('T')[0])}.</p>
            </div>

            {/* FIRMAS */}
            <div className="print-signatures flex justify-around mt-16 pt-8 page-break-inside-avoid">
                <div className="text-center flex flex-col items-center">
                    <div className="signature-line"></div>
                    <p className="font-bold uppercase mt-1">Firma del Párroco Emisor</p>
                    <p className="text-[10pt] text-black">{emisorInfo?.name}</p>
                </div>
                
                <div className="text-center flex flex-col items-center">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center mx-auto mb-2 opacity-80">
                        <span className="text-[10pt]">Sello Parroquial</span>
                    </div>
                </div>
            </div>
            
            {/* CSS specific for printing */}
            <style dangerouslySetInnerHTML={{ __html: `
                .signature-line {
                    margin-top: 0.4in;
                    border-top: 1px solid black;
                    width: 2in;
                    text-align: center;
                    font-size: 10pt;
                }
                @media print {
                    @page { 
                        size: letter; 
                        margin: 0.5in; 
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    body * { visibility: hidden; }
                    .print-document, .print-document * { visibility: visible; }
                    .print-document { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 11pt;
                        line-height: 1.4;
                        color: black;
                        background: white;
                    }
                    .print-header h1 { font-size: 14pt; font-weight: bold; }
                    .print-header p { font-size: 10pt; }
                    .print-section { page-break-inside: avoid; }
                    .print-section h2 { font-size: 12pt; font-weight: bold; border-bottom: 1px solid black; }
                    .print-section p { font-size: 11pt; }
                    .no-print { display: none !important; }
                    /* Remove shadows and unneeded border colors for print */
                    * { box-shadow: none !important; }
                }
            `}} />
        </div>
    );
};

export default VistaImprimibleDocumento;
