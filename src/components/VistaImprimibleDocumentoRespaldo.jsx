
import React, { forwardRef } from 'react';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';

const VistaImprimibleDocumentoRespaldo = forwardRef(({ documento, emisorInfo, receptorInfo }, ref) => {
    
    if (!documento) return null;

    const renderField = (label, value) => (
        <div className="mb-2">
            <span className="font-bold uppercase text-xs text-gray-800 mr-2">{label}:</span>
            <span className="text-gray-900 border-b border-gray-300 inline-block min-w-[200px]">{value || '---'}</span>
        </div>
    );

    return (
        <div ref={ref} className="p-8 bg-white max-w-4xl mx-auto print-container" style={{ fontFamily: 'Times New Roman, serif' }}>
            {/* ENCABEZADO */}
            <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-bold uppercase tracking-widest mb-1">Copia de Respaldo - Archivo Parroquial</h1>
                <h2 className="text-lg uppercase text-gray-700 mb-2">Aviso de Notificación Matrimonial</h2>
                <div className="flex justify-between items-center mt-4">
                    <span className="font-bold">Consecutivo: {documento.consecutivo}</span>
                    <span>Fecha Emisión: {new Date(documento.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
            </div>

            {/* SECCIÓN 1: IDENTIFICACIÓN DE PARROQUIAS */}
            <div className="mb-8 flex justify-between border border-gray-300 p-4 bg-gray-50">
                <div className="w-1/2 pr-4 border-r border-gray-300">
                    <h4 className="font-bold text-sm uppercase text-gray-600 mb-2">Parroquia Emisora (Origen)</h4>
                    <p className="font-semibold text-lg">{emisorInfo?.name || '---'}</p>
                    <p className="text-sm">{emisorInfo?.city || '---'}</p>
                </div>
                <div className="w-1/2 pl-4">
                    <h4 className="font-bold text-sm uppercase text-gray-600 mb-2">Parroquia Receptora (Destino)</h4>
                    <p className="font-semibold text-lg">{receptorInfo ? receptorInfo.name : 'Uso Interno (Misma Parroquia)'}</p>
                    <p className="text-sm">{receptorInfo?.city || '---'}</p>
                </div>
            </div>

            {/* SECCIÓN 2: DATOS DEL BAUTISMO */}
            <div className="mb-6 border border-gray-400 p-4">
                <h4 className="font-bold text-lg border-b border-gray-400 mb-4 pb-1">I. Datos de la Partida de Bautismo</h4>
                <div className="grid grid-cols-2 gap-4">
                    {renderField("Nombre del Bautizado/a", documento.personName)}
                    {renderField("Fecha de Nacimiento", documento.personBirthDate)}
                    {renderField("Libro", documento.baptismBook)}
                    {renderField("Folio", documento.baptismFolio)}
                    {renderField("Número", documento.baptismNumber)}
                </div>
            </div>

            {/* SECCIÓN 3: DATOS DEL MATRIMONIO */}
            <div className="mb-6 border border-gray-400 p-4">
                <h4 className="font-bold text-lg border-b border-gray-400 mb-4 pb-1">II. Datos de la Celebración del Matrimonio</h4>
                <div className="grid grid-cols-2 gap-4">
                    {renderField("Contrajo Matrimonio con", documento.spouseName)}
                    {renderField("Fecha de Matrimonio", documento.marriageDate)}
                    {renderField("Lugar de Celebración", `${documento.marriageParish}, ${documento.marriageDiocese}`)}
                    {renderField("Libro de Matrimonios", documento.marriageBook)}
                    {renderField("Folio", documento.marriageFolio)}
                    {renderField("Número", documento.marriageNumber)}
                </div>
            </div>

            {/* SECCIÓN 4: NOTA MARGINAL APLICADA/SUGERIDA */}
            {documento.marginNoteText && (
                <div className="mb-12 bg-gray-50 p-4 border border-gray-300 italic text-sm">
                    <h5 className="font-bold not-italic mb-2 text-gray-800">Nota Marginal Registrada/Enviada:</h5>
                    <p className="text-justify leading-relaxed">{documento.marginNoteText}</p>
                </div>
            )}

            <div className="mb-8">
                <p className="text-sm text-gray-600">Documento generado el {convertDateToSpanishText(new Date(documento.createdAt || Date.now()).toISOString().split('T')[0])} por el usuario: {documento.createdBy || 'Sistema'}.</p>
            </div>

            {/* FIRMAS DE RESPALDO */}
            <div className="flex justify-around mt-16 pt-8">
                <div className="text-center">
                    <div className="w-64 border-b border-black mb-2 mx-auto"></div>
                    <p className="font-bold uppercase text-sm">Firma del Párroco Emisor</p>
                    <p className="text-xs text-gray-600">{emisorInfo?.name}</p>
                </div>
                
                <div className="text-center">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xs text-gray-400">Sello Emisor</span>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; box-sizing: border-box; }
                    .no-print { display: none !important; }
                }
            `}} />
        </div>
    );
});

VistaImprimibleDocumentoRespaldo.displayName = 'VistaImprimibleDocumentoRespaldo';

export default VistaImprimibleDocumentoRespaldo;
